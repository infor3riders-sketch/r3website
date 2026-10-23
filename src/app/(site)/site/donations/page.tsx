import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section } from "@/components/site/page-hero";
import { CampaignProgress } from "@/components/site/progress-bar";
import { DonationForm } from "@/components/site/donation-form";
import { PaymentInstructions } from "@/components/site/payment-instructions";
import { Notice } from "@/components/ui/states";
import { configuredProviderName } from "@/lib/payments";
import { getPaymentInstructions } from "@/server/queries/orders";
import { getFundUsage, listPublicCampaigns } from "@/server/queries/donations";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Donations",
  description: "Support R3 Riders' charity rides and community outreach. Every verified donation counts toward our campaigns.",
};

export default async function DonationsPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const sp = await searchParams;
  const [campaigns, usage] = await Promise.all([listPublicCampaigns(), getFundUsage()]);
  const open = campaigns.filter((c) => c.is_active && (!c.ends_at || new Date(c.ends_at) > new Date()));
  const preselect = open.find((c) => c.slug === sp.campaign)?.id;
  const instructions = configuredProviderName() === "manual" ? await getPaymentInstructions() : null;

  return (
    <>
      <PageHero eyebrow="Donate" title="Help us make an impact today" subtitle="Your gift funds charity rides, outreach and community partnerships." />

      {campaigns.length > 0 ? (
        <Section id="campaigns" title="Active campaigns">
          <ul className="grid gap-5 md:grid-cols-2">
            {campaigns.map((c) => (
              <li key={c.id} className="gold-hairline rounded-lg border border-b-4 border-b-gold bg-panel p-5 shadow-card">
                <h3 className="text-2xl font-semibold uppercase">
                  <Link href={`/donations/campaigns/${c.slug}`} className="hover:text-gold">{c.title}</Link>
                </h3>
                {c.description ? <p className="mt-1 line-clamp-2 text-sm text-muted">{c.description}</p> : null}
                <div className="mt-4"><CampaignProgress raised={c.raised} goal={c.goal_amount ? Number(c.goal_amount) : null} donors={c.donors} /></div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section id="give" title="Make a donation" className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="gold-hairline rounded-lg border bg-panel p-6 shadow-card">
          <DonationForm campaigns={open.map((c) => ({ id: c.id, title: c.title }))} defaultCampaignId={preselect} />
        </div>
        <aside className="space-y-5">
          {instructions ? <PaymentInstructions instructions={instructions} /> : null}
          <Notice tone="info">
            Donations are verified by an officer before they count toward a campaign. You will get an email acknowledgement.{" "}
            <Link href="/legal/donation-policy" className="underline">Donation policy</Link>
          </Notice>
        </aside>
      </Section>

      {usage.length > 0 ? (
        <Section id="transparency" title="How funds are used">
          <ul className="space-y-3">
            {usage.map((u) => (
              <li key={u.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-white">{u.label}</span>
                  <span className="font-semibold text-gold">{u.pct}%</span>
                </div>
                <div role="img" aria-label={`${u.label}: ${u.pct}%`} className="h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-royal-edge" style={{ width: `${Math.min(100, u.pct)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
