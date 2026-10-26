import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { PLACEHOLDER_EVENTS, PLACEHOLDER_NEWS, PLACEHOLDER_PARTNERS } from "@/lib/placeholder-data";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate as fmt } from "@/lib/format";
import { publicMediaUrl } from "@/lib/supabase/public";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { getNews, getSponsors, getUpcomingEvents } from "@/server/queries/public";

/** Real rows when Supabase is configured; clearly-fake demo rows only for a first local run without it. */
const demo = () => !isSupabaseConfigured();

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

export async function UpcomingEvents() {
  const rows = demo()
    ? PLACEHOLDER_EVENTS.map((e) => ({ slug: e.slug, title: e.title, date: e.date, where: e.where, blurb: e.blurb }))
    : (await getUpcomingEvents(3)).map((e) => ({ slug: e.slug, title: e.title, date: e.starts_at, where: e.meeting_point ?? "", blurb: e.description?.slice(0, 120) ?? "" }));
  return (
    <section aria-labelledby="events-h" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div id="events-h">
        <SectionHead title="Upcoming Events" href="/services/events" cta="All events" />
      </div>
      {rows.length === 0 ? (
        <EmptyState className="mt-6" title="No upcoming events right now">New rides and activities will be announced here.</EmptyState>
      ) : (
        <ul className="mt-6 grid gap-5 md:grid-cols-3">
          {rows.map((e) => (
            <li key={e.slug} className="flex flex-col rounded-lg border border-line bg-panel p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-gold">
                <CalendarDays aria-hidden className="h-4 w-4" />
                <time dateTime={e.date}>{fmt(e.date)}</time>
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">{e.title}</h3>
              {e.where ? (
                <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                  <MapPin aria-hidden className="h-4 w-4 shrink-0" />
                  {e.where}
                </p>
              ) : null}
              <p className="mt-3 flex-1 text-sm text-muted">{e.blurb}</p>
              <Link href={`/services/events/${e.slug}`} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}>
                Details<span className="sr-only"> for {e.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export async function LatestNews() {
  const rows = demo()
    ? PLACEHOLDER_NEWS.map((n) => ({ slug: n.slug, title: n.title, date: n.date as string | null, excerpt: n.excerpt }))
    : (await getNews(2)).map((n) => ({ slug: n.slug, title: n.title, date: n.published_at, excerpt: n.excerpt ?? "" }));
  return (
    <section aria-labelledby="news-h" className="border-y border-line bg-panel/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div id="news-h">
          <SectionHead title="Latest News" href="/news" cta="All news" />
        </div>
        {rows.length === 0 ? (
          <EmptyState className="mt-6" title="No news yet">Stories and announcements will appear here.</EmptyState>
        ) : (
          <ul className="mt-6 grid gap-5 md:grid-cols-2">
            {rows.map((n) => (
              <li key={n.slug} className="rounded-lg border border-line bg-ink p-5">
                {n.date ? (
                  <time dateTime={n.date} className="text-sm text-gold">
                    {fmt(n.date)}
                  </time>
                ) : null}
                <h3 className="mt-1 text-xl font-semibold text-white">
                  <Link href={`/news/${n.slug}`} className="hover:text-gold">
                    {n.title}
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-muted">{n.excerpt}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export async function Partners() {
  const partners = demo()
    ? PLACEHOLDER_PARTNERS.map((name) => ({ id: name, name, logo: null, url: null }))
    : (await getSponsors()).map((s) => ({ id: s.id, name: s.name, logo: publicMediaUrl(s.logo_path), url: s.website_url }));
  if (partners.length === 0) return null;
  return (
    <section aria-labelledby="partners-h" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <h2 id="partners-h" className="text-center text-3xl font-semibold uppercase tracking-wide text-white">
        Sponsors &amp; Partners
      </h2>
      <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {partners.map((p) => {
          const body = p.logo ? (
            <Image src={p.logo} alt={p.name} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-contain p-4" />
          ) : (
            <span className="text-center text-sm uppercase tracking-wider text-muted">{p.name}</span>
          );
          const box = cn("relative flex h-28 items-center justify-center rounded-lg px-3", p.logo ? "border border-line bg-white/5" : "border border-dashed border-line");
          return (
            <li key={p.id}>
              {p.url ? (
                <a href={p.url} target="_blank" rel="noopener noreferrer sponsored" className={cn(box, "transition-colors hover:border-gold")} aria-label={p.logo ? `${p.name} (opens in a new tab)` : undefined}>
                  {body}
                </a>
              ) : (
                <div className={box}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
