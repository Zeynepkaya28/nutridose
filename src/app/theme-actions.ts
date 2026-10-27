"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export async function setTheme(value: string): Promise<void> {
  const theme = parseTheme(value);
  const store = await cookies();
  if (theme === "system") {
    store.delete(THEME_COOKIE);
  } else {
    store.set(THEME_COOKIE, theme, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
    });
  }
  revalidatePath("/", "layout");
}
