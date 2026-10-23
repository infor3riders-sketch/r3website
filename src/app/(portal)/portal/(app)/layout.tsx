import { PortalShell } from "@/components/portal/portal-shell";
import { Notice } from "@/components/ui/states";
import { requireUser } from "@/lib/auth/session";
import { signOut } from "@/server/auth-actions";
import { Button } from "@/components/ui/button";

// Everything under (app) needs a signed-in, active member. Role-gated areas add their own guard layout.
export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();

  if (!profile || profile.status !== "active") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
        <Notice tone="warn">
          Your account is not active. Please contact a club officer to restore access.
        </Notice>
        <form action={signOut}>
          <Button type="submit" variant="outline" block>
            Sign out
          </Button>
        </form>
      </main>
    );
  }

  return (
    <PortalShell user={{ name: profile.road_name || profile.full_name || profile.email || "Member", role: profile.role }}>
      {children}
    </PortalShell>
  );
}
