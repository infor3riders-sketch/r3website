import Link from "next/link";
import { DonationTabs } from "@/components/portal/donation-forms";
import { StatusBadge } from "@/components/portal/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { formatPHP, progressPercent } from "@/lib/format";
import { listCampaignsAdmin } from "@/server/queries/donations";

export const metadata = { title: "Campaigns" };

export default async function CampaignsAdminPage() {
  const campaigns = await listCampaignsAdmin();
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold uppercase">Donations</h1>
          <p className="text-sm text-muted">Campaigns with goals and verified progress.</p>
        </div>
        <Link href="/manage/donations/campaigns/new" className={buttonVariants({ variant: "gold" })}>New campaign</Link>
      </header>
      <DonationTabs active="campaigns" />
      {campaigns.length === 0 ? (
        <EmptyState title="No campaigns yet" />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
          {campaigns.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/manage/donations/campaigns/${c.id}`} className="font-medium hover:text-gold">{c.title}</Link>
                <p className="text-xs text-muted">
                  {formatPHP(c.raised, { whole: true })}
                  {c.goal_amount ? ` of ${formatPHP(Number(c.goal_amount), { whole: true })} (${progressPercent(c.raised, Number(c.goal_amount))}%)` : " raised"} · {c.donors} verified
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={c.is_public ? "approved" : "pending"} label={c.is_public ? "Public" : "Hidden"} />
                {c.is_active ? null : <span className="text-xs text-muted">closed</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
