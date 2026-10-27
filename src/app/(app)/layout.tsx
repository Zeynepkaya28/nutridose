import { redirect } from "next/navigation";
import { getAccountState, getViewer } from "@/server/queries";
import { TabBar } from "@/ui/TabBar";
import { AddSheetProvider } from "./_components/AddSheet";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  // Middleware already redirects signed-out visitors; this covers an expired session mid-request.
  if (!viewer) redirect("/giris");
  const account = await getAccountState(viewer);
  if (!account.exists) redirect("/auth/cikis");
  if (!account.consented) redirect("/hosgeldin?adim=0");
  if (!account.onboarded) redirect("/hosgeldin");

  return (
    <AddSheetProvider userId={viewer.userId}>
      <main className="page">{children}</main>
      <TabBar />
    </AddSheetProvider>
  );
}
