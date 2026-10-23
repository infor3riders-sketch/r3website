import "server-only";
import type { RenderedEmail } from "@/emails/layout";

export interface SendResult {
  sent: boolean;
  skipped?: boolean;
  error?: string;
}

/**
 * Sends through Resend's HTTP API (no SDK). Without RESEND_API_KEY the message is logged and
 * skipped so local development works end to end. Never throws: email failure must not fail the
 * user's action; callers can inspect the result.
 */
export async function sendEmail(to: string, email: RenderedEmail, opts: { replyTo?: string } = {}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email skipped: no RESEND_API_KEY] to=${to} subject="${email.subject}"`);
    return { sent: false, skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "R3 Riders <no-reply@r3riders.org>",
        to: [to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const error = `Resend ${res.status}`;
      console.error("email send failed", error);
      return { sent: false, error };
    }
    return { sent: true };
  } catch (e) {
    console.error("email send threw", e);
    return { sent: false, error: "network" };
  }
}
