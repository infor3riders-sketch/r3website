import { MemberPermissionsForm } from "@/components/portal/admin-forms";
import { getMemberPermissions } from "@/server/queries/permissions";

export const metadata = { title: "Member permissions" };
export const dynamic = "force-dynamic";

export default async function MemberPermissionsPage() {
  const value = await getMemberPermissions();
  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold uppercase">Member permissions</h1>
        <p className="text-sm text-muted">
          Choose what regular members can change in the portal. These apply to all members. Members can always sign in and view their profile, motorcycles, events, volunteer programs, dues and documents. Officers and admins are not affected, and admins can still edit any member under Members &amp; roles.
        </p>
      </header>
      <section className="rounded-lg border border-line bg-panel p-5">
        <MemberPermissionsForm value={value} />
      </section>
    </div>
  );
}
