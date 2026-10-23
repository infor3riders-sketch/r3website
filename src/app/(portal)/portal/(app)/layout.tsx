import { PortalShell } from "@/components/portal/portal-shell";

// Role comes from the session in the auth phase; until then the shell renders the member view.
export default function PortalAppLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell role="member">{children}</PortalShell>;
}
