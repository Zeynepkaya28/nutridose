import Foundation
import Supabase

/// Public configuration from Info.plist (filled from Config.xcconfig).
enum AppConfig {
    static func value(_ key: String) -> String {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String, !value.isEmpty else {
            fatalError("\(key) is missing. Copy Config.example.xcconfig to Config.xcconfig and fill it in.")
        }
        return value
    }

    static let supabaseURL = URL(string: value("SUPABASE_URL"))!
    static let supabaseKey = value("SUPABASE_PUBLISHABLE_KEY")
    static let apiBaseURL = URL(string: value("API_BASE_URL"))!
    static let authRedirect = URL(string: "nutridose://auth-callback")!
    /// Must match CONSENT_VERSION in the web app (src/lib/consent.ts).
    static let consentVersion = "2026-10-27"
}

/// Same Supabase backend as the web app. Uses only the publishable key; RLS protects the data.
let supabase = SupabaseClient(supabaseURL: AppConfig.supabaseURL, supabaseKey: AppConfig.supabaseKey)

/// Errors with a Turkish message that can be shown as is.
struct UserFacingError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

/// Calls the web API so the domain logic (Factory / Strategy / Chain) stays in one place.
enum AnalysisAPI {
    private struct ErrorBody: Decodable { let error: String }

    static func analyze(_ request: AnalyzeRequest) async throws -> AnalyzeResponse {
        try await send(path: "api/analyze", method: "POST", body: request, as: AnalyzeResponse.self)
    }

    static func deleteAccount() async throws {
        _ = try await send(path: "api/account", method: "DELETE", body: Optional<String>.none, as: Empty.self)
    }

    private struct Empty: Decodable {}

    private static func send<Body: Encodable, Response: Decodable>(
        path: String, method: String, body: Body?, as: Response.Type
    ) async throws -> Response {
        let token = try await supabase.auth.session.accessToken
        var request = URLRequest(url: AppConfig.apiBaseURL.appendingPathComponent(path))
        request.httpMethod = method
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let message = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.error
            throw UserFacingError(message: message ?? "İşlem şu anda yapılamadı. Lütfen tekrar deneyin.")
        }
        if Response.self == Empty.self || data.isEmpty { return try JSONDecoder().decode(Response.self, from: Data("{}".utf8)) }
        return try JSONDecoder().decode(Response.self, from: data)
    }
}
