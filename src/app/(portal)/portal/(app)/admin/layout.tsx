import { guardRoute } from "@/lib/auth/session";

// Admin-only area. Non-admins get a 404 so the route does not reveal itself.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await guardRoute("admin");
  return children;
}
