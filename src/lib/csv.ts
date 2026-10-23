/**
 * Minimal CSV writer. Cells that start with = + - @ (or tab/CR) are prefixed with an apostrophe so a
 * spreadsheet never interprets donor-supplied text as a formula (CSV injection).
 */
export function csvCell(value: unknown): string {
  let s = value == null ? "" : value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
