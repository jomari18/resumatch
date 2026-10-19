import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "@/lib/ai/schema";
import { createSupabaseStores, type SupabaseLike } from "@/lib/store/supabase";
import { StoreUnavailableError } from "@/lib/store/types";

type Reply = { data: unknown; error: { message: string } | null };

function fakeClient(reply: () => Reply | Promise<Reply>) {
  const rpcCalls: Array<{ fn: string; params: Record<string, unknown> }> = [];
  const filters: Array<[string, string, unknown]> = [];
  const client: SupabaseLike = {
    rpc: async (fn, params) => {
      rpcCalls.push({ fn, params });
      return reply();
    },
    from: (table) => {
      filters.push(["from", table, null]);
      const query = {
        select: (cols: string) => (filters.push(["select", cols, null]), query),
        eq: (col: string, val: unknown) => (filters.push(["eq", col, val]), query),
        gt: (col: string, val: unknown) => (filters.push(["gt", col, val]), query),
        maybeSingle: async () => reply(),
      };
      return query;
    },
  };
  return { client, rpcCalls, filters };
}

const now = () => new Date("2026-10-19T00:00:00.000Z");
const opts = { url: "https://x.supabase.co", secretKey: "sb_secret_x", now };
const result = { jobTitle: "Dev" } as AnalysisResult;

describe("Supabase RateLimitStore", () => {
  it("calls consume_quota with the SQL parameter names", async () => {
    const { client, rpcCalls } = fakeClient(() => ({ data: "ip_limit", error: null }));
    const { rateLimits } = createSupabaseStores({ ...opts, client });
    expect(await rateLimits.consume("hash", 10, 200)).toBe("ip_limit");
    expect(rpcCalls).toEqual([{ fn: "consume_quota", params: { p_ip_hash: "hash", p_ip_limit: 10, p_global_limit: 200 } }]);
  });

  it("maps an error to StoreUnavailableError", async () => {
    const { client } = fakeClient(() => ({ data: null, error: { message: "boom" } }));
    await expect(createSupabaseStores({ ...opts, client }).rateLimits.consume("h", 1, 1)).rejects.toBeInstanceOf(
      StoreUnavailableError,
    );
  });

  it("maps a thrown network error to StoreUnavailableError", async () => {
    const { client } = fakeClient(() => {
      throw new TypeError("fetch failed");
    });
    await expect(createSupabaseStores({ ...opts, client }).rateLimits.consume("h", 1, 1)).rejects.toBeInstanceOf(
      StoreUnavailableError,
    );
  });
});

describe("Supabase ShareStore", () => {
  it("creates through create_share and maps the row", async () => {
    const { client, rpcCalls } = fakeClient(() => ({
      data: [{ id: "abcdefghijkl", created: true, expires_at: "2026-11-18T00:00:00+00:00" }],
      error: null,
    }));
    const { shares } = createSupabaseStores({ ...opts, client });
    const out = await shares.create({ id: "abcdefghijkl", result, digest: "d", jobTitle: "Dev", deleteTokenHash: "h" });
    expect(out).toEqual({ id: "abcdefghijkl", created: true, expiresAt: "2026-11-18T00:00:00.000Z" });
    expect(rpcCalls[0]).toEqual({
      fn: "create_share",
      params: { p_id: "abcdefghijkl", p_result: result, p_digest: "d", p_job_title: "Dev", p_delete_token_hash: "h" },
    });
  });

  it("gets a live share by id and maps it to camelCase", async () => {
    const { client, filters } = fakeClient(() => ({
      data: { result, job_title: "Dev", created_at: "2026-10-19T00:00:00+00:00", expires_at: "2026-11-18T00:00:00+00:00" },
      error: null,
    }));
    const share = await createSupabaseStores({ ...opts, client }).shares.get("abcdefghijkl");
    expect(share).toEqual({
      result,
      jobTitle: "Dev",
      createdAt: "2026-10-19T00:00:00.000Z",
      expiresAt: "2026-11-18T00:00:00.000Z",
    });
    expect(filters).toContainEqual(["eq", "id", "abcdefghijkl"]);
    expect(filters).toContainEqual(["gt", "expires_at", "2026-10-19T00:00:00.000Z"]);
  });

  it("returns null when no row matches", async () => {
    const { client } = fakeClient(() => ({ data: null, error: null }));
    expect(await createSupabaseStores({ ...opts, client }).shares.get("abcdefghijkl")).toBeNull();
  });

  it("deletes through delete_share", async () => {
    const { client, rpcCalls } = fakeClient(() => ({ data: true, error: null }));
    expect(await createSupabaseStores({ ...opts, client }).shares.delete("abcdefghijkl", "h")).toBe(true);
    expect(rpcCalls[0]).toEqual({ fn: "delete_share", params: { p_id: "abcdefghijkl", p_delete_token_hash: "h" } });
  });
});

describe("Supabase RateLimitStore fails closed", () => {
  it.each([null, "maybe", 42])("treats an unexpected consume_quota value (%s) as unavailable", async (data) => {
    const { client } = fakeClient(() => ({ data, error: null }));
    await expect(createSupabaseStores({ ...opts, client }).rateLimits.consume("h", 1, 1)).rejects.toBeInstanceOf(
      StoreUnavailableError,
    );
  });
});

describe("Supabase RateLimitStore refund", () => {
  it("calls refund_quota with p_ip_hash", async () => {
    const { client, rpcCalls } = fakeClient(() => ({ data: null, error: null }));
    await createSupabaseStores({ ...opts, client }).rateLimits.refund("hash");
    expect(rpcCalls).toEqual([{ fn: "refund_quota", params: { p_ip_hash: "hash" } }]);
  });
});
