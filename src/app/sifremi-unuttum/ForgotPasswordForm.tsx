"use client";

import { useActionState } from "react";
import { requestPasswordReset, type AuthState } from "../auth/actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, { status: "idle" });
  if (state.status === "sent") {
    return (
      <p className="card t-body" role="status">
        {state.email} adresine kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderdik. Bağlantı 1 saat geçerlidir.
      </p>
    );
  }
  return (
    <form action={action}>
      <section className="list-section">
        <label htmlFor="reset-email" className="list-section__header" style={{ display: "block" }}>
          E-posta
        </label>
        <div className="list">
          <input id="reset-email" name="email" type="email" className="field" autoComplete="email" placeholder="ornek@eposta.com" required defaultValue={state.email} />
        </div>
      </section>
      {state.status === "error" ? (
        <p className="error-text" role="alert">
          {state.message}
        </p>
      ) : null}
      <button type="submit" className="btn btn--filled btn--block" disabled={pending}>
        Sıfırlama bağlantısı gönder
      </button>
    </form>
  );
}
