/**
 * Semicolon-delimited UTF-8 CSV for Excel in Vietnamese locales.
 * User-controlled cells are quoted and formula-prefixed input is neutralized.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '""';
  const raw = String(value).replace(/\u0000/g, '');
  // Excel may evaluate untrusted spreadsheet formulas even inside quoted CSV.
  const escaped = /^[\s]*[=+\-@]/.test(raw) || /^[\s]*[\t\r]/.test(raw)
    ? `'${raw}`
    : raw;
  return `"${escaped.replace(/"/g, '""')}"`;
}
export function csvRow(values: Array<string | number | null | undefined>): string {
  return values.map(csvCell).join(';') + '\n';
}
