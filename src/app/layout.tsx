import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import "@/ui/tokens.css";
import "@/ui/components.css";

export const metadata: Metadata = {
  title: { default: "NutriDose", template: "%s · NutriDose" },
  description: "İlaç, besin ve takviye etkileşimlerini tedavi profilinize göre kontrol edin.",
  applicationName: "NutriDose",
  appleWebApp: { capable: true, title: "NutriDose", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

const LIGHT = "#f2f2f7";
const DARK = "#000000";

export async function generateViewport(): Promise<Viewport> {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    colorScheme: theme === "system" ? "light dark" : theme,
    themeColor:
      theme === "system"
        ? [
            { media: "(prefers-color-scheme: light)", color: LIGHT },
            { media: "(prefers-color-scheme: dark)", color: DARK },
          ]
        : theme === "dark"
          ? DARK
          : LIGHT,
  };
}

// Pages render per request so Next.js can attach the CSP nonce from middleware to its scripts.
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await headers();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="tr" data-theme={theme === "system" ? undefined : theme}>
      <body>{children}</body>
    </html>
  );
}
