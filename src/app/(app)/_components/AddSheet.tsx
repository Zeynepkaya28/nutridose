"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { startBarcodeScan, type ScanControls } from "@/lib/barcode/scanner";
import { uploadPrescription, validatePrescriptionFile, PrescriptionUploadError } from "@/lib/prescriptions/upload";
import { createClient } from "@/lib/supabase/client";
import { defaultMealLabel, MEAL_LABELS, type MealLabel } from "@/lib/time";
import { Icon } from "@/ui/Icon";
import { ListRow, ListSection } from "@/ui/List";
import { Sheet } from "@/ui/Sheet";
import { submitAnalysis } from "../actions";

type Mode = "menu" | "barcode" | "manual" | "prescription";

const AddSheetContext = createContext<{ open: (mode?: Mode) => void } | null>(null);

export function useAddSheet() {
  const context = useContext(AddSheetContext);
  if (!context) throw new Error("useAddSheet must be used inside AddSheetProvider");
  return context;
}

export function AddSheetProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const open = useCallback((next: Mode = "menu") => setMode(next), []);
  const close = useCallback(() => setMode(null), []);

  const titles: Record<Mode, string> = {
    menu: "Ekle",
    barcode: "Barkod tara",
    manual: "Elle yaz",
    prescription: "Reçete yükle",
  };

  return (
    <AddSheetContext.Provider value={{ open }}>
      {children}
      <Sheet
        open={mode !== null}
        onClose={close}
        title={titles[mode ?? "menu"]}
        initialDetent={mode === "barcode" ? "large" : "medium"}
      >
        {mode === "menu" ? <AddMenu onPick={setMode} /> : null}
        {mode === "manual" ? <ManualForm onDone={close} /> : null}
        {mode === "barcode" ? <BarcodeForm onDone={close} /> : null}
        {mode === "prescription" ? <PrescriptionForm userId={userId} onDone={close} /> : null}
      </Sheet>
    </AddSheetContext.Provider>
  );
}

export function AddButton({ variant = "icon" }: { variant?: "icon" | "block" }) {
  const { open } = useAddSheet();
  if (variant === "block") {
    return (
      <button type="button" className="btn btn--filled btn--block" onClick={() => open()}>
        <Icon name="plus.circle.fill" />
        Öğün veya ürün ekle
      </button>
    );
  }
  return (
    <button type="button" className="btn btn--tinted btn--icon" aria-label="Ekle" onClick={() => open()}>
      <Icon name="plus" />
    </button>
  );
}

function AddMenu({ onPick }: { onPick: (mode: Mode) => void }) {
  return (
    <ListSection footer="Barkod ve elle girişler bugünkü öğünlerinize eklenir. Reçeteler ayrı analiz edilir.">
      <ListRow
        icon="barcode.viewfinder"
        iconColor="var(--system-blue)"
        title="Barkod tara"
        subtitle="Paketli gıda veya takviye"
        accessory="chevron"
        onClick={() => onPick("barcode")}
      />
      <ListRow
        icon="keyboard"
        iconColor="var(--system-indigo)"
        title="Elle yaz"
        subtitle="Örneğin: ıspanak, greyfurt suyu"
        accessory="chevron"
        onClick={() => onPick("manual")}
      />
      <ListRow
        icon="doc.text.viewfinder"
        iconColor="var(--system-teal)"
        title="Reçete yükle"
        subtitle="PDF, en fazla 5 MB"
        accessory="chevron"
        onClick={() => onPick("prescription")}
      />
    </ListSection>
  );
}

/** Shared submit flow: runs the analysis and opens the result. */
function useSubmit(onDone: () => void) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (input: Parameters<typeof submitAnalysis>[0]) => {
    setBusy(true);
    setError(null);
    const result = await submitAnalysis(input);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
    router.push(`/analiz/${result.data.runId}${result.data.requiresAlert ? "?uyari=1" : ""}`);
  };
  return { busy, error, setError, submit };
}

function MealLabelPicker({ value, onChange }: { value: MealLabel; onChange: (label: MealLabel) => void }) {
  return (
    <fieldset className="list-section" style={{ border: 0, padding: 0, margin: "0 0 24px" }}>
      <legend className="list-section__header">Öğün</legend>
      <div className="segmented">
        {MEAL_LABELS.map((label) => (
          <label key={label}>
            <input type="radio" name="meal-label" value={label} checked={value === label} onChange={() => onChange(label)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SubmitButton({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button type="submit" className="btn btn--filled btn--block" disabled={busy} aria-busy={busy}>
      {busy ? <span className="spinner" aria-hidden="true" /> : null}
      {busy ? "Analiz ediliyor…" : label}
    </button>
  );
}

function ManualForm({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [label, setLabel] = useState<MealLabel>(defaultMealLabel());
  const { busy, error, submit } = useSubmit(onDone);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit({ request: { inputKind: "manual", payload: { text } }, mealLabel: label });
      }}
    >
      <MealLabelPicker value={label} onChange={setLabel} />
      <section className="list-section">
        <label htmlFor="manual-text" className="list-section__header" style={{ display: "block" }}>
          Ne yediniz veya içtiniz?
        </label>
        <div className="list">
          <textarea
            id="manual-text"
            className="field"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ıspanak, greyfurt suyu"
            maxLength={2000}
            required
          />
        </div>
        <p className="list-section__footer">Virgülle ayırın. Her kalem ayrı kontrol edilir.</p>
      </section>
      {error ? <p className="error-text" role="alert">{error}</p> : null}
      <SubmitButton busy={busy} label="Analiz et" />
    </form>
  );
}

function BarcodeForm({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState<MealLabel>(defaultMealLabel());
  const [camera, setCamera] = useState<"starting" | "on" | "unavailable">("starting");
  const { busy, error, submit } = useSubmit(onDone);
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const labelRef = useRef(label);
  labelRef.current = label;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let controls: ScanControls | null = null;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera API");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCamera("on");
        controls = await startBarcodeScan(videoRef.current, (value) => {
          setCode(value);
          void submitRef.current({
            request: { inputKind: "barcode", payload: { barcode: value } },
            mealLabel: labelRef.current,
          });
        });
      } catch {
        if (!cancelled) setCamera("unavailable");
      }
    })();
    return () => {
      cancelled = true;
      controls?.stop();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit({ request: { inputKind: "barcode", payload: { barcode: code } }, mealLabel: label });
      }}
    >
      {camera !== "unavailable" ? (
        <div className="scanner" style={{ marginBottom: 16 }}>
          <video ref={videoRef} muted playsInline aria-label="Kamera görüntüsü" />
          <span className="scanner__frame" aria-hidden="true" />
        </div>
      ) : (
        <p className="list-section__footer" style={{ marginBottom: 16 }} role="status">
          Kameraya erişilemedi. Barkod numarasını aşağıya yazabilirsiniz.
        </p>
      )}
      <MealLabelPicker value={label} onChange={setLabel} />
      <section className="list-section">
        <label htmlFor="barcode" className="list-section__header" style={{ display: "block" }}>
          Barkod numarası
        </label>
        <div className="list">
          <input
            id="barcode"
            className="field"
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9\s\-]{8,20}"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="8690000000000"
            required
          />
        </div>
      </section>
      {error ? <p className="error-text" role="alert">{error}</p> : null}
      <SubmitButton busy={busy} label="Analiz et" />
    </form>
  );
}

function PrescriptionForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { busy, error, setError, submit } = useSubmit(onDone);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!file) return;
        const problem = validatePrescriptionFile(file);
        if (problem) {
          setError(problem);
          return;
        }
        setUploading(true);
        try {
          const storagePath = await uploadPrescription(createClient(), userId, file);
          await submit({ request: { inputKind: "prescription_pdf", payload: { storagePath } } });
        } catch (e) {
          setError(e instanceof PrescriptionUploadError ? e.message : "Reçete yüklenemedi. Lütfen tekrar deneyin.");
        } finally {
          setUploading(false);
        }
      }}
    >
      <section className="list-section">
        <label htmlFor="prescription" className="list-section__header" style={{ display: "block" }}>
          Reçete dosyası (PDF)
        </label>
        <div className="list" style={{ padding: "12px var(--gutter)" }}>
          <input
            id="prescription"
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              setError(null);
              setFile(e.target.files?.[0] ?? null);
            }}
            required
            style={{ width: "100%", minHeight: "var(--tap)" }}
          />
        </div>
        <p className="list-section__footer">
          Dosya yalnızca sizin erişebildiğiniz özel bir alana yüklenir. Taranmış (fotoğraf) reçeteler henüz okunamıyor.
        </p>
      </section>
      {error ? <p className="error-text" role="alert">{error}</p> : null}
      <SubmitButton busy={busy || uploading} label="Yükle ve analiz et" />
    </form>
  );
}
