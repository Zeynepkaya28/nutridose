import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isPublicPath } from "@/lib/auth/redirect";
import { getPublicSupabaseEnv, hasPublicSupabaseEnv } from "./env";
import type { Database } from "./types";

/**
 * Refreshes the auth session cookie on every request and keeps signed-out visitors on the sign-in screen.
 * Route handlers under /api answer 401 themselves.
 */
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
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Do not put code between client creation and this call: it validates and refreshes the token.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const target = request.nextUrl.clone();
    const [base, query] = path.split("?");
    target.pathname = base;
    target.search = query ? `?${query}` : "";
    const redirect = NextResponse.redirect(target);
    // Keep refreshed session cookies on the redirect.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!signedIn && !isPublicPath(pathname)) {
    const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return redirectTo(`/giris${next}`);
  }
  if (signedIn && pathname === "/giris") return redirectTo("/");

  return response;
}
