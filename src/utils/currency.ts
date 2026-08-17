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
  if (!inputStr) return 0;

  const trimmed = inputStr.trim().toLowerCase();

  // Match shortcut notation like "500k", "1.5m", "2tr", "2.5tr"
  const shortcutMatch = trimmed.match(/^([\d.,]+)\s*([kmtr]|tr)?$/i);
  if (shortcutMatch) {
    const rawDigits = shortcutMatch[1];
    const unit = shortcutMatch[2]?.toLowerCase();

    // If there is a unit like 'm' or 'tr' and digits have '.' or ',', treat as decimal (e.g. 1.5tr)
    if (unit === 'm' || unit === 'tr') {
      const normalizedFloat = parseFloat(rawDigits.replace(',', '.'));
      if (!isNaN(normalizedFloat)) {
        return Math.max(0, Math.round(normalizedFloat * 1000000));
      }
    } else if (unit === 'k') {
      const normalizedFloat = parseFloat(rawDigits.replace(',', '.'));
      if (!isNaN(normalizedFloat)) {
        return Math.max(0, Math.round(normalizedFloat * 1000));
      }
    }
  }

  // Remove any non-numeric characters (dots, commas, currency symbols)
  const cleanDigits = trimmed.replace(/\D/g, '');
  if (!cleanDigits) return 0;

  const parsed = parseInt(cleanDigits, 10);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}
