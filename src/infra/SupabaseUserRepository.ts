import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile, UserRepository } from "@/domain";
import { isConditionCode } from "@/domain";
import type { Database } from "@/lib/supabase/types";
import { PRODUCT_SELECT, toProduct, type ProductRow } from "./SupabaseCatalogRepository";

/** Reads the signed-in user's own profile data. RLS limits every query to that user's rows. */
export class SupabaseUserRepository implements UserRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const [conditions, allergies, medications] = await Promise.all([
      this.supabase.from("user_conditions").select("condition_code").eq("user_id", userId),
      this.supabase.from("user_allergies").select("allergen_id, free_text, kind").eq("user_id", userId),
      this.supabase
        .from("user_medications")
        .select(`product_id, products ( ${PRODUCT_SELECT} )`)
        .eq("user_id", userId)
        .eq("active", true),
    ]);
    for (const [name, result] of [
      ["user_conditions", conditions],
      ["user_allergies", allergies],
      ["user_medications", medications],
    ] as const) {
      if (result.error) throw new Error(`users.getProfile(${name}): ${result.error.message}`);
    }

    type MedicationRow = { product_id: string; products: ProductRow | null };
    return {
      conditions: (conditions.data ?? []).map((r) => r.condition_code).filter(isConditionCode),
      allergies: (allergies.data ?? []).map((r) => ({
        allergenId: r.allergen_id,
        freeText: r.free_text,
        kind: r.kind,
      })),
      medications: ((medications.data ?? []) as unknown as MedicationRow[]).flatMap((row) => {
        if (!row.products) return [];
        const product = toProduct(row.products);
        return [{ productId: product.id, name: product.name, substances: product.substances }];
      }),
    };
  }
}
