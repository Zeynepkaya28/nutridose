import { notFound } from "next/navigation";
import { getMedication, getViewer } from "@/server/queries";
import { ListRow, ListSection } from "@/ui/List";
import { BackBar } from "@/ui/Nav";
import { MedicationEditor } from "./MedicationEditor";

export const metadata = { title: "İlaç" };

export default async function MedicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = (await getViewer())!;
  const med = /^[0-9a-f-]{36}$/.test(id) ? await getMedication(viewer, id) : null;
  if (!med) notFound();

  return (
    <>
      <BackBar href="/ilaclarim" label="İlaçlarım" />
      <h1 className="page-title">{med.name}</h1>

      <MedicationEditor id={med.id} dose={med.dose ?? ""} active={med.active} />

      <ListSection id="substances" header="Etken maddeler">
        {med.substances.length === 0 ? <ListRow title="Kayıtlı etken madde yok" /> : med.substances.map((s) => <ListRow key={s} title={s} />)}
      </ListSection>
    </>
  );
}
