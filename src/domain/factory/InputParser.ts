import { InvalidInputError } from "../errors";
import type { AnalysisInput, AnalysisItem, InputKind, Product } from "../types";

export interface InputParser {
  parse(raw: unknown): Promise<AnalysisInput>;
}

/** Factory Method: each concrete creator decides which parser to build. */
export abstract class InputParserCreator {
  abstract readonly kind: InputKind;
  abstract createParser(): InputParser;

  async toInput(raw: unknown): Promise<AnalysisInput> {
    return this.createParser().parse(raw);
  }
}

/** Accepts either a plain string or an object with the given field. */
export function readText(raw: unknown, field: string, label: string): string {
  const value =
    typeof raw === "string"
      ? raw
      : typeof raw === "object" && raw !== null
        ? (raw as Record<string, unknown>)[field]
        : undefined;
  if (typeof value !== "string" || value.trim() === "") {
    throw new InvalidInputError(`${label} boş olamaz.`);
  }
  return value.trim();
}

export function itemFromProduct(product: Product, rawText = product.name): AnalysisItem {
  return { productId: product.id, rawText, substances: product.substances };
}
