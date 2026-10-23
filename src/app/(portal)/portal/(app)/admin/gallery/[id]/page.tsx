import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AlbumForm, PhotoUploadForm } from "@/components/portal/admin-forms";
import { Button } from "@/components/ui/button";
import { publicMediaUrl } from "@/lib/supabase/public";
import { deleteAlbum, deletePhoto } from "@/server/admin-actions";
import { getAlbumAdmin } from "@/server/queries/admin";

export const metadata = { title: "Album" };

export default async function AdminAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getAlbumAdmin(id);
  if (!data) notFound();
  const { album, photos } = data;
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/admin/gallery" className="text-sm text-gold hover:text-gold-hover">
        &larr; All albums
      </Link>
      <h1 className="text-3xl font-semibold uppercase">{album.title}</h1>
      <div className="rounded-lg border border-line bg-panel p-5">
        <AlbumForm album={album} />
      </div>

      <section aria-labelledby="photos-h" className="space-y-3">
        <h2 id="photos-h" className="text-2xl font-semibold uppercase text-gold">Photos</h2>
        {photos.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-3">
            {photos.map((ph) => {
              const url = publicMediaUrl(ph.path);
              return (
                <li key={ph.id} className="space-y-2 rounded-lg border border-line bg-panel p-2">
                  <div className="relative aspect-square overflow-hidden rounded-md bg-ink">{url ? <Image src={url} alt={ph.caption ?? ""} fill sizes="240px" className="object-cover" /> : null}</div>
                  {ph.caption ? <p className="truncate text-xs text-muted">{ph.caption}</p> : null}
                  <form action={deletePhoto}>
                    <input type="hidden" name="id" value={ph.id} />
                    <input type="hidden" name="album_id" value={album.id} />
                    <Button type="submit" variant="ghost" size="sm" className="text-red-300">
                      Remove
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="rounded-lg border border-line bg-panel p-4">
          <PhotoUploadForm albumId={album.id} />
        </div>
      </section>

      <form action={deleteAlbum}>
        <input type="hidden" name="id" value={album.id} />
        <Button type="submit" variant="danger" size="sm">
          Delete album and photos
        </Button>
      </form>
    </div>
  );
}
