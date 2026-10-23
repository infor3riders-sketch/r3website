import { describe, expect, it } from "vitest";
import { barPercent, cleanStats, totalMembers } from "@/lib/membership-stats";

describe("membership stats", () => {
  const stats = cleanStats([
    { area: "Iloilo City", members: 20 },
    { area: "Cabatuan", members: 30 },
    { area: "Sta. Barbara", members: 15 },
  ]);
  it("sorts largest first and totals", () => {
    expect(stats.map((s) => s.area)).toEqual(["Cabatuan", "Iloilo City", "Sta. Barbara"]);
    expect(totalMembers(stats)).toBe(65);
  });
  it("scales bars against the largest area", () => {
    expect(barPercent(30, stats)).toBe(100);
    expect(barPercent(15, stats)).toBe(50);
    expect(barPercent(0, [])).toBe(0);
  });
  it("ignores malformed rows", () => {
    expect(cleanStats(null)).toEqual([]);
    expect(cleanStats([{ area: "", members: 5 }, { area: "X", members: -1 }, { area: "Y", members: "9" }, { area: " Z ", members: 4.9 }])).toEqual([{ area: "Z", members: 4 }]);
  });
});
