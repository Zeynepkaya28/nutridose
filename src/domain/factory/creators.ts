import type { CatalogRepository, PdfTextExtractor } from "../repositories";
import type { InputKind } from "../types";
import { BarcodeParser } from "./BarcodeParser";
import { InputParserCreator, type InputParser } from "./InputParser";
import { ManualTextParser } from "./ManualTextParser";
import { PrescriptionPdfParser } from "./PrescriptionPdfParser";

export class BarcodeCreator extends InputParserCreator {
  readonly kind = "barcode" as const;
  constructor(private readonly catalog: CatalogRepository) {
    super();
  }
  createParser(): InputParser {
    return new BarcodeParser(this.catalog);
  }
}

export class ManualTextCreator extends InputParserCreator {
  readonly kind = "manual" as const;
  constructor(private readonly catalog: CatalogRepository) {
    super();
  }
  createParser(): InputParser {
    return new ManualTextParser(this.catalog);
  }
}

export class PrescriptionPdfCreator extends InputParserCreator {
  readonly kind = "prescription_pdf" as const;
  constructor(
    private readonly catalog: CatalogRepository,
    private readonly extractor: PdfTextExtractor,
  ) {
    super();
  }
  createParser(): InputParser {
    return new PrescriptionPdfParser(this.extractor, this.catalog);
  }
}

export interface CreatorDeps {
  catalog: CatalogRepository;
  pdfText?: PdfTextExtractor;
}

/** Picks the concrete creator for an input kind. */
export function creatorFor(kind: InputKind, deps: CreatorDeps): InputParserCreator {
  switch (kind) {
    case "barcode":
      return new BarcodeCreator(deps.catalog);
    case "manual":
      return new ManualTextCreator(deps.catalog);
    case "prescription_pdf":
      if (!deps.pdfText) throw new Error("PrescriptionPdfCreator needs a PdfTextExtractor.");
      return new PrescriptionPdfCreator(deps.catalog, deps.pdfText);
  }
}
