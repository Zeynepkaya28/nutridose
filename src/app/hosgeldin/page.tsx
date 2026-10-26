import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountState, getMedications, getProfileData, getViewer } from "@/server/queries";
import { ListRow, ListSection } from "@/ui/List";
import { completeOnboarding } from "../(app)/actions";
import { AddMedicationRow } from "../(app)/ilaclarim/AddMedication";
import { AllergyList, ConditionList } from "../(app)/profil/ProfileLists";

export const metadata = { title: "Hoş geldiniz" };
export const dynamic = "force-dynamic";

const STEPS = [
  { title: "Tedavi profiliniz", intro: "Analizler seçtiğiniz tedavi stratejilerine göre değerlendirilir. Birden çok seçebilirsiniz." },
  { title: "Alerji ve intoleranslar", intro: "Yediklerinizde bunlarla ilişkili bir madde bulunursa sizi uyarırız." },
  { title: "Kullandığınız ilaçlar", intro: "Öğünleriniz bu ilaçlarla etkileşim açısından kontrol edilir." },
] as const;

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ adim?: string; hata?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/giris");
  const account = await getAccountState(viewer);
  if (!account.exists) redirect("/auth/cikis");
  if (account.onboarded) redirect("/");

  const { adim, hata } = await searchParams;
  const step = Math.min(Math.max(Number(adim) || 1, 1), STEPS.length);
  const { title, intro } = STEPS[step - 1];
  const [profile, medications] = await Promise.all([getProfileData(viewer), step === 3 ? getMedications(viewer) : []]);

  return (
    <main className="page" style={{ paddingBottom: 32 }}>
      <ol className="steps" aria-label={`Adım ${step} / ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <li key={s.title} className={i + 1 < step ? "done" : undefined} aria-current={i + 1 === step ? "step" : undefined}>
            <span className="visually-hidden">{s.title}</span>
          </li>
        ))}
      </ol>
      <p className="t-footnote t-secondary" style={{ margin: 0 }}>
        Adım {step} / {STEPS.length}
      </p>
      <h1 className="page-title">{title}</h1>
      <p className="t-body t-secondary" style={{ margin: "0 0 24px" }}>
        {intro}
      </p>

      {step === 1 ? <ConditionList selected={profile.conditions} names={profile.conditionNames} /> : null}
      {step === 2 ? <AllergyList allergies={profile.allergies} catalog={profile.allergenCatalog} /> : null}
      {step === 3 ? (
        <ListSection id="onboarding-meds" header="İlaçlarım" footer="İstediğiniz zaman İlaçlarım sekmesinden değiştirebilirsiniz.">
          {medications.map((m) => (
            <ListRow key={m.id} icon="pills.fill" iconColor="var(--system-mint)" title={m.name} detail={m.dose ?? undefined} />
          ))}
          <AddMedicationRow />
        </ListSection>
      ) : null}

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
        {step < STEPS.length ? (
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
    </main>
  );
}
