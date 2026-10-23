import type { Metadata } from "next";
import { LoginForm } from "@/components/portal/auth-forms";
import { sanitizeNext } from "@/lib/auth/safe-redirect";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  link: "That sign-in link is invalid or has expired. Request a new one below.",
  config: "Sign-in is not configured yet.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const notice = sp.error ? NOTICES[sp.error] : !isSupabaseConfigured() ? NOTICES.config : undefined;
  return <LoginForm next={sanitizeNext(sp.next)} notice={notice} />;
}
