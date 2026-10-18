import { describe, expect, it } from "vitest";
import { bandFor, scoreFromRequirements } from "@/lib/scoring";

describe("scoreFromRequirements", () => {
  it("gives 100 when everything is matched and 0 when everything is missing", () => {
    expect(scoreFromRequirements([{ importance: "required", status: "matched" }, { importance: "nice_to_have", status: "matched" }])).toBe(100);
    expect(scoreFromRequirements([{ importance: "required", status: "missing" }, { importance: "nice_to_have", status: "missing" }])).toBe(0);
  });

  it("weights required twice as much as nice-to-have", () => {
    expect(scoreFromRequirements([{ importance: "required", status: "matched" }, { importance: "nice_to_have", status: "missing" }])).toBe(67);
  });

  it("gives half credit for partial", () => {
    expect(scoreFromRequirements([{ importance: "required", status: "partial" }])).toBe(50);
    expect(
      scoreFromRequirements([
        { importance: "nice_to_have", status: "partial" },
        { importance: "nice_to_have", status: "partial" },
        { importance: "required", status: "matched" },
      ]),
    ).toBe(75);
  });
});

describe("bandFor", () => {
  it.each([
    [39, "Low match"],
    [40, "Fair match"],
    [59, "Fair match"],
    [60, "Good match"],
    [79, "Good match"],
    [80, "Strong match"],
  ] as const)("score %i is %s", (score, band) => {
    expect(bandFor(score)).toBe(band);
  });
});
