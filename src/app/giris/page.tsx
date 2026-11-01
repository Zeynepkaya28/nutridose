import { AppIconArt } from "../appIcon";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Giriş" };

const ERRORS: Record<string, string> = {
  baglanti: "Giriş bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı isteyin.",
  apple: "Apple ile giriş şu anda kullanılamıyor. E-posta ile devam edebilirsiniz.",
  "baglanti-tarayici":
    "Bağlantı, isteği yaptığınız tarayıcıdan farklı bir yerde açıldı. Şifre sıfırlama isteğini bu tarayıcıdan tekrar yapın ve bağlantıyı aynı tarayıcıda açın.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; hata?: string; silindi?: string; dogrulandi?: string }>;
}) {
  const { next, hata, silindi, dogrulandi } = await searchParams;
  const appleEnabled = process.env.NEXT_PUBLIC_APPLE_SIGNIN_ENABLED === "true";

  return (
    <main className="page" style={{ paddingBottom: 32, maxWidth: 480 }}>
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 48 }}>
        <div style={{ width: 72, height: 72, borderRadius: 16, overflow: "hidden" }} aria-hidden="true">
          <AppIconArt size={72} />
        </div>
      </div>
      <h1 className="t-large-title" style={{ textAlign: "center", margin: "16px 0 4px" }}>
        NutriDose
      </h1>
      <p className="t-body t-secondary" style={{ textAlign: "center", margin: "0 0 32px" }}>
        İlaçlarınızla yediklerinizin etkileşimini tedavi profilinize göre kontrol edin.
      </p>

      {silindi ? (
        <p className="card t-subhead" role="status">
          Hesabınız ve tüm verileriniz silindi.
        </p>
      ) : null}
      {dogrulandi ? (
        <p className="card t-subhead" role="status">
          E-posta adresiniz doğrulandı. Şimdi e-posta ve şifrenizle giriş yapabilirsiniz.
        </p>
      ) : null}
      {hata && ERRORS[hata] ? (
        <p className="error-text" role="alert" style={{ marginBottom: 16 }}>
          {ERRORS[hata]}
        </p>
      ) : null}

      <LoginForm next={next} appleEnabled={appleEnabled} />

      <p className="disclaimer">
        Devam ederek <a href="/kvkk" style={{ color: "var(--tint-text)" }}>KVKK aydınlatma metnini</a> okuduğunuzu kabul edersiniz.
        NutriDose tıbbi tavsiye yerine geçmez.
      </p>
    </main>
  );
}
