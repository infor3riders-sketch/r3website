import Link from "next/link";
import { CampaignForm } from "@/components/portal/donation-forms";

export const metadata = { title: "New campaign" };

export default function NewCampaignPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/manage/donations/campaigns" className="text-sm text-gold hover:text-gold-hover">&larr; All campaigns</Link>
      <h1 className="text-3xl font-semibold uppercase">New campaign</h1>
      <div className="rounded-lg border border-line bg-panel p-5"><CampaignForm /></div>
    </div>
  );
}
