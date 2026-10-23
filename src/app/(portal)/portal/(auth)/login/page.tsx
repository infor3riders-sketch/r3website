import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in" };

// Replaced by the real login flow in the auth phase.
export default function LoginPage() {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-2xl font-semibold uppercase">Sign in</h1>
      <p className="text-sm text-muted">Member sign-in arrives in the next phase.</p>
    </div>
  );
}
