import { describe, expect, it } from "vitest";
import { getClientIp, hashIp } from "@/lib/client-ip";

describe("getClientIp", () => {
  it("prefers the Netlify client IP header", () => {
    const headers = new Headers({ "x-nf-client-connection-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1, 2.2.2.2" });
    expect(getClientIp(headers)).toBe("9.9.9.9");
  });

  it("falls back to the first x-forwarded-for entry, then to unknown", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("1.1.1.1");
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});

describe("hashIp", () => {
  it("depends on the salt and never contains the IP", () => {
    const a = hashIp("1.1.1.1", "a".repeat(32));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(hashIp("1.1.1.1", "b".repeat(32)));
    expect(a).not.toContain("1.1.1.1");
  });
});
