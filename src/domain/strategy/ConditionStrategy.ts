import { escalate } from "../severity";
import { matchesAnyKey, normalize } from "../text";
import type { ConditionCode, Finding, Interaction, NutrientLimit, Severity } from "../types";
import { basePhrase, type InteractionStrategy } from "./InteractionStrategy";
import { DEFAULT_RULES, type ConditionRules } from "./rules";

/** Shared behaviour for single-condition strategies; subclasses only pick the code. */
export abstract class ConditionStrategy implements InteractionStrategy {
  abstract readonly code: ConditionCode;
  private readonly escalateKeys: ReadonlySet<string>;
  private readonly watchKeys: ReadonlySet<string>;

  constructor(protected readonly rules: ConditionRules) {
    for (const [substanceId, factor] of Object.entries(rules.limitFactors)) {
      if (!(factor > 0 && factor <= 1)) {
        throw new Error(`limitFactors[${substanceId}] must be in (0, 1], got ${factor}.`);
      }
    }
    this.escalateKeys = new Set(rules.escalateSubstances.map(normalize));
    this.watchKeys = new Set(rules.watchSubstances.map(normalize));
  }

  get codes(): readonly ConditionCode[] {
    return [this.code];
  }

  get label(): string {
    return this.rules.label;
  }

  weighInteraction(interaction: Interaction): Severity {
    // Condition-specific rows are already graded for this profile.
    if (interaction.conditionCode === this.code) return interaction.severity;
    const sensitive =
      matchesAnyKey(interaction.substanceA, this.escalateKeys) ||
      matchesAnyKey(interaction.substanceB, this.escalateKeys);
    return sensitive ? escalate(interaction.severity) : interaction.severity;
  }

  adjustLimit(limit: NutrientLimit): NutrientLimit {
    // Condition-specific limits come from data as they are.
    if (limit.conditionCode !== null) return limit;
    const factor = this.rules.limitFactors[limit.substanceId];
    return factor === undefined ? limit : { ...limit, upperLimit: limit.upperLimit * factor };
  }

  isRelevant(finding: Finding): boolean {
    if (finding.status === "pass") return false;
    return (finding.substances ?? []).some((s) => matchesAnyKey(s, this.watchKeys));
  }

  phrase(finding: Finding): string {
    const text = basePhrase(finding);
    return this.isRelevant(finding) ? `${text} (${this.label} profilinize göre önemli)` : text;
  }
}

export class CardiologyStrategy extends ConditionStrategy {
  readonly code = "cardiology" as const;
  constructor(rules: ConditionRules = DEFAULT_RULES.cardiology) {
    super(rules);
  }
}

export class DiabetesInsulinStrategy extends ConditionStrategy {
  readonly code = "diabetes_insulin" as const;
  constructor(rules: ConditionRules = DEFAULT_RULES.diabetes_insulin) {
    super(rules);
  }
}

export class TransplantImmunoStrategy extends ConditionStrategy {
  readonly code = "transplant_immuno" as const;
  constructor(rules: ConditionRules = DEFAULT_RULES.transplant_immuno) {
    super(rules);
  }
}

export class HypertensionStrategy extends ConditionStrategy {
  readonly code = "hypertension" as const;
  constructor(rules: ConditionRules = DEFAULT_RULES.hypertension) {
    super(rules);
  }
}

export class RenalStrategy extends ConditionStrategy {
  readonly code = "renal" as const;
  constructor(rules: ConditionRules = DEFAULT_RULES.renal) {
    super(rules);
  }
}
