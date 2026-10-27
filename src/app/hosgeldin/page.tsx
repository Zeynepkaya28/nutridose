import Link from "next/link";
import { redirect } from "next/navigation";
import { CONSENT_STATEMENT } from "@/lib/consent";
import { getAccountState, getMedications, getProfileData, getViewer } from "@/server/queries";
import { ListRow, ListSection } from "@/ui/List";
import { completeOnboarding, giveConsent } from "../(app)/actions";
import { AddMedicationRow } from "../(app)/ilaclarim/AddMedication";
import { AllergyList, ConditionList } from "../(app)/profil/ProfileLists";

export const metadata = { title: "Hoş geldiniz" };
export const dynamic = "force-dynamic";

const STEPS = [
  { title: "Verileriniz ve açık rıza", intro: "Başlamadan önce sağlık verilerinizin nasıl işlendiğini okuyun ve onaylayın." },
  { title: "Tedavi profiliniz", intro: "Analizler seçtiğiniz tedavi stratejilerine göre değerlendirilir. Birden çok seçebilirsiniz." },
  { title: "Alerji ve intoleranslar", intro: "Yediklerinizde bunlarla ilişkili bir madde bulunursa sizi uyarırız." },
  { title: "Kullandığınız ilaçlar", intro: "Öğünleriniz bu ilaçlarla etkileşim açısından kontrol edilir." },
] as const;
const LAST = STEPS.length - 1;

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ adim?: string; hata?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/giris");
  const account = await getAccountState(viewer);
  if (!account.exists) redirect("/auth/cikis");
  if (account.onboarded && account.consented) redirect("/");

  const { adim, hata } = await searchParams;
  // Nothing else can be saved before consent, so consent always comes first.
  const step = account.consented ? Math.min(Math.max(Number(adim) || 1, 1), LAST) : 0;
  const { title, intro } = STEPS[step];
  const [profile, medications] =
    step === 0 ? [null, []] : await Promise.all([getProfileData(viewer), step === 3 ? getMedications(viewer) : []]);

  return (
    <main className="page" style={{ paddingBottom: 32 }}>
      <ol className="steps" aria-label={`Adım ${step + 1} / ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <li key={s.title} className={i < step ? "done" : undefined} aria-current={i === step ? "step" : undefined}>
            <span className="visually-hidden">{s.title}</span>
          </li>
        ))}
      </ol>
      <p className="t-footnote t-secondary" style={{ margin: 0 }}>
        Adım {step + 1} / {STEPS.length}
      </p>
      <h1 className="page-title">{title}</h1>
      <p className="t-body t-secondary" style={{ margin: "0 0 24px" }}>
        {intro}
      </p>

      {step === 0 ? (
        <form action={giveConsent}>
          <div className="card t-subhead" style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0 }}>
              NutriDose; tedavi profiliniz, ilaçlarınız, alerjileriniz, öğünleriniz ve reçeteleriniz gibi <strong>sağlık verilerinizi</strong>{" "}
              yalnızca size etkileşim analizi sunmak için işler. Veriler AB bölgesinde saklanır, kimseyle paylaşılmaz ve hesabınızı
              sildiğinizde tamamen silinir.
            </p>
            <p style={{ margin: 0 }}>
              <Link href="/kvkk" style={{ color: "var(--tint-text)" }}>
                KVKK aydınlatma metninin tamamını okuyun
              </Link>
            </p>
          </div>
          <label className="card" style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" name="consent" required style={{ width: 24, height: 24, marginTop: 2, flex: "none" }} />
            <span className="t-body">{CONSENT_STATEMENT}</span>
          </label>
          {hata ? (
            <p className="error-text" role="alert">
              Devam etmek için açık rıza kutusunu işaretleyin.
            </p>
          ) : null}
          <button type="submit" className="btn btn--filled btn--block">
            Onayla ve devam et
          </button>
          <p className="disclaimer">Açık rıza vermezseniz hiçbir sağlık verisi kaydedilmez. NutriDose tıbbi tavsiye yerine geçmez.</p>
        </form>
      ) : null}

      {step === 1 && profile ? <ConditionList selected={profile.conditions} names={profile.conditionNames} /> : null}
      {step === 2 && profile ? <AllergyList allergies={profile.allergies} catalog={profile.allergenCatalog} /> : null}
      {step === 3 ? (
        <ListSection id="onboarding-meds" header="İlaçlarım" footer="İstediğiniz zaman İlaçlarım sekmesinden değiştirebilirsiniz.">
          {medications.map((m) => (
            <ListRow key={m.id} icon="pills.fill" iconColor="var(--system-mint)" title={m.name} detail={m.dose ?? undefined} />
          ))}
          <AddMedicationRow />
        </ListSection>
      ) : null}

      {step > 0 ? (
        <>
          {hata ? (
            <p className="error-text" role="alert">
              Kaydedilemedi. Lütfen tekrar deneyin.
            </p>
          ) : null}
          <div className="stack" style={{ marginTop: 8 }}>
            {step > 1 ? (
              <Link className="btn btn--tinted" href={`/hosgeldin?adim=${step - 1}`}>
                Geri
              </Link>
            ) : null}
            {step < LAST ? (
              <Link className="btn btn--filled" href={`/hosgeldin?adim=${step + 1}`}>
                Devam
              </Link>
            ) : (
              <form action={completeOnboarding} style={{ display: "contents" }}>
                <button type="submit" className="btn btn--filled">
                  Bitir
                </button>
              </form>
            )}
          </div>
          <p className="disclaimer">Bu bilgileri daha sonra Profil sekmesinden değiştirebilirsiniz.</p>
        </>
      ) : null}
    </main>
  );
}
