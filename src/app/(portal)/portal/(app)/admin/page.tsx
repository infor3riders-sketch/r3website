export const metadata = { title: "Admin" };

export default function AdminHomePage() {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold uppercase">Admin</h1>
      <p className="text-muted">Members and roles, site content, settings and the audit log will live here.</p>
    </div>
  );
}
