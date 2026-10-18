import type { AnalysisResult } from "@/lib/ai/schema";
import { manilaDay } from "@/lib/time";
import type { QuotaResult, RateLimitStore, ShareStore } from "@/lib/store/types";

const SHARE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const GLOBAL_KEY = "__global__";

type Row = {
  result: AnalysisResult;
  digest: string;
  jobTitle: string;
  deleteTokenHash: string;
  createdAt: Date;
  expiresAt: Date;
};

/** In-memory stores with the same semantics as the SQL functions. For API tests and E2E only. */
export function createMemoryStores(opts: { now?: () => Date } = {}): { rateLimits: RateLimitStore; shares: ShareStore } {
  const now = opts.now ?? (() => new Date());
  const counts = new Map<string, number>();
  const rows = new Map<string, Row>();

  const rateLimits: RateLimitStore = {
    async consume(ipHash, perIpLimit, globalLimit): Promise<QuotaResult> {
      const day = manilaDay(now());
      const ipKey = `${day}|${ipHash}`;
      const globalKey = `${day}|${GLOBAL_KEY}`;
      if ((counts.get(ipKey) ?? 0) >= perIpLimit) return "ip_limit";
      if ((counts.get(globalKey) ?? 0) >= globalLimit) return "global_limit";
      counts.set(ipKey, (counts.get(ipKey) ?? 0) + 1);
      counts.set(globalKey, (counts.get(globalKey) ?? 0) + 1);
      return "ok";
    },
  };

  const isLive = (row: Row) => row.expiresAt > now();

  const shares: ShareStore = {
    async create({ id, result, digest, jobTitle, deleteTokenHash }) {
      for (const [existingId, row] of rows) {
        if (row.digest !== digest) continue;
        if (isLive(row)) return { id: existingId, created: false, expiresAt: row.expiresAt.toISOString() };
        rows.delete(existingId);
      }
      const createdAt = now();
      const expiresAt = new Date(createdAt.getTime() + SHARE_TTL_MS);
      rows.set(id, { result, digest, jobTitle, deleteTokenHash, createdAt, expiresAt });
      return { id, created: true, expiresAt: expiresAt.toISOString() };
    },
    async get(id) {
      const row = rows.get(id);
      if (!row || !isLive(row)) return null;
      return {
        result: row.result,
        jobTitle: row.jobTitle,
        createdAt: row.createdAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
      };
    },
    async delete(id, deleteTokenHash) {
      const row = rows.get(id);
      if (!row || row.deleteTokenHash !== deleteTokenHash) return false;
      rows.delete(id);
      return true;
    },
  };

  return { rateLimits, shares };
}
