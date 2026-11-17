/**
 * Currency and Vietnamese Number Formatting Utilities
 */

/**
 * Format a number to Vietnamese standard currency string with dot separators (e.g. 1.000.000)
 */
export function formatCurrencyNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'string' ? parseFloat(val.replace(/\./g, '').replace(/,/g, '')) : val;
  if (isNaN(num) || num === 0) return '';
  return Math.round(num).toLocaleString('vi-VN');
}

/**
 * Parse raw string input into a number, supporting shortcut suffixes (k, m, tr)
 * Examples:
 * - "500000" -> 500000
 * - "500.000" -> 500000
 * - "500,000" -> 500000
 * - "500k" or "500K" -> 500000
 * - "1.5m" or "1,5tr" -> 1500000
 * - "2tr" -> 2000000
 */
export function parseCurrencyInput(inputStr: string): number {
  const trimmed = inputStr.trim().toLowerCase();
  if (!trimmed) return 0;

  const shortcut = trimmed.match(/^([\d.,]+)\s*(tr|m|k)$/);
  if (shortcut) {
    const raw = shortcut[1];
    const parts = raw.split(/[.,]/);
    const last = parts[parts.length - 1];
    // Vietnamese thousands groups have 3 digits; 1.000k means 1000k,
    // while 1,5tr means 1.5 million. Also support 1.000,5tr.
    const isDecimal = parts.length > 1 && last.length !== 3;
    const whole = (isDecimal ? parts.slice(0, -1) : parts).join('');
    const literal = isDecimal ? `${whole}.${last}` : whole;
    const number = Number(literal);
    const multiplier = shortcut[2] === 'k' ? 1_000 : 1_000_000;
    if (Number.isFinite(number) && number >= 0) {
      return Math.min(Number.MAX_SAFE_INTEGER, Math.round(number * multiplier));
    }
  }

  // Plain VND input accepts Vietnamese thousands punctuation, not fractions.
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return 0;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.round(parsed))) : 0;
}
