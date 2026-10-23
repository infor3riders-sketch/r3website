import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ReviewPanel } from "@/components/portal/review-panel";
import { StatusBadge } from "@/components/portal/status-badge";
import { applicationReference, canTransition, readMotorcycles, readReferences } from "@/lib/applications";
import { formatDate, formatDateTime } from "@/lib/format";
import { getApplicationForReview, getMembershipTypeNames } from "@/server/queries/applications";

export const metadata = { title: "Review application" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="whitespace-pre-line text-white">{children || <span className="text-muted">Not provided</span>}</dd>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <h2 className="mb-2 text-lg font-semibold uppercase tracking-wide text-gold">{title}</h2>
      {children}
    </section>
  );
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [app, typeNames] = await Promise.all([getApplicationForReview(id), getMembershipTypeNames()]);
  if (!app) notFound();

  const bikes = readMotorcycles(app.motorcycles);
  const refs = readReferences(app.references);
  const open = canTransition(app.status, "approved");

  return (
    <div className="space-y-5">
      <Link href="/applications" className="text-sm text-gold hover:text-gold-hover">
        &larr; All applications
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold uppercase">{app.full_name}</h1>
          <p className="text-sm text-muted">
            {applicationReference(app.id)} · submitted {formatDateTime(app.created_at)}
          </p>
        </div>
        <StatusBadge status={app.status} />
      </header>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card title="Applicant">
            <dl className="divide-y divide-line">
              <Row label="Email">{app.email}</Row>
              <Row label="Mobile">{app.phone}</Row>
              <Row label="Birthdate">{app.birthdate ? formatDate(app.birthdate) : ""}</Row>
              <Row label="Address">{app.address}</Row>
              <Row label="Road name">{app.road_name}</Row>
              <Row label="Membership type">{(app.membership_type_id && typeNames[app.membership_type_id]) || "Not specified"}</Row>
            </dl>
          </Card>

          <Card title="Riding">
            <dl className="divide-y divide-line">
              <Row label="Years riding">{app.riding_years?.toString()}</Row>
              <Row label="License no.">{app.license_number}</Row>
              <Row label="Experience">{app.riding_experience}</Row>
            </dl>
          </Card>

          <Card title="Motorcycles">
            {bikes.length === 0 ? (
              <p className="text-muted">None listed.</p>
            ) : (
              <ul className="divide-y divide-line">
                {bikes.map((m, i) => (
                  <li key={i} className="py-2 text-white">
                    {[m.year, m.make, m.model].filter(Boolean).join(" ")}
                    <span className="ml-2 text-sm text-muted">
                      {[m.displacement_cc ? `${m.displacement_cc}cc` : "", m.color, m.plate_number].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="References">
            {refs.length === 0 ? (
              <p className="text-muted">None listed.</p>
            ) : (
              <ul className="divide-y divide-line">
                {refs.map((r, i) => (
                  <li key={i} className="py-2 text-white">
                    {r.name} <span className="text-sm text-muted">· {r.relationship} · {r.phone}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Agreements">
            <dl className="divide-y divide-line">
              <Row label="Club rules">{app.agreed_rules ? "Agreed" : "Not agreed"}</Row>
              <Row label="Privacy consent">{app.consent_privacy ? "Given" : "Not given"}</Row>
              <Row label="Volunteer interests">{app.volunteer_interests.join(", ")}</Row>
            </dl>
          </Card>
        </div>

        <aside aria-label="Review" className="h-fit rounded-lg border border-line bg-panel p-5 xl:sticky xl:top-6">
          <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-gold">Review</h2>
          {app.reviewed_at ? <p className="mb-4 text-xs text-muted">Last reviewed {formatDateTime(app.reviewed_at)}</p> : null}
          <ReviewPanel id={app.id} notes={app.review_notes ?? ""} open={open} />
        </aside>
      </div>
    </div>
  );
}
