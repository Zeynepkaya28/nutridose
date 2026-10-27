import SwiftUI

@main
struct NutriDoseApp: App {
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .task { await model.start() }
                .onOpenURL { url in Task { await model.handle(url: url) } }
        }
    }
}

struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        switch model.phase {
        case .loading:
            ProgressView()
        case .signedOut:
            SignInView()
        case .needsConsent:
            ConsentView()
        case .ready:
            MainTabView()
        }
    }
}

/// Four tabs; system tab bar, SF Symbols, Dynamic Type.
struct MainTabView: View {
    var body: some View {
        TabView {
            TodayView()
                .tabItem { Label("Bugün", systemImage: "house.fill") }
            MedicationsView()
                .tabItem { Label("İlaçlarım", systemImage: "pills.fill") }
            MealsView()
                .tabItem { Label("Öğünler", systemImage: "fork.knife") }
            ProfileView()
                .tabItem { Label("Profil", systemImage: "person.crop.circle.fill") }
        }
    }
}

/// Shown on every analysis-related screen.
struct DisclaimerText: View {
    var body: some View {
        Text("NutriDose tıbbi tavsiye yerine geçmez. Kararlarınızı doktorunuz veya eczacınızla verin.")
            .font(.footnote)
            .foregroundStyle(.secondary)
    }
}
