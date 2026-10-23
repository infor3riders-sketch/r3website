import type { Metadata } from "next";
import { SetPasswordForm } from "@/components/portal/auth-forms";

export const metadata: Metadata = { title: "Accept invitation" };

export default function AcceptInvitePage() {
  return (
    <SetPasswordForm
      title="Welcome, rider"
      intro="Set a password to activate your R3 Riders member account."
      cta="Activate account"
    />
  );
}
