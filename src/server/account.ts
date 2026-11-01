import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PRESCRIPTION_BUCKET } from "@/lib/prescriptions/constants";
import type { Database } from "@/lib/supabase/types";

/**
 * Deletes everything that belongs to the user, using only their own session (no service key):
 * 1. their prescription files (storage RLS lets owners delete their own objects),
 * 2. the auth user via `delete_my_account()`, which cascades to every public table.
 */
export async function deleteAccount(userClient: SupabaseClient<Database>, userId: string): Promise<void> {
  const bucket = userClient.storage.from(PRESCRIPTION_BUCKET);
  for (;;) {
    const { data: files, error } = await bucket.list(userId, { limit: 100 });
    if (error) throw new Error(`storage.list: ${error.message}`);
    if (!files || files.length === 0) break;
    const { error: removeError } = await bucket.remove(files.map((f) => `${userId}/${f.name}`));
    if (removeError) throw new Error(`storage.remove: ${removeError.message}`);
  }

  const { error } = await userClient.rpc("delete_my_account");
  if (error) throw new Error(`delete_my_account: ${error.message}`);
}
