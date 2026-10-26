import { getProfileData, getViewer } from "@/server/queries";
import { ListRow } from "@/ui/List";
import { Disclaimer, LargeTitle } from "@/ui/Nav";
import { signOut } from "../actions";
import { DeleteAccountRow } from "./DeleteAccount";
import { AllergyList, ConditionList } from "./ProfileLists";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const viewer = (await getViewer())!;
  const profile = await getProfileData(viewer);

  return (
    <>
      <LargeTitle title="Profil" subtitle={viewer.email ?? undefined} />

      <ConditionList selected={profile.conditions} names={profile.conditionNames} />
      <AllergyList allergies={profile.allergies} catalog={profile.allergenCatalog} />

      <section className="list-section" aria-labelledby="account-header">
        <h2 className="list-section__header" id="account-header">
          Hesap
        </h2>
        <form action={signOut}>
          <ul className="list">
            <ListRow
              icon="rectangle.portrait.and.arrow.right"
              iconColor="var(--system-gray)"
              title="Çıkış yap"
              tone="tint"
              buttonProps={{ type: "submit" }}
            />
          </ul>
        </form>
      </section>

      <section className="list-section" aria-labelledby="danger-header">
        <h2 className="list-section__header" id="danger-header">
          Verileriniz
        </h2>
        <ul className="list">
          <DeleteAccountRow />
        </ul>
        <p className="list-section__footer">Hesabınızı sildiğinizde tüm sağlık verileriniz ve dosyalarınız kalıcı olarak silinir.</p>
      </section>

      <Disclaimer />
    </>
  );
}
