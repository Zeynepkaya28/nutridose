import type { ConditionCode, Finding, FindingStatus, Interaction, NutrientLimit, Severity } from "../types";

export type StrategyCode = ConditionCode | "general" | "composite";

export interface InteractionStrategy {
  readonly code: StrategyCode;
  /** Condition codes this strategy covers (empty for the general strategy). */
  readonly codes: readonly ConditionCode[];
  /** Severity for this profile (threshold / escalation rules). */
  weighInteraction(interaction: Interaction): Severity;
  /** Profile-specific limit, e.g. a tighter factor for renal patients. */
  adjustLimit(limit: NutrientLimit): NutrientLimit;
  /** User-facing warning text. */
  phrase(finding: Finding): string;
}

/** A catalog row with a condition code only applies to users who have that condition. */
export function appliesTo(strategy: InteractionStrategy, conditionCode: ConditionCode | null): boolean {
  return conditionCode === null || strategy.codes.includes(conditionCode);
}

const STATUS_PREFIX: Record<FindingStatus, string> = {
  pass: "Sorun bulunmadı",
  caution: "Dikkat",
  high: "Yüksek risk",
  error: "Kontrol edilemedi",
};

export function basePhrase(finding: Finding): string {
  return `${STATUS_PREFIX[finding.status]}: ${finding.title}`;
}
