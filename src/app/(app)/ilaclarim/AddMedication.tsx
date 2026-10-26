"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/ui/Icon";
import { ListRow, ListSection } from "@/ui/List";
import { Sheet } from "@/ui/Sheet";
import { addMedication, searchDrugs } from "../actions";

type Result = { id: string; name: string; substances: string[] };

export function AddMedicationRow() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ListRow icon="plus" iconColor="var(--system-blue)" title="İlaç ekle" tone="tint" onClick={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title="İlaç ekle" initialDetent="large">
        <AddMedicationForm onDone={() => setOpen(false)} />
      </Sheet>
    </>
  );
}

function AddMedicationForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState<Result | null>(null);
  const [dose, setDose] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const result = await searchDrugs(query);
      if (result.ok) setResults(result.data);
      else setError(result.error);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  if (selected) {
    return (
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          const result = await addMedication({ productId: selected.id, dose });
          setBusy(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          onDone();
          router.refresh();
        }}
      >
        <ListSection header="Seçilen ilaç">
          <ListRow icon="pills.fill" iconColor="var(--system-mint)" title={selected.name} subtitle={selected.substances.join(", ")} />
        </ListSection>
        <section className="list-section">
          <label htmlFor="dose" className="list-section__header" style={{ display: "block" }}>
            Doz (isteğe bağlı)
          </label>
          <div className="list">
            <input id="dose" className="field" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="ör. 1×1, sabah" maxLength={100} />
          </div>
        </section>
        {error ? <p className="error-text" role="alert">{error}</p> : null}
        <div className="stack">
          <button type="button" className="btn btn--tinted" onClick={() => setSelected(null)}>
            Geri
          </button>
          <button type="submit" className="btn btn--filled" disabled={busy}>
            Ekle
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="search-field">
        <Icon name="magnifyingglass" />
        <label htmlFor="drug-search" className="visually-hidden">
          İlaç ara
        </label>
        <input
          id="drug-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="İlaç veya etken madde ara"
          autoComplete="off"
          autoFocus
        />
      </div>
      {error ? <p className="error-text" role="alert">{error}</p> : null}
      {results.length > 0 ? (
        <ListSection header="Sonuçlar">
          {results.map((r) => (
            <ListRow key={r.id} title={r.name} subtitle={r.substances.join(", ")} accessory="chevron" onClick={() => setSelected(r)} />
          ))}
        </ListSection>
      ) : (
        <p className="empty" role="status">
          {query.trim().length < 2 ? "Aramak için en az 2 harf yazın." : "Sonuç bulunamadı."}
        </p>
      )}
    </>
  );
}
