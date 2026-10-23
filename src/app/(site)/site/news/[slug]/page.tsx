import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero, Section } from "@/components/site/page-hero";
import { JsonLd } from "@/components/site/json-ld";
import { formatDate } from "@/lib/format";
import { siteUrl } from "@/lib/env";
import { ORG } from "@/lib/org";
import { publicMediaUrl } from "@/lib/supabase/public";
import { getNewsPost } from "@/server/queries/public";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getNewsPost((await params).slug);
  if (!post) return {};
  return { title: post.title, description: post.excerpt ?? undefined };
}

export default async function NewsPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getNewsPost(slug);
  if (!post) notFound();
  const cover = publicMediaUrl(post.cover_path);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: post.title,
          datePublished: post.published_at,
          publisher: { "@type": "Organization", name: ORG.name },
          mainEntityOfPage: siteUrl(`/news/${post.slug}`),
        }}
      />
      <PageHero eyebrow={post.published_at ? formatDate(post.published_at) : "News"} title={post.title} />
      <Section id="post" className="max-w-3xl">
        {cover ? (
          <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-lg border border-line">
            <Image src={cover} alt="" fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
          </div>
        ) : null}
        <div className="whitespace-pre-line text-lg leading-relaxed text-white/90">{post.body}</div>
        <Link href="/news" className="mt-8 inline-block text-gold hover:text-gold-hover">
          &larr; All news
        </Link>
      </Section>
    </>
  );
}
