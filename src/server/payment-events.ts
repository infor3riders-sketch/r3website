import "server-only";
import { donationAcknowledgement, orderStatusUpdate } from "@/emails/templates";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { deriveOrderToken } from "@/lib/order-token";
import type { PaymentEvent } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Applies a verified gateway payment event. Callers must have verified the signature first.
 * Idempotent: the SQL functions only move `pending` rows, so webhook retries are harmless.
 * Returns true when something changed.
 */
export async function applyPaymentEvent(event: PaymentEvent): Promise<boolean> {
  if (event.status !== "paid") return false;
  const admin = createAdminClient();

  if (event.kind === "order") {
    const { data: order } = await admin.from("orders").select("id, order_no, total, customer_name, email").eq("id", event.id).maybeSingle();
    if (!order) return false;
    // Never trust the event amount blindly: it must cover the order total.
    if (event.amount + 0.001 < Number(order.total)) {
      console.error("paymongo amount below order total", { order: order.order_no, paid: event.amount, total: order.total });
      return false;
    }
    const { data: ok } = await admin.rpc("mark_order_paid", { p_order: order.id });
    if (ok) {
      await admin.from("payments").update({ status: "paid" }).eq("provider", "paymongo").eq("provider_ref", event.providerRef);
      await sendEmail(
        order.email,
        orderStatusUpdate({ name: order.customer_name, orderNo: order.order_no, status: "Payment verified", lookupUrl: siteUrl(`/orders/${order.order_no}?t=${deriveOrderToken(order.id)}`) }),
      );
    }
    return Boolean(ok);
  }

  const { data: donation } = await admin.from("donations").select("id, donor_name, donor_email, amount, campaign_id").eq("id", event.id).maybeSingle();
  if (!donation) return false;
  if (event.amount + 0.001 < Number(donation.amount)) {
    console.error("paymongo amount below donation amount", { donation: donation.id });
    return false;
  }
  const { data: ok } = await admin.rpc("mark_donation_paid", { p_donation: donation.id });
  if (ok) {
    await admin.from("payments").update({ status: "paid" }).eq("provider", "paymongo").eq("provider_ref", event.providerRef);
    let campaign: string | undefined;
    if (donation.campaign_id) {
      const { data: c } = await admin.from("donation_campaigns").select("title").eq("id", donation.campaign_id).maybeSingle();
      campaign = c?.title;
    }
    await sendEmail(donation.donor_email, donationAcknowledgement({ name: donation.donor_name, amount: Number(donation.amount), campaign, reference: donation.id.slice(0, 8).toUpperCase() }));
  }
  return Boolean(ok);
}
