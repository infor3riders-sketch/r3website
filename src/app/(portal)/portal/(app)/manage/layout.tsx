import { guardRoute } from "@/lib/auth/session";

// Officer/admin area (shop, donations, payments management).
export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  await guardRoute("officer");
  return children;
}
