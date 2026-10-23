import Link from "next/link";
import { StatusBadge } from "@/components/portal/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { formatDate } from "@/lib/format";
import { listNewsAdmin } from "@/server/queries/admin";

export const metadata = { title: "News" };

export default async function AdminNewsPage() {
  const posts = await listNewsAdmin();
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold uppercase">News</h1>
        <Link href="/admin/news/new" className={buttonVariants({ variant: "gold" })}>
          New post
        </Link>
      </header>
      {posts.length === 0 ? (
        <EmptyState title="No posts yet" />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
          {posts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/admin/news/${p.id}`} className="font-medium hover:text-gold">
                  {p.title}
                </Link>
                <p className="text-xs text-muted">{p.published_at ? formatDate(p.published_at) : "Not published"}</p>
              </div>
              <StatusBadge status={p.is_public ? "approved" : "pending"} label={p.is_public ? "Published" : "Draft"} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
