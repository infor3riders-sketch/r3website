import Link from "next/link";
import { NewsForm } from "@/components/portal/admin-forms";

export const metadata = { title: "New post" };

export default function NewNewsPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/admin/news" className="text-sm text-gold hover:text-gold-hover">
        &larr; All posts
      </Link>
      <h1 className="text-3xl font-semibold uppercase">New post</h1>
      <div className="rounded-lg border border-line bg-panel p-5">
        <NewsForm />
      </div>
    </div>
  );
}
