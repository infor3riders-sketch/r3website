import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { NewsForm } from "@/components/portal/admin-forms";
import { Button } from "@/components/ui/button";
import { deleteNews } from "@/server/admin-actions";
import { getNewsAdmin } from "@/server/queries/admin";

export const metadata = { title: "Edit post" };

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const post = await getNewsAdmin(id);
  if (!post) notFound();
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/admin/news" className="text-sm text-gold hover:text-gold-hover">
        &larr; All posts
      </Link>
      <h1 className="text-3xl font-semibold uppercase">{post.title}</h1>
      <div className="rounded-lg border border-line bg-panel p-5">
        <NewsForm post={post} />
      </div>
      <form action={deleteNews}>
        <input type="hidden" name="id" value={post.id} />
        <Button type="submit" variant="danger" size="sm">
          Delete post
        </Button>
      </form>
    </div>
  );
}
