/**
 * Allocate whole Vietnamese đồng without losing or creating money.
 * Largest-remainder allocation is deterministic (lower member index wins ties).
 */
export function allocateExact(amount: number, weights: number[]): number[] {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new RangeError('Amount must be a non-negative integer of VND');
  }
  if (weights.length === 0) return [];
  if (weights.some(w => !Number.isFinite(w) || w < 0)) {
    throw new RangeError('Allocation weights must be finite and non-negative');
  }

  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (!Number.isFinite(total) || total <= 0) {
    throw new RangeError('At least one allocation weight must be positive');
  }

  const exact = weights.map(weight => amount * weight / total);
  const result = exact.map(Math.floor);
  let remainder = amount - result.reduce((sum, share) => sum + share, 0);

  const order = exact.map((share, index) => ({
    index,
    fraction: share - Math.floor(share)
  })).sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let i = 0; i < remainder; i++) {
    result[order[i % order.length].index]++;
  }
  return result;
}

export function equalShares(amount: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 1) return [];
  return allocateExact(amount, Array(count).fill(1));
}

/**
 * While percentages are being edited, show their literal shares.
 * A valid 100% allocation is reconciled exactly; invalid totals are rejected on save.
 */
export function percentageShares(amount: number, percentages: number[]): number[] {
  const valid = percentages.every(p => Number.isFinite(p) && p >= 0 && p <= 100);
  if (!valid) throw new RangeError('Invalid percentage');
  const total = percentages.reduce((sum, p) => sum + p, 0);
  if (Math.abs(total - 100) < 1e-8) return allocateExact(amount, percentages);
  return percentages.map(p => Math.round(amount * p / 100));
}

export function rouletteShares(
  amount: number,
  count: number,
  selectedIndex: number | null,
  selectedPercent: number
): number[] {
  if (!Number.isInteger(count) || count < 1) return [];
  if (count === 1 || selectedIndex === null || selectedIndex < 0 || selectedIndex >= count) {
    return equalShares(amount, count);
  }
  const percent = Math.min(100, Math.max(0, selectedPercent));
  const selectedShare = Math.round(amount * percent / 100);
  const otherShares = equalShares(amount - selectedShare, count - 1);
  let otherIndex = 0;
  return Array.from({ length: count }, (_, index) =>
    index === selectedIndex ? selectedShare : otherShares[otherIndex++]
  );
}
