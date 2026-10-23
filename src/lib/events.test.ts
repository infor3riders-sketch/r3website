import { describe, expect, it } from "vitest";
import {
  fitsCapacity,
  isoToManilaLocal,
  isPastEvent,
  manilaDateKey,
  manilaLocalToIso,
  monthGrid,
  parseMonthParam,
  seatsRemaining,
  seatsUsed,
  shiftMonth,
} from "@/lib/events";

describe("capacity", () => {
  it("counts only going RSVPs, riders plus passengers", () => {
    expect(
      seatsUsed([
        { status: "going", riders: 2, passengers: 1 },
        { status: "maybe", riders: 5, passengers: 5 },
        { status: "no", riders: 1, passengers: 0 },
        { status: "going", riders: 1, passengers: 0 },
      ]),
    ).toBe(4);
  });
  it("handles unlimited and exhausted capacity", () => {
    expect(seatsRemaining(null, 99)).toBeNull();
    expect(seatsRemaining(10, 4)).toBe(6);
    expect(seatsRemaining(10, 12)).toBe(0);
  });
  it("lets members keep or shrink their own seats when full", () => {
    expect(fitsCapacity(10, 10, 2)).toBe(false);
    expect(fitsCapacity(10, 10, 2, 2)).toBe(true); // already holding 2 of the 10
    expect(fitsCapacity(10, 10, 1, 2)).toBe(true);
    expect(fitsCapacity(null, 999, 50)).toBe(true);
  });
});

describe("timezones", () => {
  it("converts Manila wall time to an instant and back", () => {
    const iso = manilaLocalToIso("2026-12-06T07:30");
    expect(iso).toBe("2026-12-05T23:30:00.000Z");
    expect(isoToManilaLocal(iso)).toBe("2026-12-06T07:30");
  });
  it("rejects malformed input", () => {
    expect(manilaLocalToIso("")).toBeNull();
    expect(manilaLocalToIso("2026-12-06")).toBeNull();
    expect(manilaLocalToIso("2026-13-40T99:99")).toBeNull();
  });
  it("buckets instants by Manila calendar day", () => {
    expect(manilaDateKey("2026-12-05T20:00:00Z")).toBe("2026-12-06");
    expect(manilaDateKey("2026-12-05T15:59:00Z")).toBe("2026-12-05");
  });
});

describe("isPastEvent", () => {
  const now = new Date("2026-12-06T12:00:00Z");
  it("uses end time, else start + 6h", () => {
    expect(isPastEvent({ starts_at: "2026-12-06T00:00:00Z", ends_at: "2026-12-06T11:00:00Z" }, now)).toBe(true);
    expect(isPastEvent({ starts_at: "2026-12-06T00:00:00Z", ends_at: "2026-12-06T13:00:00Z" }, now)).toBe(false);
    expect(isPastEvent({ starts_at: "2026-12-06T04:00:00Z", ends_at: null }, now)).toBe(true);
    expect(isPastEvent({ starts_at: "2026-12-06T08:00:00Z", ends_at: null }, now)).toBe(false);
  });
});

describe("calendar", () => {
  it("builds full Sunday-first weeks around the month", () => {
    const grid = monthGrid(2026, 11); // December 2026 starts on a Tuesday
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid[0][0].key).toBe("2026-11-29");
    expect(grid[0][2]).toMatchObject({ key: "2026-12-01", inMonth: true });
    expect(grid.flat().filter((c) => c.inMonth)).toHaveLength(31);
  });
  it("parses and shifts month params", () => {
    expect(parseMonthParam("2027-02")).toEqual({ year: 2027, month0: 1 });
    expect(parseMonthParam("garbage", new Date("2026-10-24T00:00:00Z"))).toEqual({ year: 2026, month0: 9 });
    expect(shiftMonth(2026, 11, 1)).toBe("2027-01");
    expect(shiftMonth(2026, 0, -1)).toBe("2025-12");
  });
});
