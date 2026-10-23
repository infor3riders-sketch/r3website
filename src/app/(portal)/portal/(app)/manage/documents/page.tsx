import { DocumentUploadForm } from "@/components/portal/dues-forms";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { requireUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";
import { formatDate } from "@/lib/format";
import { deleteDocument } from "@/server/document-actions";
import { listDocuments } from "@/server/queries/dues";

export const metadata = { title: "Manage documents" };

export default async function ManageDocumentsPage() {
  const { profile } = await requireUser("/manage/documents");
  const docs = await listDocuments();
  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold uppercase">Manage documents</h1>
        <p className="text-sm text-muted">Upload bylaws, forms and minutes and choose who can see them.</p>
      </header>
      <section aria-labelledby="up-h" className="space-y-3 rounded-lg border border-line bg-panel p-5">
        <h2 id="up-h" className="text-xl font-semibold uppercase text-gold">Upload</h2>
        <DocumentUploadForm canAdminOnly={hasRole(profile?.role, "admin")} />
      </section>
      {docs.length === 0 ? (
        <EmptyState title="No documents yet" />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{d.title}</p>
                <p className="text-xs capitalize text-muted">{d.category} · visible to {d.min_role === "member" ? "all members" : `${d.min_role}s`} · {formatDate(d.created_at)}</p>
              </div>
              <form action={deleteDocument}>
                <input type="hidden" name="id" value={d.id} />
                <Button type="submit" variant="ghost" size="sm" className="text-red-300">Delete</Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
