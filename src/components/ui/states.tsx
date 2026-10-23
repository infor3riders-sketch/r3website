import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Empty state used by lists across both products. */
export function EmptyState({ title, children, className }: { title: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-dashed border-line px-6 py-10 text-center", className)}>
      <p className="font-display text-xl text-white">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-white/10", className)} />;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "success"; children: ReactNode }) {
  const tones = {
    info: "border-royal-edge/50 bg-royal/15 text-white",
    warn: "border-gold/50 bg-gold/10 text-white",
    error: "border-red-400/60 bg-red-500/10 text-red-100",
    success: "border-emerald-400/50 bg-emerald-500/10 text-emerald-100",
  } as const;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-md border px-4 py-3 text-sm", tones[tone])}>
      {children}
    </div>
  );
}
