import type { InteractionStrategy } from "../strategy/InteractionStrategy";
import type { AnalysisInput, Finding, SubstanceRef, UserProfile } from "../types";

export interface AnalysisContext {
  readonly input: AnalysisInput;
  readonly profile: UserProfile;
  readonly strategy: InteractionStrategy;
  readonly findings: readonly Finding[];
  /** True when a contraindicated interaction was found; the UI shows the critical alert. */
  readonly requiresAlert: boolean;
}

export function createContext(
  input: AnalysisInput,
  profile: UserProfile,
  strategy: InteractionStrategy,
): AnalysisContext {
  return { input, profile, strategy, findings: [], requiresAlert: false };
}

/** A substance together with the label of the item or medication it came from. */
export interface SourcedSubstance {
  substance: SubstanceRef;
  label: string;
}

function unique(entries: SourcedSubstance[]): SourcedSubstance[] {
  const byId = new Map<string, SourcedSubstance>();
  for (const entry of entries) {
    if (!byId.has(entry.substance.id)) byId.set(entry.substance.id, entry);
  }
  return [...byId.values()];
}

export function inputSubstances(ctx: AnalysisContext): SourcedSubstance[] {
  return unique(
    ctx.input.items.flatMap((item) => item.substances.map((substance) => ({ substance, label: item.rawText }))),
  );
}

export function medicationSubstances(ctx: AnalysisContext): SourcedSubstance[] {
  return unique(
    ctx.profile.medications.flatMap((med) => med.substances.map((substance) => ({ substance, label: med.name }))),
  );
}
