"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/ui/Alert";
import { ListRow, ListSection } from "@/ui/List";
import { removeMedication, updateMedication } from "../../actions";

export function MedicationEditor({ id, dose: initialDose, active: initialActive }: { id: string; dose: string; active: boolean }) {
  const router = useRouter();
  const [dose, setDose] = useState(initialDose);
  const [active, setActive] = useState(initialActive);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const save = async (changes: { dose?: string; active?: boolean }) => {
    setError(null);
    const result = await updateMedication({ id, ...changes });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setStatus("Kaydedildi");
    router.refresh();
    return true;
  };

  return (
    <>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await save({ dose });
        }}
      >
        <section className="list-section">
          <label htmlFor="dose" className="list-section__header" style={{ display: "block" }}>
            Doz
          </label>
          <div className="list">
            <input
              id="dose"
              className="field"
              value={dose}
              onChange={(e) => {
                setDose(e.target.value);
                setStatus(null);
              }}
              placeholder="ör. 1×1, sabah"
              maxLength={100}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 8 }}>
            <span className="t-footnote t-secondary" role="status">
              {status}
            </span>
            <button type="submit" className="btn btn--tinted" disabled={dose === initialDose}>
              Dozu kaydet
            </button>
          </div>
        </section>
      </form>

      <section className="list-section" aria-labelledby="state-header">
        <h2 className="list-section__header" id="state-header">
          Durum
        </h2>
        <div className="list">
          <label className="list-row" htmlFor="active">
            <span className="list-row__content">
              <span className="list-row__text">
                <span className="list-row__title">Aktif olarak kullanıyorum</span>
              </span>
            </span>
            <input
              id="active"
              type="checkbox"
              role="switch"
              className="switch"
              checked={active}
              onChange={async (e) => {
                const next = e.target.checked;
                setActive(next);
                if (!(await save({ active: next }))) setActive(!next);
              }}
            />
          </label>
        </div>
        <p className="list-section__footer">Pasif ilaçlar analizlerde dikkate alınmaz.</p>
      </section>

      {error ? <p className="error-text" role="alert">{error}</p> : null}

      <ListSection>
        <ListRow title="İlacı kaldır" tone="destructive" onClick={() => setConfirming(true)} />
      </ListSection>

      <Alert
        open={confirming}
        title="İlaç kaldırılsın mı?"
        message="Bu ilaç listenizden silinir. Geçmiş analizler etkilenmez."
        actions={[
          {
            label: "Kaldır",
            role: "destructive",
            onSelect: async () => {
              setConfirming(false);
              const result = await removeMedication(id);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.push("/ilaclarim");
              router.refresh();
            },
          },
          { label: "Vazgeç", role: "cancel", onSelect: () => setConfirming(false) },
        ]}
      />
    </>
  );
}
