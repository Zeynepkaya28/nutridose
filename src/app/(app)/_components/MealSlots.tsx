"use client";

import { useState, useTransition } from "react";
import { formatTime, type MealLabel } from "@/lib/time";
import type { MealSummary } from "@/server/queries";
import { ListRow, ListSection } from "@/ui/List";
import { skipMeal, undoSkipMeal } from "../actions";
import { useAddSheet } from "./AddSheet";

const MAIN_MEALS: MealLabel[] = ["Kahvaltı", "Öğle yemeği", "Akşam yemeği"];

/**
 * Today's meals as slots. Any slot can be filled in any order, or marked as skipped
 * ("Kahvaltı yapmadım"), so lunch can be added without entering breakfast first.
 */
export function MealSlots({ meals }: { meals: MealSummary[] }) {
  const { open } = useAddSheet();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) setError(result.error ?? "İşlem yapılamadı.");
    });

  const snacks = meals.filter((m) => !MAIN_MEALS.includes(m.label as MealLabel));

  return (
    <>
      <ListSection
        id="today-meals"
        header="Bugünkü öğünler"
        footer="Öğünleri istediğiniz sırayla ekleyin. Yemediğiniz bir öğünü “Atladım” ile işaretleyebilirsiniz."
      >
        {MAIN_MEALS.flatMap((label) => {
          const forLabel = meals.filter((m) => m.label === label);
          const eaten = forLabel.filter((m) => !m.skipped);
          const skipped = forLabel.find((m) => m.skipped);

          if (eaten.length > 0) {
            return eaten.map((meal) => <MealRow key={meal.id} meal={meal} />);
          }
          if (skipped) {
            return [
              <ListRow
                key={skipped.id}
                icon="minus.circle"
                iconColor="var(--system-gray)"
                title={label}
                subtitle="Atlandı"
                trailing={
                  <button
                    type="button"
                    className="btn btn--plain"
                    disabled={pending}
                    onClick={() => run(() => undoSkipMeal(skipped.id))}
                    aria-label={`${label} atlandı işaretini geri al`}
                  >
                    Geri al
                  </button>
                }
              />,
            ];
          }
          return [
            <ListRow
              key={label}
              icon="fork.knife"
              iconColor="var(--system-orange)"
              title={label}
              subtitle="Eklenmedi"
              trailing={
                <span style={{ display: "flex", gap: 4, flex: "none" }}>
                  <button
                    type="button"
                    className="btn btn--plain"
                    disabled={pending}
                    onClick={() => run(() => skipMeal(label))}
                    aria-label={`${label} öğününü atladım`}
                  >
                    Atladım
                  </button>
                  <button type="button" className="btn btn--tinted" onClick={() => open("menu", label)} aria-label={`${label} ekle`}>
                    Ekle
                  </button>
                </span>
              }
            />,
          ];
        })}
        {snacks.map((meal) => (
          <MealRow key={meal.id} meal={meal} />
        ))}
        <ListRow
          icon="plus.circle.fill"
          iconColor="var(--system-mint)"
          title="Ara öğün ekle"
          tone="tint"
          accessory="chevron"
          onClick={() => open("menu", "Ara öğün")}
        />
      </ListSection>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

function MealRow({ meal }: { meal: MealSummary }) {
  return (
    <ListRow
      icon={meal.latestRun?.requiresAlert ? "xmark.octagon.fill" : "fork.knife"}
      iconColor={meal.latestRun?.requiresAlert ? "var(--system-red)" : "var(--system-orange)"}
      title={meal.label ?? "Öğün"}
      subtitle={meal.items.join(", ") || "Kalem yok"}
      detail={formatTime(meal.eatenAt)}
      accessory={meal.latestRun ? "chevron" : "none"}
      href={meal.latestRun ? `/analiz/${meal.latestRun.id}` : undefined}
    />
  );
}
