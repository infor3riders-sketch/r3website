import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AccessToggle, MemberForm } from "@/components/portal/admin-forms";
import { requireRole } from "@/lib/auth/session";
import { formatDate, formatDateTimeFull } from "@/lib/format";
import { getMember } from "@/server/queries/admin";
import { listLoginEvents } from "@/server/queries/activity";

export const metadata = { title: "Member" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-white">{children || <span className="text-muted">Not provided</span>}</dd>
    </div>
  );
}

export default async function AdminMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [data, me, logins] = await Promise.all([getMember(id), requireRole("admin"), listLoginEvents({ profileId: id, page: 0, pageSize: 5 })]);
  if (!data) notFound();
  const { profile: p, bikes, types } = data;
  const name = p.full_name ?? p.email ?? "this user";

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/members" className="text-sm text-gold hover:text-gold-hover">
        &larr; All members
      </Link>
      <header>
        <h1 className="text-3xl font-semibold uppercase">{p.full_name ?? p.email}</h1>
        <p className="text-sm text-muted">{p.email}</p>
      </header>

      <section className="space-y-3 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-xl font-semibold uppercase text-gold">Portal access</h2>
        {p.id === me.id ? (
          <p className="text-sm text-muted">This is your own account. Another admin would have to turn off your access.</p>
        ) : (
          <AccessToggle id={p.id} on={p.portal_access} name={name} />
        )}
        <p className="text-xs text-muted">
          When off, they are signed out and cannot sign in or see anything in the portal. Their records are kept and can be restored by turning access back on.
          {p.access_changed_at ? ` Last changed ${formatDateTimeFull(p.access_changed_at)}.` : ""}
        </p>
        <h3 className="pt-2 text-sm font-semibold uppercase tracking-wider text-muted">Recent sign-ins</h3>
        {logins.rows.length === 0 ? (
          <p className="text-sm text-muted">No sign-in activity recorded yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {logins.rows.map((r) => (
              <li key={r.id} className="flex flex-wrap gap-x-3">
                <span className="text-muted">{formatDateTimeFull(r.created_at)}</span>
                <span>{r.label}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/admin/activity?member=${p.id}`} className="text-sm text-gold hover:text-gold-hover">All login activity for {name} &rarr;</Link>
      </section>

      <section className="space-y-3 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-xl font-semibold uppercase text-gold">Role &amp; membership</h2>
        <MemberForm profile={p} types={types} />
        <p className="text-xs text-muted">You cannot demote or deactivate your own account. Role changes are recorded in the audit log.</p>
      </section>

      <section className="rounded-lg border border-line bg-panel p-5">
        <h2 className="mb-1 text-xl font-semibold uppercase text-gold">Profile (admin view)</h2>
        <p className="mb-2 text-xs text-muted">Contains personal data. Handle under the Data Privacy Act; do not share.</p>
        <dl className="divide-y divide-line">
          <Row label="Road name">{p.road_name}</Row>
          <Row label="Mobile">{p.phone}</Row>
          <Row label="Address">{p.address}</Row>
          <Row label="Birthdate">{p.birthdate ? formatDate(p.birthdate) : ""}</Row>
          <Row label="Blood type">{p.blood_type}</Row>
          <Row label="Emergency contact">{[p.emergency_contact_name, p.emergency_contact_relation, p.emergency_contact_phone].filter(Boolean).join(" · ")}</Row>
          <Row label="Member since">{p.member_since ? formatDate(p.member_since) : ""}</Row>
          <Row label="Motorcycles">{bikes.map((b) => [b.year, b.make, b.model].filter(Boolean).join(" ")).join(", ")}</Row>
        </dl>
      </section>
    </div>
  );
}
