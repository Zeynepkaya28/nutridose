import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PRESCRIPTION_BUCKET } from "@/lib/prescriptions/constants";
import type { Database } from "@/lib/supabase/types";

/**
 * Deletes everything that belongs to the user:
 * 1. their prescription files (with their own session; storage RLS allows owners to delete),
 * 2. the auth user (admin API), which cascades to every public table via ON DELETE CASCADE.
 */
export async function deleteAccount(
  userClient: SupabaseClient<Database>,
  adminClient: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const bucket = userClient.storage.from(PRESCRIPTION_BUCKET);
  for (;;) {
    const { data: files, error } = await bucket.list(userId, { limit: 100 });
    if (error) throw new Error(`storage.list: ${error.message}`);
    if (!files || files.length === 0) break;
    const { error: removeError } = await bucket.remove(files.map((f) => `${userId}/${f.name}`));
    if (removeError) throw new Error(`storage.remove: ${removeError.message}`);
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) throw new Error(`auth.deleteUser: ${error.message}`);
}
