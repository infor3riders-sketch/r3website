import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { MemberForm } from "@/components/portal/admin-forms";
import { formatDate } from "@/lib/format";
import { getMember } from "@/server/queries/admin";

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
  const data = await getMember(id);
  if (!data) notFound();
  const { profile: p, bikes, types } = data;

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
        <h2 className="text-xl font-semibold uppercase text-gold">Access</h2>
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
