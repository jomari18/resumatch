import "server-only";
import type { ServerConfig } from "@/lib/config";
import { createMemoryStores } from "@/lib/store/memory";
import type { RateLimitStore, ShareStore } from "@/lib/store/types";

export type Stores = { rateLimits: RateLimitStore; shares: ShareStore };

const cache = globalThis as typeof globalThis & { __resumatchMemoryStores?: Stores };

export async function getStores(config: ServerConfig): Promise<Stores> {
  if (config.store === "memory") {
    // Cached on globalThis so counters and shares survive between requests in one server process.
    cache.__resumatchMemoryStores ??= createMemoryStores();
    return cache.__resumatchMemoryStores;
  }
  throw new Error("The Supabase store is added in Task 8");
}
