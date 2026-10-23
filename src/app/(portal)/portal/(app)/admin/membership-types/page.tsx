import { MembershipTypeForm } from "@/components/portal/admin-forms";
import { Button } from "@/components/ui/button";
import { formatPHP } from "@/lib/format";
import { deleteMembershipType } from "@/server/admin-actions";
import { listMembershipTypesAdmin } from "@/server/queries/admin";

export const metadata = { title: "Membership types" };

export default async function MembershipTypesPage() {
  const types = await listMembershipTypesAdmin();
  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold uppercase">Membership types</h1>
        <p className="text-sm text-muted">These appear on the public Membership page and in the application form.</p>
      </header>

      <section aria-labelledby="new-h" className="space-y-3 rounded-lg border border-line bg-panel p-5">
        <h2 id="new-h" className="text-xl font-semibold uppercase text-gold">New membership type</h2>
        <MembershipTypeForm />
      </section>

      {types.map((t) => (
        <section key={t.id} aria-label={t.name} className="space-y-3 rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold uppercase">
            {t.name} <span className="ml-2 text-base text-gold">{t.fee_amount > 0 ? formatPHP(Number(t.fee_amount), { whole: true }) : "Free"}</span>
          </h2>
          <MembershipTypeForm type={t} />
          <form action={deleteMembershipType}>
            <input type="hidden" name="id" value={t.id} />
            <Button type="submit" variant="ghost" size="sm" className="text-red-300">
              Delete
            </Button>
          </form>
        </section>
      ))}
    </div>
  );
}
