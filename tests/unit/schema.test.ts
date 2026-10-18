import { describe, expect, it } from "vitest";
import { RawAnalysisSchema, rawAnalysisJsonSchema } from "@/lib/ai/schema";
import fixture from "./fixtures/raw-analysis.json";

const withChanges = (changes: Record<string, unknown>) => ({ ...structuredClone(fixture), ...changes });
const requirement = fixture.requirements[0];

describe("RawAnalysisSchema", () => {
  it("accepts the fixture", () => {
    expect(RawAnalysisSchema.safeParse(fixture).success).toBe(true);
  });

  it("rejects 0 or 26 requirements", () => {
    expect(RawAnalysisSchema.safeParse(withChanges({ requirements: [] })).success).toBe(false);
    expect(RawAnalysisSchema.safeParse(withChanges({ requirements: Array(26).fill(requirement) })).success).toBe(false);
  });

  it("rejects 7 suggestions", () => {
    expect(RawAnalysisSchema.safeParse(withChanges({ suggestions: Array(7).fill("Do this.") })).success).toBe(false);
  });

  it("rejects a 299-character cover letter", () => {
    expect(RawAnalysisSchema.safeParse(withChanges({ coverLetter: "c".repeat(299) })).success).toBe(false);
  });

  it("rejects a missing jobTitle", () => {
    const { jobTitle: _omit, ...rest } = structuredClone(fixture);
    expect(RawAnalysisSchema.safeParse(rest).success).toBe(false);
  });
});

describe("rawAnalysisJsonSchema", () => {
  it("is an object schema", () => {
    expect(rawAnalysisJsonSchema.type).toBe("object");
  });
});
