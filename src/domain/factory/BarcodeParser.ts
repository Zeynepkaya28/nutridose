import { InvalidInputError } from "../errors";
import type { CatalogRepository } from "../repositories";
import type { AnalysisInput } from "../types";
import { itemFromProduct, readText, type InputParser } from "./InputParser";

export class BarcodeParser implements InputParser {
  constructor(private readonly catalog: CatalogRepository) {}

  async parse(raw: unknown): Promise<AnalysisInput> {
    const code = readText(raw, "barcode", "Barkod").replace(/[\s-]/g, "");
    if (!/^\d{8,14}$/.test(code)) {
      throw new InvalidInputError("Barkod 8–14 haneli bir sayı olmalı.");
    }
    const product = await this.catalog.findProductByBarcode(code);
    // Unknown barcodes stay in the input with no substances; the scan step reports them.
    const item = product ? itemFromProduct(product) : { rawText: code, substances: [] };
    return { kind: "barcode", items: [item] };
  }
}
