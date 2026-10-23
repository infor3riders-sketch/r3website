import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { manilaDateKey, monthGrid, shiftMonth } from "@/lib/events";
import { cn } from "@/lib/utils";

interface CalEvent {
  slug: string;
  title: string;
  starts_at: string;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Month grid of events (Manila days). Each event links to its detail page. */
export function EventCalendar({ year, month0, events, basePath = "/events" }: { year: number; month0: number; events: CalEvent[]; basePath?: string }) {
  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) {
    const k = manilaDateKey(e.starts_at);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  const today = manilaDateKey(new Date());
  const weeks = monthGrid(year, month0);

  return (
    <section aria-label={`Calendar for ${MONTHS[month0]} ${year}`} className="space-y-3">
      <div className="flex items-center justify-between">
        <Link href={`${basePath}?view=calendar&month=${shiftMonth(year, month0, -1)}`} aria-label="Previous month" className="flex h-11 w-11 items-center justify-center rounded-md border border-line hover:bg-white/10">
          <ChevronLeft aria-hidden className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-semibold uppercase tracking-wide">
          {MONTHS[month0]} {year}
        </h2>
        <Link href={`${basePath}?view=calendar&month=${shiftMonth(year, month0, 1)}`} aria-label="Next month" className="flex h-11 w-11 items-center justify-center rounded-md border border-line hover:bg-white/10">
          <ChevronRight aria-hidden className="h-5 w-5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
          <thead>
            <tr>
              {DAYS.map((d) => (
                <th key={d} scope="col" className="border border-line bg-panel p-2 text-xs uppercase tracking-wider text-muted">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0].key}>
                {week.map((c) => {
                  const list = byDay.get(c.key) ?? [];
                  return (
                    <td key={c.key} className={cn("h-28 border border-line p-1.5 align-top", c.inMonth ? "bg-ink" : "bg-panel/40 text-muted")}>
                      <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", c.key === today ? "bg-gold font-bold text-black" : "")}>{c.day}</span>
                      <ul className="mt-1 space-y-1">
                        {list.map((e) => (
                          <li key={e.slug}>
                            <Link href={`${basePath}/${e.slug}`} className="block truncate rounded bg-royal/30 px-1.5 py-0.5 text-xs font-medium text-white hover:bg-royal/60" title={e.title}>
                              {e.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
