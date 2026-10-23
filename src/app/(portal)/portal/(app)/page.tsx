import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { profile } = await requireUser();
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold uppercase">
        Welcome, {profile?.road_name || profile?.full_name || "rider"}
      </h1>
      <p className="text-muted">Announcements, next ride, RSVPs and dues status will appear here.</p>
    </div>
  );
}
