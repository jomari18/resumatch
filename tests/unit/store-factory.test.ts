import { describe, expect, it } from "vitest";
import type { ServerConfig } from "@/lib/config";
import { getStores } from "@/lib/store";

const config = { store: "supabase", supabaseUrl: "https://x.supabase.co", supabaseSecretKey: "sb_secret_x" } as ServerConfig;

describe("getStores", () => {
  it("builds Supabase stores for store supabase", async () => {
    const stores = await getStores(config);
    expect(typeof stores.rateLimits.consume).toBe("function");
    expect(typeof stores.shares.get).toBe("function");
  });

  it("returns the same memory stores on every call", async () => {
    const memory = { ...config, store: "memory" } as ServerConfig;
    expect(await getStores(memory)).toBe(await getStores(memory));
  });
});
