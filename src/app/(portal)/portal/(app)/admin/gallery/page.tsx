import Link from "next/link";
import { AlbumForm } from "@/components/portal/admin-forms";
import { StatusBadge } from "@/components/portal/status-badge";
import { EmptyState } from "@/components/ui/states";
import { listAlbumsAdmin } from "@/server/queries/admin";

export const metadata = { title: "Gallery" };

export default async function AdminGalleryPage() {
  const albums = await listAlbumsAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold uppercase">Gallery</h1>
      <section aria-labelledby="new-h" className="space-y-3 rounded-lg border border-line bg-panel p-5">
        <h2 id="new-h" className="text-xl font-semibold uppercase text-gold">New album</h2>
        <AlbumForm />
      </section>
      {albums.length === 0 ? (
        <EmptyState title="No albums yet" />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
          {albums.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/admin/gallery/${a.id}`} className="font-medium hover:text-gold">
                  {a.title}
                </Link>
                <p className="text-xs text-muted">
                  {a.photoCount} photo{a.photoCount === 1 ? "" : "s"}
                </p>
              </div>
              <StatusBadge status={a.is_public ? "approved" : "pending"} label={a.is_public ? "Public" : "Hidden"} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
