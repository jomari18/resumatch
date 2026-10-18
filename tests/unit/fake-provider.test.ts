import { describe, expect, it } from "vitest";
import { createFakeProvider } from "@/lib/ai/fake";
import { AiUnavailableError } from "@/lib/ai/provider";
import { RawAnalysisSchema } from "@/lib/ai/schema";

const input = { resumeText: "resume", jobText: "job" };
const live = () => ({ signal: new AbortController().signal });

describe("createFakeProvider", () => {
  it("ok returns a schema-valid analysis", async () => {
    const out = await createFakeProvider("ok").analyze(input, live());
    expect(RawAnalysisSchema.safeParse(out).success).toBe(true);
  });

  it("invalid returns an object that fails the schema", async () => {
    expect(await createFakeProvider("invalid").analyze(input, live())).toEqual({ nope: true });
  });

  it("invalid_then_ok is invalid first and valid second", async () => {
    const provider = createFakeProvider("invalid_then_ok");
    expect(RawAnalysisSchema.safeParse(await provider.analyze(input, live())).success).toBe(false);
    expect(RawAnalysisSchema.safeParse(await provider.analyze(input, live())).success).toBe(true);
  });

  it("timeout rejects with AiUnavailableError when the signal aborts", async () => {
    const controller = new AbortController();
    const pending = createFakeProvider("timeout").analyze(input, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it("unavailable rejects with AiUnavailableError", async () => {
    await expect(createFakeProvider("unavailable").analyze(input, live())).rejects.toBeInstanceOf(AiUnavailableError);
  });
});

describe("sample fixtures", () => {
  it("every evidence quote in the sample analysis appears in the sample resume", async () => {
    const { readFileSync } = await import("node:fs");
    const { verifyEvidence } = await import("@/lib/evidence");
    const sample = RawAnalysisSchema.parse(await createFakeProvider("ok").analyze(input, live()));
    const resume = readFileSync("src/lib/ai/fixtures/sample-resume.txt", "utf8");
    const withEvidence = verifyEvidence(sample, resume).requirements.filter((r) => r.status !== "missing");
    expect(withEvidence.length).toBeGreaterThan(0);
    expect(withEvidence.every((r) => r.evidenceVerified)).toBe(true);
  });
});
