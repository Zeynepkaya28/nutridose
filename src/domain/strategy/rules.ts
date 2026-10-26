import type { ConditionCode } from "../types";

export interface ConditionRules {
  /** Turkish profile name shown in warnings. */
  label: string;
  /** Substance names/synonyms that raise an existing interaction by one level for this profile. */
  escalateSubstances: readonly string[];
  /** Substance names/synonyms worth calling out in this profile's warning text. */
  watchSubstances: readonly string[];
  /**
   * Multipliers in (0, 1] applied to general (non condition-specific) limits, keyed by substance id.
   * Empty by default on purpose: numeric limits belong in nutrient_limits with a cited source.
   */
  limitFactors: Readonly<Record<string, number>>;
}

/**
 * Qualitative defaults only — ÖRNEK, klinik doğrulama gerekli.
 * These never create an interaction or a number; they only adjust or describe catalog data.
 */
export const DEFAULT_RULES: Readonly<Record<ConditionCode, ConditionRules>> = {
  cardiology: {
    label: "Kardiyoloji",
    escalateSubstances: [],
    watchSubstances: ["K vitamini", "vitamin K", "furanokumarin", "sodyum"],
    limitFactors: {},
  },
  diabetes_insulin: {
    label: "Diyabet / İnsülin",
    escalateSubstances: [],
    watchSubstances: ["glukoz", "şeker", "alkol"],
    limitFactors: {},
  },
  transplant_immuno: {
    label: "Transplant / İmmünsüpresyon",
    escalateSubstances: ["furanokumarin"],
    watchSubstances: ["furanokumarin"],
    limitFactors: {},
  },
  hypertension: {
    label: "Hipertansiyon",
    escalateSubstances: ["sodyum"],
    watchSubstances: ["sodyum", "potasyum"],
    limitFactors: {},
  },
  renal: {
    label: "Böbrek",
    escalateSubstances: ["potasyum", "fosfor"],
    watchSubstances: ["potasyum", "fosfor", "sodyum"],
    limitFactors: {},
  },
};
