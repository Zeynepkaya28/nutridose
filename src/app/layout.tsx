import type { Metadata, Viewport } from "next";
import "@/ui/tokens.css";
import "@/ui/components.css";

export const metadata: Metadata = {
  title: { default: "NutriDose", template: "%s · NutriDose" },
  description: "İlaç, besin ve takviye etkileşimlerini tedavi profilinize göre kontrol edin.",
  applicationName: "NutriDose",
  appleWebApp: { capable: true, title: "NutriDose", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
