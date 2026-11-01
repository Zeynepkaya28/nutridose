import Link from "next/link";
import { formatLongDate, formatTime } from "@/lib/time";
import { getMedications, getTodayMeals, getViewer } from "@/server/queries";
import { Icon } from "@/ui/Icon";
import { ListRow, ListSection } from "@/ui/List";
import { Disclaimer, LargeTitle } from "@/ui/Nav";
import { AddButton } from "./_components/AddSheet";
import { MealSlots } from "./_components/MealSlots";

export const metadata = { title: "Bugün" };

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ sifre?: string }> }) {
  const { sifre } = await searchParams;
  const viewer = (await getViewer())!;
  const [meals, medications] = await Promise.all([getTodayMeals(viewer), getMedications(viewer)]);
  const active = medications.filter((m) => m.active);
  const critical = meals.find((m) => m.latestRun?.requiresAlert);

  return (
    <>
      <LargeTitle title="Bugün" subtitle={formatLongDate()} trailing={<AddButton />} />

      {sifre === "yenilendi" ? (
        <p className="card t-subhead" role="status">
          Şifreniz yenilendi. Diğer cihazlardaki oturumlar kapatıldı.
        </p>
      ) : null}

      {critical?.latestRun ? (
        <Link href={`/analiz/${critical.latestRun.id}`} className="card card--critical" style={{ display: "block" }}>
          <div className="card__row">
            <Icon name="xmark.octagon.fill" className="card__icon" label="Kritik" />
            <div className="card__body">
              <p className="card__title">Kritik etkileşim</p>
              <p className="card__text">
                {critical.label ?? "Öğün"} · {formatTime(critical.eatenAt)} için yüksek riskli bir etkileşim bulundu. Ayrıntıları görün.
              </p>
            </div>
            <span className="list-row__accessory">
              <Icon name="chevron.right" />
            </span>
          </div>
        </Link>
      ) : null}

      <MealSlots meals={meals} />

      <ListSection id="today-meds" header="İlaçlarım">
        {active.length === 0 ? (
          <ListRow title="İlaç ekleyin" icon="pills.fill" iconColor="var(--system-mint)" accessory="chevron" href="/ilaclarim" tone="tint" />
        ) : (
          active.map((med) => (
            <ListRow
              key={med.id}
              icon="pills.fill"
              iconColor="var(--system-mint)"
              title={med.name}
              detail={med.dose ?? undefined}
              accessory="chevron"
              href={`/ilaclarim/${med.id}`}
            />
          ))
        )}
      </ListSection>

      <AddButton variant="block" />
      <Disclaimer />
    </>
  );
}
