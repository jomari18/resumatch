import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { AnalysisResult } from "@/lib/ai/schema";
import { StoreUnavailableError, type QuotaResult, type RateLimitStore, type ShareStore } from "@/lib/store/types";

type Reply = { data: unknown; error: { message: string } | null };

type ShareQuery = {
  select(cols: string): ShareQuery;
  eq(col: string, val: unknown): ShareQuery;
  gt(col: string, val: unknown): ShareQuery;
  maybeSingle(): PromiseLike<Reply>;
};

/** The slice of the supabase-js client the stores use, so tests can inject a fake. */
export type SupabaseLike = {
  rpc(fn: string, params: Record<string, unknown>): PromiseLike<Reply>;
  from(table: string): ShareQuery;
};

async function call(run: () => PromiseLike<Reply>, what: string): Promise<unknown> {
  let reply: Reply;
  try {
    reply = await run();
  } catch {
    throw new StoreUnavailableError(`${what} failed: network error`);
  }
  if (reply.error) throw new StoreUnavailableError(`${what} failed: ${reply.error.message}`);
  return reply.data;
}

const iso = (timestamp: string) => new Date(timestamp).toISOString();

export function createSupabaseStores(opts: {
  url: string;
  secretKey: string;
  client?: SupabaseLike;
  now?: () => Date;
}): { rateLimits: RateLimitStore; shares: ShareStore } {
  const now = opts.now ?? (() => new Date());
  // The real client's builders are structurally wider than SupabaseLike.
  const client: SupabaseLike =
    opts.client ??
    (createClient(opts.url, opts.secretKey, { auth: { persistSession: false } }) as unknown as SupabaseLike);

  const rateLimits: RateLimitStore = {
    async consume(ipHash, perIpLimit, globalLimit) {
      const params = { p_ip_hash: ipHash, p_ip_limit: perIpLimit, p_global_limit: globalLimit };
      return (await call(() => client.rpc("consume_quota", params), "consume_quota")) as QuotaResult;
    },
  };

  const shares: ShareStore = {
    async create({ id, result, digest, jobTitle, deleteTokenHash }) {
      const params = {
        p_id: id,
        p_result: result,
        p_digest: digest,
        p_job_title: jobTitle,
        p_delete_token_hash: deleteTokenHash,
      };
      const rows = (await call(() => client.rpc("create_share", params), "create_share")) as Array<{
        id: string;
        created: boolean;
        expires_at: string;
      }>;
      const row = rows?.[0];
      if (!row) throw new StoreUnavailableError("create_share returned no row");
      return { id: row.id, created: row.created, expiresAt: iso(row.expires_at) };
    },

    async get(id) {
      const row = (await call(
        () =>
          client
            .from("analyses")
            .select("result, job_title, created_at, expires_at")
            .eq("id", id)
            .gt("expires_at", now().toISOString())
            .maybeSingle(),
        "get share",
      )) as { result: AnalysisResult; job_title: string; created_at: string; expires_at: string } | null;
      if (!row) return null;
      return { result: row.result, jobTitle: row.job_title, createdAt: iso(row.created_at), expiresAt: iso(row.expires_at) };
    },

    async delete(id, deleteTokenHash) {
      const params = { p_id: id, p_delete_token_hash: deleteTokenHash };
      return (await call(() => client.rpc("delete_share", params), "delete_share")) === true;
    },
  };

  return { rateLimits, shares };
}
