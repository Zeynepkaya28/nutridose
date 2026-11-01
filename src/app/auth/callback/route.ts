// Return point for the magic link (PKCE code or token hash) and for Sign in with Apple.
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNext } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { createLogger } from "@/server/log";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let error: unknown = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else {
    error = new Error("missing code");
  }

  // The verification link was opened in another browser/app (e.g. the mail app). Supabase already
  // confirmed the address before redirecting here; only this browser has no session yet.
  if (code && (error as { code?: string } | null)?.code === "pkce_code_verifier_not_found") {
    createLogger({ route: "/auth/callback" }).info("link opened in another browser", { next });
    const url = new URL("/giris", request.url);
    if (next === "/sifre-yenile") url.searchParams.set("hata", "baglanti-tarayici");
    else url.searchParams.set("dogrulandi", "1");
    return NextResponse.redirect(url);
  }

  if (error) {
    createLogger({ route: "/auth/callback" }).error("sign-in callback failed", { error });
    return NextResponse.redirect(new URL("/giris?hata=baglanti", request.url));
  }
  return NextResponse.redirect(new URL(next, request.url));
}
