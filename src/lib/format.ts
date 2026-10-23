/** Formatting helpers. The club operates in the Philippines: PHP currency, Asia/Manila time. */
const TZ = "Asia/Manila";

const php = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });
const phpWhole = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: TZ });
const dateTimeFmt = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat("en-PH", { timeStyle: "short", timeZone: TZ });

export const formatPHP = (amount: number, opts: { whole?: boolean } = {}) =>
  (opts.whole ? phpWhole : php).format(amount);

/** Accepts timestamptz strings, Date objects, or plain `YYYY-MM-DD` dates (treated as Manila midnight). */
function toDate(v: string | Date): Date {
  if (v instanceof Date) return v;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00+08:00`) : new Date(v);
}

export const formatDate = (v: string | Date) => dateFmt.format(toDate(v));
export const formatDateTime = (v: string | Date) => dateTimeFmt.format(toDate(v));
export const formatTime = (v: string | Date) => timeFmt.format(toDate(v));

/** Whole-percent progress, clamped 0..100. Returns 0 when there is no goal. */
export function progressPercent(raised: number, goal: number | null | undefined): number {
  if (!goal || goal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((raised / goal) * 100)));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
