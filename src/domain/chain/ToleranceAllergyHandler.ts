import { normalize, substanceKeys } from "../text";
import type { AnalysisItem, Finding, SubstanceRef, UserAllergy } from "../types";
import type { AnalysisContext } from "./AnalysisContext";
import { SafetyHandler, type StepOutcome } from "./SafetyHandler";

/** Step 4: allergies (high) and intolerances (caution) against the input items. */
export class ToleranceAllergyHandler extends SafetyHandler {
  readonly step = "tolerance_allergy" as const;

  protected async process(ctx: AnalysisContext): Promise<StepOutcome> {
    const { allergies } = ctx.profile;
    if (allergies.length === 0) {
      return { findings: [{ step: this.step, status: "pass", title: "Kayıtlı alerji veya intolerans yok" }] };
    }

    const allergenIds = [...new Set(allergies.flatMap((a) => (a.allergenId ? [a.allergenId] : [])))];
    const allergens = allergenIds.length > 0 ? await this.deps.catalog.getAllergens(allergenIds) : [];
    const allergenById = new Map(allergens.map((a) => [a.id, a]));

    const findings: Finding[] = [];
    for (const allergy of allergies) {
      const allergen = allergy.allergenId ? allergenById.get(allergy.allergenId) : undefined;
      const name = allergen?.name ?? allergy.freeText?.trim() ?? "";
      const crossReactive = new Set(allergen?.crossReactiveSubstanceIds ?? []);
      const key = allergy.freeText ? normalize(allergy.freeText) : "";

      for (const item of ctx.input.items) {
        const matched = matchItem(item, crossReactive, key);
        if (!matched) continue;
        findings.push(toFinding(this.step, allergy, name, item, matched));
      }
    }

    if (findings.length === 0) {
      return { findings: [{ step: this.step, status: "pass", title: "Alerji veya intolerans eşleşmesi bulunmadı" }] };
    }
    return { findings };
  }
}

/** Returns the matching substances (possibly empty for a text-only match), or null for no match. */
function matchItem(item: AnalysisItem, crossReactive: ReadonlySet<string>, key: string): SubstanceRef[] | null {
  const bySubstance = item.substances.filter(
    (s) => crossReactive.has(s.id) || (key !== "" && substanceKeys(s).some((k) => k.includes(key))),
  );
  if (bySubstance.length > 0) return bySubstance;
  if (key !== "" && normalize(item.rawText).includes(key)) return [];
  return null;
}

function toFinding(
  step: Finding["step"],
  allergy: UserAllergy,
  name: string,
  item: AnalysisItem,
  substances: SubstanceRef[],
): Finding {
  const isAllergy = allergy.kind === "allergy";
  return {
    step,
    status: isAllergy ? "high" : "caution",
    title: `"${item.rawText}" ${isAllergy ? "alerjinizle" : "intoleransınızla"} ilişkili olabilir`,
    detail: `Kayıtlı ${isAllergy ? "alerji" : "intolerans"}: ${name}`,
    substances,
  };
}
