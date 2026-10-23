export interface AreaStat {
  area: string;
  members: number;
}

/** Drops malformed rows (settings are admin-edited JSON) and sorts largest first. */
export function cleanStats(input: unknown): AreaStat[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((r): r is AreaStat => !!r && typeof r.area === "string" && r.area.trim() !== "" && Number.isFinite(r.members) && r.members >= 0)
    .map((r) => ({ area: r.area.trim(), members: Math.floor(r.members) }))
    .sort((a, b) => b.members - a.members);
}

export const totalMembers = (stats: AreaStat[]) => stats.reduce((n, s) => n + s.members, 0);

/** Whole-percent share of the largest area, used for bar widths (largest = 100). */
export function barPercent(members: number, stats: AreaStat[]): number {
  const max = Math.max(0, ...stats.map((s) => s.members));
  return max === 0 ? 0 : Math.round((members / max) * 100);
}
