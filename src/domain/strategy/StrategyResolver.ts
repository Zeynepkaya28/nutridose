import { InvalidInputError } from "../errors";
import { CONDITION_CODES, isConditionCode, type ConditionCode } from "../types";
import { CompositeStrategy } from "./CompositeStrategy";
import {
  CardiologyStrategy,
  DiabetesInsulinStrategy,
  HypertensionStrategy,
  RenalStrategy,
  TransplantImmunoStrategy,
  type ConditionStrategy,
} from "./ConditionStrategy";
import { GeneralStrategy } from "./GeneralStrategy";
import type { InteractionStrategy } from "./InteractionStrategy";
import { DEFAULT_RULES, type ConditionRules } from "./rules";

type RuleSet = Readonly<Record<ConditionCode, ConditionRules>>;

export class StrategyResolver {
  constructor(private readonly rules: RuleSet = DEFAULT_RULES) {}

  static fromConditions(codes: readonly string[], rules: RuleSet = DEFAULT_RULES): InteractionStrategy {
    return new StrategyResolver(rules).resolve(codes);
  }

  resolve(codes: readonly string[]): InteractionStrategy {
    for (const code of codes) {
      if (!isConditionCode(code)) throw new InvalidInputError(`Bilinmeyen tedavi profili: ${code}`);
    }
    // Stable order regardless of how the user picked them.
    const selected = CONDITION_CODES.filter((code) => codes.includes(code));
    if (selected.length === 0) return new GeneralStrategy();
    const strategies = selected.map((code) => this.create(code));
    return strategies.length === 1 ? strategies[0] : new CompositeStrategy(strategies);
  }

  private create(code: ConditionCode): ConditionStrategy {
    const rules = this.rules[code];
    switch (code) {
      case "cardiology":
        return new CardiologyStrategy(rules);
      case "diabetes_insulin":
        return new DiabetesInsulinStrategy(rules);
      case "transplant_immuno":
        return new TransplantImmunoStrategy(rules);
      case "hypertension":
        return new HypertensionStrategy(rules);
      case "renal":
        return new RenalStrategy(rules);
    }
  }
}
