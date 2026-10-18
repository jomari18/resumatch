import { describe, expect, it } from "vitest";
import type { RawAnalysis } from "@/lib/ai/schema";
import { normalizeForMatch, verifyEvidence } from "@/lib/evidence";

const resume = [
  "Juan Dela Cruz",
  "• Built MediSched with React and “TypeScript” for a clinic\r\n",
  "Used PostgreSQL exclusion constraints to stop double bookings.",
].join("\n");

const base = (requirements: RawAnalysis["requirements"]): RawAnalysis => ({
  jobTitle: "Junior Web Developer",
  company: null,
  requirements,
  suggestions: ["Lead with your React work."],
  coverLetter: "c".repeat(300),
});

describe("normalizeForMatch", () => {
  it("lowercases, maps curly quotes, dashes and bullets, and collapses whitespace", () => {
    expect(normalizeForMatch("  • “React” – Next\r\n\tJS ")).toBe('"react" - next js');
  });
});

describe("verifyEvidence", () => {
  it("keeps an exact quote as matched and verified", () => {
    const out = verifyEvidence(
      base([{ skill: "PostgreSQL", importance: "required", status: "matched", evidence: "Used PostgreSQL exclusion constraints" }]),
      resume,
    );
    expect(out.requirements[0]).toMatchObject({ status: "matched", evidenceVerified: true });
  });

  it("verifies a quote that differs only in case, curly quotes, line breaks and a leading bullet", () => {
    const out = verifyEvidence(
      base([{ skill: "React", importance: "required", status: "matched", evidence: "• built medisched with react and \"typescript\" for a clinic" }]),
      resume,
    );
    expect(out.requirements[0]).toMatchObject({ status: "matched", evidenceVerified: true });
  });

  it("downgrades a paraphrased matched quote to partial and keeps the quote unverified", () => {
    const out = verifyEvidence(
      base([{ skill: "React", importance: "required", status: "matched", evidence: "Expert React developer for 5 years" }]),
      resume,
    );
    expect(out.requirements[0]).toEqual({
      skill: "React",
      importance: "required",
      status: "partial",
      evidence: "Expert React developer for 5 years",
      evidenceVerified: false,
    });
  });

  it("downgrades a paraphrased partial quote to missing and clears the quote", () => {
    const out = verifyEvidence(
      base([{ skill: "Docker", importance: "nice_to_have", status: "partial", evidence: "Containerized apps with Docker" }]),
      resume,
    );
    expect(out.requirements[0]).toMatchObject({ status: "missing", evidence: null, evidenceVerified: false });
  });

  it("turns a matched requirement without evidence into missing", () => {
    const out = verifyEvidence(base([{ skill: "Git", importance: "required", status: "matched", evidence: null }]), resume);
    expect(out.requirements[0]).toMatchObject({ status: "missing", evidence: null });
  });

  it("clears evidence on a missing requirement", () => {
    const out = verifyEvidence(base([{ skill: "Go", importance: "required", status: "missing", evidence: "something" }]), resume);
    expect(out.requirements[0]).toMatchObject({ status: "missing", evidence: null });
  });

  it("merges duplicate skills and keeps required when any duplicate is required", () => {
    const out = verifyEvidence(
      base([
        { skill: "React", importance: "nice_to_have", status: "matched", evidence: "Built MediSched with React" },
        { skill: "Docker", importance: "nice_to_have", status: "missing", evidence: null },
        { skill: "react.js ", importance: "required", status: "missing", evidence: null },
      ]),
      resume,
    );
    expect(out.requirements).toHaveLength(2);
    expect(out.requirements[0]).toMatchObject({ skill: "React", importance: "required", status: "matched" });
  });

  it("does not mutate its input", () => {
    const input = base([{ skill: "React", importance: "required", status: "matched", evidence: "not in resume" }]);
    const snapshot = structuredClone(input);
    verifyEvidence(input, resume);
    expect(input).toEqual(snapshot);
  });
});

describe("verifyEvidence hardening (final review)", () => {
  it("does not verify a trivial quote such as 'and'", () => {
    const out = verifyEvidence(base([{ skill: "Kubernetes", importance: "required", status: "matched", evidence: "and" }]), resume);
    expect(out.requirements[0].evidenceVerified).toBe(false);
    expect(out.requirements[0].status).not.toBe("matched");
  });

  it("matches on word boundaries: 'Java' is not found inside 'JavaScript'", () => {
    const js = "Juan Dela Cruz\nBuilt dashboards with JavaScript and React for three clients.";
    const out = verifyEvidence(base([{ skill: "Java", importance: "required", status: "matched", evidence: "Built dashboards with Java" }]), js);
    expect(out.requirements[0].evidenceVerified).toBe(false);
  });

  it("caps a real but unrelated quote at partial", () => {
    const out = verifyEvidence(
      base([{ skill: "Kubernetes", importance: "required", status: "matched", evidence: "Used PostgreSQL exclusion constraints" }]),
      resume,
    );
    expect(out.requirements[0]).toMatchObject({ status: "partial", evidenceVerified: false });
  });

  it("keeps the best verified duplicate regardless of order", () => {
    const out = verifyEvidence(
      base([
        { skill: "React", importance: "nice_to_have", status: "missing", evidence: null },
        { skill: "React.js", importance: "required", status: "matched", evidence: "Built MediSched with React and" },
      ]),
      resume,
    );
    expect(out.requirements).toHaveLength(1);
    expect(out.requirements[0]).toMatchObject({ importance: "required", status: "matched", evidenceVerified: true });
  });
});
