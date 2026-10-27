import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, createNonce } from "@/lib/security/csp";
import { hasPublicSupabaseEnv } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildCsp(nonce, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    dev: process.env.NODE_ENV === "development",
  });

  // Next.js reads the nonce from the request's CSP header and adds it to its scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  let response: NextResponse;
  if (!hasPublicSupabaseEnv()) {
    // Deployment without Supabase settings: explain instead of crashing.
    const { pathname } = request.nextUrl;
    response =
      pathname === "/kurulum" || pathname === "/api/health"
        ? NextResponse.next({ request: { headers: requestHeaders } })
        : NextResponse.rewrite(new URL("/kurulum", request.url), { request: { headers: requestHeaders } });
  } else {
    response = await updateSession(request, requestHeaders);
  }

  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Skip static files and images.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
