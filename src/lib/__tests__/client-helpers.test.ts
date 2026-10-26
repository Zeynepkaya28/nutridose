import { afterEach, describe, expect, it, vi } from "vitest";
import { requestAnalysis } from "@/lib/api/analyze";
import { nativeFormats, startBarcodeScan } from "@/lib/barcode/scanner";
import { MAX_PRESCRIPTION_BYTES } from "@/lib/prescriptions/constants";
import { prescriptionPath, validatePrescriptionFile } from "@/lib/prescriptions/upload";

const zxing = vi.hoisted(() => ({ stop: vi.fn(), callback: undefined as undefined | ((...args: unknown[]) => void) }));
vi.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: class {
    async decodeFromVideoElement(_video: unknown, cb: (...args: unknown[]) => void) {
      zxing.callback = cb;
      return { stop: zxing.stop };
    }
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("validatePrescriptionFile", () => {
  it("accepts a PDF up to 5 MB", () => {
    expect(validatePrescriptionFile({ type: "application/pdf", size: MAX_PRESCRIPTION_BYTES })).toBeNull();
  });
  it.each([
    [{ type: "image/png", size: 10 }, "Lütfen PDF formatında bir reçete seçin."],
    [{ type: "application/pdf", size: 0 }, "Seçilen dosya boş."],
    [{ type: "application/pdf", size: MAX_PRESCRIPTION_BYTES + 1 }, "Reçete dosyası 5 MB'tan büyük olamaz."],
  ])("rejects %o", (file, message) => {
    expect(validatePrescriptionFile(file)).toBe(message);
  });
  it("builds the storage path", () => {
    expect(prescriptionPath("u1", "f1")).toBe("u1/f1.pdf");
    expect(prescriptionPath("u1")).toMatch(/^u1\/[0-9a-f-]{36}\.pdf$/);
  });
});

describe("barcode scanner", () => {
  const video = {} as HTMLVideoElement;

  function nativeScope(supported: string[], results: Array<Array<{ rawValue: string }> | Error>) {
    const detect = vi.fn(async () => {
      const next = results.shift() ?? [];
      if (next instanceof Error) throw next;
      return next;
    });
    class BarcodeDetector {
      static getSupportedFormats = async () => supported;
      constructor(readonly options: { formats: string[] }) {}
      detect = detect;
    }
    return { scope: { BarcodeDetector }, detect };
  }

  it("uses only retail formats the native detector supports", async () => {
    expect(await nativeFormats({})).toBeNull();
    expect(await nativeFormats(nativeScope(["qr_code"], []).scope)).toBeNull();
    expect(await nativeFormats(nativeScope(["qr_code", "ean_13", "upc_a"], []).scope)).toEqual(["ean_13", "upc_a"]);
    const broken = { BarcodeDetector: { getSupportedFormats: async () => Promise.reject(new Error("x")) } };
    expect(await nativeFormats(broken)).toBeNull();
  });

  it("native: retries until a code is read, reports it once", async () => {
    vi.useFakeTimers();
    const { scope, detect } = nativeScope(["ean_13"], [new Error("not ready"), [], [{ rawValue: "8690000000017" }]]);
    const onCode = vi.fn();
    const controls = await startBarcodeScan(video, onCode, scope);
    expect(controls.engine).toBe("native");
    await vi.advanceTimersByTimeAsync(1000);
    expect(onCode).toHaveBeenCalledExactlyOnceWith("8690000000017");
    expect(detect).toHaveBeenCalledTimes(3);
    controls.stop();
  });

  it("native: stop ends the loop", async () => {
    vi.useFakeTimers();
    const { scope, detect } = nativeScope(["ean_13"], []);
    const controls = await startBarcodeScan(video, vi.fn(), scope);
    await vi.advanceTimersByTimeAsync(10);
    controls.stop();
    const calls = detect.mock.calls.length;
    await vi.advanceTimersByTimeAsync(2000);
    expect(detect.mock.calls.length).toBe(calls);
  });

  it("falls back to zxing and reports the first result once", async () => {
    const onCode = vi.fn();
    const controls = await startBarcodeScan(video, onCode, {});
    expect(controls.engine).toBe("zxing");
    const scanControls = { stop: vi.fn() };
    zxing.callback?.(undefined, new Error("no code"), scanControls);
    zxing.callback?.({ getText: () => "12345678" }, undefined, scanControls);
    zxing.callback?.({ getText: () => "99999999" }, undefined, scanControls);
    expect(onCode).toHaveBeenCalledExactlyOnceWith("12345678");
    expect(scanControls.stop).toHaveBeenCalledOnce();
    controls.stop();
    expect(zxing.stop).toHaveBeenCalled();
  });
});

describe("requestAnalysis", () => {
  const body = { inputKind: "manual", payload: { text: "muz" } } as const;

  it("returns the response on success", async () => {
    const result = { runId: "r", findings: [], requiresAlert: false };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(result));
    await expect(requestAnalysis(body)).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith("/api/analyze", expect.objectContaining({ method: "POST" }));
  });

  it("throws the API's Turkish message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ error: "Çok fazla istek" }, { status: 429 }));
    await expect(requestAnalysis(body)).rejects.toThrow("Çok fazla istek");
  });

  it("falls back to a generic message when the body is not JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("oops", { status: 502 }));
    await expect(requestAnalysis(body)).rejects.toThrow("Analiz şu anda yapılamadı. Lütfen tekrar deneyin.");
  });
});
