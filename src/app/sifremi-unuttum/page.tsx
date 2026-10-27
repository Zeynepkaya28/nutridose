import Link from "next/link";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = { title: "Şifremi unuttum" };

export default function ForgotPasswordPage() {
  return (
    <main className="page" style={{ paddingBottom: 32, maxWidth: 480 }}>
      <nav className="nav-bar" aria-label="Gezinme">
        <Link href="/giris" className="nav-bar__back">
          ‹ Giriş
        </Link>
      </nav>
      <h1 className="page-title">Şifremi unuttum</h1>
      <p className="t-body t-secondary" style={{ margin: "0 0 24px" }}>
        E-posta adresinizi yazın; size yeni şifre belirleme bağlantısı gönderelim.
      </p>
      <ForgotPasswordForm />
    </main>
  );
}
