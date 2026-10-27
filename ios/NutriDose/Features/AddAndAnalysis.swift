import SwiftUI
import UniformTypeIdentifiers
import VisionKit

/// "Ekle" sheet with medium/large detents.
struct AddSheet: View {
    enum Mode: Hashable { case barcode, manual, prescription }

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var path: [Mode] = []
    @State private var result: AnalyzeResponse?
    let onResult: (AnalyzeResponse) -> Void

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Section {
                    NavigationLink(value: Mode.barcode) { Label("Barkod tara", systemImage: "barcode.viewfinder") }
                    NavigationLink(value: Mode.manual) { Label("Elle yaz", systemImage: "keyboard") }
                    NavigationLink(value: Mode.prescription) { Label("Reçete yükle", systemImage: "doc.text.viewfinder") }
                } footer: {
                    Text("Barkod ve elle girişler bugünkü öğünlerinize eklenir. Reçeteler ayrı analiz edilir.")
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Ekle")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Vazgeç") { dismiss() } } }
            .navigationDestination(for: Mode.self) { mode in
                switch mode {
                case .barcode: BarcodeEntry(onResult: finish)
                case .manual: ManualEntry(onResult: finish)
                case .prescription: PrescriptionEntry(onResult: finish)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private func finish(_ response: AnalyzeResponse) {
        dismiss()
        onResult(response)
    }
}

private func defaultMealLabel() -> String {
    switch Calendar.current.component(.hour, from: .now) {
    case 5..<11: "Kahvaltı"
    case 11..<15: "Öğle yemeği"
    case 18..<23: "Akşam yemeği"
    default: "Ara öğün"
    }
}

private struct ManualEntry: View {
    @Environment(AppModel.self) private var model
    @State private var text = ""
    @State private var busy = false
    @State private var error: String?
    let onResult: (AnalyzeResponse) -> Void

    var body: some View {
        Form {
            Section {
                TextField("ıspanak, greyfurt suyu", text: $text, axis: .vertical).lineLimit(3...6)
            } header: { Text("Ne yediniz veya içtiniz?") } footer: { Text("Virgülle ayırın. Her kalem ayrı kontrol edilir.") }
            if let error { Section { Text(error).foregroundStyle(.red) } }
            Section {
                Button(busy ? "Analiz ediliyor…" : "Analiz et") {
                    Task {
                        busy = true
                        defer { busy = false }
                        do { onResult(try await model.analyze(.manual(text), mealLabel: defaultMealLabel())) } catch { self.error = error.localizedDescription }
                    }
                }
                .disabled(busy || text.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .navigationTitle("Elle yaz")
    }
}

private struct BarcodeEntry: View {
    @Environment(AppModel.self) private var model
    @State private var code = ""
    @State private var busy = false
    @State private var error: String?
    let onResult: (AnalyzeResponse) -> Void

    var body: some View {
        Form {
            if DataScannerViewController.isSupported && DataScannerViewController.isAvailable {
                Section {
                    BarcodeScannerView { scanned in
                        guard !busy else { return }
                        code = scanned
                        submit()
                    }
                    .frame(height: 260)
                    .listRowInsets(EdgeInsets())
                }
            }
            Section("Barkod numarası") {
                TextField("8690000000000", text: $code).keyboardType(.numberPad)
            }
            if let error { Section { Text(error).foregroundStyle(.red) } }
            Section { Button(busy ? "Analiz ediliyor…" : "Analiz et", action: submit).disabled(busy || code.count < 8) }
        }
        .navigationTitle("Barkod tara")
    }

    private func submit() {
        Task {
            busy = true
            defer { busy = false }
            do { onResult(try await model.analyze(.barcode(code), mealLabel: defaultMealLabel())) } catch { self.error = error.localizedDescription }
        }
    }
}

/// VisionKit live barcode scanner. Only the decoded text leaves the scanner.
struct BarcodeScannerView: UIViewControllerRepresentable {
    let onCode: (String) -> Void

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let scanner = DataScannerViewController(
            recognizedDataTypes: [.barcode(symbologies: [.ean13, .ean8, .upce, .code128])],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isHighFrameRateTrackingEnabled: false,
            isHighlightingEnabled: true
        )
        scanner.delegate = context.coordinator
        try? scanner.startScanning()
        return scanner
    }

    func updateUIViewController(_ controller: DataScannerViewController, context: Context) {}

    static func dismantleUIViewController(_ controller: DataScannerViewController, coordinator: Coordinator) {
        controller.stopScanning()
    }

    func makeCoordinator() -> Coordinator { Coordinator(onCode: onCode) }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        let onCode: (String) -> Void
        private var reported = false
        init(onCode: @escaping (String) -> Void) { self.onCode = onCode }

        func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
            guard !reported else { return }
            for item in addedItems {
                if case .barcode(let barcode) = item, let value = barcode.payloadStringValue {
                    reported = true
                    dataScanner.stopScanning()
                    onCode(value)
                    return
                }
            }
        }
    }
}

private struct PrescriptionEntry: View {
    @Environment(AppModel.self) private var model
    @State private var picking = false
    @State private var busy = false
    @State private var error: String?
    let onResult: (AnalyzeResponse) -> Void

    var body: some View {
        Form {
            Section {
                Button(busy ? "Analiz ediliyor…" : "PDF seç ve analiz et") { picking = true }.disabled(busy)
            } footer: {
                Text("PDF, en fazla 5 MB. Dosya yalnızca sizin erişebildiğiniz özel bir alana yüklenir. Taranmış (fotoğraf) reçeteler henüz okunamıyor.")
            }
            if let error { Section { Text(error).foregroundStyle(.red) } }
        }
        .navigationTitle("Reçete yükle")
        .fileImporter(isPresented: $picking, allowedContentTypes: [.pdf]) { result in
            guard case .success(let url) = result else { return }
            Task {
                busy = true
                defer { busy = false }
                do {
                    let access = url.startAccessingSecurityScopedResource()
                    defer { if access { url.stopAccessingSecurityScopedResource() } }
                    let path = try await model.uploadPrescription(try Data(contentsOf: url))
                    onResult(try await model.analyze(.prescription(storagePath: path), mealLabel: nil))
                } catch {
                    self.error = error.localizedDescription
                }
            }
        }
    }
}

/// Result of an analysis: inset grouped list per chain step; alert only for a critical interaction.
struct AnalysisView: View {
    let result: AnalyzeResponse
    @State private var showAlert: Bool

    init(result: AnalyzeResponse) {
        self.result = result
        _showAlert = State(initialValue: result.requiresAlert)
    }

    var body: some View {
        List {
            ForEach(AnalysisStep.allCases, id: \.self) { step in
                let findings = result.findings.filter { $0.step == step }
                if !findings.isEmpty {
                    Section(step.title) {
                        ForEach(findings) { FindingRow(finding: $0) }
                    }
                }
            }
            Section { DisclaimerText() }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Öğün analizi")
        .alert("Kritik etkileşim", isPresented: $showAlert) {
            Button("Ayrıntıları gör") {}
            Button("Vazgeç", role: .cancel) {}
        } message: {
            Text(criticalMessage)
        }
    }

    private var criticalMessage: String {
        let critical = result.findings.first { $0.severity == "contraindicated" } ?? result.findings.first { $0.status == .high }
        return "\(critical?.title ?? "Yüksek riskli etkileşim"). Bu kombinasyonu kullanmadan önce doktorunuza veya eczacınıza danışın."
    }
}

struct FindingRow: View {
    let finding: Finding

    var color: Color {
        switch finding.status {
        case .pass: .green
        case .caution: .orange
        case .high: .red
        case .error: Color(.secondaryLabel)
        }
    }

    var body: some View {
        Label {
            VStack(alignment: .leading, spacing: 2) {
                Text(finding.status.label).font(.footnote.weight(.semibold)).foregroundStyle(color)
                Text(finding.title).font(.body)
                if let detail = finding.detail { Text(detail).font(.subheadline).foregroundStyle(.secondary) }
            }
        } icon: {
            Image(systemName: finding.status.symbol).foregroundStyle(color)
        }
        .accessibilityElement(children: .combine)
    }
}
