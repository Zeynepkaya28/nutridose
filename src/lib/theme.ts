// Appearance preference: follow the device, or force light / dark. Stored in a cookie so the server
// renders the right theme on the first paint (no flash).
export const THEME_COOKIE = "nd-theme";
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
  system: "Sistem",
  light: "Açık",
  dark: "Koyu",
};

export function parseTheme(value: string | undefined | null): Theme {
  return (THEMES as readonly string[]).includes(value ?? "") ? (value as Theme) : "system";
}
