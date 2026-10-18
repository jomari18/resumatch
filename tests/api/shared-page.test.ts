import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "@/lib/ai/schema";
import { scoreFromRequirements, bandFor } from "@/lib/scoring";
import { loadShared } from "@/lib/shared";
import { createMemoryStores } from "@/lib/store/memory";
import type { ShareStore } from "@/lib/store/types";
import raw from "../unit/fixtures/raw-analysis.json";

const analysis = {
  ...raw,
  requirements: raw.requirements.map((r) => ({ ...r, evidenceVerified: r.status !== "missing" })),
} as AnalysisResult;

const base = { id: "abcdefghijkl", result: analysis, digest: "d", jobTitle: "Junior Web Developer", deleteTokenHash: "h" };

describe("loadShared", () => {
  it("recomputes score and band from the stored requirements", async () => {
    const { shares } = createMemoryStores();
    await shares.create(base);
    const view = await loadShared("abcdefghijkl", shares);
    const score = scoreFromRequirements(analysis.requirements);
    expect(view).toMatchObject({ score, band: bandFor(score), jobTitle: "Junior Web Developer" });
    expect(view?.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns null for an unknown or expired id", async () => {
    let now = new Date("2026-10-19T00:00:00Z");
    const { shares } = createMemoryStores({ now: () => now });
    expect(await loadShared("zzzzzzzzzzzz", shares)).toBeNull();
    await shares.create(base);
    now = new Date("2026-11-19T00:00:00Z");
    expect(await loadShared("abcdefghijkl", shares)).toBeNull();
  });

  it("never queries the store for a malformed id", async () => {
    let calls = 0;
    const spy: ShareStore = { create: async () => ({ id: "", created: true, expiresAt: "" }), get: async () => (calls++, null), delete: async () => false };
    expect(await loadShared("../etc", spy)).toBeNull();
    expect(await loadShared("short", spy)).toBeNull();
    expect(calls).toBe(0);
  });
});
