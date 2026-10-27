"use client";

import { useState, useTransition } from "react";
import { setTheme } from "@/app/theme-actions";
import { THEME_LABELS, THEMES, type Theme } from "@/lib/theme";

/** Görünüm: Sistem / Açık / Koyu. Applies instantly, then saves the choice. */
export function ThemePicker({ initial }: { initial: Theme }) {
  const [theme, setLocal] = useState<Theme>(initial);
  const [, startTransition] = useTransition();

  const choose = (next: Theme) => {
    setLocal(next);
    const root = document.documentElement;
    if (next === "system") delete root.dataset.theme;
    else root.dataset.theme = next;
    startTransition(() => setTheme(next));
  };

  return (
    <fieldset className="list-section" style={{ border: 0, padding: 0, margin: "0 0 32px" }}>
      <legend className="list-section__header">Görünüm</legend>
      <div className="segmented segmented--compact">
        {THEMES.map((value) => (
          <label key={value}>
            <input type="radio" name="theme" value={value} checked={theme === value} onChange={() => choose(value)} />
            <span>{THEME_LABELS[value]}</span>
          </label>
        ))}
      </div>
      <p className="list-section__footer">Sistem seçiliyken cihazınızın açık/koyu ayarı izlenir.</p>
    </fieldset>
  );
}
