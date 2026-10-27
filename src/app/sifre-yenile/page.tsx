import { redirect } from "next/navigation";
import { getViewer } from "@/server/queries";
import { NewPasswordForm } from "./NewPasswordForm";

export const metadata = { title: "Yeni şifre" };
export const dynamic = "force-dynamic";

/** Reached from the reset e-mail (the link signs the user in) or from Profil › Güvenlik. */
export default async function NewPasswordPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sifremi-unuttum");
  return (
    <main className="page" style={{ paddingBottom: 32, maxWidth: 480 }}>
      <h1 className="page-title" style={{ paddingTop: 32 }}>
        Yeni şifre belirleyin
      </h1>
      <p className="t-body t-secondary" style={{ margin: "0 0 24px" }}>
        {viewer.email} hesabı için. Şifreniz değişince diğer cihazlardaki oturumlar kapatılır.
      </p>
      <NewPasswordForm />
    </main>
  );
}
