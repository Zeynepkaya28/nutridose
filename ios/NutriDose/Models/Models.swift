import Foundation

// MARK: - /api/analyze contract (mirrors src/lib/api/analyze.ts)

struct AnalyzeRequest: Encodable {
    enum Payload: Encodable {
        case barcode(String)
        case manual(String)
        case prescription(storagePath: String)

        func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: Key.self)
            switch self {
            case .barcode(let code): try container.encode(code, forKey: .barcode)
            case .manual(let text): try container.encode(text, forKey: .text)
            case .prescription(let path): try container.encode(path, forKey: .storagePath)
            }
        }

        private enum Key: String, CodingKey { case barcode, text, storagePath }

        var inputKind: String {
            switch self {
            case .barcode: "barcode"
            case .manual: "manual"
            case .prescription: "prescription_pdf"
            }
        }
    }

    let payload: Payload
    var mealId: UUID?

    private enum CodingKeys: String, CodingKey { case inputKind, payload, mealId }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(payload.inputKind, forKey: .inputKind)
        try container.encode(payload, forKey: .payload)
        try container.encodeIfPresent(mealId?.uuidString.lowercased(), forKey: .mealId)
    }
}

enum FindingStatus: String, Decodable {
    case pass, caution, high, error

    var label: String {
        switch self {
        case .pass: "Uygun"
        case .caution: "Dikkat"
        case .high: "Yüksek risk"
        case .error: "Kontrol edilemedi"
        }
    }

    /// Status is shown with color + shape + text.
    var symbol: String {
        switch self {
        case .pass: "checkmark.circle.fill"
        case .caution: "exclamationmark.triangle.fill"
        case .high: "xmark.octagon.fill"
        case .error: "questionmark.circle.fill"
        }
    }
}

enum AnalysisStep: String, Decodable, CaseIterable {
    case ingredientScan = "ingredient_scan"
    case drugFood = "drug_food"
    case doseLimit = "dose_limit"
    case toleranceAllergy = "tolerance_allergy"

    var title: String {
        switch self {
        case .ingredientScan: "1 · Etken madde taraması"
        case .drugFood: "2 · İlaç–besin etkileşimi"
        case .doseLimit: "3 · Doz sınırı"
        case .toleranceAllergy: "4 · Tolerans ve alerji"
        }
    }
}

struct Finding: Decodable, Identifiable {
    let step: AnalysisStep
    let status: FindingStatus
    let severity: String?
    let title: String
    let detail: String?
    let message: String
    let interactionId: String?

    var id: String { "\(step.rawValue)|\(title)" }
}

struct AnalyzeResponse: Decodable {
    let runId: String
    let findings: [Finding]
    let requiresAlert: Bool
}

// MARK: - Rows read directly from Supabase (RLS: own rows only)

struct ProfileRow: Decodable {
    let displayName: String?
    let onboardedAt: Date?
    let healthConsentAt: Date?
    let healthConsentVersion: String?

    enum CodingKeys: String, CodingKey {
        case displayName = "display_name"
        case onboardedAt = "onboarded_at"
        case healthConsentAt = "health_consent_at"
        case healthConsentVersion = "health_consent_version"
    }
}

struct MedicationRow: Decodable, Identifiable {
    struct Product: Decodable { let name: String }
    let id: UUID
    let dose: String?
    let active: Bool
    let products: Product?

    var name: String { products?.name ?? "Bilinmeyen ilaç" }
}

struct MealRow: Decodable, Identifiable {
    struct Item: Decodable { let rawText: String; enum CodingKeys: String, CodingKey { case rawText = "raw_text" } }
    struct Run: Decodable { let id: UUID; let requiresAlert: Bool; enum CodingKeys: String, CodingKey { case id; case requiresAlert = "requires_alert" } }
    let id: UUID
    let label: String?
    let eatenAt: Date
    let mealItems: [Item]
    let analysisRuns: [Run]

    enum CodingKeys: String, CodingKey {
        case id, label
        case eatenAt = "eaten_at"
        case mealItems = "meal_items"
        case analysisRuns = "analysis_runs"
    }
}

struct ProductRow: Decodable, Identifiable {
    let id: UUID
    let name: String
}

enum ConditionCode: String, CaseIterable, Identifiable {
    case cardiology, diabetesInsulin = "diabetes_insulin", transplantImmuno = "transplant_immuno", hypertension, renal

    var id: String { rawValue }
    var name: String {
        switch self {
        case .cardiology: "Kardiyoloji"
        case .diabetesInsulin: "Diyabet / İnsülin"
        case .transplantImmuno: "Transplant / İmmünsüpresyon"
        case .hypertension: "Hipertansiyon"
        case .renal: "Böbrek hastalığı"
        }
    }
}
