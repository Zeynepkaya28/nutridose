const GRAMS_PER_UNIT: Record<string, number> = {
  g: 1,
  mg: 1e-3,
  mcg: 1e-6,
  µg: 1e-6,
  μg: 1e-6,
  ug: 1e-6,
};

/** Converts an amount between mass units. Returns null if the units are unknown or not comparable. */
export function convertAmount(amount: number, from: string, to: string): number | null {
  const a = from.trim().toLowerCase();
  const b = to.trim().toLowerCase();
  if (a === b) return amount;
  const fromFactor = GRAMS_PER_UNIT[a];
  const toFactor = GRAMS_PER_UNIT[b];
  if (fromFactor === undefined || toFactor === undefined) return null;
  return (amount * fromFactor) / toFactor;
}
