import "server-only";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "./env";
import type { Database } from "./types";

export interface RequestSession {
  supabase: SupabaseClient<Database>;
  userId: string;
}

/**
 * Resolves the caller of a route handler from the Request itself.
 * - `Authorization: Bearer <access token>` (native iOS client, integration tests)
 * - otherwise the cookie session set by @supabase/ssr (web app). Middleware refreshes
 *   that session before the handler runs, so the handler only reads it.
 * Both clients use the publishable key, so RLS applies to everything they do.
 */
export async function getRequestSession(request: Request): Promise<RequestSession | null> {
  const { url, publishableKey } = getPublicSupabaseEnv();
  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(\S+)$/i);

  if (match) {
    const token = match[1];
    const supabase = createSupabaseClient<Database>(url, publishableKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase.auth.getClaims(token);
    const userId = data?.claims?.sub;
    return error || !userId ? null : { supabase, userId };
  }

  const cookies = parseCookieHeader(request.headers.get("cookie") ?? "").map(({ name, value }) => ({
    name,
    value: value ?? "",
  }));
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookies,
      setAll: () => {
        // Read-only here; middleware writes refreshed cookies.
      },
    },
  });
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return error || !userId ? null : { supabase, userId };
}
