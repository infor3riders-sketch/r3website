import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { PLACEHOLDER_EVENTS, PLACEHOLDER_NEWS, PLACEHOLDER_PARTNERS } from "@/lib/placeholder-data";
import { buttonVariants } from "@/components/ui/button";

const dateFmt = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });
const fmt = (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00+08:00`));

function SectionHead({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-3xl font-semibold uppercase tracking-wide text-white">{title}</h2>
      <Link href={href} className="text-sm font-semibold uppercase tracking-wider text-gold hover:text-gold-hover">
        {cta} &rarr;
      </Link>
    </div>
  );
}

export function UpcomingEvents() {
  return (
    <section aria-labelledby="events-h" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div id="events-h">
        <SectionHead title="Upcoming Events" href="/services/events" cta="All events" />
      </div>
      <ul className="mt-6 grid gap-5 md:grid-cols-3">
        {PLACEHOLDER_EVENTS.map((e) => (
          <li key={e.slug} className="flex flex-col rounded-lg border border-line bg-panel p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-gold">
              <CalendarDays aria-hidden className="h-4 w-4" />
              <time dateTime={e.date}>{fmt(e.date)}</time>
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">{e.title}</h3>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted">
              <MapPin aria-hidden className="h-4 w-4 shrink-0" />
              {e.where}
            </p>
            <p className="mt-3 flex-1 text-sm text-muted">{e.blurb}</p>
            <Link href={`/services/events/${e.slug}`} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}>
              Details
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LatestNews() {
  return (
    <section aria-labelledby="news-h" className="border-y border-line bg-panel/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div id="news-h">
          <SectionHead title="Latest News" href="/news" cta="All news" />
        </div>
        <ul className="mt-6 grid gap-5 md:grid-cols-2">
          {PLACEHOLDER_NEWS.map((n) => (
            <li key={n.slug} className="rounded-lg border border-line bg-ink p-5">
              <time dateTime={n.date} className="text-sm text-gold">
                {fmt(n.date)}
              </time>
              <h3 className="mt-1 text-xl font-semibold text-white">
                <Link href={`/news/${n.slug}`} className="hover:text-gold">
                  {n.title}
                </Link>
              </h3>
              <p className="mt-2 text-sm text-muted">{n.excerpt}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Partners() {
  return (
    <section aria-labelledby="partners-h" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <h2 id="partners-h" className="text-center text-3xl font-semibold uppercase tracking-wide text-white">
        Sponsors &amp; Partners
      </h2>
      <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {PLACEHOLDER_PARTNERS.map((p) => (
          <li
            key={p}
            className="flex h-24 items-center justify-center rounded-lg border border-dashed border-line text-sm uppercase tracking-wider text-muted"
          >
            {p}
          </li>
        ))}
      </ul>
    </section>
  );
}
