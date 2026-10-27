import AuthenticationServices
import CryptoKit
import Supabase
import SwiftUI

struct SignInView: View {
    @Environment(AppModel.self) private var model
    @State private var email = ""
    @State private var sent = false
    @State private var error: String?
    @State private var nonce = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    SignInWithAppleButton(.continue) { request in
                        nonce = Self.randomNonce()
                        request.requestedScopes = [.email]
                        request.nonce = Self.sha256(nonce)
                    } onCompletion: { result in
                        Task { await completeApple(result) }
                    }
                    .frame(minHeight: 50)
                    .listRowInsets(EdgeInsets())
                }

                Section {
                    TextField("ornek@eposta.com", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                    Button("Giriş bağlantısı gönder") { Task { await sendLink() } }
                        .disabled(!email.contains("@"))
                } header: {
                    Text("E-posta ile giriş")
                } footer: {
                    Text(sent ? "\(email) adresine bir giriş bağlantısı gönderdik. Bağlantıya bu cihazda dokunun." :
                        "Şifre gerekmez; tek kullanımlık bir giriş bağlantısı göndeririz.")
                }

                if let error { Section { Text(error).foregroundStyle(.red) } }

                Section { DisclaimerText() }
            }
            .navigationTitle("NutriDose")
        }
    }

    private func sendLink() async {
        do {
            try await supabase.auth.signInWithOTP(email: email, redirectTo: AppConfig.authRedirect)
            sent = true
            error = nil
        } catch {
            self.error = "Giriş bağlantısı gönderilemedi. Lütfen tekrar deneyin."
        }
    }

    private func completeApple(_ result: Result<ASAuthorization, Error>) async {
        guard case .success(let authorization) = result,
              let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8) else {
            error = "Apple ile giriş tamamlanamadı."
            return
        }
        do {
            try await supabase.auth.signInWithIdToken(credentials: .init(provider: .apple, idToken: idToken, nonce: nonce))
        } catch {
            self.error = "Apple ile giriş tamamlanamadı."
        }
    }

    static func randomNonce() -> String {
        (0..<32).map { _ in String(format: "%02x", UInt8.random(in: 0...255)) }.joined()
    }

    static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

/// KVKK explicit consent. Nothing health-related can be saved before this (enforced by RLS).
struct ConsentView: View {
    @Environment(AppModel.self) private var model
    @State private var accepted = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("NutriDose; tedavi profiliniz, ilaçlarınız, alerjileriniz, öğünleriniz ve reçeteleriniz gibi sağlık verilerinizi yalnızca size etkileşim analizi sunmak için işler. Veriler AB bölgesinde saklanır ve hesabınızı sildiğinizde tamamen silinir.")
                    Link("KVKK aydınlatma metninin tamamı", destination: AppConfig.apiBaseURL.appendingPathComponent("kvkk"))
                }
                Section {
                    Toggle(isOn: $accepted) {
                        Text("Sağlık verilerimin etkileşim analizi amacıyla, KVKK aydınlatma metninde açıklanan şekilde işlenmesine açık rıza veriyorum.")
                    }
                }
                Section {
                    Button("Onayla ve devam et") { Task { await model.giveConsent() } }
                        .disabled(!accepted)
                } footer: {
                    DisclaimerText()
                }
            }
            .navigationTitle("Açık rıza")
        }
    }
}
