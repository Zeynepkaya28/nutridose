import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getPublicSupabaseEnv, hasPublicSupabaseEnv } from "./env";
import type { Database } from "./types";

// Refreshes the auth session cookie on every request.
// Route protection (redirect to login) is added in Faz 5.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!hasPublicSupabaseEnv()) return response;

  const { url, publishableKey } = getPublicSupabaseEnv();
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not put code between client creation and this call: it validates and refreshes the token.
  await supabase.auth.getClaims();

  return response;
}
