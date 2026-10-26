"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isConditionCode } from "@/domain/types";
import { SupabaseCatalogRepository } from "@/infra/SupabaseCatalogRepository";
import { AnalyzeRequestSchema } from "@/lib/api/analyze";
import { MEAL_LABELS } from "@/lib/time";
import { analyze, toErrorResult } from "@/server/analyze";
import { MESSAGES } from "@/server/errors";
import { createLogger } from "@/server/log";
import { getViewer, type Viewer } from "@/server/queries";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const GENERIC = "İşlem şu anda yapılamadı. Lütfen tekrar deneyin.";

async function requireViewer(): Promise<Viewer | null> {
  return getViewer();
}

function failed(error: unknown, what: string): { ok: false; error: string } {
  createLogger({ action: what }).error("action failed", { error });
  return { ok: false, error: GENERIC };
}

// ── Analysis ───────────────────────────────────────────────

const SubmitSchema = z.object({
  request: AnalyzeRequestSchema,
  mealLabel: z.enum(MEAL_LABELS as [string, ...string[]]).optional(),
});

/**
 * Runs an analysis with the same service as POST /api/analyze. For barcode/manual input a meal is
 * created first and removed again if the analysis fails.
 */
export async function submitAnalysis(input: unknown): Promise<ActionResult<{ runId: string; requiresAlert: boolean }>> {
  const viewer = await requireViewer();
  if (!viewer) return { ok: false, error: MESSAGES.unauthenticated };
  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MESSAGES.invalidBody };

  const logger = createLogger({ action: "submitAnalysis", userId: viewer.userId });
  const { request, mealLabel } = parsed.data;
  let mealId: string | undefined;

  try {
    if (request.inputKind !== "prescription_pdf" && !request.mealId) {
      const meal = await viewer.supabase.from("meals").insert({ label: mealLabel ?? null }).select("id").single();
      if (meal.error) throw meal.error;
      mealId = meal.data.id;
    }
    const result = await analyze(
      { supabase: viewer.supabase, userId: viewer.userId, logger },
      { ...request, mealId: request.mealId ?? mealId },
    );
    revalidatePath("/", "layout");
    return { ok: true, data: { runId: result.runId, requiresAlert: result.requiresAlert } };
  } catch (error) {
    if (mealId) await viewer.supabase.from("meals").delete().eq("id", mealId);
    return { ok: false, error: toErrorResult(error, logger).message };
  }
}

// ── Medications ────────────────────────────────────────────

export async function searchDrugs(query: string): Promise<ActionResult<Array<{ id: string; name: string; substances: string[] }>>> {
  const viewer = await requireViewer();
  if (!viewer) return { ok: false, error: MESSAGES.unauthenticated };
  const text = String(query ?? "").trim().slice(0, 100);
  if (text.length < 2) return { ok: true, data: [] };
  try {
    const products = await new SupabaseCatalogRepository(viewer.supabase).searchProducts(text, {
      kinds: ["drug", "supplement"],
      limit: 15,
    });
    return { ok: true, data: products.map((p) => ({ id: p.id, name: p.name, substances: p.substances.map((s) => s.name) })) };
  } catch (error) {
    return failed(error, "searchDrugs");
  }
}

const MedicationSchema = z.object({ productId: z.uuid(), dose: z.string().trim().max(100).optional() });

export async function addMedication(input: unknown): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!viewer) return { ok: false, error: MESSAGES.unauthenticated };
  const parsed = MedicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MESSAGES.invalidBody };
  const { error } = await viewer.supabase
    .from("user_medications")
    .insert({ product_id: parsed.data.productId, dose: parsed.data.dose || null });
  if (error) return failed(error, "addMedication");
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

const UpdateMedicationSchema = z.object({
  id: z.uuid(),
  dose: z.string().trim().max(100).nullable().optional(),
  active: z.boolean().optional(),
});

export async function updateMedication(input: unknown): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!viewer) return { ok: false, error: MESSAGES.unauthenticated };
  const parsed = UpdateMedicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MESSAGES.invalidBody };
  const { id, ...changes } = parsed.data;
  const patch: { dose?: string | null; active?: boolean } = {};
  if (changes.dose !== undefined) patch.dose = changes.dose || null;
  if (changes.active !== undefined) patch.active = changes.active;
  const { error } = await viewer.supabase.from("user_medications").update(patch).eq("id", id);
  if (error) return failed(error, "updateMedication");
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function removeMedication(id: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!viewer) return { ok: false, error: MESSAGES.unauthenticated };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: MESSAGES.invalidBody };
  const { error } = await viewer.supabase.from("user_medications").delete().eq("id", id);
  if (error) return failed(error, "removeMedication");
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

// ── Profile ────────────────────────────────────────────────

export async function setCondition(code: string, enabled: boolean): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!viewer) return { ok: false, error: MESSAGES.unauthenticated };
  if (!isConditionCode(code)) return { ok: false, error: MESSAGES.invalidBody };
  const { error } = enabled
    ? await viewer.supabase.from("user_conditions").upsert({ user_id: viewer.userId, condition_code: code })
    : await viewer.supabase.from("user_conditions").delete().eq("condition_code", code);
  if (error) return failed(error, "setCondition");
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

const AllergySchema = z
  .object({
    allergenId: z.uuid().nullable().optional(),
    freeText: z.string().trim().max(100).nullable().optional(),
    kind: z.enum(["allergy", "intolerance"]),
  })
  .refine((v) => Boolean(v.allergenId) || Boolean(v.freeText), { message: "allergen or text required" });

export async function addAllergy(input: unknown): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!viewer) return { ok: false, error: MESSAGES.unauthenticated };
  const parsed = AllergySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bir alerjen seçin veya adını yazın." };
  const { error } = await viewer.supabase.from("user_allergies").insert({
    allergen_id: parsed.data.allergenId || null,
    free_text: parsed.data.allergenId ? null : parsed.data.freeText || null,
    kind: parsed.data.kind,
  });
  if (error) return failed(error, "addAllergy");
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function removeAllergy(id: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!viewer) return { ok: false, error: MESSAGES.unauthenticated };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: MESSAGES.invalidBody };
  const { error } = await viewer.supabase.from("user_allergies").delete().eq("id", id);
  if (error) return failed(error, "removeAllergy");
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function signOut(): Promise<void> {
  const viewer = await requireViewer();
  await viewer?.supabase.auth.signOut();
  revalidatePath("/", "layout");
}
