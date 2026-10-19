import { describe, expect, it } from "vitest";
import { withDb } from "./helpers";

const consume = "select public.consume_quota($1, $2, $3) as r";

describe("consume_quota", () => {
  it("allows up to the per-IP limit", () =>
    withDb(async ({ client }) => {
      const results = [];
      for (let i = 0; i < 3; i++) results.push((await client.query(consume, ["a", 2, 100])).rows[0].r);
      expect(results).toEqual(["ok", "ok", "ip_limit"]);
    }));

  it("lets exactly the limit through under 20 concurrent calls", () =>
    withDb(async ({ pool }) => {
      const results = await Promise.all(
        Array.from({ length: 20 }, () => pool.query(consume, ["same-ip", 10, 1000]).then((r) => r.rows[0].r as string)),
      );
      expect(results.filter((r) => r === "ok")).toHaveLength(10);
      expect(results.filter((r) => r === "ip_limit")).toHaveLength(10);
    }));

  it("does not use an IP slot when the global limit rejects", () =>
    withDb(async ({ client }) => {
      expect((await client.query(consume, ["a", 5, 1])).rows[0].r).toBe("ok");
      expect((await client.query(consume, ["b", 5, 1])).rows[0].r).toBe("global_limit");
      const row = await client.query("select count from public.rate_limits where ip_hash = 'b'");
      expect(row.rows[0]?.count ?? 0).toBe(0);
    }));

  it("counts per Manila day", () =>
    withDb(async ({ client }) => {
      await client.query(consume, ["a", 5, 100]);
      const day = await client.query("select day::text as d, (now() at time zone 'Asia/Manila')::date::text as today from public.rate_limits where ip_hash = 'a'");
      expect(day.rows[0].d).toBe(day.rows[0].today);
    }));

  it("raises an error for a limit below 1", () =>
    withDb(async ({ client }) => {
      await expect(client.query(consume, ["a", 0, 100])).rejects.toThrow();
    }));
});

describe("refund_quota", () => {
  it("gives back one IP slot and one global slot, never below zero", () =>
    withDb(async ({ client }) => {
      expect((await client.query(consume, ["a", 1, 100])).rows[0].r).toBe("ok");
      expect((await client.query(consume, ["a", 1, 100])).rows[0].r).toBe("ip_limit");
      await client.query("select public.refund_quota($1)", ["a"]);
      expect((await client.query(consume, ["a", 1, 100])).rows[0].r).toBe("ok");
      await client.query("select public.refund_quota($1)", ["a"]);
      await client.query("select public.refund_quota($1)", ["a"]);
      const { rows } = await client.query("select ip_hash, count from public.rate_limits order by ip_hash collate \"C\"");
      expect(rows).toEqual([
        { ip_hash: "__global__", count: 0 },
        { ip_hash: "a", count: 0 },
      ]);
    }));

  it("is executable only by service_role", () =>
    withDb(async ({ client }) => {
      await client.query("set role anon");
      await expect(client.query("select public.refund_quota('a')")).rejects.toThrow(/permission denied/);
      await client.query("reset role");
    }));
});
