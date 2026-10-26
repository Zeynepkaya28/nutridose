import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../errors";
import {
  BarcodeCreator,
  BarcodeParser,
  creatorFor,
  InputParserCreator,
  ManualTextCreator,
  ManualTextParser,
  MAX_MANUAL_ITEMS,
  MAX_MANUAL_TEXT_LENGTH,
  PrescriptionPdfCreator,
  PrescriptionPdfParser,
  readText,
  type InputParser,
} from "../factory";
import type { AnalysisInput } from "../types";
import { fakePdf, InMemoryCatalog, P, S, VALID_PDF_PATH } from "./fixtures";

describe("readText", () => {
  it("accepts a string or an object field", () => {
    expect(readText("  abc ", "x", "Alan")).toBe("abc");
    expect(readText({ x: "abc" }, "x", "Alan")).toBe("abc");
  });
  it.each([undefined, null, 42, {}, { x: 1 }, "   "])("rejects %j", (raw) => {
    expect(() => readText(raw, "x", "Alan")).toThrow(new InvalidInputError("Alan boş olamaz."));
  });
});

describe("BarcodeParser", () => {
  const parser = new BarcodeParser(new InMemoryCatalog());

  it("resolves a known barcode to its product", async () => {
    await expect(parser.parse("8690000000017")).resolves.toEqual({
      kind: "barcode",
      items: [{ productId: P.grapefruit.id, rawText: "Greyfurt suyu", substances: [S.furanocoumarin] }],
    });
  });

  it("accepts an object and strips spaces and dashes", async () => {
    const input = await parser.parse({ barcode: "869 0000-000024" });
    expect(input.items[0].productId).toBe(P.milk.id);
  });

  it("keeps unknown barcodes with no substances", async () => {
    await expect(parser.parse("12345678")).resolves.toEqual({
      kind: "barcode",
      items: [{ rawText: "12345678", substances: [] }],
    });
  });

  it.each(["1234", "123456789012345", "abcdefgh"])("rejects %s", async (code) => {
    await expect(parser.parse(code)).rejects.toThrow(InvalidInputError);
  });
});

describe("ManualTextParser", () => {
  it("matches products first, then substances, and keeps unknown entries", async () => {
    const catalog = new InMemoryCatalog();
    const input = await new ManualTextParser(catalog).parse("ıspanak, greyfurt suyu ve madde x, uçan halı");
    expect(input).toEqual({
      kind: "manual",
      items: [
        { productId: P.spinach.id, rawText: "ıspanak", substances: [S.vitaminK] },
        { productId: P.grapefruit.id, rawText: "greyfurt suyu", substances: [S.furanocoumarin] },
        { rawText: "madde x", substances: [S.drugX] },
        { rawText: "uçan halı", substances: [] },
      ],
    });
  });

  it("accepts { text }", async () => {
    const input = await new ManualTextParser(new InMemoryCatalog()).parse({ text: "muz" });
    expect(input.items.map((i) => i.productId)).toEqual([P.banana.id]);
  });

  it("rejects text that is too long", async () => {
    const parser = new ManualTextParser(new InMemoryCatalog());
    await expect(parser.parse("a".repeat(MAX_MANUAL_TEXT_LENGTH + 1))).rejects.toThrow(InvalidInputError);
  });

  it("rejects too many entries", async () => {
    const parser = new ManualTextParser(new InMemoryCatalog());
    const text = Array.from({ length: MAX_MANUAL_ITEMS + 1 }, (_, i) => `x${i}`).join(",");
    await expect(parser.parse(text)).rejects.toThrow(InvalidInputError);
  });
});

describe("PrescriptionPdfParser", () => {
  it("keeps only lines that match a drug, once per product", async () => {
    const pdf = fakePdf(
      ["Dr. Ayşe Yılmaz", "Tarih: 01.10.2026", "Atorvastatin 20 mg 1x1", "Varfarin 5 mg", "atorvastatin", "x", ""].join(
        "\r\n",
      ),
    );
    const input = await new PrescriptionPdfParser(pdf, new InMemoryCatalog()).parse({ storagePath: VALID_PDF_PATH });
    expect(pdf.paths).toEqual([VALID_PDF_PATH]);
    expect(input).toEqual({
      kind: "prescription_pdf",
      items: [
        { productId: P.atorvastatin.id, rawText: P.atorvastatin.name, substances: [S.atorvastatin] },
        { productId: P.warfarin.id, rawText: P.warfarin.name, substances: [S.warfarin] },
      ],
    });
  });

  it("does not match foods in a prescription", async () => {
    const pdf = fakePdf("Greyfurt suyu");
    const input = await new PrescriptionPdfParser(pdf, new InMemoryCatalog()).parse(VALID_PDF_PATH);
    expect(input.items).toEqual([]);
  });

  it.each(["../etc/passwd", "abc/def.pdf", VALID_PDF_PATH.replace(".pdf", ".exe")])(
    "rejects path %s without reading it",
    async (path) => {
      const pdf = fakePdf("Varfarin");
      await expect(new PrescriptionPdfParser(pdf, new InMemoryCatalog()).parse(path)).rejects.toThrow(
        InvalidInputError,
      );
      expect(pdf.paths).toEqual([]);
    },
  );
});

describe("creators (Factory Method)", () => {
  const catalog = new InMemoryCatalog();
  const pdf = fakePdf("Varfarin");

  it("each creator builds its own parser", () => {
    expect(new BarcodeCreator(catalog).createParser()).toBeInstanceOf(BarcodeParser);
    expect(new ManualTextCreator(catalog).createParser()).toBeInstanceOf(ManualTextParser);
    expect(new PrescriptionPdfCreator(catalog, pdf).createParser()).toBeInstanceOf(PrescriptionPdfParser);
  });

  it("toInput delegates to the created parser", async () => {
    const result: AnalysisInput = { kind: "manual", items: [] };
    class StubCreator extends InputParserCreator {
      readonly kind = "manual" as const;
      createParser(): InputParser {
        return { parse: async () => result };
      }
    }
    await expect(new StubCreator().toInput("x")).resolves.toBe(result);
    await expect(new BarcodeCreator(catalog).toInput("8690000000024")).resolves.toMatchObject({ kind: "barcode" });
  });

  it("creatorFor picks the creator by kind", () => {
    expect(creatorFor("barcode", { catalog })).toBeInstanceOf(BarcodeCreator);
    expect(creatorFor("manual", { catalog })).toBeInstanceOf(ManualTextCreator);
    const pdfCreator = creatorFor("prescription_pdf", { catalog, pdfText: pdf });
    expect(pdfCreator).toBeInstanceOf(PrescriptionPdfCreator);
    expect(pdfCreator.kind).toBe("prescription_pdf");
  });

  it("creatorFor needs a PDF extractor for prescriptions", () => {
    expect(() => creatorFor("prescription_pdf", { catalog })).toThrow(/PdfTextExtractor/);
  });
});
