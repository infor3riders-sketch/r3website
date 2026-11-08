import { describe, expect, it } from "vitest";
import { manilaToday, parseReportRange } from "@/lib/report-range";

describe("report ranges (Manila days)", () => {
  it("uses Manila midnight bounds with an exclusive end", () => {
    const r = parseReportRange("2026-11-01", "2026-11-30");
    expect(r.startIso).toBe("2026-10-31T16:00:00.000Z");
    expect(r.endIso).toBe("2026-11-30T16:00:00.000Z");
  });

  it("rolls the end over month and year boundaries", () => {
    expect(parseReportRange("2026-12-01", "2026-12-31").endIso).toBe("2026-12-31T16:00:00.000Z");
    expect(parseReportRange("2026-02-01", "2026-02-28").endIso).toBe("2026-02-28T16:00:00.000Z");
  });

  it("defaults to this Manila month and swaps reversed ranges", () => {
    // 2026-11-08 01:00 in Manila is still 2026-11-07 in UTC.
    const now = new Date("2026-11-07T17:00:00Z");
    expect(manilaToday(now)).toBe("2026-11-08");
    expect(parseReportRange(undefined, "bad", now)).toMatchObject({ from: "2026-11-01", to: "2026-11-08" });
    expect(parseReportRange("2026-11-20", "2026-11-05", now)).toMatchObject({ from: "2026-11-05", to: "2026-11-20" });
  });

  it("rejects impossible dates", () => {
    const now = new Date("2026-11-07T17:00:00Z");
    expect(parseReportRange("2026-02-30", "2026-13-01", now)).toMatchObject({ from: "2026-11-01", to: "2026-11-08" });
  });
});
