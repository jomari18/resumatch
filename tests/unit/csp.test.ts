import { describe, expect, it } from "vitest";
import { buildCsp } from "@/lib/csp";

describe("buildCsp", () => {
  const csp = buildCsp("abc", false);

  it.each([
    "default-src 'self'",
    "script-src 'self' 'nonce-abc' 'strict-dynamic'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "worker-src 'self' blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ])("contains %s", (directive) => {
    expect(csp).toContain(directive);
  });

  it("allows eval only in development", () => {
    expect(csp).not.toContain("unsafe-eval");
    expect(buildCsp("abc", true)).toContain("'unsafe-eval'");
  });

  it("is a single line", () => {
    expect(csp).not.toMatch(/\n/);
  });
});
