import Image from "next/image";
import { Landmark, Smartphone } from "lucide-react";
import type { ManualInstructions } from "@/lib/payments";
import { publicMediaUrl } from "@/lib/supabase/public";

/** The organization's manual payment instructions (admin-editable `payment_instructions` setting). */
export function PaymentInstructions({ instructions, reference }: { instructions: ManualInstructions; reference?: string }) {
  const qr = publicMediaUrl(instructions.gcash_qr_path);
  const hasAny = instructions.gcash_number || instructions.bank_account || instructions.notes;
  if (!hasAny) {
    return <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">Payment instructions will be sent by email. You may also contact us to arrange payment.</p>;
  }
  return (
    <div className="space-y-4 rounded-lg border border-gold/40 bg-gold/5 p-5">
      <h3 className="text-xl font-semibold uppercase text-gold">How to pay</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {instructions.gcash_number ? (
          <div className="space-y-1">
            <p className="flex items-center gap-2 font-semibold"><Smartphone aria-hidden className="h-4 w-4 text-gold" /> GCash</p>
            <p className="font-mono text-lg text-white">{instructions.gcash_number}</p>
            {instructions.gcash_name ? <p className="text-sm text-muted">{instructions.gcash_name}</p> : null}
            {qr ? <Image src={qr} alt="GCash QR code" width={160} height={160} className="mt-2 rounded-md border border-line bg-white p-1" /> : null}
          </div>
        ) : null}
        {instructions.bank_account ? (
          <div className="space-y-1">
            <p className="flex items-center gap-2 font-semibold"><Landmark aria-hidden className="h-4 w-4 text-gold" /> Bank transfer</p>
            {instructions.bank_name ? <p className="text-white">{instructions.bank_name}</p> : null}
            <p className="font-mono text-lg text-white">{instructions.bank_account}</p>
            {instructions.bank_account_name ? <p className="text-sm text-muted">{instructions.bank_account_name}</p> : null}
          </div>
        ) : null}
      </div>
      {reference ? <p className="text-sm text-white/90">Use <span className="font-mono font-semibold text-gold">{reference}</span> as your payment note, then send us the reference number below.</p> : null}
      {instructions.notes ? <p className="text-sm text-muted">{instructions.notes}</p> : null}
    </div>
  );
}
