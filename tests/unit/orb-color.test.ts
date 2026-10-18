import { describe, expect, it } from "vitest";
import { orbColorFor } from "@/lib/orb-color";

describe("orbColorFor", () => {
  it("uses the primary color when there is no score", () => {
    expect(orbColorFor(null)).toBe("#0f766e");
  });

  it("goes from amber at 0 to teal at 100", () => {
    expect(orbColorFor(0)).toBe("#f59e0b");
    expect(orbColorFor(100)).toBe("#0f766e");
    expect(orbColorFor(50)).toBe("#828a3d");
  });

  it("clamps scores outside 0–100", () => {
    expect(orbColorFor(150)).toBe(orbColorFor(100));
    expect(orbColorFor(-5)).toBe(orbColorFor(0));
  });
});
