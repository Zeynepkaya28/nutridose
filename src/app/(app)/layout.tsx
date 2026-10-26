import { getViewer } from "@/server/queries";
import { Icon } from "@/ui/Icon";
import { TabBar } from "@/ui/TabBar";
import { AddSheetProvider } from "./_components/AddSheet";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  if (!viewer) {
    // Faz 5 replaces this with the sign-in screen and a middleware redirect.
    const devLogin = process.env.NODE_ENV === "development";
    return (
      <main className="page" style={{ paddingBottom: 32 }}>
        <header className="nav-large">
          <h1 className="nav-large__title">NutriDose</h1>
        </header>
        <div className="card">
          <div className="card__row">
            <Icon name="person.crop.circle.fill" className="card__icon" />
            <div className="card__body">
              <h2 className="card__title">Giriş yapmanız gerekiyor</h2>
              <p className="card__text">Analizleriniz ve ilaçlarınız hesabınıza bağlı olarak saklanır.</p>
            </div>
          </div>
        </div>
        {devLogin ? (
          <a className="btn btn--filled btn--block" href="/dev/giris">
            Geliştirici girişi (yerel demo hesabı)
          </a>
        ) : null}
      </main>
    );
  }

  return (
    <AddSheetProvider userId={viewer.userId}>
      <main className="page">{children}</main>
      <TabBar />
    </AddSheetProvider>
  );
}
