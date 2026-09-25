export function referenceValueCents(units: number, priceUsd: string) {
  const price = Number(priceUsd);
  if (!Number.isSafeInteger(units) || units < 0 || !Number.isFinite(price) || price < 0) return undefined;
  const unitCents = Math.round(price * 100);
  const valueCents = units * unitCents;
  return Number.isSafeInteger(valueCents) ? valueCents : undefined;
}
