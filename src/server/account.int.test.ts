// Sign-up trigger and account deletion against the local Supabase stack.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { buildPdf } from "@/test/pdf";
import { adminClient, createTestUser, deleteTestUser, type TestUser } from "@/test/supabase-users";
import { deleteAccount } from "./account";

const admin = adminClient();
const leftovers: TestUser[] = [];

const USER_TABLES = [
  "profiles",
  "user_conditions",
  "user_allergies",
  "user_medications",
  "meals",
  "meal_items",
  "analysis_runs",
  "analysis_findings",
  "analysis_rate_events",
] as const;

async function countRows(userId: string) {
  const counts: Record<string, number> = {};
  for (const table of USER_TABLES) {
    const { count, error } = await admin.from(table).select("*", { count: "exact", head: true }).eq("user_id", userId);
    if (error) throw error;
    counts[table] = count ?? 0;
  }
  return counts;
}

afterAll(async () => {
  for (const user of leftovers) await deleteTestUser(admin, user).catch(() => undefined);
});

describe("account lifecycle", () => {
  it("creates a profile row on sign-up", async () => {
    const user = await createTestUser(admin);
    leftovers.push(user);
    const { data } = await user.client.from("profiles").select("user_id, display_name, onboarded_at").single();
    expect(data).toMatchObject({ user_id: user.id, onboarded_at: null });
    expect(data?.display_name).toMatch(/^test-/);
  });

  it("deleting the account removes every row and file", async () => {
    const user = await createTestUser(admin);
    leftovers.push(user);
    const c = user.client;

    // Fill every user table as the user (RLS), plus a prescription file.
    await c.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("user_id", user.id);
    expect((await c.from("user_conditions").insert({ condition_code: "renal" })).error).toBeNull();
    expect((await c.from("user_allergies").insert({ free_text: "fıstık", kind: "allergy" })).error).toBeNull();
    expect((await c.from("user_medications").insert({ product_id: "20000000-0000-4000-8000-000000000001" })).error).toBeNull();
    const meal = await c.from("meals").insert({ label: "Kahvaltı" }).select("id").single();
    expect(meal.error).toBeNull();
    expect((await c.rpc("consume_analysis_quota", {})).error).toBeNull();
    const run = await c.rpc("save_analysis_run", {
      p_input_kind: "manual",
      p_strategy_codes: ["renal"],
      p_findings: [{ step: "ingredient_scan", status: "pass", title: "1 kalem tanındı" }],
      p_meal_id: meal.data!.id,
      p_meal_items: [{ raw_text: "muz", product_id: null }],
    });
    expect(run.error).toBeNull();
    const path = `${user.id}/${randomUUID()}.pdf`;
    const upload = await c.storage
      .from("prescriptions")
      .upload(path, new Blob([buildPdf(["Varfarin"]) as BlobPart], { type: "application/pdf" }), { contentType: "application/pdf" });
    expect(upload.error).toBeNull();

    const before = await countRows(user.id);
    expect(Object.values(before).every((n) => n > 0)).toBe(true);

    await deleteAccount(c, user.id);

    expect(await countRows(user.id)).toEqual(Object.fromEntries(USER_TABLES.map((t) => [t, 0])));
    const files = await admin.storage.from("prescriptions").list(user.id);
    expect(files.data ?? []).toEqual([]);
    const { data: authUser } = await admin.auth.admin.getUserById(user.id);
    expect(authUser.user).toBeNull();
    leftovers.pop();
  });
});
