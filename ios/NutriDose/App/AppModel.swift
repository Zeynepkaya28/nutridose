import Foundation
import Observation
import Supabase

/// App-wide state: session, profile and the user's lists. All reads/writes go through RLS as the user.
@MainActor
@Observable
final class AppModel {
    enum Phase { case loading, signedOut, needsConsent, ready }

    var phase: Phase = .loading
    var email: String?
    var conditions: Set<ConditionCode> = []
    var medications: [MedicationRow] = []
    var meals: [MealRow] = []
    var errorMessage: String?

    private var userId: UUID?

    func start() async {
        for await (_, session) in supabase.auth.authStateChanges {
            userId = session?.user.id
            email = session?.user.email
            if session == nil {
                phase = .signedOut
            } else {
                await refresh()
            }
        }
    }

    func handle(url: URL) async {
        do { _ = try await supabase.auth.session(from: url) } catch { errorMessage = "Giriş bağlantısı geçersiz veya süresi dolmuş." }
    }

    func refresh() async {
        guard let userId else { return }
        do {
            let profile: ProfileRow = try await supabase.from("profiles")
                .select("display_name, onboarded_at, health_consent_at, health_consent_version")
                .eq("user_id", value: userId)
                .single()
                .execute()
                .value
            guard profile.healthConsentAt != nil, profile.healthConsentVersion == AppConfig.consentVersion else {
                phase = .needsConsent
                return
            }
            struct ConditionRow: Decodable { let condition_code: String }
            let codes: [ConditionRow] = try await supabase.from("user_conditions").select("condition_code").execute().value
            conditions = Set(codes.compactMap { ConditionCode(rawValue: $0.condition_code) })
            medications = try await supabase.from("user_medications")
                .select("id, dose, active, products ( name )")
                .order("created_at")
                .execute()
                .value
            let since = Calendar.current.date(byAdding: .day, value: -30, to: .now)!
            meals = try await supabase.from("meals")
                .select("id, label, eaten_at, meal_items ( raw_text ), analysis_runs ( id, requires_alert )")
                .gte("eaten_at", value: since.ISO8601Format())
                .order("eaten_at", ascending: false)
                .execute()
                .value
            phase = .ready
        } catch {
            errorMessage = "Veriler yüklenemedi. Lütfen tekrar deneyin."
        }
    }

    // MARK: Actions

    func giveConsent() async {
        guard let userId else { return }
        struct Consent: Encodable { let health_consent_at: String; let health_consent_version: String; let onboarded_at: String }
        let now = Date.now.ISO8601Format()
        do {
            try await supabase.from("profiles")
                .update(Consent(health_consent_at: now, health_consent_version: AppConfig.consentVersion, onboarded_at: now))
                .eq("user_id", value: userId)
                .execute()
            await refresh()
        } catch {
            errorMessage = "Onay kaydedilemedi. Lütfen tekrar deneyin."
        }
    }

    func setCondition(_ code: ConditionCode, enabled: Bool) async {
        guard let userId else { return }
        struct Row: Encodable { let user_id: UUID; let condition_code: String }
        do {
            if enabled {
                try await supabase.from("user_conditions").upsert(Row(user_id: userId, condition_code: code.rawValue)).execute()
                conditions.insert(code)
            } else {
                try await supabase.from("user_conditions").delete().eq("condition_code", value: code.rawValue).execute()
                conditions.remove(code)
            }
        } catch {
            errorMessage = "Kaydedilemedi. Lütfen tekrar deneyin."
        }
    }

    func searchDrugs(_ query: String) async -> [ProductRow] {
        struct Params: Encodable { let p_query: String; let p_kinds: [String]; let p_limit: Int }
        struct Ranked: Decodable { let product_id: UUID }
        guard query.count >= 2 else { return [] }
        do {
            let ranked: [Ranked] = try await supabase
                .rpc("search_products", params: Params(p_query: query, p_kinds: ["drug", "supplement"], p_limit: 15))
                .execute()
                .value
            let ids = ranked.map(\.product_id)
            guard !ids.isEmpty else { return [] }
            let rows: [ProductRow] = try await supabase.from("products").select("id, name").in("id", values: ids).execute().value
            return ids.compactMap { id in rows.first { $0.id == id } }
        } catch {
            return []
        }
    }

    func addMedication(productId: UUID, dose: String) async {
        struct Row: Encodable { let product_id: UUID; let dose: String? }
        do {
            try await supabase.from("user_medications").insert(Row(product_id: productId, dose: dose.isEmpty ? nil : dose)).execute()
            await refresh()
        } catch {
            errorMessage = "İlaç eklenemedi. Lütfen tekrar deneyin."
        }
    }

    func removeMedication(_ id: UUID) async {
        do {
            try await supabase.from("user_medications").delete().eq("id", value: id).execute()
            medications.removeAll { $0.id == id }
        } catch {
            errorMessage = "İlaç kaldırılamadı."
        }
    }

    /// Creates a meal for food input, then runs the analysis on the web API.
    func analyze(_ payload: AnalyzeRequest.Payload, mealLabel: String?) async throws -> AnalyzeResponse {
        var mealId: UUID?
        if case .prescription = payload {} else {
            struct NewMeal: Encodable { let label: String? }
            struct Created: Decodable { let id: UUID }
            let meal: Created = try await supabase.from("meals").insert(NewMeal(label: mealLabel)).select("id").single().execute().value
            mealId = meal.id
        }
        do {
            let result = try await AnalysisAPI.analyze(AnalyzeRequest(payload: payload, mealId: mealId))
            await refresh()
            return result
        } catch {
            if let mealId { _ = try? await supabase.from("meals").delete().eq("id", value: mealId).execute() }
            throw error
        }
    }

    func uploadPrescription(_ data: Data) async throws -> String {
        guard let userId else { throw UserFacingError(message: "Oturum bulunamadı.") }
        guard data.count <= 5 * 1024 * 1024 else { throw UserFacingError(message: "Reçete dosyası 5 MB'tan büyük olamaz.") }
        let path = "\(userId.uuidString.lowercased())/\(UUID().uuidString.lowercased()).pdf"
        try await supabase.storage.from("prescriptions").upload(path, data: data, options: FileOptions(contentType: "application/pdf"))
        return path
    }

    func signOut() async {
        try? await supabase.auth.signOut()
    }

    func deleteAccount() async {
        do {
            try await AnalysisAPI.deleteAccount()
            try? await supabase.auth.signOut(scope: .local)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
