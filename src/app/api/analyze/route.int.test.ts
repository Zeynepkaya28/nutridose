// End-to-end: POST /api/analyze against the local Supabase stack (seed.sql data).
// Run with: npm run test:integration
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AnalyzeResponse } from "@/lib/api/analyze";
import { MESSAGES } from "@/server/errors";
import { RATE_LIMIT_PER_MINUTE } from "@/server/analyze";
import { buildPdf } from "@/test/pdf";
import { adminClient, createTestUser, deleteTestUser, type TestUser } from "@/test/supabase-users";
import { POST } from "./route";

// Fixed ids from supabase/seed.sql
const PRODUCT = {
  warfarin: "20000000-0000-4000-8000-000000000001",
  atorvastatin: "20000000-0000-4000-8000-000000000002",
};
const INTERACTION = {
  grapefruitStatinCardio: "30000000-0000-4000-8000-000000000004",
  vitaminKWarfarin: "30000000-0000-4000-8000-000000000002",
};

const admin = adminClient();
let alice: TestUser; // cardiology, warfarin + atorvastatin
let bob: TestUser; // no profile

async function call(body: unknown, user?: TestUser, raw?: string) {
  const response = await POST(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(user ? { authorization: `Bearer ${user.accessToken}` } : {}),
      },
      body: raw ?? JSON.stringify(body),
    }),
  );
  return { status: response.status, headers: response.headers, json: await response.json() };
}

async function uploadPdf(user: TestUser, bytes: Uint8Array, folder = user.id) {
  const path = `${folder}/${randomUUID()}.pdf`;
  const { error } = await user.client.storage
    .from("prescriptions")
    .upload(path, new Blob([bytes as BlobPart], { type: "application/pdf" }), { contentType: "application/pdf" });
  if (error) throw error;
  return path;
}

beforeAll(async () => {
  [alice, bob] = await Promise.all([createTestUser(admin), createTestUser(admin)]);
  // Profile setup as the user (RLS), not with the admin client.
  const conditions = await alice.client.from("user_conditions").insert({ condition_code: "cardiology" });
  const medications = await alice.client.from("user_medications").insert([
    { product_id: PRODUCT.warfarin, dose: "5 mg" },
    { product_id: PRODUCT.atorvastatin, dose: "20 mg" },
  ]);
  if (conditions.error || medications.error) throw conditions.error ?? medications.error;
});

afterAll(async () => {
  await Promise.all([alice, bob].filter(Boolean).map((user) => deleteTestUser(admin, user)));
});

describe("POST /api/analyze", () => {
  it("reference scenario: cardiology, ıspanak + greyfurt suyu with warfarin + atorvastatin", async () => {
    const { status, json } = await call({ inputKind: "manual", payload: { text: "ıspanak, greyfurt suyu" } }, alice);
    expect(status).toBe(200);
    const result = json as AnalyzeResponse;

    expect([...new Set(result.findings.map((f) => f.step))]).toEqual([
      "ingredient_scan",
      "drug_food",
      "dose_limit",
      "tolerance_allergy",
    ]);
    const step2 = result.findings.filter((f) => f.step === "drug_food");
    expect(step2.map((f) => [f.title, f.status, f.interactionId])).toEqual([
      ["greyfurt suyu ↔ Atorvastatin 20 mg tablet", "high", INTERACTION.grapefruitStatinCardio],
      ["ıspanak ↔ Varfarin 5 mg tablet", "caution", INTERACTION.vitaminKWarfarin],
    ]);
    expect(step2[1].message).toContain("Kardiyoloji profilinize göre önemli");
    expect(result.requiresAlert).toBe(true);

    // Saved as Alice, in order; invisible to Bob.
    const saved = await alice.client
      .from("analysis_findings")
      .select("step, status, title, position")
      .eq("run_id", result.runId)
      .order("position");
    expect(saved.data?.map((f) => f.title)).toEqual(result.findings.map((f) => f.title));
    const run = await alice.client.from("analysis_runs").select("input_kind, strategy_codes").eq("id", result.runId).single();
    expect(run.data).toEqual({ input_kind: "manual", strategy_codes: ["cardiology"] });
    const asBob = await bob.client.from("analysis_runs").select("id").eq("id", result.runId);
    expect(asBob.data).toEqual([]);
  });

  it("same meal without a profile: high but no alert", async () => {
    const { status, json } = await call({ inputKind: "manual", payload: { text: "ıspanak, greyfurt suyu" } }, bob);
    expect(status).toBe(200);
    expect((json as AnalyzeResponse).requiresAlert).toBe(false);
    expect((json as AnalyzeResponse).findings.find((f) => f.step === "drug_food")?.title).toBe("Bilinen etkileşim bulunmadı");
  });

  it("barcode input", async () => {
    const { status, json } = await call({ inputKind: "barcode", payload: { barcode: "0000000000017" } }, alice);
    expect(status).toBe(200);
    const step2 = (json as AnalyzeResponse).findings.filter((f) => f.step === "drug_food");
    expect(step2.map((f) => f.title)).toEqual(["Greyfurt suyu ↔ Atorvastatin 20 mg tablet"]);
  });

  it("prescription PDF uploaded to storage", async () => {
    const path = await uploadPdf(alice, buildPdf(["Dr. Test", "Tarih: 01.10.2026", "Atorvastatin 20 mg 1x1", "Varfarin 5 mg"]));
    const { status, json } = await call({ inputKind: "prescription_pdf", payload: { storagePath: path } }, alice);
    expect(status).toBe(200);
    expect((json as AnalyzeResponse).findings[0]).toMatchObject({ step: "ingredient_scan", status: "pass", title: "2 kalem tanındı" });
  });

  it("cannot analyse another user's prescription", async () => {
    const path = await uploadPdf(alice, buildPdf(["Varfarin 5 mg"]));
    const { status, json } = await call({ inputKind: "prescription_pdf", payload: { storagePath: path } }, bob);
    expect(status).toBe(404);
    expect(json).toEqual({ error: MESSAGES.prescriptionNotFound });
  });

  it("rejects a file that is not really a PDF", async () => {
    const path = await uploadPdf(alice, new TextEncoder().encode("not a pdf"));
    const { status, json } = await call({ inputKind: "prescription_pdf", payload: { storagePath: path } }, alice);
    expect(status).toBe(415);
    expect(json).toEqual({ error: MESSAGES.prescriptionNotPdf });
  });

  it("storage refuses uploads into someone else's folder", async () => {
    await expect(uploadPdf(bob, buildPdf(["x"]), alice.id)).rejects.toThrow();
  });

  it("rejects someone else's meal", async () => {
    const meal = await alice.client.from("meals").insert({ label: "Kahvaltı" }).select("id").single();
    const { status, json } = await call(
      { inputKind: "manual", payload: { text: "muz" }, mealId: meal.data!.id },
      bob,
    );
    expect(status).toBe(404);
    expect(json).toEqual({ error: MESSAGES.mealNotFound });
    const own = await call({ inputKind: "manual", payload: { text: "muz" }, mealId: meal.data!.id }, alice);
    expect(own.status).toBe(200);
  });

  it("401 without a session, 401 with a bad token", async () => {
    expect(await call({ inputKind: "manual", payload: { text: "muz" } })).toMatchObject({
      status: 401,
      json: { error: MESSAGES.unauthenticated },
    });
    const forged = { ...alice, accessToken: `${alice.accessToken.slice(0, -4)}AAAA` };
    expect((await call({ inputKind: "manual", payload: { text: "muz" } }, forged)).status).toBe(401);
  });

  it("400 with a Turkish message for bad input, no technical details", async () => {
    expect(await call({ inputKind: "manual" }, alice)).toMatchObject({ status: 400, json: { error: MESSAGES.invalidBody } });
    expect(await call(undefined, alice, "{not json")).toMatchObject({ status: 400, json: { error: MESSAGES.badRequest } });
    const barcode = await call({ inputKind: "barcode", payload: { barcode: "12" } }, alice);
    expect(barcode).toMatchObject({ status: 400, json: { error: "Barkod 8–14 haneli bir sayı olmalı." } });
  });

  // Optional: same checks over real HTTP against a running server (next dev / next start / preview).
  // NUTRIDOSE_BASE_URL=http://localhost:3000 npm run test:integration
  const baseUrl = process.env.NUTRIDOSE_BASE_URL;
  it.runIf(baseUrl)("over HTTP: scenario, prescription PDF, cookie-less 401", async () => {
    const post = (body: unknown, user?: TestUser) =>
      fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(user ? { authorization: `Bearer ${user.accessToken}` } : {}),
        },
        body: JSON.stringify(body),
      });

    const scenario = await post({ inputKind: "manual", payload: { text: "ıspanak, greyfurt suyu" } }, alice);
    expect(scenario.status).toBe(200);
    expect(((await scenario.json()) as AnalyzeResponse).requiresAlert).toBe(true);

    const path = await uploadPdf(alice, buildPdf(["Atorvastatin 20 mg 1x1", "Varfarin 5 mg"]));
    const pdf = await post({ inputKind: "prescription_pdf", payload: { storagePath: path } }, alice);
    expect(pdf.status).toBe(200);
    expect(((await pdf.json()) as AnalyzeResponse).findings[0].title).toBe("2 kalem tanındı");

    const anonymous = await post({ inputKind: "manual", payload: { text: "muz" } });
    expect(anonymous.status).toBe(401);
    expect(await anonymous.json()).toEqual({ error: MESSAGES.unauthenticated });
  });

  it(`rate limit: ${RATE_LIMIT_PER_MINUTE} analyses per minute per user`, async () => {
    const carol = await createTestUser(admin);
    try {
      // Use up the quota directly (same counter the API uses).
      for (let i = 0; i < RATE_LIMIT_PER_MINUTE; i++) {
        const { data } = await carol.client.rpc("consume_analysis_quota", {});
        expect(data).toBe(true);
      }
      const limited = await call({ inputKind: "manual", payload: { text: "muz" } }, carol);
      expect(limited.status).toBe(429);
      expect(limited.json).toEqual({ error: MESSAGES.rateLimited });
      expect(limited.headers.get("retry-after")).toBe("60");

      // Users cannot reset their own counter.
      await carol.client.from("analysis_rate_events").delete().eq("user_id", carol.id);
      const after = await call({ inputKind: "manual", payload: { text: "muz" } }, carol);
      expect(after.status).toBe(429);

      // Another user is unaffected.
      expect((await call({ inputKind: "manual", payload: { text: "muz" } }, bob)).status).toBe(200);
    } finally {
      await deleteTestUser(admin, carol);
    }
  });
});
