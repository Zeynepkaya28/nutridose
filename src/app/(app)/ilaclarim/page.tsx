import { getMedications, getViewer, type MedicationSummary } from "@/server/queries";
import { ListRow, ListSection } from "@/ui/List";
import { Disclaimer, LargeTitle } from "@/ui/Nav";
import { AddMedicationRow } from "./AddMedication";

export const metadata = { title: "İlaçlarım" };

function MedicationRow({ med }: { med: MedicationSummary }) {
  return (
    <ListRow
      icon="pills.fill"
      iconColor={med.active ? "var(--system-mint)" : "var(--system-gray)"}
      title={med.name}
      subtitle={med.substances.join(", ") || undefined}
      detail={med.dose ?? undefined}
      accessory="chevron"
      href={`/ilaclarim/${med.id}`}
    />
  );
}

export default async function MedicationsPage() {
  const viewer = (await getViewer())!;
  const medications = await getMedications(viewer);
  const active = medications.filter((m) => m.active);
  const inactive = medications.filter((m) => !m.active);

  return (
    <>
      <LargeTitle title="İlaçlarım" subtitle={`${active.length} aktif ilaç`} />

      <ListSection
        id="active-meds"
        header="Kullandıklarım"
        footer="Analizler yalnızca aktif ilaçlarla yapılır. Bir ilacı geçici olarak bıraktıysanız pasif yapın."
      >
        {active.map((med) => (
          <MedicationRow key={med.id} med={med} />
        ))}
        <AddMedicationRow />
      </ListSection>

      {inactive.length > 0 ? (
        <ListSection id="inactive-meds" header="Pasif">
          {inactive.map((med) => (
            <MedicationRow key={med.id} med={med} />
          ))}
        </ListSection>
      ) : null}

      <Disclaimer />
    </>
  );
}
