import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";

describe("csv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('Juan, "JD"')).toBe('"Juan, ""JD"""');
    expect(csvCell("a\nb")).toBe('"a\nb"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(250)).toBe("250");
  });
  it("neutralises spreadsheet formulas", () => {
    for (const evil of ["=HYPERLINK(\"http://x\")", "+1+1", "-2+3", "@SUM(A1)"]) {
      expect(csvCell(evil).replace(/^"/, "").startsWith("'")).toBe(true);
    }
    expect(csvCell("normal text")).toBe("normal text");
  });
  it("builds CRLF rows with a trailing newline", () => {
    expect(toCsv(["a", "b"], [[1, "x,y"]])).toBe('a,b\r\n1,"x,y"\r\n');
  });
});
