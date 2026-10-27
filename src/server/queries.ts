import "server-only";
import { cache } from "react";
import { CONDITION_CODES, type ConditionCode, type FindingStatus, type AnalysisStep, type Severity } from "@/domain/types";
import { CONSENT_VERSION } from "@/lib/consent";
import { createClient } from "@/lib/supabase/server";
import { daysAgoIso, startOfDayIso } from "@/lib/time";

/** The signed-in user for this request, or null. Cached per request. */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { supabase, userId: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

export type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

/** Onboarding state of the signed-in user. Cached per request. */
export const getAccountState = cache(async (viewer: Viewer) => {
  const { data, error } = await viewer.supabase
    .from("profiles")
    .select("display_name, onboarded_at, health_consent_at, health_consent_version")
    .eq("user_id", viewer.userId)
    .maybeSingle();
  if (error) throw new Error(`profiles: ${error.message}`);
  // No profile row: the account was deleted while this session token was still valid.
  return {
    exists: Boolean(data),
    displayName: data?.display_name ?? null,
    onboarded: Boolean(data?.onboarded_at),
    // Consent to an older text version must be renewed.
    consented: Boolean(data?.health_consent_at) && data?.health_consent_version === CONSENT_VERSION,
  };
});

function check<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data as T;
}

export interface MealSummary {
  id: string;
  label: string | null;
  eatenAt: string;
  items: string[];
  latestRun: { id: string; requiresAlert: boolean } | null;
}

export async function getMeals(viewer: Viewer, sinceIso: string): Promise<MealSummary[]> {
  const rows = check(
    await viewer.supabase
      .from("meals")
      .select("id, label, eaten_at, meal_items ( raw_text ), analysis_runs ( id, requires_alert, created_at )")
      .gte("eaten_at", sinceIso)
      .order("eaten_at", { ascending: false }),
    "meals",
  );
  return rows.map((row) => {
    const runs = [...row.analysis_runs].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return {
      id: row.id,
      label: row.label,
      eatenAt: row.eaten_at,
      items: row.meal_items.map((i) => i.raw_text),
      latestRun: runs[0] ? { id: runs[0].id, requiresAlert: runs[0].requires_alert } : null,
    };
  });
}

export const getTodayMeals = (viewer: Viewer) => getMeals(viewer, startOfDayIso());
export const getRecentMeals = (viewer: Viewer) => getMeals(viewer, daysAgoIso(30));

export interface StandaloneRun {
  id: string;
  inputKind: "barcode" | "manual" | "prescription_pdf";
  createdAt: string;
  requiresAlert: boolean;
}

/** Analyses not tied to a meal (e.g. prescriptions). */
export async function getStandaloneRuns(viewer: Viewer): Promise<StandaloneRun[]> {
  const rows = check(
    await viewer.supabase
      .from("analysis_runs")
      .select("id, input_kind, created_at, requires_alert")
      .is("meal_id", null)
      .gte("created_at", daysAgoIso(30))
      .order("created_at", { ascending: false })
      .limit(20),
    "analysis_runs",
  );
  return rows.map((r) => ({ id: r.id, inputKind: r.input_kind, createdAt: r.created_at, requiresAlert: r.requires_alert }));
}

export interface MedicationSummary {
  id: string;
  productId: string;
  name: string;
  dose: string | null;
  active: boolean;
  substances: string[];
}

const MEDICATION_SELECT =
  "id, product_id, dose, active, products ( name, product_substances ( substances ( name ) ) )" as const;

type MedicationRow = {
  id: string;
  product_id: string;
  dose: string | null;
  active: boolean;
  products: { name: string; product_substances: Array<{ substances: { name: string } | null }> } | null;
};

function toMedication(row: MedicationRow): MedicationSummary {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.products?.name ?? "Bilinmeyen ilaç",
    dose: row.dose,
    active: row.active,
    substances: (row.products?.product_substances ?? []).flatMap((ps) => (ps.substances ? [ps.substances.name] : [])),
  };
}

export async function getMedications(viewer: Viewer): Promise<MedicationSummary[]> {
  const rows = check(
    await viewer.supabase.from("user_medications").select(MEDICATION_SELECT).order("created_at"),
    "user_medications",
  );
  return (rows as unknown as MedicationRow[]).map(toMedication);
}

export async function getMedication(viewer: Viewer, id: string): Promise<MedicationSummary | null> {
  const row = check(
    await viewer.supabase.from("user_medications").select(MEDICATION_SELECT).eq("id", id).maybeSingle(),
    "user_medications",
  );
  return row ? toMedication(row as unknown as MedicationRow) : null;
}

export interface ProfileData {
  conditions: ConditionCode[];
  allergies: Array<{ id: string; name: string; kind: "allergy" | "intolerance" }>;
  allergenCatalog: Array<{ id: string; name: string }>;
  conditionNames: Record<ConditionCode, string>;
}

export async function getProfileData(viewer: Viewer): Promise<ProfileData> {
  const [conditions, allergies, allergens, catalog] = await Promise.all([
    viewer.supabase.from("user_conditions").select("condition_code"),
    viewer.supabase.from("user_allergies").select("id, kind, free_text, allergens ( name )"),
    viewer.supabase.from("allergens").select("id, name").order("name"),
    viewer.supabase.from("conditions").select("code, name"),
  ]);
  const names = Object.fromEntries(check(catalog, "conditions").map((c) => [c.code, c.name]));
  return {
    conditions: check(conditions, "user_conditions")
      .map((c) => c.condition_code)
      .filter((c): c is ConditionCode => (CONDITION_CODES as readonly string[]).includes(c)),
    allergies: check(allergies, "user_allergies").map((a) => ({
      id: a.id,
      kind: a.kind,
      name: (a.allergens as { name: string } | null)?.name ?? a.free_text ?? "",
    })),
    allergenCatalog: check(allergens, "allergens"),
    conditionNames: Object.fromEntries(CONDITION_CODES.map((code) => [code, names[code] ?? code])) as Record<
      ConditionCode,
      string
    >,
  };
}

export interface RunDetail {
  id: string;
  inputKind: "barcode" | "manual" | "prescription_pdf";
  createdAt: string;
  requiresAlert: boolean;
  strategyCodes: string[];
  meal: { label: string | null; items: string[] } | null;
  findings: Array<{
    id: string;
    step: AnalysisStep;
    status: FindingStatus;
    severity: Severity | null;
    title: string;
    detail: string | null;
    message: string | null;
  }>;
}

export async function getRun(viewer: Viewer, id: string): Promise<RunDetail | null> {
  const run = check(
    await viewer.supabase
      .from("analysis_runs")
      .select(
        "id, input_kind, created_at, requires_alert, strategy_codes, meals ( label, meal_items ( raw_text ) ), " +
          "analysis_findings ( id, step, status, severity, title, detail, message, position )",
      )
      .eq("id", id)
      .maybeSingle(),
    "analysis_runs",
  ) as unknown as {
    id: string;
    input_kind: RunDetail["inputKind"];
    created_at: string;
    requires_alert: boolean;
    strategy_codes: string[];
    meals: { label: string | null; meal_items: Array<{ raw_text: string }> } | null;
    analysis_findings: Array<RunDetail["findings"][number] & { position: number }>;
  } | null;
  if (!run) return null;
  return {
    id: run.id,
    inputKind: run.input_kind,
    createdAt: run.created_at,
    requiresAlert: run.requires_alert,
    strategyCodes: run.strategy_codes,
    meal: run.meals ? { label: run.meals.label, items: run.meals.meal_items.map((i) => i.raw_text) } : null,
    findings: [...run.analysis_findings].sort((a, b) => a.position - b.position),
  };
}
