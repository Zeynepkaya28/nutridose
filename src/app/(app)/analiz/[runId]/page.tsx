import { notFound } from "next/navigation";
import type { AnalysisStep, FindingStatus } from "@/domain/types";
import { formatDayHeading, formatTime } from "@/lib/time";
import { getRun, getViewer } from "@/server/queries";
import { Icon } from "@/ui/Icon";
import { ListSection } from "@/ui/List";
import { BackBar, Disclaimer } from "@/ui/Nav";
import { FindingItem, STATUS, StatusBadge } from "@/ui/Status";
import { CriticalAlert } from "./CriticalAlert";

export const metadata = { title: "Öğün analizi" };

const STEPS: Array<{ step: AnalysisStep; title: string }> = [
  { step: "ingredient_scan", title: "1 · Etken madde taraması" },
  { step: "drug_food", title: "2 · İlaç–besin etkileşimi" },
  { step: "dose_limit", title: "3 · Doz sınırı" },
  { step: "tolerance_allergy", title: "4 · Tolerans ve alerji" },
];

const RANK: Record<FindingStatus, number> = { pass: 0, error: 1, caution: 2, high: 3 };
const SUMMARY: Record<FindingStatus, string> = {
  pass: "Bilinen bir sorun bulunmadı.",
  error: "Bazı kontroller tamamlanamadı.",
  caution: "Dikkat edilmesi gereken etkileşimler var.",
  high: "Yüksek riskli etkileşim bulundu.",
};
const TITLE = { barcode: "Barkod analizi", manual: "Öğün analizi", prescription_pdf: "Reçete analizi" } as const;

/** "(Kardiyoloji profilinize göre önemli)" at the end of the strategy's message. */
function profileNote(message: string | null): string | null {
  return message?.match(/\(([^()]*profilinize göre önemli)\)$/)?.[1] ?? null;
}

export default async function AnalysisPage({
  params,
  searchParams,
}: {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ uyari?: string }>;
}) {
  const [{ runId }, { uyari }] = await Promise.all([params, searchParams]);
  const viewer = (await getViewer())!;
  const run = /^[0-9a-f-]{36}$/.test(runId) ? await getRun(viewer, runId) : null;
  if (!run) notFound();

  const overall = run.findings.reduce<FindingStatus>((worst, f) => (RANK[f.status] > RANK[worst] ? f.status : worst), "pass");
  const critical = run.findings.find((f) => f.severity === "contraindicated") ?? run.findings.find((f) => f.status === "high");
  const title = run.meal?.label ?? TITLE[run.inputKind];

  return (
    <>
      <BackBar href="/ogunler" label="Öğünler" />
      <h1 className="page-title">{title}</h1>
      <p className="t-subhead t-secondary" style={{ margin: "-8px 0 16px" }}>
        {formatDayHeading(run.createdAt)} · {formatTime(run.createdAt)}
        {run.meal?.items.length ? ` · ${run.meal.items.join(", ")}` : ""}
      </p>

      <div className={`card${run.requiresAlert ? " card--critical" : ""}`} id="summary">
        <div className="card__row">
          <div className="card__body">
            <StatusBadge status={overall} />
            <p className="card__text">{run.requiresAlert ? "Kritik etkileşim: bu kombinasyondan kaçının ve doktorunuza danışın." : SUMMARY[overall]}</p>
          </div>
        </div>
      </div>

      {STEPS.map(({ step, title: stepTitle }) => {
        const findings = run.findings.filter((f) => f.step === step);
        if (findings.length === 0) return null;
        return (
          <ListSection key={step} id={`step-${step}`} header={stepTitle}>
            {findings.map((f) => {
              const note = profileNote(f.message);
              const detail = [f.detail, note].filter(Boolean).join(" · ");
              return <FindingItem key={f.id} status={f.status} title={f.title} detail={detail || null} />;
            })}
          </ListSection>
        );
      })}

      {run.strategyCodes.length === 0 ? (
        <p className="list-section__footer" style={{ marginBottom: 16 }}>
          <Icon name="info.circle" /> Tedavi profili seçmediniz; genel kurallar uygulandı. Profil sekmesinden seçebilirsiniz.
        </p>
      ) : null}

      <Disclaimer />

      {run.requiresAlert && uyari === "1" && critical ? (
        <CriticalAlert
          title="Kritik etkileşim"
          message={`${critical.title}. ${STATUS.high.label}: bu kombinasyonu kullanmadan önce doktorunuza veya eczacınıza danışın.`}
        />
      ) : null}
    </>
  );
}
