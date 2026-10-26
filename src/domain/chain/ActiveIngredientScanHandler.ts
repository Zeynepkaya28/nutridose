import type { Finding } from "../types";
import { inputSubstances, type AnalysisContext } from "./AnalysisContext";
import { SafetyHandler, type StepOutcome } from "./SafetyHandler";

/** Step 1: which items were recognised and which active ingredients they contain. */
export class ActiveIngredientScanHandler extends SafetyHandler {
  readonly step = "ingredient_scan" as const;

  protected async process(ctx: AnalysisContext): Promise<StepOutcome> {
    const { items } = ctx.input;
    if (items.length === 0) {
      return {
        findings: [
          {
            step: this.step,
            status: "error",
            title: "Tanınan ürün yok",
            detail: "Girdide analiz edilecek bir ürün ya da madde bulunamadı.",
          },
        ],
      };
    }

    const findings: Finding[] = [];
    const known = items.filter((item) => item.substances.length > 0);
    if (known.length > 0) {
      const substances = inputSubstances(ctx).map((entry) => entry.substance);
      findings.push({
        step: this.step,
        status: "pass",
        title: `${known.length} kalem tanındı`,
        detail: `Etken maddeler: ${substances.map((s) => s.name).join(", ")}`,
        substances,
      });
    }
    for (const item of items.filter((i) => i.substances.length === 0)) {
      findings.push({
        step: this.step,
        status: "error",
        title: `"${item.rawText}" tanınamadı`,
        detail: "Bu kalem katalogda bulunamadı; etkileşim kontrolüne dahil edilmedi.",
      });
    }
    return { findings };
  }
}
