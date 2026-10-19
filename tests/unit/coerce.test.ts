import { describe, expect, it } from "vitest";
import { RawAnalysisSchema, coerceRawAnalysis } from "@/lib/ai/schema";
import fixture from "./fixtures/raw-analysis.json";

describe("coerceRawAnalysis", () => {
  it("clamps an over-long but otherwise valid AI answer so it passes the schema", () => {
    const req = fixture.requirements[0];
    const long = {
      ...fixture,
      jobTitle: "J".repeat(200),
      requirements: Array.from({ length: 30 }, (_, i) => ({ ...req, skill: `Skill ${i} ${"x".repeat(100)}`, evidence: "e".repeat(400) })),
      suggestions: Array.from({ length: 8 }, () => "s".repeat(400)),
      coverLetter: "c".repeat(4000),
    };
    expect(RawAnalysisSchema.safeParse(long).success).toBe(false);
    const coerced = coerceRawAnalysis(long);
    const parsed = RawAnalysisSchema.safeParse(coerced);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.requirements).toHaveLength(25);
      expect(parsed.data.suggestions).toHaveLength(6);
      expect(parsed.data.coverLetter.length).toBeLessThanOrEqual(3500);
    }
  });

  it("leaves a valid answer unchanged and passes non-objects through", () => {
    expect(coerceRawAnalysis(fixture)).toEqual(fixture);
    expect(coerceRawAnalysis(null)).toBeNull();
    expect(coerceRawAnalysis({ nope: true })).toEqual({ nope: true });
  });
});
