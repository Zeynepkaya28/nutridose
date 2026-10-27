"use client";

import { useActionState } from "react";
import { PASSWORD_HINT } from "@/lib/auth/password";
import { PasswordField } from "@/ui/PasswordField";
import { setNewPassword, type AuthState } from "../auth/actions";

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(setNewPassword, { status: "idle" });
  return (
    <form action={action}>
      <section className="list-section">
        <h2 className="list-section__header">Yeni şifre</h2>
        <div className="list">
          <PasswordField id="new-password" name="password" label="Yeni şifre" autoComplete="new-password" describedBy="new-hint" />
          <PasswordField id="new-confirm" name="confirm" label="Yeni şifre (tekrar)" autoComplete="new-password" />
        </div>
        <p className="list-section__footer" id="new-hint">
          {PASSWORD_HINT}
        </p>
      </section>
      {state.status === "error" ? (
        <p className="error-text" role="alert">
          {state.message}
        </p>
      ) : null}
      <button type="submit" className="btn btn--filled btn--block" disabled={pending}>
        Şifreyi kaydet
      </button>
    </form>
  );
}
