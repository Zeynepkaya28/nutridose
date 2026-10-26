import { InvalidInputError } from "../errors";
import type { CatalogRepository } from "../repositories";
import type { AnalysisInput, AnalysisItem } from "../types";
import { splitManualText } from "../text";
import { itemFromProduct, readText, type InputParser } from "./InputParser";

export const MAX_MANUAL_TEXT_LENGTH = 2000;
export const MAX_MANUAL_ITEMS = 30;

export class ManualTextParser implements InputParser {
  constructor(private readonly catalog: CatalogRepository) {}

  async parse(raw: unknown): Promise<AnalysisInput> {
    const text = readText(raw, "text", "Metin");
    if (text.length > MAX_MANUAL_TEXT_LENGTH) {
      throw new InvalidInputError(`Metin en fazla ${MAX_MANUAL_TEXT_LENGTH} karakter olabilir.`);
    }
    const entries = splitManualText(text);
    if (entries.length > MAX_MANUAL_ITEMS) {
      throw new InvalidInputError(`Bir seferde en fazla ${MAX_MANUAL_ITEMS} kalem girilebilir.`);
    }
    const items = await Promise.all(entries.map((entry) => this.resolve(entry)));
    return { kind: "manual", items };
  }

  private async resolve(entry: string): Promise<AnalysisItem> {
    const [product] = await this.catalog.searchProducts(entry, { limit: 1 });
    if (product) return itemFromProduct(product, entry);
    return { rawText: entry, substances: await this.catalog.findSubstances(entry) };
  }
}
