"use client";

import { useActionState, useState, useTransition } from "react";
import { PASSWORD_HINT } from "@/lib/auth/password";
import { Alert } from "@/ui/Alert";
import { ListRow } from "@/ui/List";
import { PasswordField } from "@/ui/PasswordField";
import { Sheet } from "@/ui/Sheet";
import { changePasswordAction, sendOwnPasswordReset, signOutEverywhere, type SecurityState } from "../actions";

const IDLE: SecurityState = { status: "idle" };

export function SecuritySection() {
  const [changing, setChanging] = useState(false);
  const [confirmGlobal, setConfirmGlobal] = useState(false);
  const [notice, setNotice] = useState<SecurityState>(IDLE);
  const [, startTransition] = useTransition();

  return (
    <section className="list-section" aria-labelledby="security-header">
      <h2 className="list-section__header" id="security-header">
        Güvenlik
      </h2>
      <ul className="list">
        <ListRow icon="key" iconColor="var(--system-gray)" title="Şifreyi değiştir" accessory="chevron" onClick={() => setChanging(true)} />
        <ListRow
          icon="lock.shield"
          iconColor="var(--system-indigo)"
          title="Tüm cihazlardan çıkış yap"
          subtitle="Bu cihaz dahil bütün oturumlar kapanır"
          onClick={() => setConfirmGlobal(true)}
        />
      </ul>
      <p className="list-section__footer" role="status">
        {notice.status !== "idle" ? notice.message : "Şifre değiştirildiğinde diğer cihazlardaki oturumlar otomatik kapatılır."}
      </p>

      <Sheet open={changing} onClose={() => setChanging(false)} title="Şifreyi değiştir" initialDetent="large">
        <ChangePasswordForm
          onDone={(message) => {
            setChanging(false);
            setNotice({ status: "done", message });
          }}
          onSendReset={() =>
            startTransition(async () => {
              setChanging(false);
              setNotice(await sendOwnPasswordReset());
            })
          }
        />
      </Sheet>

      <Alert
        open={confirmGlobal}
        title="Tüm cihazlardan çıkılsın mı?"
        message="Telefon, tablet ve bilgisayarlardaki bütün NutriDose oturumlarınız kapanır. Yeniden giriş yapmanız gerekir."
        actions={[
          { label: "Çıkış yap", role: "destructive", onSelect: () => startTransition(() => signOutEverywhere()) },
          { label: "Vazgeç", role: "cancel", onSelect: () => setConfirmGlobal(false) },
        ]}
      />
    </section>
  );
}

function ChangePasswordForm({ onDone, onSendReset }: { onDone: (message: string) => void; onSendReset: () => void }) {
  const [state, action, pending] = useActionState(async (prev: SecurityState, form: FormData) => {
    const result = await changePasswordAction(prev, form);
    if (result.status === "done") onDone(result.message ?? "");
    return result;
  }, IDLE);

  return (
    <form action={action}>
      <section className="list-section">
        <h2 className="list-section__header">Mevcut şifre</h2>
        <div className="list">
          <PasswordField id="current-password" name="current" label="Mevcut şifre" autoComplete="current-password" />
        </div>
        <p className="list-section__footer">
          Şifreniz yok mu ya da unuttunuz mu?{" "}
          <button type="button" className="btn btn--plain" style={{ minHeight: 0, padding: 0, font: "inherit" }} onClick={onSendReset}>
            Şifre belirleme bağlantısı gönder
          </button>
        </p>
      </section>
      <section className="list-section">
        <h2 className="list-section__header">Yeni şifre</h2>
        <div className="list">
          <PasswordField id="change-password" name="password" label="Yeni şifre" autoComplete="new-password" describedBy="change-hint" />
          <PasswordField id="change-confirm" name="confirm" label="Yeni şifre (tekrar)" autoComplete="new-password" />
        </div>
        <p className="list-section__footer" id="change-hint">
          {PASSWORD_HINT}
        </p>
      </section>
      {state.status === "error" ? (
        <p className="error-text" role="alert">
          {state.message}
        </p>
      ) : null}
      <button type="submit" className="btn btn--filled btn--block" disabled={pending} aria-busy={pending}>
        {pending ? <span className="spinner" aria-hidden="true" /> : null}
        Şifreyi değiştir
      </button>
    </form>
  );
}
