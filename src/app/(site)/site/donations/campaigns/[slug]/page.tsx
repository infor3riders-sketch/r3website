import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero, Section } from "@/components/site/page-hero";
import { CampaignProgress } from "@/components/site/progress-bar";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { getPublicCampaign } from "@/server/queries/donations";

export const revalidate = 120;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getPublicCampaign((await params).slug);
  return c ? { title: c.title, description: c.description?.slice(0, 160) ?? undefined } : {};
}

export default async function CampaignPage({ params }: Props) {
  const campaign = await getPublicCampaign((await params).slug);
  if (!campaign) notFound();
  const ended = campaign.ends_at ? new Date(campaign.ends_at) < new Date() : false;
  return (
    <>
      <PageHero eyebrow="Campaign" title={campaign.title} subtitle={campaign.ends_at ? `${ended ? "Ended" : "Runs until"} ${formatDate(campaign.ends_at)}` : undefined} />
      <Section id="campaign" className="max-w-3xl space-y-6">
        <div className="gold-hairline rounded-lg border bg-panel p-6">
          <CampaignProgress raised={campaign.raised} goal={campaign.goal_amount ? Number(campaign.goal_amount) : null} donors={campaign.donors} />
          <p className="mt-3 text-xs text-muted">Only verified donations are counted.</p>
        </div>
        {campaign.description ? <p className="whitespace-pre-line text-lg leading-relaxed text-white/90">{campaign.description}</p> : null}
        {campaign.is_active && !ended ? (
          <Link href={`/donations?campaign=${campaign.slug}#give`} className={buttonVariants({ size: "lg" })}>
            Donate to this campaign
          </Link>
        ) : (
          <p className="text-muted">This campaign is no longer accepting donations.</p>
        )}
      </Section>
    </>
  );
}
