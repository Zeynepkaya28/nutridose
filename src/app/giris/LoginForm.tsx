"use client";

import { useActionState } from "react";
import { Icon } from "@/ui/Icon";
import { sendMagicLink, signInWithApple, type AuthState } from "../auth/actions";

export function LoginForm({ next, appleEnabled }: { next?: string; appleEnabled: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="card" role="status">
        <div className="card__row">
          <Icon name="checkmark.circle.fill" className="card__icon" />
          <div className="card__body">
            <h2 className="card__title">E-postanızı kontrol edin</h2>
            <p className="card__text">
              {state.email} adresine bir giriş bağlantısı gönderdik. Bağlantıya bu cihazda dokunun.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {appleEnabled ? (
        <form action={signInWithApple} style={{ marginBottom: 24 }}>
          <input type="hidden" name="next" value={next ?? ""} />
          <button type="submit" className="btn btn--block" style={{ background: "var(--label)", color: "var(--bg-card)" }}>
            Apple ile devam et
          </button>
        </form>
      ) : null}

      <form action={action}>
        <input type="hidden" name="next" value={next ?? ""} />
        <section className="list-section">
          <label htmlFor="email" className="list-section__header" style={{ display: "block" }}>
            E-posta ile giriş
          </label>
          <div className="list">
            <input
              id="email"
              name="email"
              type="email"
              className="field"
              autoComplete="email"
              inputMode="email"
              placeholder="ornek@eposta.com"
              required
              aria-describedby={state.status === "error" ? "email-error" : "email-help"}
            />
          </div>
          <p className="list-section__footer" id="email-help">
            Şifre gerekmez; size tek kullanımlık bir giriş bağlantısı göndeririz.
          </p>
        </section>
        {state.status === "error" ? (
          <p className="error-text" id="email-error" role="alert">
            {state.message}
          </p>
        ) : null}
        <button type="submit" className="btn btn--filled btn--block" disabled={pending} aria-busy={pending}>
          {pending ? <span className="spinner" aria-hidden="true" /> : null}
          Giriş bağlantısı gönder
        </button>
      </form>
    </>
  );
}
