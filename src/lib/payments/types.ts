/**
 * Payment provider abstraction shared by the Shop and Donations.
 *
 * Rules that hold for every provider:
 *  - Card data never touches this app.
 *  - The client never decides whether something is paid. Status changes happen only server-side:
 *    an officer verifying a manual payment, or a signed webhook from a gateway.
 */
export type PaymentKind = "order" | "donation";

export interface ManualInstructions {
  gcash_number?: string;
  gcash_name?: string;
  gcash_qr_path?: string;
  bank_name?: string;
  bank_account?: string;
  bank_account_name?: string;
  notes?: string;
}

export interface CreatePaymentInput {
  kind: PaymentKind;
  /** order or donation id; echoed back in webhooks via metadata */
  id: string;
  /** human reference shown to the payer, e.g. R3-2610-00001 */
  reference: string;
  amount: number;
  description: string;
  customer: { name: string; email: string };
  returnUrl: string;
}

export type CreatePaymentResult =
  /** Manual: show instructions, collect a reference number and optional proof; an officer verifies later. */
  | { mode: "manual"; instructions: ManualInstructions }
  /** Gateway: send the payer to a hosted checkout page. */
  | { mode: "redirect"; redirectUrl: string; providerRef: string };

export interface PaymentEvent {
  kind: PaymentKind;
  id: string;
  providerRef: string;
  amount: number;
  status: "paid" | "failed";
}

export interface PaymentProvider {
  readonly name: "manual" | "paymongo";
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /** Gateways only: verify a webhook's signature and extract the payment event. */
  parseWebhook?(rawBody: string, headers: Headers): PaymentEvent | null;
}
