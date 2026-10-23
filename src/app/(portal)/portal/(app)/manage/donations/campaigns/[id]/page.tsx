import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CampaignForm } from "@/components/portal/donation-forms";
import { Button } from "@/components/ui/button";
import { deleteCampaign } from "@/server/donation-admin-actions";
import { getCampaignAdmin } from "@/server/queries/donations";

export const metadata = { title: "Edit campaign" };

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const campaign = await getCampaignAdmin(id);
  if (!campaign) notFound();
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/manage/donations/campaigns" className="text-sm text-gold hover:text-gold-hover">&larr; All campaigns</Link>
      <h1 className="text-3xl font-semibold uppercase">{campaign.title}</h1>
      <div className="rounded-lg border border-line bg-panel p-5"><CampaignForm campaign={campaign} /></div>
      <p className="text-xs text-muted">Deleting a campaign keeps its donations; they move to the general fund.</p>
      <form action={deleteCampaign}>
        <input type="hidden" name="id" value={campaign.id} />
        <Button type="submit" variant="danger" size="sm">Delete campaign</Button>
      </form>
    </div>
  );
}
