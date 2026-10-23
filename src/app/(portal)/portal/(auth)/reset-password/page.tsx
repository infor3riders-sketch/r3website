import type { Metadata } from "next";
import { SetPasswordForm } from "@/components/portal/auth-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <SetPasswordForm
      title="New password"
      intro="Choose a new password for your account."
      cta="Update password"
    />
  );
}
