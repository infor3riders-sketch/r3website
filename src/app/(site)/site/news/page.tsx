import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section } from "@/components/site/page-hero";
import { EmptyState } from "@/components/ui/states";
import { formatDate } from "@/lib/format";
import { getNews } from "@/server/queries/public";

export const revalidate = 300;
export const metadata: Metadata = { title: "News", description: "Latest news and stories from R3 Riders." };

export default async function NewsPage() {
  const posts = await getNews();
  return (
    <>
      <PageHero eyebrow="News" title="Latest from the road" />
      <Section id="news">
        {posts.length === 0 ? (
          <EmptyState title="No news yet">Stories and announcements will appear here.</EmptyState>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2">
            {posts.map((p) => (
              <li key={p.id} className="rounded-lg border border-line bg-panel p-5">
                {p.published_at ? (
                  <time dateTime={p.published_at} className="text-sm text-gold">
                    {formatDate(p.published_at)}
                  </time>
                ) : null}
                <h2 className="mt-1 text-2xl font-semibold">
                  <Link href={`/news/${p.slug}`} className="hover:text-gold">
                    {p.title}
                  </Link>
                </h2>
                <p className="mt-2 text-muted">{p.excerpt}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
