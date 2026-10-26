import { maxSeverity } from "../severity";
import type { ConditionCode, Finding, Interaction, NutrientLimit, Severity } from "../types";
import type { ConditionStrategy } from "./ConditionStrategy";
import { basePhrase, type InteractionStrategy } from "./InteractionStrategy";

/** Several conditions at once: highest severity and strictest limit win. */
export class CompositeStrategy implements InteractionStrategy {
  readonly code = "composite" as const;
  readonly codes: readonly ConditionCode[];

  constructor(private readonly children: readonly ConditionStrategy[]) {
    if (children.length === 0) throw new Error("CompositeStrategy needs at least one strategy.");
    this.codes = [...new Set(children.flatMap((child) => child.codes))];
  }

  weighInteraction(interaction: Interaction): Severity {
    return this.children
      .map((child) => child.weighInteraction(interaction))
      .reduce((worst, current) => maxSeverity(worst, current));
  }

  adjustLimit(limit: NutrientLimit): NutrientLimit {
    return this.children
      .map((child) => child.adjustLimit(limit))
      .reduce((strictest, current) => (current.upperLimit < strictest.upperLimit ? current : strictest));
  }

  phrase(finding: Finding): string {
    const labels = this.children.filter((child) => child.isRelevant(finding)).map((child) => child.label);
    const text = basePhrase(finding);
    return labels.length > 0 ? `${text} (${labels.join(", ")} profilinize göre önemli)` : text;
  }
}
