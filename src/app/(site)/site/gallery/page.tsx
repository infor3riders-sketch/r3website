import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero, Section } from "@/components/site/page-hero";
import { EmptyState } from "@/components/ui/states";
import { publicMediaUrl } from "@/lib/supabase/public";
import { getAlbums } from "@/server/queries/public";

export const revalidate = 300;
export const metadata: Metadata = { title: "Gallery", description: "Photos from R3 Riders charity rides, outreach and community events." };

export default async function GalleryPage() {
  const albums = await getAlbums();
  return (
    <>
      <PageHero eyebrow="Gallery" title="Moments on the road" />
      <Section id="albums">
        {albums.length === 0 ? (
          <EmptyState title="Photos are coming soon" />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((a) => {
              const cover = publicMediaUrl(a.cover);
              return (
                <li key={a.id} className="group overflow-hidden rounded-lg border border-line bg-panel shadow-card">
                  <Link href={`/gallery/${a.slug}`} className="block">
                    <div className="relative aspect-[4/3] bg-ink">
                      {cover ? <Image src={cover} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform group-hover:scale-105" /> : null}
                    </div>
                    <div className="p-4">
                      <h2 className="text-xl font-semibold uppercase">{a.title}</h2>
                      <p className="text-sm text-muted">
                        {a.photoCount} photo{a.photoCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
