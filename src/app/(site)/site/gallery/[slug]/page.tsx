import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero, Section } from "@/components/site/page-hero";
import { publicMediaUrl } from "@/lib/supabase/public";
import { getAlbum } from "@/server/queries/public";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getAlbum((await params).slug);
  return data ? { title: data.album.title, description: data.album.description ?? undefined } : {};
}

export default async function AlbumPage({ params }: Props) {
  const data = await getAlbum((await params).slug);
  if (!data) notFound();
  const { album, photos } = data;
  return (
    <>
      <PageHero eyebrow="Gallery" title={album.title} subtitle={album.description ?? undefined} />
      <Section id="photos">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {photos.map((p) => {
            const url = publicMediaUrl(p.path);
            return url ? (
              <li key={p.id} className="space-y-1">
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-panel">
                  <Image src={url} alt={p.caption ?? ""} fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover" />
                </div>
                {p.caption ? <p className="text-xs text-muted">{p.caption}</p> : null}
              </li>
            ) : null;
          })}
        </ul>
        <Link href="/gallery" className="mt-8 inline-block text-gold hover:text-gold-hover">
          &larr; All albums
        </Link>
      </Section>
    </>
  );
}
