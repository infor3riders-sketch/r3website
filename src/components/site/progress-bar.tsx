import { formatPHP, progressPercent } from "@/lib/format";

/** Campaign progress. `raised` must come from verified donations only (see campaign_totals()). */
export function CampaignProgress({ raised, goal, donors }: { raised: number; goal: number | null; donors: number }) {
  const pct = progressPercent(raised, goal);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-2xl font-bold text-gold">{formatPHP(raised, { whole: true })}</p>
        {goal ? <p className="text-sm text-muted">raised of {formatPHP(goal, { whole: true })} goal</p> : <p className="text-sm text-muted">raised so far</p>}
      </div>
      {goal ? (
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${pct}% of goal raised`} className="h-3 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-hover" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      <p className="text-xs text-muted">
        {donors} verified donation{donors === 1 ? "" : "s"}
        {goal ? ` · ${pct}%` : ""}
      </p>
    </div>
  );
}
