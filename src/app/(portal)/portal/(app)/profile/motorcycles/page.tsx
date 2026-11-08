import Link from "next/link";
import { Bike } from "lucide-react";
import { DeleteButton, MotorcycleForm } from "@/components/portal/profile-forms";
import { EmptyState } from "@/components/ui/states";
import { ViewOnly, ViewOnlyNotice } from "@/components/portal/view-only";
import { requireUser } from "@/lib/auth/session";
import { deleteMotorcycle } from "@/server/profile-actions";
import { getOwnMotorcycles } from "@/server/queries/members";
import { memberCan } from "@/server/queries/permissions";

export const metadata = { title: "My Motorcycles" };

export default async function MotorcyclesPage() {
  const { userId, profile } = await requireUser("/profile/motorcycles");
  const [bikes, canEdit] = await Promise.all([getOwnMotorcycles(userId), memberCan(profile?.role, "manage_motorcycles")]);

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <Link href="/profile" className="text-sm text-gold hover:text-gold-hover">
          &larr; My profile
        </Link>
        <h1 className="mt-1 text-3xl font-semibold uppercase">My Motorcycles</h1>
      </header>
      {canEdit ? null : <ViewOnlyNotice />}

      {bikes.length === 0 ? (
        <EmptyState title="No motorcycles yet">{canEdit ? "Add the bikes you ride below." : "Ask an officer to add your bikes."}</EmptyState>
      ) : (
        <ul className="space-y-4">
          {bikes.map((b) => (
            <li key={b.id} className="rounded-lg border border-line bg-panel p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <Bike aria-hidden className="h-5 w-5 text-gold" />
                  {[b.year, b.make, b.model].filter(Boolean).join(" ")}
                </h2>
                {canEdit ? (
                  <form action={deleteMotorcycle}>
                    <input type="hidden" name="id" value={b.id} />
                    <DeleteButton label={`Delete ${b.make} ${b.model}`} />
                  </form>
                ) : null}
              </div>
              <ViewOnly locked={!canEdit}>
                <MotorcycleForm bike={b} />
              </ViewOnly>
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        <section aria-labelledby="add-h" className="rounded-lg border border-line bg-panel p-5">
          <h2 id="add-h" className="mb-4 text-xl font-semibold uppercase text-gold">Add a motorcycle</h2>
          <MotorcycleForm />
        </section>
      ) : null}
    </div>
  );
}
