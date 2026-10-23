/** Pure event helpers (no I/O) so capacity, calendar and timezone logic is unit-testable. */

const TZ = "Asia/Manila";
const HOUR = 3600_000;

export interface SeatRow {
  status: "going" | "maybe" | "no";
  riders: number;
  passengers: number;
}

/** Seats consumed by 'going' RSVPs (riders + passengers). Maybe/no never hold seats. */
export const seatsUsed = (rows: SeatRow[]) => rows.reduce((n, r) => (r.status === "going" ? n + r.riders + r.passengers : n), 0);

/** null capacity = unlimited. Never negative. */
export const seatsRemaining = (capacity: number | null | undefined, taken: number): number | null =>
  capacity == null ? null : Math.max(0, capacity - taken);

/** Can a party of `party` seats be added (excluding their own existing seats) without exceeding capacity? */
export const fitsCapacity = (capacity: number | null | undefined, taken: number, party: number, own = 0) =>
  capacity == null || taken - own + party <= capacity;

/** An event is "over" 6 hours after it starts when no end time is set. */
export function isPastEvent(e: { starts_at: string; ends_at: string | null }, now = new Date()): boolean {
  const end = e.ends_at ? new Date(e.ends_at).getTime() : new Date(e.starts_at).getTime() + 6 * HOUR;
  return end < now.getTime();
}

/** `YYYY-MM-DD` of an instant in Asia/Manila. */
export function manilaDateKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** `<input type="datetime-local">` value (Manila wall time) -> ISO instant. Returns null if invalid/empty. */
export function manilaLocalToIso(local: string | null | undefined): string | null {
  if (!local || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(`${local}:00+08:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO instant -> datetime-local value in Manila wall time. */
export function isoToManilaLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export interface CalendarCell {
  key: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
}

/** Sunday-first month grid (weeks of 7 cells) for a given year and zero-based month. */
export function monthGrid(year: number, month0: number): CalendarCell[][] {
  const first = new Date(Date.UTC(year, month0, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const weeks: CalendarCell[][] = [];
  const cursor = new Date(start);
  do {
    const week: CalendarCell[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({ key: cursor.toISOString().slice(0, 10), day: cursor.getUTCDate(), inMonth: cursor.getUTCMonth() === month0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getUTCMonth() === month0 || weeks.length < 4);
  return weeks;
}

/** Parse `?month=YYYY-MM`, falling back to the current Manila month. */
export function parseMonthParam(v: string | undefined, now = new Date()): { year: number; month0: number } {
  const m = v?.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (m) return { year: Number(m[1]), month0: Number(m[2]) - 1 };
  const [y, mo] = manilaDateKey(now).split("-").map(Number);
  return { year: y, month0: mo - 1 };
}

export function shiftMonth(year: number, month0: number, delta: number): string {
  const d = new Date(Date.UTC(year, month0 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
