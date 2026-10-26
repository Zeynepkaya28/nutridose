import { describe, expect, it, vi } from "vitest";
import { InvalidInputError } from "@/domain";
import { looksLikePdf, SupabasePdfTextExtractor } from "@/infra/SupabasePdfTextExtractor";
import { AnalyzeRequestSchema } from "@/lib/api/analyze";
import { MAX_PRESCRIPTION_BYTES } from "@/lib/prescriptions/constants";
import { toErrorResult } from "@/server/analyze";
import { MESSAGES, UserFacingError } from "@/server/errors";
import { createLogger } from "@/server/log";
import { buildPdf } from "@/test/pdf";

const silentLogger = () => {
  const logger = { info: vi.fn(), error: vi.fn(), child: vi.fn() };
  logger.child.mockReturnValue(logger);
  return logger;
};

describe("AnalyzeRequestSchema", () => {
  it("accepts each input kind", () => {
    for (const body of [
      { inputKind: "barcode", payload: { barcode: "8690000000017" } },
      { inputKind: "manual", payload: { text: "ıspanak" }, mealId: "11111111-1111-4111-8111-111111111111" },
      { inputKind: "prescription_pdf", payload: { storagePath: "a/b.pdf" } },
    ]) {
      expect(AnalyzeRequestSchema.safeParse(body).success).toBe(true);
    }
  });
  it.each([
    {},
    { inputKind: "fax", payload: {} },
    { inputKind: "manual", payload: { barcode: "1" } },
    { inputKind: "manual", payload: { text: "   " } },
    { inputKind: "manual", payload: { text: "x".repeat(2001) } },
    { inputKind: "manual", payload: { text: "x" }, mealId: "not-a-uuid" },
  ])("rejects %j", (body) => {
    expect(AnalyzeRequestSchema.safeParse(body).success).toBe(false);
  });
});

describe("toErrorResult", () => {
  it("shows user-facing and input errors, hides everything else", () => {
    const logger = silentLogger();
    expect(toErrorResult(new UserFacingError("Öğün yok", 404), logger)).toEqual({ status: 404, message: "Öğün yok" });
    expect(toErrorResult(new InvalidInputError("Barkod hatalı"), logger)).toEqual({ status: 400, message: "Barkod hatalı" });
    expect(logger.error).not.toHaveBeenCalled();

    const internal = Object.assign(new Error('relation "x" does not exist'), { code: "42P01" });
    expect(toErrorResult(internal, logger)).toEqual({ status: 500, message: MESSAGES.unexpected });
    expect(logger.error).toHaveBeenCalledWith("unexpected error", { error: internal });
  });

  it("logs user-facing errors that carry a cause", () => {
    const logger = silentLogger();
    toErrorResult(new UserFacingError("PDF okunamadı", 422, { cause: new Error("bad xref") }), logger);
    expect(logger.error).toHaveBeenCalledOnce();
  });
});

describe("createLogger", () => {
  it("writes one JSON line with base fields and summarised errors", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = createLogger({ requestId: "r1" }).child({ userId: "u1" });
    logger.info("ok", { n: 1 });
    logger.error("boom", { error: Object.assign(new Error("db down"), { code: "XX000" }) });
    logger.error("plain", { error: new Error("no code") });
    expect(JSON.parse(info.mock.calls[0][0] as string)).toMatchObject({ level: "info", message: "ok", requestId: "r1", userId: "u1", n: 1 });
    expect(JSON.parse(error.mock.calls[0][0] as string).error).toEqual({ name: "Error", message: "db down", code: "XX000" });
    expect(JSON.parse(error.mock.calls[1][0] as string).error).toEqual({ name: "Error", message: "no code" });
  });
});

describe("SupabasePdfTextExtractor", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const path = `${userId}/22222222-2222-4222-8222-222222222222.pdf`;

  function client(result: { data: Blob | null; error: unknown }) {
    const download = vi.fn(async () => result);
    const supabase = { storage: { from: vi.fn(() => ({ download })) } };
    return { supabase: supabase as never, download };
  }

  it("recognises the PDF signature", () => {
    expect(looksLikePdf(buildPdf(["x"]))).toBe(true);
    expect(looksLikePdf(new TextEncoder().encode("hello"))).toBe(false);
    expect(looksLikePdf(new Uint8Array([0x25]))).toBe(false);
  });

  it("refuses another user's folder without downloading", async () => {
    const { supabase, download } = client({ data: null, error: null });
    await expect(new SupabasePdfTextExtractor(supabase, "someone-else").extractText(path)).rejects.toMatchObject({ status: 404 });
    expect(download).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", { data: null, error: new Error("not found") }, 404],
    ["too large", { data: new Blob([new Uint8Array(MAX_PRESCRIPTION_BYTES + 1)], { type: "application/pdf" }), error: null }, 413],
    ["wrong type", { data: new Blob(["%PDF-1.4"], { type: "image/png" }), error: null }, 415],
    ["not a PDF", { data: new Blob(["hello"], { type: "application/pdf" }), error: null }, 415],
  ])("rejects %s files", async (_label, result, status) => {
    const { supabase } = client(result);
    await expect(new SupabasePdfTextExtractor(supabase, userId).extractText(path)).rejects.toMatchObject({ status });
  });

  it("parses a valid PDF and maps parser failures to 422", async () => {
    const pdf = new Blob([buildPdf(["Varfarin 5 mg"]) as BlobPart], { type: "application/pdf" });
    const { supabase } = client({ data: pdf, error: null });
    await expect(new SupabasePdfTextExtractor(supabase, userId).extractText(path)).resolves.toContain("Varfarin 5 mg");

    const failing = new SupabasePdfTextExtractor(supabase, userId, async () => {
      throw new Error("bad xref");
    });
    await expect(failing.extractText(path)).rejects.toMatchObject({ status: 422, message: MESSAGES.prescriptionUnreadable });
  });

  it("accepts a blob without a declared type when the bytes are a PDF", async () => {
    const { supabase } = client({ data: new Blob([buildPdf(["Atorvastatin"]) as BlobPart]), error: null });
    await expect(new SupabasePdfTextExtractor(supabase, userId, async () => "ok").extractText(path)).resolves.toBe("ok");
  });
});
