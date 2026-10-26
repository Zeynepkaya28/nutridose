"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { CONDITION_CODES, type ConditionCode } from "@/domain/types";
import { Icon } from "@/ui/Icon";
import { ListRow, ListSection } from "@/ui/List";
import { Sheet } from "@/ui/Sheet";
import { addAllergy, removeAllergy, setCondition } from "../actions";

/** Treatment strategies: multi-select with checkmarks. */
export function ConditionList({ selected, names }: { selected: ConditionCode[]; names: Record<ConditionCode, string> }) {
  const [optimistic, toggle] = useOptimistic(selected, (current: ConditionCode[], code: ConditionCode) =>
    current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <ListSection
        id="conditions"
        header="Tedavi stratejileri"
        footer="Analizler seçtiğiniz profillere göre değerlendirilir. Birden çok seçerseniz en yüksek risk ve en sıkı sınır uygulanır."
      >
        {CONDITION_CODES.map((code) => {
          const on = optimistic.includes(code);
          return (
            <ListRow
              key={code}
              title={names[code]}
              accessory="check"
              checked={on}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  toggle(code);
                  const result = await setCondition(code, !on);
                  if (!result.ok) setError(result.error);
                })
              }
            />
          );
        })}
      </ListSection>
      {error ? <p className="error-text" role="alert">{error}</p> : null}
    </>
  );
}

type Allergy = { id: string; name: string; kind: "allergy" | "intolerance" };
const KIND_LABEL = { allergy: "Alerji", intolerance: "İntolerans" } as const;

export function AllergyList({ allergies, catalog }: { allergies: Allergy[]; catalog: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <section className="list-section" aria-labelledby="allergies-header">
        <h2 className="list-section__header" id="allergies-header">
          Alerji ve intoleranslar
        </h2>
        <ul className="list">
          {allergies.map((a) => (
            <ListRow
              key={a.id}
              icon="leaf"
              iconColor={a.kind === "allergy" ? "var(--system-red)" : "var(--system-orange)"}
              title={a.name}
              detail={KIND_LABEL[a.kind]}
              trailing={
                <button
                  type="button"
                  className="btn btn--plain btn--icon"
                  aria-label={`${a.name} kaydını kaldır`}
                  onClick={async () => {
                    const result = await removeAllergy(a.id);
                    if (!result.ok) setError(result.error);
                    else router.refresh();
                  }}
                >
                  <Icon name="trash" />
                </button>
              }
            />
          ))}
          <ListRow icon="plus" iconColor="var(--system-blue)" title="Alerji veya intolerans ekle" tone="tint" onClick={() => setOpen(true)} />
        </ul>
        <p className="list-section__footer">Alerjiler yüksek risk, intoleranslar dikkat olarak işaretlenir.</p>
      </section>
      {error ? <p className="error-text" role="alert">{error}</p> : null}

      <Sheet open={open} onClose={() => setOpen(false)} title="Alerji ekle" initialDetent="large">
        <AllergyForm
          catalog={catalog}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Sheet>
    </>
  );
}

function AllergyForm({ catalog, onDone }: { catalog: Array<{ id: string; name: string }>; onDone: () => void }) {
  const [allergenId, setAllergenId] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [kind, setKind] = useState<"allergy" | "intolerance">("allergy");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        const result = await addAllergy({ allergenId, freeText: allergenId ? null : freeText, kind });
        setBusy(false);
        if (!result.ok) setError(result.error);
        else onDone();
      }}
    >
      <fieldset className="list-section" style={{ border: 0, padding: 0 }}>
        <legend className="list-section__header">Tür</legend>
        <div className="segmented">
          {(["allergy", "intolerance"] as const).map((k) => (
            <label key={k}>
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
              <span>{KIND_LABEL[k]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {catalog.length > 0 ? (
        <ListSection header="Listeden seçin">
          {catalog.map((a) => (
            <ListRow
              key={a.id}
              title={a.name}
              accessory="check"
              checked={allergenId === a.id}
              onClick={() => setAllergenId(allergenId === a.id ? null : a.id)}
            />
          ))}
        </ListSection>
      ) : null}

      <section className="list-section">
        <label htmlFor="allergy-text" className="list-section__header" style={{ display: "block" }}>
          Veya adını yazın
        </label>
        <div className="list">
          <input
            id="allergy-text"
            className="field"
            value={freeText}
            onChange={(e) => {
              setFreeText(e.target.value);
              if (e.target.value) setAllergenId(null);
            }}
            placeholder="ör. fıstık"
            maxLength={100}
          />
        </div>
      </section>

      {error ? <p className="error-text" role="alert">{error}</p> : null}
      <button type="submit" className="btn btn--filled btn--block" disabled={busy || (!allergenId && !freeText.trim())}>
        Kaydet
      </button>
    </form>
  );
}
