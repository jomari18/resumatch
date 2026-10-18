import { describe, expect, it } from "vitest";
import { AnalyzeRequestSchema, LIMITS, checkLength, normalizeText } from "@/lib/input";

const job = "j".repeat(150);
const resume = "r".repeat(250);

describe("normalizeText", () => {
  it("converts CRLF, tabs and non-breaking spaces", () => {
    expect(normalizeText("a\r\nb\tc d")).toBe("a\nb c d");
  });

  it("collapses three or more newlines into two", () => {
    expect(normalizeText("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("collapses runs of spaces within a line and trims the ends", () => {
    expect(normalizeText("   a    b   ")).toBe("a b");
  });
});

describe("AnalyzeRequestSchema", () => {
  it("rejects a 199-character resume on the resumeText path", () => {
    const result = AnalyzeRequestSchema.safeParse({ resumeText: "r".repeat(199), jobText: job });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["resumeText"]);
  });

  it("accepts a 200-character resume", () => {
    expect(AnalyzeRequestSchema.safeParse({ resumeText: "r".repeat(200), jobText: job }).success).toBe(true);
  });

  it("rejects a 15,001-character resume", () => {
    expect(AnalyzeRequestSchema.safeParse({ resumeText: "r".repeat(15_001), jobText: job }).success).toBe(false);
  });

  it("rejects a 10,001-character job posting and a 99-character one", () => {
    expect(AnalyzeRequestSchema.safeParse({ resumeText: resume, jobText: "j".repeat(10_001) }).success).toBe(false);
    expect(AnalyzeRequestSchema.safeParse({ resumeText: resume, jobText: "j".repeat(99) }).success).toBe(false);
  });

  it("checks length after normalization", () => {
    const padded = " ".repeat(250) + "abcdefghij";
    expect(AnalyzeRequestSchema.safeParse({ resumeText: padded, jobText: job }).success).toBe(false);
  });

  it("returns normalized text", () => {
    const parsed = AnalyzeRequestSchema.parse({ resumeText: `${resume}\r\n`, jobText: job });
    expect(parsed.resumeText).toBe(resume);
  });
});

describe("checkLength", () => {
  it("reports a too-short job posting with the minimum in the message", () => {
    const result = checkLength("job", "x".repeat(50));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("100");
  });

  it("accepts text inside the limits", () => {
    expect(checkLength("resume", resume)).toEqual({ ok: true });
  });

  it("exposes the spec limits", () => {
    expect(LIMITS).toEqual({
      resume: { min: 200, max: 15000 },
      job: { min: 100, max: 10000 },
      pdfBytes: 5_242_880,
      bodyBytes: 65_536,
    });
  });
});
