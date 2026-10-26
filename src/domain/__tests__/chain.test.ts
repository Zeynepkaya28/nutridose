import { describe, expect, it, vi } from "vitest";
import {
  ActiveIngredientScanHandler,
  createContext,
  DoseLimitHandler,
  DrugFoodInteractionHandler,
  SafetyHandler,
  SafetyPipeline,
  ToleranceAllergyHandler,
  type AnalysisContext,
  type HandlerDeps,
  type StepOutcome,
} from "../chain";
import type { CatalogRepository } from "../repositories";
import { CardiologyStrategy, CompositeStrategy, GeneralStrategy, RenalStrategy, StrategyResolver } from "../strategy";
import type { AnalysisInput, AnalysisItem, InteractionStrategy, UserProfile } from "../index";
import {
  A,
  failingCatalog,
  I,
  InMemoryCatalog,
  interaction,
  item,
  limit,
  manualInput,
  medication,
  P,
  profile,
  S,
} from "./fixtures";

async function runStep(
  Handler: new (deps: HandlerDeps) => SafetyHandler,
  input: AnalysisInput,
  user: UserProfile = profile(),
  strategy: InteractionStrategy = new GeneralStrategy(),
  catalog: CatalogRepository = new InMemoryCatalog(),
) {
  return new Handler({ catalog }).handle(createContext(input, user, strategy));
}

describe("SafetyPipeline order and alert", () => {
  it("runs the four steps in order", async () => {
    const result = await SafetyPipeline.build(new GeneralStrategy(), { catalog: new InMemoryCatalog() }).run(
      manualInput(item(P.milk)),
      profile(),
    );
    const steps = [...new Set(result.findings.map((f) => f.step))];
    expect(steps).toEqual(["ingredient_scan", "drug_food", "dose_limit", "tolerance_allergy"]);
    expect(result.requiresAlert).toBe(false);
    expect(result.strategyCodes).toEqual([]);
    expect(result.findings.every((f) => typeof f.message === "string")).toBe(true);
  });

  it("contraindicated sets requiresAlert and the chain still finishes", async () => {
    const result = await SafetyPipeline.build(new CardiologyStrategy(), { catalog: new InMemoryCatalog() }).run(
      manualInput(item(P.grapefruit)),
      profile({ medications: [medication(P.atorvastatin)] }),
    );
    expect(result.requiresAlert).toBe(true);
    expect(result.findings.at(-1)?.step).toBe("tolerance_allergy");
  });

  it("a failing step reports an error and the next steps still run", async () => {
    const onError = vi.fn();
    const result = await SafetyPipeline.build(new GeneralStrategy(), { catalog: failingCatalog(), onError }).run(
      manualInput(item(P.milk)),
      profile({ allergies: [{ allergenId: A.milk.id, kind: "allergy" }] }),
    );
    expect(result.findings.map((f) => [f.step, f.status])).toEqual([
      ["ingredient_scan", "pass"],
      ["drug_food", "error"],
      ["dose_limit", "error"],
      ["tolerance_allergy", "error"],
    ]);
    expect(onError).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalledWith("drug_food", expect.any(Error));
  });

  it("handlers can be chained manually and pass the context along", async () => {
    class Recorder extends SafetyHandler {
      readonly step = "dose_limit" as const;
      protected async process(ctx: AnalysisContext): Promise<StepOutcome> {
        return { findings: [{ step: this.step, status: "pass", title: `seen ${ctx.findings.length}` }] };
      }
    }
    const deps = { catalog: new InMemoryCatalog() };
    const head = new Recorder(deps);
    const tail = new Recorder(deps);
    expect(head.setNext(tail)).toBe(tail);
    const ctx = await head.handle(createContext(manualInput(), profile(), new GeneralStrategy()));
    expect(ctx.findings.map((f) => f.title)).toEqual(["seen 0", "seen 1"]);
    expect(ctx.requiresAlert).toBe(false);
  });
});

describe("ActiveIngredientScanHandler", () => {
  it("reports an empty input as an error", async () => {
    const ctx = await runStep(ActiveIngredientScanHandler, manualInput());
    expect(ctx.findings).toEqual([expect.objectContaining({ status: "error", title: "Tanınan ürün yok" })]);
  });

  it("lists recognised substances and flags unknown items", async () => {
    const unknown: AnalysisItem = { rawText: "uçan halı", substances: [] };
    const ctx = await runStep(ActiveIngredientScanHandler, manualInput(item(P.milk), item(P.spinach), unknown));
    expect(ctx.findings).toEqual([
      expect.objectContaining({
        status: "pass",
        title: "2 kalem tanındı",
        detail: "Etken maddeler: Kalsiyum, Laktoz, K vitamini",
      }),
      expect.objectContaining({ status: "error", title: '"uçan halı" tanınamadı' }),
    ]);
  });

  it("lists a substance once even if several items contain it", async () => {
    const ctx = await runStep(ActiveIngredientScanHandler, manualInput(item(P.milk), item(P.milk, "süt")));
    expect(ctx.findings[0]).toMatchObject({ title: "2 kalem tanındı", detail: "Etken maddeler: Kalsiyum, Laktoz" });
  });

  it("reports only errors when nothing is recognised", async () => {
    const ctx = await runStep(ActiveIngredientScanHandler, manualInput({ rawText: "x", substances: [] }));
    expect(ctx.findings.map((f) => f.status)).toEqual(["error"]);
  });
});

describe("DrugFoodInteractionHandler", () => {
  it("passes when there is nothing to check", async () => {
    const ctx = await runStep(DrugFoodInteractionHandler, manualInput({ rawText: "x", substances: [] }));
    expect(ctx.findings).toEqual([expect.objectContaining({ status: "pass", title: "Etkileşim kontrolü için madde yok" })]);
  });

  it("passes when no interaction is known", async () => {
    const ctx = await runStep(DrugFoodInteractionHandler, manualInput(item(P.banana)));
    expect(ctx.findings).toEqual([expect.objectContaining({ status: "pass", title: "Bilinen etkileşim bulunmadı" })]);
  });

  it("checks input ↔ medications and input ↔ input, not medication ↔ medication", async () => {
    const ctx = await runStep(
      DrugFoodInteractionHandler,
      manualInput(item(P.milk), item(P.ironSupplement)),
      profile({ medications: [medication(P.warfarin), medication(P.atorvastatin)] }),
    );
    expect(ctx.findings.map((f) => f.interactionId)).toEqual([I.calciumIron.id]);
    expect(ctx.findings[0]).toMatchObject({ status: "pass", severity: "info", title: "Süt ↔ Demir takviyesi" });
  });

  it("puts the input side first and uses advice, then mechanism, as detail", async () => {
    const ctx = await runStep(
      DrugFoodInteractionHandler,
      manualInput(item(P.spinach, "ıspanak"), item(P.grapefruit, "greyfurt suyu")),
      profile({ medications: [medication(P.warfarin), medication(P.atorvastatin)] }),
    );
    expect(ctx.findings.map((f) => [f.title, f.detail])).toEqual([
      ["greyfurt suyu ↔ Atorvastatin 20 mg tablet", "Öneri metni"],
      ["ıspanak ↔ Varfarin 5 mg tablet", "Mekanizma metni"],
    ]);
    const catalog = new InMemoryCatalog({ interactions: [interaction("bare", S.atorvastatin, S.furanocoumarin, "high", null)] });
    const bare = await runStep(
      DrugFoodInteractionHandler,
      manualInput(item(P.grapefruit)),
      profile({ medications: [medication(P.atorvastatin)] }),
      new GeneralStrategy(),
      catalog,
    );
    expect(bare.findings[0]).toMatchObject({ title: "Greyfurt suyu ↔ Atorvastatin 20 mg tablet", detail: undefined });
  });

  it("ignores condition-specific rows for other profiles", async () => {
    const input = manualInput(item(P.grapefruit));
    const user = profile({ medications: [medication(P.atorvastatin)] });
    const general = await runStep(DrugFoodInteractionHandler, input, user, new GeneralStrategy());
    expect(general.findings).toEqual([expect.objectContaining({ interactionId: I.grapefruitStatin.id, severity: "high" })]);
    expect(general.requiresAlert).toBe(false);
    const renal = await runStep(DrugFoodInteractionHandler, input, user, new RenalStrategy());
    expect(renal.findings[0].severity).toBe("high");
  });

  it("keeps one finding per pair, the most severe applicable row", async () => {
    const ctx = await runStep(
      DrugFoodInteractionHandler,
      manualInput(item(P.grapefruit)),
      profile({ medications: [medication(P.atorvastatin)] }),
      new CardiologyStrategy(),
    );
    expect(ctx.findings).toEqual([
      expect.objectContaining({ interactionId: I.grapefruitStatinCardio.id, severity: "contraindicated", status: "high" }),
    ]);
    expect(ctx.requiresAlert).toBe(true);

    // Reverse catalog order: the more severe row still wins over a later, milder one.
    const reversed = new InMemoryCatalog({ interactions: [I.grapefruitStatinCardio, I.grapefruitStatin] });
    const again = await runStep(
      DrugFoodInteractionHandler,
      manualInput(item(P.grapefruit)),
      profile({ medications: [medication(P.atorvastatin)] }),
      new CardiologyStrategy(),
      reversed,
    );
    expect(again.findings.map((f) => f.interactionId)).toEqual([I.grapefruitStatinCardio.id]);
  });

  it("skips rows whose substances are not in this analysis", async () => {
    const stray = interaction("stray", S.calcium, S.drugX, "high", null);
    const catalog = new InMemoryCatalog();
    catalog.getInteractions = async () => [stray];
    const ctx = await runStep(DrugFoodInteractionHandler, manualInput(item(P.milk)), profile(), new GeneralStrategy(), catalog);
    expect(ctx.findings[0].title).toBe("Bilinen etkileşim bulunmadı");
  });
});

describe("DoseLimitHandler", () => {
  const potassiumMg = (amount: number | null, unit: string | null = "mg"): AnalysisItem => ({
    rawText: "muz",
    substances: [{ ...S.potassium, amount, unit }],
  });
  const withLimits = (...limits: ReturnType<typeof limit>[]) => new InMemoryCatalog({ limits });
  const run = (input: AnalysisInput, catalog: CatalogRepository, strategy: InteractionStrategy = new RenalStrategy()) =>
    runStep(DoseLimitHandler, input, profile(), strategy, catalog);

  it("passes with no substances", async () => {
    const ctx = await run(manualInput({ rawText: "x", substances: [] }), withLimits());
    expect(ctx.findings[0].title).toBe("Limit kontrolü için madde yok");
  });

  it("passes when no limit is defined", async () => {
    const ctx = await run(manualInput(potassiumMg(400)), withLimits());
    expect(ctx.findings).toEqual([expect.objectContaining({ status: "pass", title: "Bu maddeler için tanımlı sınır yok" })]);
  });

  it("flags totals above, near and below the limit", async () => {
    const catalog = withLimits(limit("l", S.potassium.id, 1, "g", "renal"));
    const above = await run(manualInput(potassiumMg(700), potassiumMg(400)), catalog);
    expect(above.findings[0]).toMatchObject({ status: "high", title: "Potasyum günlük üst sınırı aşıyor" });
    expect(above.findings[0].detail).toBe("Bu girdide 1,1 g; sınır 1 g/gün.");
    const near = await run(manualInput(potassiumMg(850)), catalog);
    expect(near.findings[0]).toMatchObject({ status: "caution", title: "Potasyum günlük üst sınıra yaklaşıyor" });
    const below = await run(manualInput(potassiumMg(100)), catalog);
    expect(below.findings).toEqual([expect.objectContaining({ status: "pass", title: "Günlük sınırlar içinde" })]);
  });

  it("ignores limits for other profiles", async () => {
    const ctx = await run(manualInput(potassiumMg(5000)), withLimits(limit("l", S.potassium.id, 1, "g", "renal")), new CardiologyStrategy());
    expect(ctx.findings[0].title).toBe("Bu maddeler için tanımlı sınır yok");
  });

  it("warns when the amount is unknown or not comparable", async () => {
    const catalog = withLimits(limit("l", S.potassium.id, 1, "g"));
    for (const input of [
      manualInput(potassiumMg(null)),
      manualInput(potassiumMg(1, "IU")),
      manualInput(potassiumMg(100), potassiumMg(null)),
      manualInput(potassiumMg(null), potassiumMg(100)),
      manualInput(potassiumMg(100), potassiumMg(1, "IU")),
    ]) {
      const ctx = await run(input, catalog, new GeneralStrategy());
      expect(ctx.findings[0]).toMatchObject({ status: "caution", title: "Potasyum miktarı hesaplanamadı" });
    }
  });

  it("uses the strictest applicable, profile-adjusted limit", async () => {
    const catalog = withLimits(
      limit("general", S.potassium.id, 4, "g"),
      limit("renal", S.potassium.id, 2000, "mg", "renal"),
      limit("loose", S.potassium.id, 5, "g", "renal"),
      limit("iu", S.potassium.id, 1, "IU"),
    );
    const strategy = new CompositeStrategy([
      new RenalStrategy({ label: "Böbrek", escalateSubstances: [], watchSubstances: [], limitFactors: { [S.potassium.id]: 0.25 } }),
    ]);
    // general 4 g × 0.25 = 1 g is the strictest
    const ctx = await run(manualInput(potassiumMg(1500)), catalog, strategy);
    expect(ctx.findings[0].detail).toBe("Bu girdide 1,5 g; sınır 1 g/gün.");
    const plain = await run(manualInput(potassiumMg(1500)), catalog, StrategyResolver.fromConditions(["renal"]));
    expect(plain.findings).toEqual([expect.objectContaining({ status: "pass" })]);
  });
});

describe("ToleranceAllergyHandler", () => {
  const run = (input: AnalysisInput, allergies: UserProfile["allergies"], catalog = new InMemoryCatalog()) =>
    runStep(ToleranceAllergyHandler, input, profile({ allergies }), new GeneralStrategy(), catalog);

  it("passes when the user has no allergies", async () => {
    const ctx = await run(manualInput(item(P.milk)), []);
    expect(ctx.findings[0].title).toBe("Kayıtlı alerji veya intolerans yok");
  });

  it("allergy via cross-reactive substance → high", async () => {
    const ctx = await run(manualInput(item(P.milk), item(P.banana)), [{ allergenId: A.milk.id, kind: "allergy" }]);
    expect(ctx.findings).toEqual([
      expect.objectContaining({
        status: "high",
        title: '"Süt" alerjinizle ilişkili olabilir',
        detail: "Kayıtlı alerji: Süt / laktoz",
        substances: [S.lactose],
      }),
    ]);
  });

  it("intolerance via free text on a substance synonym → caution", async () => {
    const ctx = await run(manualInput(item(P.milk)), [{ freeText: "Lactose", kind: "intolerance" }]);
    expect(ctx.findings[0]).toMatchObject({
      status: "caution",
      title: '"Süt" intoleransınızla ilişkili olabilir',
      detail: "Kayıtlı intolerans: Lactose",
    });
  });

  it("free text can match the item text even without substances", async () => {
    const ctx = await run(manualInput({ rawText: "Fıstık ezmesi", substances: [] }), [{ freeText: "fıstık", kind: "allergy" }]);
    expect(ctx.findings[0]).toMatchObject({ status: "high", substances: [] });
  });

  it("passes when nothing matches and skips the catalog for text-only allergies", async () => {
    const catalog = new InMemoryCatalog();
    const ctx = await run(manualInput(item(P.banana)), [{ freeText: "fıstık", kind: "allergy" }], catalog);
    expect(ctx.findings[0].title).toBe("Alerji veya intolerans eşleşmesi bulunmadı");
    expect(catalog.calls).not.toContain("getAllergens");
  });

  it("an unknown allergen id falls back to its free text", async () => {
    const ctx = await run(manualInput(item(P.milk)), [{ allergenId: "missing", freeText: null, kind: "allergy" }]);
    expect(ctx.findings[0].title).toBe("Alerji veya intolerans eşleşmesi bulunmadı");
  });
});
