import type {
  Allergen,
  Interaction,
  NutrientLimit,
  Product,
  ProductKind,
  SubstanceRef,
  UserProfile,
} from "./types";

/** Read access to the reference catalog. Implemented in src/infra (Supabase) and in tests (in memory). */
export interface CatalogRepository {
  findProductByBarcode(barcode: string): Promise<Product | null>;
  /** Products relevant to free text, best match first. */
  searchProducts(text: string, options?: { kinds?: ProductKind[]; limit?: number }): Promise<Product[]>;
  /** Substances whose name or synonym matches the text. */
  findSubstances(text: string): Promise<SubstanceRef[]>;
  /** Interactions where both substances are in the given set. */
  getInteractions(substanceIds: string[]): Promise<Interaction[]>;
  /** All limits (general and condition-specific) for the given substances. */
  getNutrientLimits(substanceIds: string[]): Promise<NutrientLimit[]>;
  getAllergens(ids: string[]): Promise<Allergen[]>;
}

export interface UserRepository {
  getProfile(userId: string): Promise<UserProfile>;
}

/** Turns an uploaded prescription (storage path) into plain text. */
export interface PdfTextExtractor {
  extractText(storagePath: string): Promise<string>;
}
