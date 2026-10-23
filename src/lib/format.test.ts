import { describe, expect, it } from "vitest";
import { formatDate, formatPHP, progressPercent, slugify } from "@/lib/format";

describe("formatPHP", () => {
  it("formats pesos", () => {
    expect(formatPHP(1500)).toMatch(/1,500\.00/);
    expect(formatPHP(1500, { whole: true })).toMatch(/1,500$/);
    expect(formatPHP(1500)).toContain("₱");
  });
});

describe("formatDate", () => {
  it("treats plain dates as Manila dates (no off-by-one)", () => {
    expect(formatDate("2026-12-06")).toMatch(/6/);
    expect(formatDate("2026-12-06")).toMatch(/Dec/);
  });
  it("renders timestamps in Asia/Manila", () => {
    // 2026-12-05T20:00Z is already Dec 6 in Manila (UTC+8)
    expect(formatDate("2026-12-05T20:00:00Z")).toMatch(/Dec 6/);
  });
});

describe("progressPercent", () => {
  it("clamps and handles missing goals", () => {
    expect(progressPercent(25, 100)).toBe(25);
    expect(progressPercent(250, 100)).toBe(100);
    expect(progressPercent(-5, 100)).toBe(0);
    expect(progressPercent(50, null)).toBe(0);
    expect(progressPercent(50, 0)).toBe(0);
  });
});

describe("slugify", () => {
  it("makes url-safe slugs", () => {
    expect(slugify("Charity Ride 2026!")).toBe("charity-ride-2026");
    expect(slugify("  Café  Meetup ")).toBe("cafe-meetup");
  });
});
