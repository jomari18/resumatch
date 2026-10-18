import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "@/lib/ai/schema";
import { createMemoryStores } from "@/lib/store/memory";

const clock = (start: string) => {
  let now = new Date(start);
  return { now: () => now, set: (iso: string) => (now = new Date(iso)) };
};

describe("memory RateLimitStore", () => {
  it("allows up to the per-IP limit", async () => {
    const { rateLimits } = createMemoryStores();
    expect(await rateLimits.consume("a", 2, 100)).toBe("ok");
    expect(await rateLimits.consume("a", 2, 100)).toBe("ok");
    expect(await rateLimits.consume("a", 2, 100)).toBe("ip_limit");
  });

  it("does not use an IP slot when the global limit rejects", async () => {
    const { rateLimits } = createMemoryStores();
    expect(await rateLimits.consume("a", 2, 1)).toBe("ok");
    expect(await rateLimits.consume("b", 2, 1)).toBe("global_limit");
    expect(await rateLimits.consume("b", 2, 100)).toBe("ok");
    expect(await rateLimits.consume("b", 2, 100)).toBe("ok");
    expect(await rateLimits.consume("b", 2, 100)).toBe("ip_limit");
  });

  it("resets at the next Manila day", async () => {
    const c = clock("2026-10-19T15:00:00Z");
    const { rateLimits } = createMemoryStores({ now: c.now });
    expect(await rateLimits.consume("a", 1, 100)).toBe("ok");
    expect(await rateLimits.consume("a", 1, 100)).toBe("ip_limit");
    c.set("2026-10-19T16:00:00Z");
    expect(await rateLimits.consume("a", 1, 100)).toBe("ok");
  });
});

describe("memory ShareStore", () => {
  const result = { jobTitle: "Dev" } as AnalysisResult;
  const input = { id: "abcdefghijkl", result, digest: "d1", jobTitle: "Dev", deleteTokenHash: "h1" };

  it("round-trips and dedupes by digest", async () => {
    const { shares } = createMemoryStores({ now: () => new Date("2026-10-19T00:00:00Z") });
    const first = await shares.create(input);
    expect(first).toEqual({ id: "abcdefghijkl", created: true, expiresAt: "2026-11-18T00:00:00.000Z" });
    expect((await shares.get("abcdefghijkl"))?.result).toEqual(result);
    expect(await shares.create({ ...input, id: "zzzzzzzzzzzz" })).toMatchObject({ id: "abcdefghijkl", created: false });
  });

  it("hides a share after 30 days", async () => {
    const c = clock("2026-10-19T00:00:00Z");
    const { shares } = createMemoryStores({ now: c.now });
    await shares.create(input);
    c.set("2026-11-18T00:00:01Z");
    expect(await shares.get("abcdefghijkl")).toBeNull();
  });

  it("deletes only with the right token hash", async () => {
    const { shares } = createMemoryStores();
    await shares.create(input);
    expect(await shares.delete("abcdefghijkl", "wrong")).toBe(false);
    expect(await shares.delete("abcdefghijkl", "h1")).toBe(true);
    expect(await shares.get("abcdefghijkl")).toBeNull();
  });
});
