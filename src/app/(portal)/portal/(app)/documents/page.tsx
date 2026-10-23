import { Download, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/auth/session";
import { listDocuments } from "@/server/queries/dues";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  await requireUser("/documents");
  const docs = await listDocuments();
  const groups = new Map<string, typeof docs>();
  for (const d of docs) groups.set(d.category, [...(groups.get(d.category) ?? []), d]);

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold uppercase">Documents</h1>
        <p className="text-sm text-muted">Bylaws, forms and minutes. You only see documents your role may access.</p>
      </header>
      {docs.length === 0 ? (
        <EmptyState title="No documents yet">Officers will post bylaws, forms and minutes here.</EmptyState>
      ) : (
        [...groups].map(([category, items]) => (
          <section key={category} aria-labelledby={`cat-${category}`} className="space-y-2">
            <h2 id={`cat-${category}`} className="text-xl font-semibold uppercase capitalize text-gold">{category}</h2>
            <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
              {items.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <FileText aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <div className="min-w-0">
                      <p className="font-medium text-white">{d.title}</p>
                      {d.description ? <p className="text-sm text-muted">{d.description}</p> : null}
                      <p className="text-xs text-muted">Added {formatDate(d.created_at)}</p>
                    </div>
                  </div>
                  <a href={`/documents/${d.id}/download`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-4 text-sm font-medium hover:bg-white/10">
                    <Download aria-hidden className="h-4 w-4" /> Download
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
