"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { PASSWORD_HINT } from "@/lib/auth/password";
import { Icon } from "@/ui/Icon";
import { PasswordField } from "@/ui/PasswordField";
import { sendMagicLink, signInWithApple, signInWithPassword, signUp, type AuthState } from "../auth/actions";

type Mode = "signin" | "signup" | "magic";
const IDLE: AuthState = { status: "idle" };

function SentCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="card" role="status">
      <div className="card__row">
        <Icon name="checkmark.circle.fill" className="card__icon" />
        <div className="card__body">
          <h2 className="card__title">{title}</h2>
          <p className="card__text">{text}</p>
        </div>
      </div>
    </div>
  );
}

function ErrorText({ state, id }: { state: AuthState; id: string }) {
  return state.status === "error" ? (
    <p className="error-text" id={id} role="alert">
      {state.message}
    </p>
  ) : null;
}

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button type="submit" className="btn btn--filled btn--block" disabled={pending} aria-busy={pending}>
      {pending ? <span className="spinner" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}

export function LoginForm({ next, appleEnabled }: { next?: string; appleEnabled: boolean }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [signInState, signInAction, signingIn] = useActionState(signInWithPassword, IDLE);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, IDLE);
  const [magicState, magicAction, sendingMagic] = useActionState(sendMagicLink, IDLE);

  if (signUpState.status === "sent") {
    return (
      <SentCard
        title="E-postanızı doğrulayın"
        text={`${signUpState.email} adresine bir doğrulama bağlantısı gönderdik. Bağlantıya dokunduktan sonra hesabınız açılır.`}
      />
    );
  }
  if (magicState.status === "sent") {
    return (
      <SentCard
        title="E-postanızı kontrol edin"
        text={`${magicState.email} adresine kayıtlı bir hesap varsa giriş bağlantısı gönderdik.`}
      />
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

      {mode !== "magic" ? (
        <div className="segmented segmented--compact" role="radiogroup" aria-label="Giriş türü" style={{ marginBottom: 24 }}>
          <label>
            <input type="radio" name="mode" checked={mode === "signin"} onChange={() => setMode("signin")} />
            <span>Giriş yap</span>
          </label>
          <label>
            <input type="radio" name="mode" checked={mode === "signup"} onChange={() => setMode("signup")} />
            <span>Kayıt ol</span>
          </label>
        </div>
      ) : null}

      {mode === "signin" ? (
        <form action={signInAction}>
          <input type="hidden" name="next" value={next ?? ""} />
          <section className="list-section">
            <h2 className="list-section__header">E-posta ve şifre</h2>
            <div className="list">
              <label htmlFor="signin-email" className="visually-hidden">
                E-posta
              </label>
              <input id="signin-email" name="email" type="email" className="field" autoComplete="email" placeholder="E-posta" required defaultValue={signInState.email} key={`in-${signInState.email ?? ""}`} />
              <PasswordField id="signin-password" name="password" label="Şifre" autoComplete="current-password" describedBy="signin-error" />
            </div>
            <p className="list-section__footer">
              <Link href="/sifremi-unuttum" style={{ color: "var(--tint-text)" }}>
                Şifremi unuttum
              </Link>
            </p>
          </section>
          <ErrorText state={signInState} id="signin-error" />
          <Submit pending={signingIn} label="Giriş yap" />
          <button type="button" className="btn btn--plain btn--block" onClick={() => setMode("magic")}>
            Şifresiz, e-posta bağlantısıyla giriş yap
          </button>
        </form>
      ) : null}

      {mode === "signup" ? (
        <form action={signUpAction}>
          <section className="list-section">
            <h2 className="list-section__header">Yeni hesap</h2>
            <div className="list">
              <label htmlFor="signup-email" className="visually-hidden">
                E-posta
              </label>
              <input id="signup-email" name="email" type="email" className="field" autoComplete="email" placeholder="E-posta" required defaultValue={signUpState.email} key={`up-${signUpState.email ?? ""}`} />
              <PasswordField id="signup-password" name="password" label="Şifre" autoComplete="new-password" describedBy="password-hint" />
              <PasswordField id="signup-confirm" name="confirm" label="Şifre (tekrar)" autoComplete="new-password" />
            </div>
            <p className="list-section__footer" id="password-hint">
              {PASSWORD_HINT} Hesabınız e-posta adresinizi doğruladıktan sonra açılır.
            </p>
          </section>
          <ErrorText state={signUpState} id="signup-error" />
          <Submit pending={signingUp} label="Hesap oluştur" />
        </form>
      ) : null}

      {mode === "magic" ? (
        <form action={magicAction}>
          <input type="hidden" name="next" value={next ?? ""} />
          <section className="list-section">
            <label htmlFor="magic-email" className="list-section__header" style={{ display: "block" }}>
              E-posta bağlantısıyla giriş
            </label>
            <div className="list">
              <input id="magic-email" name="email" type="email" className="field" autoComplete="email" placeholder="E-posta" required defaultValue={magicState.email} key={`mg-${magicState.email ?? ""}`} />
            </div>
            <p className="list-section__footer">Kayıtlı hesabınıza tek kullanımlık bir giriş bağlantısı göndeririz; şifre gerekmez.</p>
          </section>
          <ErrorText state={magicState} id="magic-error" />
          <Submit pending={sendingMagic} label="Giriş bağlantısı gönder" />
          <button type="button" className="btn btn--plain btn--block" onClick={() => setMode("signin")}>
            Şifreyle giriş yap
          </button>
        </form>
      ) : null}
    </>
  );
}
