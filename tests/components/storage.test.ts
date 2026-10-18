// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { safeGet, safeRemove, safeSet } from "@/lib/client/storage";

afterEach(() => vi.restoreAllMocks());

describe("safe storage", () => {
  it("reads and writes when storage works", () => {
    expect(safeSet("local", "k", "v")).toBe(true);
    expect(safeGet("local", "k")).toBe("v");
    safeRemove("local", "k");
    expect(safeGet("local", "k")).toBeNull();
  });

  it("never throws when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(safeGet("session", "k")).toBeNull();
    expect(safeSet("session", "k", "v")).toBe(false);
    expect(() => safeRemove("session", "k")).not.toThrow();
  });
});
