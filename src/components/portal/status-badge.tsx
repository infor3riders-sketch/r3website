import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  pending: "border-gold/60 bg-gold/10 text-gold",
  info_requested: "border-royal-edge/60 bg-royal/20 text-white",
  approved: "border-emerald-400/50 bg-emerald-500/10 text-emerald-200",
  paid: "border-emerald-400/50 bg-emerald-500/10 text-emerald-200",
  completed: "border-emerald-400/50 bg-emerald-500/10 text-emerald-200",
  rejected: "border-red-400/50 bg-red-500/10 text-red-200",
  cancelled: "border-red-400/50 bg-red-500/10 text-red-200",
  expired: "border-line bg-white/5 text-muted",
};

const LABELS: Record<string, string> = {
  info_requested: "Info requested",
  pending_payment: "Awaiting payment",
};

/** Status chip used across portal tables. Text always carries the meaning; colour is secondary. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label = LABELS[status] ?? status.replace(/_/g, " ");
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize", TONES[status] ?? "border-line text-white", className)}>
      {label}
    </span>
  );
}
