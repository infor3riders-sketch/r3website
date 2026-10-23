import { describe, expect, it } from "vitest";
import { safeSearch } from "@/lib/search";

describe("safeSearch", () => {
  it("removes filter-injection characters", () => {
    expect(safeSearch("juan,status.eq.approved")).toBe("juan status eq approved");
    expect(safeSearch("a%b_c(d)")).toBe("a b c d");
  });
  it("trims and caps length", () => {
    expect(safeSearch("   x   ")).toBe("x");
    expect(safeSearch("y".repeat(200)).length).toBe(80);
  });
});
