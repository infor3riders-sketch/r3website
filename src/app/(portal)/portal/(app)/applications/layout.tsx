import { guardRoute } from "@/lib/auth/session";

export default async function ApplicationsLayout({ children }: { children: React.ReactNode }) {
  await guardRoute("officer");
  return children;
}
