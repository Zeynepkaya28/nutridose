"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authErrorMessage, passwordProblem } from "@/lib/auth/password";
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

async function callbackUrl(next: string): Promise<string> {
  const url = new URL("/auth/callback", await origin());
  url.searchParams.set("next", next);
  return url.toString();
}

const Email = z.email().max(254);
const field = (form: FormData, name: string) => String(form.get(name) ?? "");
const log = (action: string) => createLogger({ action });

// ── Password sign-in ─────────────────────────────────────

export async function signInWithPassword(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = Email.safeParse(field(form, "email").trim());
  const password = field(form, "password");
  if (!email.success || !password) return { status: "error", message: "E-posta ve şifrenizi girin.", email: field(form, "email").trim() };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) {
    // Wrong credentials are expected; only unusual failures are logged.
    if (error.code !== "invalid_credentials") log("signInWithPassword").error("sign-in failed", { error });
    return { status: "error", message: authErrorMessage(error.code, error.status), email: field(form, "email").trim() };
  }
  redirect(safeNext(field(form, "next")));
}

// ── Sign-up (email must be verified before the first sign-in) ──

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = Email.safeParse(field(form, "email").trim());
  const password = field(form, "password");
  if (!email.success) return { status: "error", message: "Geçerli bir e-posta adresi yazın.", email: field(form, "email").trim() };
  const problem = passwordProblem(password);
  if (problem) return { status: "error", message: problem, email: field(form, "email").trim() };
  if (password !== field(form, "confirm")) return { status: "error", message: "Şifreler aynı değil.", email: field(form, "email").trim() };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: email.data,
    password,
    options: { emailRedirectTo: await callbackUrl("/hosgeldin") },
  });
  if (error) {
    log("signUp").error("sign-up failed", { error });
    return { status: "error", message: authErrorMessage(error.code, error.status), email: field(form, "email").trim() };
  }
  // Same answer whether or not the address already has an account (no account enumeration).
  return { status: "sent", email: email.data };
}

// ── Magic link (passwordless alternative) ────────────────

export async function sendMagicLink(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = Email.safeParse(field(form, "email").trim());
  if (!email.success) return { status: "error", message: "Geçerli bir e-posta adresi yazın.", email: field(form, "email").trim() };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: await callbackUrl(safeNext(field(form, "next"))), shouldCreateUser: false },
  });
  // Unknown addresses get the same answer (no account enumeration); only real failures are shown.
  if (error && error.code !== "otp_disabled" && error.status !== 400 && error.status !== 422) {
    log("sendMagicLink").error("magic link failed", { error });
    return { status: "error", message: authErrorMessage(error.code, error.status), email: field(form, "email").trim() };
  }
  return { status: "sent", email: email.data };
}

// ── Forgotten password ───────────────────────────────────

export async function requestPasswordReset(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = Email.safeParse(field(form, "email").trim());
  if (!email.success) return { status: "error", message: "Geçerli bir e-posta adresi yazın.", email: field(form, "email").trim() };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: await callbackUrl("/sifre-yenile"),
  });
  if (error && error.status === 429) return { status: "error", message: authErrorMessage(error.code, 429), email: field(form, "email").trim() };
  if (error) log("requestPasswordReset").error("reset failed", { error });
  return { status: "sent", email: email.data };
}

/** Sets a new password after following the reset link (the link signs the user in). */
export async function setNewPassword(_prev: AuthState, form: FormData): Promise<AuthState> {
  const password = field(form, "password");
  const problem = passwordProblem(password);
  if (problem) return { status: "error", message: problem, email: field(form, "email").trim() };
  if (password !== field(form, "confirm")) return { status: "error", message: "Şifreler aynı değil.", email: field(form, "email").trim() };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { status: "error", message: "Bağlantının süresi dolmuş. Yeni bir sıfırlama e-postası isteyin.", email: field(form, "email").trim() };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    log("setNewPassword").error("update failed", { error });
    return { status: "error", message: authErrorMessage(error.code, error.status), email: field(form, "email").trim() };
  }
  // A reset means the old password may be known to someone else: end every other session.
  await supabase.auth.signOut({ scope: "others" });
  redirect("/?sifre=yenilendi");
}

// ── Sign in with Apple ───────────────────────────────────

export async function signInWithApple(form: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: await callbackUrl(safeNext(field(form, "next"))) },
  });
  if (error || !data.url) {
    log("signInWithApple").error("apple sign-in failed", { error });
    redirect("/giris?hata=apple");
  }
  redirect(data.url);
}
