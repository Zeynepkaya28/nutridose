import type { SubstanceRef } from "./types";

/** Lowercase (Turkish rules), drop diacritics and extra spaces. "Ispanak" and "ıspanak" both become "ispanak". */
export function normalize(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits "ıspanak, greyfurt suyu ve süt" into separate entries. */
export function splitManualText(text: string): string[] {
  return text
    .split(/[,;\n+]|\s+ve\s+/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function substanceKeys(substance: SubstanceRef): string[] {
  return [substance.name, ...(substance.synonyms ?? [])].map(normalize);
}

export function matchesAnyKey(substance: SubstanceRef, keys: ReadonlySet<string>): boolean {
  return substanceKeys(substance).some((key) => keys.has(key));
}
