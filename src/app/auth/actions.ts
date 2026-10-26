"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { createLogger } from "@/server/log";

export type AuthState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

/** Origin of the current request, used to build the email / OAuth return URL. */
async function origin(): Promise<string> {
  const h = await headers();
  const fromHeader = h.get("origin");
  if (fromHeader) return fromHeader;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;
}

const EmailSchema = z.object({ email: z.email().max(254), next: z.string().optional() });

export async function sendMagicLink(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = EmailSchema.safeParse({ email: String(form.get("email") ?? "").trim(), next: form.get("next") ?? undefined });
  if (!parsed.success) return { status: "error", message: "Geçerli bir e-posta adresi yazın." };

  const supabase = await createClient();
  const callback = new URL("/auth/callback", await origin());
  callback.searchParams.set("next", safeNext(parsed.data.next));
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
  });
  if (error) {
    createLogger({ action: "sendMagicLink" }).error("magic link failed", { error });
    const message =
      error.status === 429
        ? "Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin."
        : "Giriş bağlantısı gönderilemedi. Lütfen tekrar deneyin.";
    return { status: "error", message };
  }
  return { status: "sent", email: parsed.data.email };
}

export async function signInWithApple(form: FormData) {
  const supabase = await createClient();
  const callback = new URL("/auth/callback", await origin());
  callback.searchParams.set("next", safeNext(String(form.get("next") ?? "")));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: callback.toString() },
  });
  if (error || !data.url) {
    createLogger({ action: "signInWithApple" }).error("apple sign-in failed", { error });
    redirect("/giris?hata=apple");
  }
  redirect(data.url);
}
