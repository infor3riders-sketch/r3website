/**
 * Date ranges for printed reports. The club runs on Manila time, so a range of `YYYY-MM-DD` days
 * means Manila midnight on `from` up to (but excluding) Manila midnight after `to`.
 */
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface ReportRange {
  from: string; // YYYY-MM-DD (Manila)
  to: string; // YYYY-MM-DD (Manila), inclusive
  startIso: string; // inclusive lower bound
  endIso: string; // exclusive upper bound
}

/** Today's date in Manila as YYYY-MM-DD. */
export function manilaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function isRealDay(v: string): boolean {
  if (!DAY.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/**
 * Parses `from`/`to` query values. Missing or invalid values default to the first of the current
 * Manila month through today; a reversed range is swapped.
 */
export function parseReportRange(fromRaw: unknown, toRaw: unknown, now: Date = new Date()): ReportRange {
  const today = manilaToday(now);
  let from = typeof fromRaw === "string" && isRealDay(fromRaw) ? fromRaw : `${today.slice(0, 8)}01`;
  let to = typeof toRaw === "string" && isRealDay(toRaw) ? toRaw : today;
  if (from > to) [from, to] = [to, from];
  const end = new Date(`${to}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return {
    from,
    to,
    startIso: new Date(`${from}T00:00:00+08:00`).toISOString(),
    endIso: new Date(`${end.toISOString().slice(0, 10)}T00:00:00+08:00`).toISOString(),
  };
}
