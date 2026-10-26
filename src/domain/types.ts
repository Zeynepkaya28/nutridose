// Core domain types. Plain TypeScript, no framework imports.

export const CONDITION_CODES = [
  "cardiology",
  "diabetes_insulin",
  "transplant_immuno",
  "hypertension",
  "renal",
] as const;
export type ConditionCode = (typeof CONDITION_CODES)[number];

export function isConditionCode(value: unknown): value is ConditionCode {
  return typeof value === "string" && (CONDITION_CODES as readonly string[]).includes(value);
}

export type Severity = "info" | "caution" | "high" | "contraindicated";
export type InputKind = "barcode" | "manual" | "prescription_pdf";
export type ProductKind = "drug" | "food" | "supplement";
export type AnalysisStep = "ingredient_scan" | "drug_food" | "dose_limit" | "tolerance_allergy";
export type FindingStatus = "pass" | "caution" | "high" | "error";
export type AllergyKind = "allergy" | "intolerance";

export interface SubstanceRef {
  id: string;
  name: string;
  synonyms?: readonly string[];
  /** Amount in one serving of the product, when known. */
  amount?: number | null;
  unit?: string | null;
}

export interface Product {
  id: string;
  kind: ProductKind;
  name: string;
  barcode?: string | null;
  substances: SubstanceRef[];
}

export interface Interaction {
  id: string;
  substanceA: SubstanceRef;
  substanceB: SubstanceRef;
  severity: Severity;
  /** null = applies to everyone; otherwise only to users with this condition. */
  conditionCode: ConditionCode | null;
  mechanism?: string | null;
  advice?: string | null;
  evidenceSource: string;
}

export interface NutrientLimit {
  id: string;
  substanceId: string;
  conditionCode: ConditionCode | null;
  upperLimit: number;
  unit: string;
  period: "day";
  source: string;
}

export interface Allergen {
  id: string;
  name: string;
  crossReactiveSubstanceIds: string[];
}

export interface AnalysisItem {
  productId?: string;
  /** What the user entered or the recognised product name; used as the label in findings. */
  rawText: string;
  substances: SubstanceRef[];
}

export interface AnalysisInput {
  kind: InputKind;
  items: AnalysisItem[];
}

export interface Medication {
  productId: string;
  name: string;
  substances: SubstanceRef[];
}

export interface UserAllergy {
  allergenId?: string | null;
  freeText?: string | null;
  kind: AllergyKind;
}

export interface UserProfile {
  conditions: ConditionCode[];
  medications: Medication[];
  allergies: UserAllergy[];
}

export interface Finding {
  step: AnalysisStep;
  status: FindingStatus;
  title: string;
  detail?: string;
  severity?: Severity;
  interactionId?: string | null;
  substances?: SubstanceRef[];
  /** User-facing sentence produced by the active strategy. Filled by SafetyPipeline. */
  message?: string;
}
