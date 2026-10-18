import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "@/lib/ai/schema";
import { randomId, randomToken, sha256Hex, signAnalysis, stableStringify, verifyAnalysisSignature } from "@/lib/signing";
import raw from "./fixtures/raw-analysis.json";

const secret = "s".repeat(32);
const issuedAt = "2026-10-19T03:00:00.000Z";
const analysis = {
  ...raw,
  requirements: raw.requirements.map((r) => ({ ...r, evidenceVerified: r.status !== "missing" })),
} as AnalysisResult;

describe("stableStringify", () => {
  it("sorts object keys at every level and keeps array order", () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
    expect(stableStringify([{ b: 1, a: 2 }, 3])).toBe('[{"a":2,"b":1},3]');
  });
});

describe("signAnalysis / verifyAnalysisSignature", () => {
  const signature = signAnalysis(analysis, issuedAt, secret);

  it("verifies its own signature", () => {
    expect(verifyAnalysisSignature(analysis, issuedAt, signature, secret)).toBe(true);
  });

  it("fails when the analysis, issuedAt or secret changes", () => {
    const tampered = structuredClone(analysis);
    tampered.requirements[2].status = "matched";
    expect(verifyAnalysisSignature(tampered, issuedAt, signature, secret)).toBe(false);
    expect(verifyAnalysisSignature(analysis, "2026-10-19T03:00:01.000Z", signature, secret)).toBe(false);
    expect(verifyAnalysisSignature(analysis, issuedAt, signature, "t".repeat(32))).toBe(false);
  });

  it("returns false for a truncated signature without throwing", () => {
    expect(verifyAnalysisSignature(analysis, issuedAt, signature.slice(0, 10), secret)).toBe(false);
  });
});

describe("random values and digests", () => {
  it("randomId is 12 URL-safe characters and unique", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => randomId()));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{12}$/);
  });

  it("randomToken is 32 bytes in base64url", () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("sha256Hex is the hex SHA-256 digest", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
