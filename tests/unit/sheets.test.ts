import { describe, expect, it } from "vitest";
import { makeSheets, sheetCount } from "@/lib/sheets";

describe("sheetCount", () => {
  it("uses 14 sheets on a wide landing page, 8 on a narrow one, and 6 elsewhere", () => {
    expect(sheetCount("landing", 1280)).toBe(14);
    expect(sheetCount("landing", 360)).toBe(8);
    expect(sheetCount("app", 1280)).toBe(6);
    expect(sheetCount("app", 360)).toBe(6);
  });
});

describe("makeSheets", () => {
  it("is deterministic for the same seed", () => {
    expect(makeSheets(8, 42, true)).toEqual(makeSheets(8, 42, true));
  });

  it("alternates sides and keeps sheets away from the centre so text stays readable", () => {
    const sheets = makeSheets(14, 7, false);
    expect(sheets).toHaveLength(14);
    sheets.forEach((s, i) => {
      expect(Math.sign(s.x)).toBe(i % 2 ? 1 : -1);
      expect(Math.abs(s.x)).toBeGreaterThanOrEqual(3);
      expect(s.z).toBeLessThan(-1 + 1e-9);
      expect(s.lines).toHaveLength(6);
    });
  });

  it("shifts sheets right on wide screens", () => {
    const narrow = makeSheets(4, 1, false);
    const wide = makeSheets(4, 1, true);
    wide.forEach((s, i) => expect(s.x).toBeCloseTo(narrow[i].x + 2));
  });
});
