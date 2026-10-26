import { severityRank, severityToStatus } from "../severity";
import { appliesTo } from "../strategy/InteractionStrategy";
import type { Finding, Severity } from "../types";
import { inputSubstances, medicationSubstances, type AnalysisContext } from "./AnalysisContext";
import { SafetyHandler, type StepOutcome } from "./SafetyHandler";

/**
 * Step 2: interactions triggered by this input — input ↔ current medications and input ↔ input.
 * Medication ↔ medication pairs are not re-reported here because this input did not cause them.
 */
export class DrugFoodInteractionHandler extends SafetyHandler {
  readonly step = "drug_food" as const;

  protected async process(ctx: AnalysisContext): Promise<StepOutcome> {
    const fromInput = inputSubstances(ctx);
    if (fromInput.length === 0) {
      return { findings: [{ step: this.step, status: "pass", title: "Etkileşim kontrolü için madde yok" }] };
    }

    const labels = new Map<string, string>();
    for (const entry of [...medicationSubstances(ctx), ...fromInput]) labels.set(entry.substance.id, entry.label);
    const inputIds = new Set(fromInput.map((entry) => entry.substance.id));

    const interactions = await this.deps.catalog.getInteractions([...labels.keys()]);

    // One finding per substance pair. A pair can have a general row and condition-specific rows;
    // the most severe applicable one wins.
    const byPair = new Map<string, { finding: Finding; severity: Severity }>();

    for (const interaction of interactions) {
      const { substanceA: a, substanceB: b } = interaction;
      if (!appliesTo(ctx.strategy, interaction.conditionCode)) continue;
      if (!labels.has(a.id) || !labels.has(b.id)) continue;
      if (!inputIds.has(a.id) && !inputIds.has(b.id)) continue;

      const severity = ctx.strategy.weighInteraction(interaction);
      const pairKey = [a.id, b.id].sort().join("|");
      const existing = byPair.get(pairKey);
      if (existing && severityRank(existing.severity) >= severityRank(severity)) continue;

      // Put the side that came from this input first: "Greyfurt suyu ↔ Atorvastatin".
      const [first, second] = inputIds.has(a.id) ? [a, b] : [b, a];
      byPair.set(pairKey, {
        severity,
        finding: {
          step: this.step,
          status: severityToStatus(severity),
          severity,
          title: `${labels.get(first.id)} ↔ ${labels.get(second.id)}`,
          detail: interaction.advice ?? interaction.mechanism ?? undefined,
          interactionId: interaction.id,
          substances: [first, second],
        },
      });
    }

    if (byPair.size === 0) {
      return { findings: [{ step: this.step, status: "pass", title: "Bilinen etkileşim bulunmadı" }] };
    }
    const results = [...byPair.values()].sort((x, y) => severityRank(y.severity) - severityRank(x.severity));
    return {
      findings: results.map((r) => r.finding),
      // The chain does not stop; the UI shows the critical alert.
      requiresAlert: results.some((r) => r.severity === "contraindicated"),
    };
  }
}
