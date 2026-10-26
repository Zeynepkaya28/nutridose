import type { ConditionCode, Finding, Interaction, NutrientLimit, Severity } from "../types";
import { basePhrase, type InteractionStrategy } from "./InteractionStrategy";

/** Used when the user has no treatment profile: catalog data as is. */
export class GeneralStrategy implements InteractionStrategy {
  readonly code = "general" as const;
  readonly codes: readonly ConditionCode[] = [];

  weighInteraction(interaction: Interaction): Severity {
    return interaction.severity;
  }

  adjustLimit(limit: NutrientLimit): NutrientLimit {
    return limit;
  }

  phrase(finding: Finding): string {
    return basePhrase(finding);
  }
}
