import Link from "next/link";
import { CONSENT_VERSION } from "@/lib/consent";

export const metadata = { title: "KVKK Aydınlatma Metni" };

// NOTE: Template text. Fill in the data controller details and have it reviewed by a lawyer before launch.
export default function KvkkPage() {
  return (
    <main className="page" style={{ paddingBottom: 48 }}>
      <nav className="nav-bar" aria-label="Gezinme">
        <Link href="/" className="nav-bar__back">
          ‹ Geri
        </Link>
      </nav>
      <h1 className="page-title">KVKK Aydınlatma Metni</h1>
      <p className="t-footnote t-secondary">Sürüm {CONSENT_VERSION}</p>

      <article className="card t-body" style={{ display: "grid", gap: 16 }}>
        <section>
          <h2 className="t-headline">1. Veri sorumlusu</h2>
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında veri sorumlusu: <strong>[Şirket / kişi adı, adres, iletişim]</strong>.
          </p>
        </section>
        <section>
          <h2 className="t-headline">2. İşlenen veriler</h2>
          <p>
            Kimlik ve iletişim: e-posta adresi. <strong>Özel nitelikli kişisel veri (sağlık):</strong> seçtiğiniz tedavi stratejileri,
            kullandığınız ilaçlar ve dozları, alerji ve intoleranslarınız, eklediğiniz öğünler, yüklediğiniz reçeteler ve bunlara ait
            analiz sonuçları. İşlem güvenliği: oturum ve hata kayıtları (sağlık verisi içermez).
          </p>
        </section>
        <section>
          <h2 className="t-headline">3. Amaç ve hukuki sebep</h2>
          <p>
            Sağlık verileriniz yalnızca ilaç–besin etkileşimi analizini size sunmak amacıyla ve KVKK m.6 uyarınca <strong>açık rızanıza</strong>{" "}
            dayanılarak işlenir. Açık rıza vermeden sağlık verisi kaydedilmez; bu kural veritabanı düzeyinde uygulanır. Kimlik ve iletişim
            verileriniz hizmetin kurulması ve ifası için (KVKK m.5/2-c) işlenir.
          </p>
        </section>
        <section>
          <h2 className="t-headline">4. Saklama yeri ve aktarım</h2>
          <p>
            Veriler Avrupa Birliği bölgesindeki (Frankfurt) Supabase altyapısında saklanır; uygulama Vercel üzerinde çalışır. Bu hizmet
            sağlayıcılar veri işleyen sıfatıyla hareket eder. Verileriniz başka üçüncü kişilerle paylaşılmaz ve pazarlama amacıyla
            kullanılmaz. Yurt dışına aktarım KVKK m.9 kapsamında açık rızanıza dayanır.
          </p>
        </section>
        <section>
          <h2 className="t-headline">5. Saklama süresi</h2>
          <p>Verileriniz hesabınız açık olduğu sürece saklanır. Hesabınızı sildiğinizde tüm verileriniz ve dosyalarınız kalıcı olarak silinir.</p>
        </section>
        <section>
          <h2 className="t-headline">6. Haklarınız</h2>
          <p>
            KVKK m.11 kapsamındaki haklarınızı (bilgi talep etme, düzeltme, silme, itiraz vb.) kullanabilirsiniz. Açık rızanızı
            istediğiniz zaman geri alabilirsiniz: Profil › Verileriniz › &quot;Hesabı ve verileri sil&quot; ile tüm sağlık verileriniz
            silinir. Başvuru: <strong>[iletişim adresi]</strong>.
          </p>
        </section>
        <section>
          <h2 className="t-headline">7. Tıbbi tavsiye değildir</h2>
          <p>NutriDose bilgilendirme amaçlıdır ve tıbbi tavsiye yerine geçmez. Tedavinizle ilgili kararları doktorunuz veya eczacınızla verin.</p>
        </section>
      </article>
    </main>
  );
}
