import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { LEGAL_DOCS } from "@/lib/legal-content";
import { getNews, getPrograms, getUpcomingEvents } from "@/server/queries/public";

export const revalidate = 3600;

const STATIC = ["/", "/about", "/membership", "/services", "/services/events", "/shop", "/donations", "/contact", "/news", "/gallery"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [programs, events, news] = await Promise.all([getPrograms(), getUpcomingEvents(200), getNews(200)]);
  return [
    ...STATIC.map((p) => ({ url: siteUrl(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.7 })),
    ...programs.map((p) => ({ url: siteUrl(`/services/${p.slug}`), lastModified: p.updated_at, priority: 0.6 })),
    ...events.map((e) => ({ url: siteUrl(`/services/events/${e.slug}`), lastModified: e.updated_at, priority: 0.6 })),
    ...news.map((n) => ({ url: siteUrl(`/news/${n.slug}`), lastModified: n.updated_at, priority: 0.5 })),
    ...LEGAL_DOCS.map((d) => ({ url: siteUrl(`/legal/${d.slug}`), changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
