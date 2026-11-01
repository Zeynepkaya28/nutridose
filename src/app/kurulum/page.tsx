export const metadata = { title: "Kurulum gerekli" };

/** Shown when the deployment has no Supabase settings yet. */
export default function SetupPage() {
  return (
    <main className="page" style={{ paddingBottom: 32 }}>
      <h1 className="page-title" style={{ paddingTop: 48 }}>
        NutriDose henüz yapılandırılmadı
      </h1>
      <div className="card t-body">
        Bu kurulumda veritabanı bağlantısı tanımlı değil. Yönetici, Netlify ortam değişkenlerine
        <code> NEXT_PUBLIC_SUPABASE_URL</code> ve <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> değerlerini
        eklemeli ve yeniden dağıtmalıdır.
      </div>
    </main>
  );
}
