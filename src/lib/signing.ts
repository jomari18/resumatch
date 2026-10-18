import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { AnalysisResult } from "@/lib/ai/schema";

/** JSON with object keys sorted at every level, so signatures and digests ignore key order. */
export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  if (v !== null && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    const entries = Object.keys(obj)
      .sort()
      .filter((k) => obj[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(v);
}

export function signAnalysis(analysis: AnalysisResult, issuedAt: string, secret: string): string {
  return createHmac("sha256", secret).update(stableStringify({ analysis, issuedAt })).digest("base64url");
}

export function verifyAnalysisSignature(
  analysis: AnalysisResult,
  issuedAt: string,
  signature: string,
  secret: string,
): boolean {
  const expected = Buffer.from(signAnalysis(analysis, issuedAt, secret));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/** 12 URL-safe characters (9 random bytes in base64url). */
export function randomId(): string {
  return randomBytes(9).toString("base64url");
}

/** 32 random bytes in base64url (43 characters). */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}
