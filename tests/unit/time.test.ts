import { describe, expect, it } from "vitest";
import { manilaDay, nextManilaMidnight } from "@/lib/time";

describe("manilaDay", () => {
  it("rolls over at 16:00 UTC (midnight in Manila)", () => {
    expect(manilaDay(new Date("2026-10-19T15:59:59Z"))).toBe("2026-10-19");
    expect(manilaDay(new Date("2026-10-19T16:00:00Z"))).toBe("2026-10-20");
  });
});

describe("nextManilaMidnight", () => {
  it("returns the next Manila midnight as an ISO UTC string", () => {
    expect(nextManilaMidnight(new Date("2026-10-19T03:00:00Z"))).toBe("2026-10-19T16:00:00.000Z");
    expect(nextManilaMidnight(new Date("2026-10-19T16:00:00Z"))).toBe("2026-10-20T16:00:00.000Z");
  });
});
