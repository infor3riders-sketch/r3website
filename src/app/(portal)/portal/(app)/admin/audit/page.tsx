import Link from "next/link";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/format";
import { changedKeys } from "@/lib/validators/admin";
import { listAudit, listAuditTables } from "@/server/queries/admin";

export const metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ table?: string; action?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page) || 0);
  const [{ rows, pageSize }, tables] = await Promise.all([listAudit({ table: sp.table, action: sp.action, page }), listAuditTables()]);
  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { table: sp.table, action: sp.action, page: String(page), ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/admin/audit?${p.toString()}`;
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold uppercase">Audit log</h1>
        <p className="text-sm text-muted">Changes to sensitive records and data exports. Entries cannot be edited. Personal details are minimised in the log.</p>
      </header>

      <form className="flex flex-wrap items-end gap-3" role="search">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Table</span>
          <select name="table" defaultValue={sp.table ?? ""} className="h-11 rounded-md border border-line bg-black/40 px-3 text-white">
            <option value="">All</option>
            {tables.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Action</span>
          <select name="action" defaultValue={sp.action ?? ""} className="h-11 rounded-md border border-line bg-black/40 px-3 text-white">
            <option value="">All</option>
            {["insert", "update", "delete", "export_donations"].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-11 rounded-md border border-line px-4 text-sm font-medium hover:bg-white/10">
          Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No entries" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">When</th>
                <th scope="col" className="px-4 py-3">Who</th>
                <th scope="col" className="px-4 py-3">What</th>
                <th scope="col" className="px-4 py-3">Changed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2 text-muted">{formatDateTime(r.created_at)}</td>
                  <td className="px-4 py-2">{r.actor}</td>
                  <td className="px-4 py-2">
                    <span className="font-mono text-xs">{r.action}</span> <span className="text-muted">{r.table_name}</span>
                    {r.row_id ? <div className="font-mono text-[11px] text-muted">{r.row_id.slice(0, 8)}</div> : null}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted">
                    {r.action === "update" ? changedKeys(r.old_data, r.new_data).join(", ") || "(no visible change)" : r.action === "export_donations" ? JSON.stringify(r.new_data) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav aria-label="Pagination" className="flex gap-3 text-sm">
        {page > 0 ? (
          <Link href={qs({ page: String(page - 1) })} className="text-gold hover:text-gold-hover">
            &larr; Newer
          </Link>
        ) : null}
        {rows.length === pageSize ? (
          <Link href={qs({ page: String(page + 1) })} className="text-gold hover:text-gold-hover">
            Older &rarr;
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
