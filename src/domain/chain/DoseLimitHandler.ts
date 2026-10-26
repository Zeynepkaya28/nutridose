import { appliesTo } from "../strategy/InteractionStrategy";
import type { Finding, NutrientLimit, SubstanceRef } from "../types";
import { type AnalysisContext } from "./AnalysisContext";
import { SafetyHandler, type StepOutcome } from "./SafetyHandler";
import { convertAmount } from "./units";

/** Share of the limit at which we start warning. A product rule, not a clinical value. */
export const NEAR_LIMIT_RATIO = 0.8;

interface Total {
  substance: SubstanceRef;
  amount: number | null;
  unit: string | null;
  /** Some amounts could not be added (missing or incompatible unit). */
  partial: boolean;
}

/** Step 3: totals in this input against the (profile-adjusted) daily upper limits. */
export class DoseLimitHandler extends SafetyHandler {
  readonly step = "dose_limit" as const;

  protected async process(ctx: AnalysisContext): Promise<StepOutcome> {
    const totals = sumInput(ctx);
    if (totals.size === 0) {
      return { findings: [{ step: this.step, status: "pass", title: "Limit kontrolü için madde yok" }] };
    }

    const limits = (await this.deps.catalog.getNutrientLimits([...totals.keys()]))
      .filter((limit) => totals.has(limit.substanceId) && appliesTo(ctx.strategy, limit.conditionCode))
      .map((limit) => ctx.strategy.adjustLimit(limit));
    const strictest = pickStrictest(limits);

    const findings: Finding[] = [];
    for (const [substanceId, limit] of strictest) {
      const total = totals.get(substanceId)!;
      const name = total.substance.name;
      const substances = [total.substance];
      const limitText = `${formatNumber(limit.upperLimit)} ${limit.unit}/gün`;

      const amount =
        total.amount === null || total.unit === null ? null : convertAmount(total.amount, total.unit, limit.unit);
      if (amount === null || total.partial) {
        findings.push({
          step: this.step,
          status: "caution",
          title: `${name} miktarı hesaplanamadı`,
          detail: `${name} için günlük üst sınır ${limitText}, ancak bu girdideki miktar bilinmiyor.`,
          substances,
        });
        continue;
      }
      const ratio = amount / limit.upperLimit;
      if (ratio > 1) {
        findings.push({
          step: this.step,
          status: "high",
          title: `${name} günlük üst sınırı aşıyor`,
          detail: `Bu girdide ${formatNumber(amount)} ${limit.unit}; sınır ${limitText}.`,
          substances,
        });
      } else if (ratio >= NEAR_LIMIT_RATIO) {
        findings.push({
          step: this.step,
          status: "caution",
          title: `${name} günlük üst sınıra yaklaşıyor`,
          detail: `Bu girdide ${formatNumber(amount)} ${limit.unit}; sınır ${limitText}.`,
          substances,
        });
      }
    }

    if (findings.length === 0) {
      const title = strictest.size === 0 ? "Bu maddeler için tanımlı sınır yok" : "Günlük sınırlar içinde";
      return { findings: [{ step: this.step, status: "pass", title }] };
    }
    return { findings };
  }
}

function sumInput(ctx: AnalysisContext): Map<string, Total> {
  const totals = new Map<string, Total>();
  for (const substance of ctx.input.items.flatMap((item) => item.substances)) {
    const current = totals.get(substance.id);
    const hasAmount = substance.amount != null && !!substance.unit;
    if (!current) {
      totals.set(substance.id, {
        substance,
        amount: hasAmount ? substance.amount! : null,
        unit: hasAmount ? substance.unit! : null,
        partial: false,
      });
      continue;
    }
    if (!hasAmount) {
      current.partial = true;
      continue;
    }
    if (current.amount === null || current.unit === null) {
      current.partial = true;
      continue;
    }
    const converted = convertAmount(substance.amount!, substance.unit!, current.unit);
    if (converted === null) current.partial = true;
    else current.amount += converted;
  }
  return totals;
}

/** Lowest limit per substance; limits in incomparable units keep the first one seen. */
function pickStrictest(limits: NutrientLimit[]): Map<string, NutrientLimit> {
  const result = new Map<string, NutrientLimit>();
  for (const limit of limits) {
    const current = result.get(limit.substanceId);
    if (!current) {
      result.set(limit.substanceId, limit);
      continue;
    }
    const comparable = convertAmount(limit.upperLimit, limit.unit, current.unit);
    if (comparable !== null && comparable < current.upperLimit) result.set(limit.substanceId, limit);
  }
  return result;
}

function formatNumber(value: number): string {
  return Number(value.toFixed(2)).toLocaleString("tr-TR");
}
