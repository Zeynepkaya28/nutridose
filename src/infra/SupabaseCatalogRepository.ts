import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Allergen,
  CatalogRepository,
  Interaction,
  NutrientLimit,
  Product,
  ProductKind,
  SubstanceRef,
} from "@/domain";
import { isConditionCode } from "@/domain";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export const PRODUCT_SELECT =
  "id, kind, name, barcode, product_substances ( amount, unit, substances ( id, name, synonyms ) )" as const;

type SubstanceRow = { id: string; name: string; synonyms: string[] };
export type ProductRow = {
  id: string;
  kind: ProductKind;
  name: string;
  barcode: string | null;
  product_substances: Array<{ amount: number | null; unit: string | null; substances: SubstanceRow | null }>;
};

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    barcode: row.barcode,
    substances: row.product_substances.flatMap((ps) =>
      ps.substances
        ? [{ id: ps.substances.id, name: ps.substances.name, synonyms: ps.substances.synonyms, amount: ps.amount, unit: ps.unit }]
        : [],
    ),
  };
}

function toSubstance(row: SubstanceRow): SubstanceRef {
  return { id: row.id, name: row.name, synonyms: row.synonyms };
}

function fail(operation: string, message: string): never {
  throw new Error(`catalog.${operation}: ${message}`);
}

/** Reads the catalog as the signed-in user (RLS: authenticated read-only). */
export class SupabaseCatalogRepository implements CatalogRepository {
  constructor(private readonly supabase: Client) {}

  async findProductByBarcode(barcode: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("barcode", barcode)
      .maybeSingle();
    if (error) fail("findProductByBarcode", error.message);
    return data ? toProduct(data as ProductRow) : null;
  }

  async searchProducts(text: string, options: { kinds?: ProductKind[]; limit?: number } = {}): Promise<Product[]> {
    const { data: ranked, error } = await this.supabase.rpc("search_products", {
      p_query: text,
      p_kinds: options.kinds,
      p_limit: options.limit ?? 10,
    });
    if (error) fail("searchProducts", error.message);
    if (!ranked || ranked.length === 0) return [];

    const ids = ranked.map((r) => r.product_id);
    const { data, error: loadError } = await this.supabase.from("products").select(PRODUCT_SELECT).in("id", ids);
    if (loadError) fail("searchProducts", loadError.message);
    const byId = new Map((data as ProductRow[]).map((row) => [row.id, toProduct(row)]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  async findSubstances(text: string): Promise<SubstanceRef[]> {
    const { data, error } = await this.supabase.rpc("search_substances", { p_query: text });
    if (error) fail("findSubstances", error.message);
    return (data ?? []).map(toSubstance);
  }

  async getInteractions(substanceIds: string[]): Promise<Interaction[]> {
    if (substanceIds.length === 0) return [];
    const { data, error } = await this.supabase
      .from("interactions")
      .select(
        "id, severity, condition_code, mechanism, advice, evidence_source, " +
          "a:substances!interactions_substance_a_fkey ( id, name, synonyms ), " +
          "b:substances!interactions_substance_b_fkey ( id, name, synonyms )",
      )
      .in("substance_a", substanceIds)
      .in("substance_b", substanceIds);
    if (error) fail("getInteractions", error.message);

    type Row = {
      id: string;
      severity: Interaction["severity"];
      condition_code: string | null;
      mechanism: string | null;
      advice: string | null;
      evidence_source: string;
      a: SubstanceRow;
      b: SubstanceRow;
    };
    return (data as unknown as Row[]).flatMap((row) => {
      const conditionCode = row.condition_code;
      // Rows for condition codes the app does not know are skipped rather than applied to everyone.
      if (conditionCode !== null && !isConditionCode(conditionCode)) return [];
      return [
        {
          id: row.id,
          substanceA: toSubstance(row.a),
          substanceB: toSubstance(row.b),
          severity: row.severity,
          conditionCode,
          mechanism: row.mechanism,
          advice: row.advice,
          evidenceSource: row.evidence_source,
        },
      ];
    });
  }

  async getNutrientLimits(substanceIds: string[]): Promise<NutrientLimit[]> {
    if (substanceIds.length === 0) return [];
    const { data, error } = await this.supabase
      .from("nutrient_limits")
      .select("id, substance_id, condition_code, upper_limit, unit, period, source")
      .in("substance_id", substanceIds);
    if (error) fail("getNutrientLimits", error.message);
    return (data ?? []).flatMap((row) => {
      if (row.condition_code !== null && !isConditionCode(row.condition_code)) return [];
      return [
        {
          id: row.id,
          substanceId: row.substance_id,
          conditionCode: row.condition_code,
          upperLimit: Number(row.upper_limit),
          unit: row.unit,
          period: row.period,
          source: row.source,
        },
      ];
    });
  }

  async getAllergens(ids: string[]): Promise<Allergen[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.supabase
      .from("allergens")
      .select("id, name, cross_reactive_substances")
      .in("id", ids);
    if (error) fail("getAllergens", error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      crossReactiveSubstanceIds: row.cross_reactive_substances,
    }));
  }
}
