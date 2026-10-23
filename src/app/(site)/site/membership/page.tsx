import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PageHero, Section } from "@/components/site/page-hero";
import { MembershipStats } from "@/components/site/membership-stats";
import { EmptyState } from "@/components/ui/states";
import { formatPHP } from "@/lib/format";
import { getMembershipTypes } from "@/server/queries/public";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Membership",
  description: "Become a Riding Member, Associate/Supporter or Volunteer of R3 Riders. Types, requirements, fees and benefits.",
};

const STEPS = [
  { n: "01", title: "Apply", text: "Complete the application form below. It takes about 10 minutes." },
  { n: "02", title: "Review", text: "Our officers review your application and may reach out for more information." },
  { n: "03", title: "Get invited", text: "Approved applicants receive an email invitation to activate their member portal account." },
];

export default async function MembershipPage() {
  const types = await getMembershipTypes();
  return (
    <>
      <PageHero eyebrow="Membership" title="Join the brotherhood" subtitle="Ride with purpose. Choose the way you want to be part of R3 Riders." />

      <Section id="types" title="Membership types">
        {types.length === 0 ? (
          <EmptyState title="Membership details are being updated">Please contact us to learn how to join.</EmptyState>
        ) : (
          <ul className="grid gap-5 md:grid-cols-3">
            {types.map((t) => (
              <li key={t.id} className="gold-hairline flex flex-col rounded-lg border border-b-4 border-b-gold bg-panel p-6 shadow-card">
                <h3 className="text-2xl font-semibold uppercase tracking-wide">{t.name}</h3>
                <p className="mt-1 font-display text-3xl font-bold text-gold">
                  {t.fee_amount > 0 ? formatPHP(Number(t.fee_amount), { whole: true }) : "Free"}
                </p>
                {t.description ? <p className="mt-3 text-muted">{t.description}</p> : null}
                {t.requirements ? (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Requirements</h4>
                    <p className="mt-1 text-sm text-muted">{t.requirements}</p>
                  </div>
                ) : null}
                {t.benefits.length > 0 ? (
                  <ul className="mt-4 space-y-2 text-sm text-white/90">
                    {t.benefits.map((b) => (
                      <li key={b} className="flex gap-2">
                        <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {b}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <MembershipStats />

      <Section id="how" title="How it works">
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-lg border border-line bg-panel p-5">
              <span className="font-display text-3xl font-bold text-gold">{s.n}</span>
              <h3 className="mt-1 text-xl font-semibold uppercase">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="apply" title="Apply now">
        <div className="gold-hairline rounded-lg border bg-panel p-6 shadow-card">
          <p className="text-muted">The application form is being finalized.</p>
        </div>
      </Section>
    </>
  );
}
