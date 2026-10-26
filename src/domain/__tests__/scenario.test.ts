// Faz 2 reference scenario: cardiology profile, meal = spinach + grapefruit juice,
// medications = warfarin + atorvastatin.
import { describe, expect, it } from "vitest";
import { SafetyPipeline } from "../chain";
import { ManualTextCreator } from "../factory";
import { StrategyResolver } from "../strategy";
import { InMemoryCatalog, I, medication, P, profile } from "./fixtures";

describe("scenario: cardiology, ıspanak + greyfurt suyu, varfarin + atorvastatin", () => {
  async function analyse(conditions: string[]) {
    const catalog = new InMemoryCatalog();
    const input = await new ManualTextCreator(catalog).toInput("ıspanak, greyfurt suyu");
    const user = profile({
      conditions: conditions as never,
      medications: [medication(P.warfarin), medication(P.atorvastatin)],
    });
    const strategy = StrategyResolver.fromConditions(user.conditions);
    return SafetyPipeline.build(strategy, { catalog }).run(input, user);
  }

  it("step 2: greyfurt ↔ atorvastatin high, ıspanak ↔ varfarin caution, requiresAlert", async () => {
    const result = await analyse(["cardiology"]);
    const step2 = result.findings.filter((f) => f.step === "drug_food");

    expect(step2.map((f) => [f.title, f.status])).toEqual([
      ["greyfurt suyu ↔ Atorvastatin 20 mg tablet", "high"],
      ["ıspanak ↔ Varfarin 5 mg tablet", "caution"],
    ]);
    expect(step2[0].interactionId).toBe(I.grapefruitStatinCardio.id);
    expect(step2[1].interactionId).toBe(I.vitaminKWarfarin.id);
    expect(result.requiresAlert).toBe(true);
    expect(result.strategyCodes).toEqual(["cardiology"]);
    expect(step2[1].message).toBe("Dikkat: ıspanak ↔ Varfarin 5 mg tablet (Kardiyoloji profilinize göre önemli)");

    // Warfarin ↔ atorvastatin (medication ↔ medication) is not reported by this meal.
    expect(step2.some((f) => f.interactionId === I.warfarinStatin.id)).toBe(false);
  });

  it("without the cardiology profile the same meal is high but not an alert", async () => {
    const result = await analyse([]);
    const step2 = result.findings.filter((f) => f.step === "drug_food");
    expect(step2.map((f) => f.status)).toEqual(["high", "caution"]);
    expect(result.requiresAlert).toBe(false);
  });
});
