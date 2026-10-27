import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authErrorMessage, passwordProblem } from "@/lib/auth/password";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

export type PasswordChangeResult = { ok: true } | { ok: false; error: string };

/**
 * Changes the signed-in user's password.
 * 1. The current password is checked by signing in on a separate, short-lived session.
 *    That fresh session also satisfies Supabase's secure_password_change (recent sign-in) rule.
 * 2. The new password is set on that session.
 * 3. Every other session (other devices and the temporary one) is signed out; this device stays signed in.
 */
export async function changePassword(
  session: SupabaseClient<Database>,
  email: string,
  current: string,
  next: string,
  confirm: string,
): Promise<PasswordChangeResult> {
  if (!current) return { ok: false, error: "Mevcut şifrenizi girin." };
  const problem = passwordProblem(next);
  if (problem) return { ok: false, error: problem };
  if (next !== confirm) return { ok: false, error: "Yeni şifreler aynı değil." };
  if (next === current) return { ok: false, error: "Yeni şifre eskisiyle aynı olamaz." };

  const { url, publishableKey } = getPublicSupabaseEnv();
  const verifier = createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const signIn = await verifier.auth.signInWithPassword({ email, password: current });
  if (signIn.error) {
    return {
      ok: false,
      error: signIn.error.code === "invalid_credentials" ? "Mevcut şifre hatalı." : authErrorMessage(signIn.error.code, signIn.error.status),
    };
  }

  const update = await verifier.auth.updateUser({ password: next });
  if (update.error) {
    await verifier.auth.signOut({ scope: "local" });
    return { ok: false, error: authErrorMessage(update.error.code, update.error.status) };
  }

  await session.auth.signOut({ scope: "others" });
  return { ok: true };
}
