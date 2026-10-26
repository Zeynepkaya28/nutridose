import { dayKey, formatDayHeading, formatTime } from "@/lib/time";
import { getRecentMeals, getStandaloneRuns, getViewer, type MealSummary } from "@/server/queries";
import { ListRow, ListSection } from "@/ui/List";
import { Disclaimer, LargeTitle } from "@/ui/Nav";
import { AddButton } from "../_components/AddSheet";

export const metadata = { title: "Öğünler" };

const RUN_LABEL = { barcode: "Barkod analizi", manual: "Elle giriş analizi", prescription_pdf: "Reçete analizi" } as const;

export default async function MealsPage() {
  const viewer = (await getViewer())!;
  const [meals, runs] = await Promise.all([getRecentMeals(viewer), getStandaloneRuns(viewer)]);

  const days = new Map<string, MealSummary[]>();
  for (const meal of meals) {
    const key = dayKey(meal.eatenAt);
    days.set(key, [...(days.get(key) ?? []), meal]);
  }

  return (
    <>
      <LargeTitle title="Öğünler" subtitle="Son 30 gün" trailing={<AddButton />} />

      {meals.length === 0 ? (
        <ListSection header="Öğünler" footer="Eklediğiniz öğünler ve analiz sonuçları burada listelenir.">
          <ListRow title="Henüz öğün yok" icon="fork.knife" iconColor="var(--system-orange)" />
        </ListSection>
      ) : (
        [...days.entries()].map(([key, dayMeals]) => (
          <ListSection key={key} id={`day-${key}`} header={formatDayHeading(dayMeals[0].eatenAt)}>
            {dayMeals.map((meal) => (
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
            ))}
          </ListSection>
        ))
      )}

      {runs.length > 0 ? (
        <ListSection id="runs" header="Diğer analizler">
          {runs.map((run) => (
            <ListRow
              key={run.id}
              icon={run.requiresAlert ? "xmark.octagon.fill" : "doc.text.viewfinder"}
              iconColor={run.requiresAlert ? "var(--system-red)" : "var(--system-teal)"}
              title={RUN_LABEL[run.inputKind]}
              detail={`${formatDayHeading(run.createdAt)} ${formatTime(run.createdAt)}`}
              accessory="chevron"
              href={`/analiz/${run.id}`}
            />
          ))}
        </ListSection>
      ) : null}

      <Disclaimer />
    </>
  );
}
