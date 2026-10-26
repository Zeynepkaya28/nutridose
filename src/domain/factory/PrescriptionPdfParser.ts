import { InvalidInputError } from "../errors";
import type { CatalogRepository, PdfTextExtractor } from "../repositories";
import type { AnalysisInput, AnalysisItem } from "../types";
import { itemFromProduct, readText, type InputParser } from "./InputParser";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
/** Same shape the storage policy enforces: {user_id}/{uuid}.pdf */
export const PRESCRIPTION_PATH = new RegExp(`^${UUID}/${UUID}\.pdf$`);
export const MAX_PRESCRIPTION_LINES = 200;

export class PrescriptionPdfParser implements InputParser {
  constructor(
    private readonly extractor: PdfTextExtractor,
    private readonly catalog: CatalogRepository,
  ) {}

  async parse(raw: unknown): Promise<AnalysisInput> {
    const path = readText(raw, "storagePath", "Reçete dosyası");
    if (!PRESCRIPTION_PATH.test(path)) {
      throw new InvalidInputError("Reçete dosyası geçersiz. Lütfen PDF'i yeniden yükleyin.");
    }
    const text = await this.extractor.extractText(path);
    const lines = [...new Set(text.split(/\r?\n/).map((line) => line.trim()))]
      .filter((line) => line.length >= 3)
      .slice(0, MAX_PRESCRIPTION_LINES);

    // Prescriptions contain a lot of noise (doctor, dates, notes); keep only lines that match a drug.
    const matches = await Promise.all(
      lines.map((line) => this.catalog.searchProducts(line, { kinds: ["drug"], limit: 1 })),
    );
    const items = new Map<string, AnalysisItem>();
    for (const [product] of matches) {
      if (product && !items.has(product.id)) items.set(product.id, itemFromProduct(product));
    }
    return { kind: "prescription_pdf", items: [...items.values()] };
  }
}
