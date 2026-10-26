// Test-only catalog. Interaction rows are placeholders for exercising the code, not clinical data.
import type { CatalogRepository, PdfTextExtractor } from "../repositories";
import { normalize, substanceKeys } from "../text";
import type {
  Allergen,
  AnalysisInput,
  AnalysisItem,
  Interaction,
  NutrientLimit,
  Product,
  ProductKind,
  SubstanceRef,
  UserProfile,
} from "../types";

export const S = {
  warfarin: { id: "s-warfarin", name: "Varfarin", synonyms: ["warfarin"] },
  atorvastatin: { id: "s-atorvastatin", name: "Atorvastatin", synonyms: [] },
  vitaminK: { id: "s-vitk", name: "K vitamini", synonyms: ["vitamin K"] },
  furanocoumarin: { id: "s-furano", name: "Furanokumarin", synonyms: [] },
  calcium: { id: "s-calcium", name: "Kalsiyum", synonyms: ["calcium"] },
  iron: { id: "s-iron", name: "Demir", synonyms: ["iron"] },
  potassium: { id: "s-potassium", name: "Potasyum", synonyms: ["potassium"] },
  lactose: { id: "s-lactose", name: "Laktoz", synonyms: ["lactose"] },
  drugX: { id: "s-drugx", name: "Madde X", synonyms: [] },
} satisfies Record<string, SubstanceRef>;

export const P = {
  warfarin: { id: "p-warfarin", kind: "drug", name: "Varfarin 5 mg tablet", substances: [S.warfarin] },
  atorvastatin: { id: "p-atorvastatin", kind: "drug", name: "Atorvastatin 20 mg tablet", substances: [S.atorvastatin] },
  spinach: { id: "p-spinach", kind: "food", name: "Ispanak", substances: [S.vitaminK] },
  grapefruit: {
    id: "p-grapefruit",
    kind: "food",
    name: "Greyfurt suyu",
    barcode: "8690000000017",
    substances: [S.furanocoumarin],
  },
  milk: { id: "p-milk", kind: "food", name: "Süt", barcode: "8690000000024", substances: [S.calcium, S.lactose] },
  ironSupplement: { id: "p-iron", kind: "supplement", name: "Demir takviyesi", substances: [S.iron] },
  banana: {
    id: "p-banana",
    kind: "food",
    name: "Muz",
    substances: [{ ...S.potassium, amount: 400, unit: "mg" }],
  },
} satisfies Record<string, Product>;

const SAMPLE = "TEST – klinik veri değil";

export const I = {
  grapefruitStatin: interaction("i-1", S.furanocoumarin, S.atorvastatin, "high", null, { advice: "Öneri metni" }),
  grapefruitStatinCardio: interaction("i-1c", S.furanocoumarin, S.atorvastatin, "contraindicated", "cardiology"),
  vitaminKWarfarin: interaction("i-2", S.vitaminK, S.warfarin, "caution", null, { mechanism: "Mekanizma metni" }),
  calciumIron: interaction("i-3", S.calcium, S.iron, "info", null),
  warfarinStatin: interaction("i-4", S.warfarin, S.atorvastatin, "high", null),
  drugXPotassiumRenal: interaction("i-5", S.drugX, S.potassium, "caution", "renal"),
};

export function interaction(
  id: string,
  a: SubstanceRef,
  b: SubstanceRef,
  severity: Interaction["severity"],
  conditionCode: Interaction["conditionCode"],
  text: { mechanism?: string; advice?: string } = {},
): Interaction {
  return { id, substanceA: a, substanceB: b, severity, conditionCode, evidenceSource: SAMPLE, ...text };
}

export function limit(
  id: string,
  substanceId: string,
  upperLimit: number,
  unit: string,
  conditionCode: NutrientLimit["conditionCode"] = null,
): NutrientLimit {
  return { id, substanceId, upperLimit, unit, conditionCode, period: "day", source: SAMPLE };
}

export const A = {
  milk: { id: "a-milk", name: "Süt / laktoz", crossReactiveSubstanceIds: [S.lactose.id] },
} satisfies Record<string, Allergen>;

export interface CatalogData {
  products?: Product[];
  substances?: SubstanceRef[];
  interactions?: Interaction[];
  limits?: NutrientLimit[];
  allergens?: Allergen[];
}

export class InMemoryCatalog implements CatalogRepository {
  readonly calls: string[] = [];
  private readonly products: Product[];
  private readonly substances: SubstanceRef[];
  private readonly interactions: Interaction[];
  private readonly limits: NutrientLimit[];
  private readonly allergens: Allergen[];

  constructor(data: CatalogData = {}) {
    this.products = data.products ?? Object.values(P);
    this.substances = data.substances ?? Object.values(S);
    this.interactions = data.interactions ?? Object.values(I);
    this.limits = data.limits ?? [];
    this.allergens = data.allergens ?? Object.values(A);
  }

  async findProductByBarcode(barcode: string) {
    this.calls.push("findProductByBarcode");
    return this.products.find((p) => p.barcode === barcode) ?? null;
  }

  async searchProducts(text: string, options: { kinds?: ProductKind[]; limit?: number } = {}) {
    this.calls.push("searchProducts");
    const query = normalize(text);
    return this.products
      .filter((p) => !options.kinds || options.kinds.includes(p.kind))
      .filter((p) => {
        const name = normalize(p.name);
        return (
          name.includes(query) ||
          query.includes(name) ||
          p.substances.some((s) => substanceKeys(s).some((key) => query.split(" ").includes(key)))
        );
      })
      .slice(0, options.limit ?? 10);
  }

  async findSubstances(text: string) {
    this.calls.push("findSubstances");
    const query = normalize(text);
    return this.substances.filter((s) => substanceKeys(s).includes(query));
  }

  async getInteractions(substanceIds: string[]) {
    this.calls.push("getInteractions");
    const ids = new Set(substanceIds);
    return this.interactions.filter((i) => ids.has(i.substanceA.id) && ids.has(i.substanceB.id));
  }

  async getNutrientLimits(substanceIds: string[]) {
    this.calls.push("getNutrientLimits");
    return this.limits.filter((l) => substanceIds.includes(l.substanceId));
  }

  async getAllergens(ids: string[]) {
    this.calls.push("getAllergens");
    return this.allergens.filter((a) => ids.includes(a.id));
  }
}

/** A catalog whose every method rejects. */
export function failingCatalog(): CatalogRepository {
  const fail = async () => {
    throw new Error("catalog down");
  };
  return {
    findProductByBarcode: fail,
    searchProducts: fail,
    findSubstances: fail,
    getInteractions: fail,
    getNutrientLimits: fail,
    getAllergens: fail,
  };
}

export function fakePdf(text: string): PdfTextExtractor & { paths: string[] } {
  const paths: string[] = [];
  return {
    paths,
    async extractText(path: string) {
      paths.push(path);
      return text;
    },
  };
}

export function item(product: Product, rawText = product.name): AnalysisItem {
  return { productId: product.id, rawText, substances: product.substances };
}

export function manualInput(...items: AnalysisItem[]): AnalysisInput {
  return { kind: "manual", items };
}

export function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return { conditions: [], medications: [], allergies: [], ...overrides };
}

export function medication(product: Product) {
  return { productId: product.id, name: product.name, substances: product.substances };
}

export const VALID_PDF_PATH = "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf";
