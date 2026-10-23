import type { ManualInstructions, PaymentProvider } from "@/lib/payments/types";

/**
 * v1 default. The payer follows the organization's instructions (GCash / bank, from the public
 * `payment_instructions` site setting), supplies a reference number and optional proof image, and
 * an officer verifies in the portal. Nothing here can mark anything paid.
 */
export function createManualProvider(loadInstructions: () => Promise<ManualInstructions>): PaymentProvider {
  return {
    name: "manual",
    async createPayment() {
      return { mode: "manual", instructions: await loadInstructions() };
    },
  };
}
