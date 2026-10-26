// Dates are shown in Turkey time (UTC+3 all year since 2016).
export const TIME_ZONE = "Europe/Istanbul";
const OFFSET = "+03:00";

function ymd(date: Date): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function startOfDayIso(date = new Date()): string {
  return `${ymd(date)}T00:00:00${OFFSET}`;
}

export function daysAgoIso(days: number, now = new Date()): string {
  return startOfDayIso(new Date(now.getTime() - days * 86_400_000));
}

export function dayKey(iso: string): string {
  return ymd(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatLongDate(date = new Date()): string {
  return new Intl.DateTimeFormat("tr-TR", { timeZone: TIME_ZONE, day: "numeric", month: "long", weekday: "long" }).format(date);
}

export function formatDayHeading(iso: string, now = new Date()): string {
  const key = dayKey(iso);
  if (key === ymd(now)) return "Bugün";
  if (key === ymd(new Date(now.getTime() - 86_400_000))) return "Dün";
  return formatLongDate(new Date(iso));
}

export type MealLabel = "Kahvaltı" | "Öğle yemeği" | "Akşam yemeği" | "Ara öğün";
export const MEAL_LABELS: MealLabel[] = ["Kahvaltı", "Öğle yemeği", "Akşam yemeği", "Ara öğün"];

export function defaultMealLabel(now = new Date()): MealLabel {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hour12: false }).format(now));
  if (hour >= 5 && hour < 11) return "Kahvaltı";
  if (hour >= 11 && hour < 15) return "Öğle yemeği";
  if (hour >= 18 && hour < 23) return "Akşam yemeği";
  return "Ara öğün";
}
