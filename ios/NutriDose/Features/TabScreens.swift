import SwiftUI

struct TodayView: View {
    @Environment(AppModel.self) private var model
    @State private var adding = false
    @State private var result: AnalyzeResponse?

    private var todayMeals: [MealRow] { model.meals.filter { Calendar.current.isDateInToday($0.eatenAt) } }

    var body: some View {
        NavigationStack {
            List {
                Section("Bugünkü öğünler") {
                    if todayMeals.isEmpty {
                        Label("Henüz öğün eklemediniz", systemImage: "fork.knife")
                    }
                    ForEach(todayMeals) { MealSummaryRow(meal: $0) }
                }
                Section("İlaçlarım") {
                    ForEach(model.medications.filter(\.active)) { med in
                        LabeledContent { Text(med.dose ?? "") } label: { Label(med.name, systemImage: "pills.fill") }
                    }
                }
                Section {
                    Button { adding = true } label: { Label("Öğün veya ürün ekle", systemImage: "plus.circle.fill") }
                } footer: { DisclaimerText() }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Bugün")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { adding = true } label: { Image(systemName: "plus") }.accessibilityLabel("Ekle")
                }
            }
            .refreshable { await model.refresh() }
            .sheet(isPresented: $adding) { AddSheet { result = $0 } }
            .navigationDestination(item: $result) { AnalysisView(result: $0) }
        }
    }
}

extension AnalyzeResponse: Hashable, Identifiable {
    var id: String { runId }
    static func == (a: AnalyzeResponse, b: AnalyzeResponse) -> Bool { a.runId == b.runId }
    func hash(into hasher: inout Hasher) { hasher.combine(runId) }
}

struct MealSummaryRow: View {
    let meal: MealRow
    var critical: Bool { meal.analysisRuns.contains { $0.requiresAlert } }

    var body: some View {
        Label {
            VStack(alignment: .leading) {
                Text(meal.label ?? "Öğün")
                Text(meal.mealItems.map(\.rawText).joined(separator: ", ")).font(.subheadline).foregroundStyle(.secondary)
            }
        } icon: {
            Image(systemName: critical ? "xmark.octagon.fill" : "fork.knife").foregroundStyle(critical ? .red : .orange)
        }
        .badge(Text(meal.eatenAt, style: .time))
    }
}

struct MealsView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        NavigationStack {
            List {
                if model.meals.isEmpty { Text("Henüz öğün yok").foregroundStyle(.secondary) }
                ForEach(model.meals) { MealSummaryRow(meal: $0) }
                Section { DisclaimerText() }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Öğünler")
            .refreshable { await model.refresh() }
        }
    }
}

struct MedicationsView: View {
    @Environment(AppModel.self) private var model
    @State private var query = ""
    @State private var results: [ProductRow] = []
    @State private var selected: ProductRow?
    @State private var dose = ""

    var body: some View {
        NavigationStack {
            List {
                if query.isEmpty {
                    Section {
                        ForEach(model.medications) { med in
                            LabeledContent { Text(med.active ? (med.dose ?? "") : "Pasif") } label: { Label(med.name, systemImage: "pills.fill") }
                        }
                        .onDelete { indexes in
                            let ids = indexes.map { model.medications[$0].id }
                            Task { for id in ids { await model.removeMedication(id) } }
                        }
                    } header: { Text("Kullandıklarım") } footer: { Text("Eklemek için yukarıdan arayın. Silmek için sola kaydırın.") }
                } else {
                    Section("Sonuçlar") {
                        ForEach(results) { product in
                            Button(product.name) { selected = product }
                        }
                        if results.isEmpty { Text("Sonuç bulunamadı").foregroundStyle(.secondary) }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("İlaçlarım")
            .searchable(text: $query, prompt: "İlaç veya etken madde ara")
            .task(id: query) {
                try? await Task.sleep(for: .milliseconds(250))
                results = await model.searchDrugs(query)
            }
            .alert("Doz (isteğe bağlı)", isPresented: Binding(get: { selected != nil }, set: { if !$0 { selected = nil } })) {
                TextField("ör. 1×1, sabah", text: $dose)
                Button("Ekle") {
                    if let product = selected { Task { await model.addMedication(productId: product.id, dose: dose); query = "" } }
                    dose = ""
                }
                Button("Vazgeç", role: .cancel) { dose = "" }
            } message: {
                Text(selected?.name ?? "")
            }
        }
    }
}

struct ProfileView: View {
    @Environment(AppModel.self) private var model
    @State private var confirmingDelete = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(ConditionCode.allCases) { code in
                        Button {
                            Task { await model.setCondition(code, enabled: !model.conditions.contains(code)) }
                        } label: {
                            HStack {
                                Text(code.name).foregroundStyle(Color(.label))
                                Spacer()
                                if model.conditions.contains(code) { Image(systemName: "checkmark").foregroundStyle(.tint) }
                            }
                        }
                        .accessibilityAddTraits(model.conditions.contains(code) ? .isSelected : [])
                    }
                } header: { Text("Tedavi stratejileri") } footer: {
                    Text("Birden çok seçerseniz en yüksek risk ve en sıkı sınır uygulanır.")
                }

                Section("Hesap") {
                    if let email = model.email { LabeledContent("E-posta", value: email) }
                    Button("Çıkış yap") { Task { await model.signOut() } }
                    Button("Hesabı ve verileri sil", role: .destructive) { confirmingDelete = true }
                }
                if let error = model.errorMessage { Section { Text(error).foregroundStyle(.red) } }
                Section { DisclaimerText() }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Profil")
            .confirmationDialog(
                "Hesabınız kalıcı olarak silinsin mi?",
                isPresented: $confirmingDelete,
                titleVisibility: .visible
            ) {
                Button("Hesabımı ve verilerimi sil", role: .destructive) { Task { await model.deleteAccount() } }
                Button("Vazgeç", role: .cancel) {}
            } message: {
                Text("Profiliniz, ilaçlarınız, öğünleriniz, analizleriniz ve reçeteleriniz silinir. Bu işlem geri alınamaz.")
            }
        }
    }
}
