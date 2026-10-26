import type { InteractionStrategy } from "../strategy/InteractionStrategy";
import type { AnalysisInput, ConditionCode, Finding, UserProfile } from "../types";
import { ActiveIngredientScanHandler } from "./ActiveIngredientScanHandler";
import { createContext } from "./AnalysisContext";
import { DoseLimitHandler } from "./DoseLimitHandler";
import { DrugFoodInteractionHandler } from "./DrugFoodInteractionHandler";
import type { HandlerDeps, SafetyHandler } from "./SafetyHandler";
import { ToleranceAllergyHandler } from "./ToleranceAllergyHandler";

export interface AnalysisResult {
  findings: Finding[];
  requiresAlert: boolean;
  strategyCodes: ConditionCode[];
}

export class SafetyPipeline {
  private constructor(
    private readonly head: SafetyHandler,
    private readonly strategy: InteractionStrategy,
  ) {}

  /** Fixed order: ingredient scan → drug/food → dose limit → tolerance/allergy. */
  static build(strategy: InteractionStrategy, deps: HandlerDeps): SafetyPipeline {
    const head = new ActiveIngredientScanHandler(deps);
    head
      .setNext(new DrugFoodInteractionHandler(deps))
      .setNext(new DoseLimitHandler(deps))
      .setNext(new ToleranceAllergyHandler(deps));
    return new SafetyPipeline(head, strategy);
  }

  async run(input: AnalysisInput, profile: UserProfile): Promise<AnalysisResult> {
    const ctx = await this.head.handle(createContext(input, profile, this.strategy));
    return {
      findings: ctx.findings.map((finding) => ({ ...finding, message: this.strategy.phrase(finding) })),
      requiresAlert: ctx.requiresAlert,
      strategyCodes: [...this.strategy.codes],
    };
  }
}
