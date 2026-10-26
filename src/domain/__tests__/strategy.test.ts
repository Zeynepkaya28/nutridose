import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../errors";
import {
  appliesTo,
  basePhrase,
  CardiologyStrategy,
  CompositeStrategy,
  DEFAULT_RULES,
  DiabetesInsulinStrategy,
  GeneralStrategy,
  HypertensionStrategy,
  RenalStrategy,
  StrategyResolver,
  TransplantImmunoStrategy,
  type ConditionRules,
} from "../strategy";
import type { Finding } from "../types";
import { I, interaction, limit, S } from "./fixtures";

const sodium = { id: "s-sodium", name: "Sodyum" };
const phosphorus = { id: "s-phos", name: "Fosfor" };

function finding(overrides: Partial<Finding> = {}): Finding {
  return { step: "drug_food", status: "caution", title: "A ↔ B", ...overrides };
}

describe("single-condition strategies", () => {
  it.each([
    [new CardiologyStrategy(), "cardiology", "Kardiyoloji"],
    [new DiabetesInsulinStrategy(), "diabetes_insulin", "Diyabet / İnsülin"],
    [new TransplantImmunoStrategy(), "transplant_immuno", "Transplant / İmmünsüpresyon"],
    [new HypertensionStrategy(), "hypertension", "Hipertansiyon"],
    [new RenalStrategy(), "renal", "Böbrek"],
  ])("%o has code and label", (strategy, code, label) => {
    expect(strategy.code).toBe(code);
    expect(strategy.codes).toEqual([code]);
    expect(strategy.label).toBe(label);
  });

  it("cardiology keeps catalog severities", () => {
    const s = new CardiologyStrategy();
    expect(s.weighInteraction(I.grapefruitStatin)).toBe("high");
    expect(s.weighInteraction(I.vitaminKWarfarin)).toBe("caution");
  });

  it("renal escalates interactions involving potassium or phosphorus by one level", () => {
    const s = new RenalStrategy();
    expect(s.weighInteraction(interaction("x", S.drugX, S.potassium, "info", null))).toBe("caution");
    expect(s.weighInteraction(interaction("x", phosphorus, S.drugX, "caution", null))).toBe("high");
    expect(s.weighInteraction(I.calciumIron)).toBe("info");
  });

  it("does not re-escalate rows written for its own condition", () => {
    expect(new RenalStrategy().weighInteraction(I.drugXPotassiumRenal)).toBe("caution");
  });

  it("transplant escalates furanocoumarin; hypertension escalates sodium", () => {
    expect(new TransplantImmunoStrategy().weighInteraction(interaction("x", S.furanocoumarin, S.drugX, "caution", null))).toBe(
      "high",
    );
    expect(new HypertensionStrategy().weighInteraction(interaction("x", sodium, S.drugX, "info", null))).toBe("caution");
    expect(new DiabetesInsulinStrategy().weighInteraction(interaction("x", sodium, S.drugX, "info", null))).toBe("info");
  });

  it("never invents contraindicated", () => {
    expect(new RenalStrategy().weighInteraction(interaction("x", S.potassium, S.drugX, "high", null))).toBe("high");
  });

  it("applies limit factors only to general limits", () => {
    const rules: ConditionRules = { ...DEFAULT_RULES.renal, limitFactors: { [S.potassium.id]: 0.5 } };
    const s = new RenalStrategy(rules);
    expect(s.adjustLimit(limit("l1", S.potassium.id, 4, "g")).upperLimit).toBe(2);
    expect(s.adjustLimit(limit("l2", S.potassium.id, 3, "g", "renal")).upperLimit).toBe(3);
    const other = limit("l3", S.iron.id, 40, "mg");
    expect(s.adjustLimit(other)).toBe(other);
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects limit factor %s", (factor) => {
    expect(() => new RenalStrategy({ ...DEFAULT_RULES.renal, limitFactors: { x: factor } })).toThrow(/limitFactors/);
  });

  it("adds profile context to relevant warnings only", () => {
    const s = new CardiologyStrategy();
    expect(s.phrase(finding({ substances: [S.vitaminK, S.warfarin] }))).toBe(
      "Dikkat: A ↔ B (Kardiyoloji profilinize göre önemli)",
    );
    expect(s.phrase(finding({ substances: [S.calcium] }))).toBe("Dikkat: A ↔ B");
    expect(s.phrase(finding())).toBe("Dikkat: A ↔ B");
    expect(s.phrase(finding({ status: "pass", substances: [S.vitaminK] }))).toBe("Sorun bulunmadı: A ↔ B");
  });
});

describe("GeneralStrategy", () => {
  it("uses catalog data as is", () => {
    const s = new GeneralStrategy();
    const l = limit("l", S.iron.id, 40, "mg");
    expect(s.code).toBe("general");
    expect(s.codes).toEqual([]);
    expect(s.weighInteraction(I.grapefruitStatin)).toBe("high");
    expect(s.adjustLimit(l)).toBe(l);
    expect(s.phrase(finding({ status: "high" }))).toBe("Yüksek risk: A ↔ B");
  });
});

describe("appliesTo / basePhrase", () => {
  it("general rows apply to everyone, condition rows only to that profile", () => {
    expect(appliesTo(new GeneralStrategy(), null)).toBe(true);
    expect(appliesTo(new GeneralStrategy(), "renal")).toBe(false);
    expect(appliesTo(new RenalStrategy(), "renal")).toBe(true);
  });
  it("prefixes by status", () => {
    expect(basePhrase(finding({ status: "error", title: "X" }))).toBe("Kontrol edilemedi: X");
  });
});

describe("CompositeStrategy", () => {
  const renalRules: ConditionRules = { ...DEFAULT_RULES.renal, limitFactors: { [S.potassium.id]: 0.5 } };
  const hyperRules: ConditionRules = { ...DEFAULT_RULES.hypertension, limitFactors: { [S.potassium.id]: 0.8 } };
  const composite = new CompositeStrategy([new HypertensionStrategy(hyperRules), new RenalStrategy(renalRules)]);

  it("covers all child codes", () => {
    expect(composite.code).toBe("composite");
    expect(composite.codes).toEqual(["hypertension", "renal"]);
  });

  it("takes the highest severity", () => {
    expect(composite.weighInteraction(interaction("x", S.potassium, S.drugX, "info", null))).toBe("caution");
    expect(composite.weighInteraction(I.grapefruitStatin)).toBe("high");
  });

  it("takes the strictest limit", () => {
    expect(composite.adjustLimit(limit("l", S.potassium.id, 4, "g")).upperLimit).toBe(2);
    const reversed = new CompositeStrategy([new RenalStrategy(renalRules), new HypertensionStrategy(hyperRules)]);
    expect(reversed.adjustLimit(limit("l", S.potassium.id, 4, "g")).upperLimit).toBe(2);
  });

  it("names every relevant profile in the warning", () => {
    expect(composite.phrase(finding({ substances: [S.potassium] }))).toBe(
      "Dikkat: A ↔ B (Hipertansiyon, Böbrek profilinize göre önemli)",
    );
    expect(composite.phrase(finding({ substances: [sodium] }))).toBe(
      "Dikkat: A ↔ B (Hipertansiyon, Böbrek profilinize göre önemli)",
    );
    expect(composite.phrase(finding({ substances: [S.iron] }))).toBe("Dikkat: A ↔ B");
  });

  it("needs at least one child", () => {
    expect(() => new CompositeStrategy([])).toThrow();
  });
});

describe("StrategyResolver", () => {
  it("no conditions → general", () => {
    expect(StrategyResolver.fromConditions([])).toBeInstanceOf(GeneralStrategy);
  });

  it.each([
    ["cardiology", CardiologyStrategy],
    ["diabetes_insulin", DiabetesInsulinStrategy],
    ["transplant_immuno", TransplantImmunoStrategy],
    ["hypertension", HypertensionStrategy],
    ["renal", RenalStrategy],
  ] as const)("%s → its strategy", (code, type) => {
    expect(StrategyResolver.fromConditions([code])).toBeInstanceOf(type);
    expect(StrategyResolver.fromConditions([code, code])).toBeInstanceOf(type);
  });

  it("several conditions → composite in a stable order", () => {
    const s = StrategyResolver.fromConditions(["renal", "cardiology"]);
    expect(s).toBeInstanceOf(CompositeStrategy);
    expect(s.codes).toEqual(["cardiology", "renal"]);
  });

  it("rejects unknown codes", () => {
    expect(() => StrategyResolver.fromConditions(["oncology"])).toThrow(InvalidInputError);
  });

  it("passes custom rules to the strategies", () => {
    const rules = { ...DEFAULT_RULES, renal: { ...DEFAULT_RULES.renal, label: "Renal (özel)" } };
    const s = new StrategyResolver(rules).resolve(["renal"]) as RenalStrategy;
    expect(s.label).toBe("Renal (özel)");
  });
});
