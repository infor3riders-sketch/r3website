import { details, p, renderEmail, type RenderedEmail } from "@/emails/layout";
import { formatPHP } from "@/lib/format";

/**
 * Transactional email templates. Each is a pure function (testable, no I/O) that returns
 * { subject, html, text }. Supabase Auth sends invite / password reset / magic link itself using
 * supabase/templates/*.html in matching brand styles.
 */

export interface ApplicationEmailInput {
  name: string;
  reference: string;
}

export const applicationReceived = ({ name, reference }: ApplicationEmailInput): RenderedEmail =>
  renderEmail({
    subject: "We received your R3 Riders application",
    heading: "Application received",
    preheader: "Thanks for applying. Here is what happens next.",
    body:
      p(`Hi ${name},`) +
      p("Thank you for applying to join R3 Riders. Our officers will review your application and contact you by email.") +
      details([["Reference", reference]]),
    text: `Hi ${name},\n\nThank you for applying to join R3 Riders. Our officers will review your application and contact you by email.\nReference: ${reference}`,
  });

export const applicationApproved = ({ name }: { name: string }): RenderedEmail =>
  renderEmail({
    subject: "Welcome to R3 Riders: your application was approved",
    heading: "You're in, rider",
    preheader: "Check your inbox for the portal invitation.",
    body:
      p(`Congratulations ${name}! Your application has been approved.`) +
      p("You will receive a separate email with an invitation to activate your member portal account. Set a password from that email to get started."),
    text: `Congratulations ${name}! Your application has been approved.\n\nYou will receive a separate email with an invitation to activate your member portal account.`,
  });

export const applicationRejected = ({ name, note }: { name: string; note?: string }): RenderedEmail =>
  renderEmail({
    subject: "Update on your R3 Riders application",
    heading: "Application update",
    body:
      p(`Hi ${name},`) +
      p("Thank you for your interest in R3 Riders. After review, we are unable to approve your application at this time.") +
      (note ? p(note) : "") +
      p("You are welcome to follow our public activities and apply again in the future."),
    text: `Hi ${name},\n\nThank you for your interest in R3 Riders. After review, we are unable to approve your application at this time.${note ? `\n\n${note}` : ""}`,
  });

export const applicationInfoRequested = ({ name, message }: { name: string; message: string }): RenderedEmail =>
  renderEmail({
    subject: "R3 Riders needs a bit more information",
    heading: "More information needed",
    body: p(`Hi ${name},`) + p("An officer reviewing your application has a question:") + p(message) + p("Please reply to this email with the details."),
    text: `Hi ${name},\n\nAn officer reviewing your application has a question:\n\n${message}\n\nPlease reply to this email with the details.`,
  });

export const volunteerConfirmation = ({ name, program }: { name: string; program: string }): RenderedEmail =>
  renderEmail({
    subject: `Thanks for volunteering: ${program}`,
    heading: "Volunteer sign-up received",
    body: p(`Hi ${name},`) + p(`Thank you for offering your time to ${program}. An officer will contact you with the details.`),
    text: `Hi ${name},\n\nThank you for offering your time to ${program}. An officer will contact you with the details.`,
  });

export interface OrderEmailInput {
  name: string;
  orderNo: string;
  total: number;
  items: { name: string; quantity: number; unitPrice: number }[];
  lookupUrl: string;
  paymentNote?: string;
}

const itemLines = (items: OrderEmailInput["items"]): [string, string][] =>
  items.map((i) => [`${i.quantity} x ${i.name}`, formatPHP(i.unitPrice * i.quantity)]);

export const orderConfirmation = (o: OrderEmailInput): RenderedEmail =>
  renderEmail({
    subject: `Order ${o.orderNo} received`,
    heading: "Order received",
    preheader: `Order ${o.orderNo}: payment verification pending.`,
    body:
      p(`Hi ${o.name}, thanks for supporting R3 Riders!`) +
      details([["Order", o.orderNo], ...itemLines(o.items), ["Total", formatPHP(o.total)]]) +
      p(o.paymentNote ?? "Your order is reserved while we verify your payment. We will email you once it is confirmed."),
    text: `Hi ${o.name}, thanks for supporting R3 Riders!\n\nOrder ${o.orderNo}\n${o.items.map((i) => `${i.quantity} x ${i.name}  ${formatPHP(i.unitPrice * i.quantity)}`).join("\n")}\nTotal: ${formatPHP(o.total)}\n\nTrack your order: ${o.lookupUrl}`,
    cta: { label: "Track your order", href: o.lookupUrl },
  });

export const orderStatusUpdate = (o: { name: string; orderNo: string; status: string; note?: string; lookupUrl: string }): RenderedEmail =>
  renderEmail({
    subject: `Order ${o.orderNo}: ${o.status}`,
    heading: "Order update",
    body: p(`Hi ${o.name},`) + details([["Order", o.orderNo], ["Status", o.status]]) + (o.note ? p(o.note) : ""),
    text: `Hi ${o.name},\n\nOrder ${o.orderNo} is now: ${o.status}.${o.note ? `\n\n${o.note}` : ""}`,
    cta: { label: "View order", href: o.lookupUrl },
  });

export const donationAcknowledgement = (d: {
  name: string;
  amount: number;
  campaign?: string;
  reference: string;
  /** Official receipts only when the organization enables them in settings; otherwise an acknowledgement. */
  official?: boolean;
}): RenderedEmail =>
  renderEmail({
    subject: d.official ? "Your R3 Riders donation receipt" : "Thank you for your donation",
    heading: d.official ? "Donation receipt" : "Thank you, ally",
    body:
      p(`Hi ${d.name},`) +
      p(`We have received and verified your donation. Your generosity helps us ride for a better tomorrow.`) +
      details([
        ["Reference", d.reference],
        ["Amount", formatPHP(d.amount)],
        ...(d.campaign ? ([["Campaign", d.campaign]] as [string, string][]) : []),
      ]) +
      (d.official ? "" : p("This email is an acknowledgement of your donation and not an official receipt.")),
    text: `Hi ${d.name},\n\nWe have received and verified your donation of ${formatPHP(d.amount)}${d.campaign ? ` to ${d.campaign}` : ""}. Reference: ${d.reference}.${d.official ? "" : "\n\nThis email is an acknowledgement and not an official receipt."}`,
  });

export const donationPending = (d: { name: string; amount: number; reference: string }): RenderedEmail =>
  renderEmail({
    subject: "We received your donation pledge",
    heading: "Pledge received",
    body:
      p(`Hi ${d.name},`) +
      p("Thank you! We will verify your payment and send an acknowledgement once confirmed.") +
      details([["Reference", d.reference], ["Amount", formatPHP(d.amount)]]),
    text: `Hi ${d.name},\n\nThank you! We will verify your payment (${formatPHP(d.amount)}, ref ${d.reference}) and send an acknowledgement once confirmed.`,
  });
