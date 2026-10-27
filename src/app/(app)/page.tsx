import Link from "next/link";
import { formatLongDate, formatTime } from "@/lib/time";
import { getMedications, getTodayMeals, getViewer } from "@/server/queries";
import { Icon } from "@/ui/Icon";
import { ListRow, ListSection } from "@/ui/List";
import { Disclaimer, LargeTitle } from "@/ui/Nav";
import { AddButton } from "./_components/AddSheet";

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

      <ListSection
        id="today-meals"
        header="Bugünkü öğünler"
        footer={meals.length === 0 ? "Yediklerinizi ekleyin; ilaçlarınızla etkileşimleri hemen kontrol edilsin." : undefined}
      >
        {meals.length === 0 ? (
          <ListRow title="Henüz öğün eklemediniz" icon="fork.knife" iconColor="var(--system-orange)" />
        ) : (
          meals.map((meal) => (
            <ListRow
              key={meal.id}
              icon={meal.latestRun?.requiresAlert ? "xmark.octagon.fill" : "fork.knife"}
              iconColor={meal.latestRun?.requiresAlert ? "var(--system-red)" : "var(--system-orange)"}
              title={meal.label ?? "Öğün"}
              subtitle={meal.items.join(", ") || "Kalem yok"}
              detail={formatTime(meal.eatenAt)}
              accessory={meal.latestRun ? "chevron" : "none"}
              href={meal.latestRun ? `/analiz/${meal.latestRun.id}` : undefined}
            />
          ))
        )}
      </ListSection>

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
