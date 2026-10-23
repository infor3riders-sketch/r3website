import { createManualProvider } from "@/lib/payments/manual";
import { createPaymongoProvider } from "@/lib/payments/paymongo";
import type { ManualInstructions, PaymentProvider } from "@/lib/payments/types";

export type { CreatePaymentInput, CreatePaymentResult, ManualInstructions, PaymentEvent, PaymentKind, PaymentProvider } from "@/lib/payments/types";

export type ProviderName = "manual" | "paymongo";

/** `PAYMENT_PROVIDER=manual|paymongo`. Anything else (or unset) falls back to manual. */
export function configuredProviderName(env: string | undefined = process.env.PAYMENT_PROVIDER): ProviderName {
  return env === "paymongo" ? "paymongo" : "manual";
}

export function getPaymentProvider(loadInstructions: () => Promise<ManualInstructions>): PaymentProvider {
  return configuredProviderName() === "paymongo" ? createPaymongoProvider() : createManualProvider(loadInstructions);
}
