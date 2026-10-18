import { describe, expect, it } from "vitest";
import { withDb } from "./helpers";

const create = "select * from public.create_share($1, $2::jsonb, $3, $4, $5)";
const result = JSON.stringify({ jobTitle: "Junior Web Developer" });

describe("create_share", () => {
  it("creates a share that expires in about 30 days", () =>
    withDb(async ({ client }) => {
      const { rows } = await client.query(create, ["abcdefghijkl", result, "digest-1", "Dev", "hash-1"]);
      expect(rows[0]).toMatchObject({ id: "abcdefghijkl", created: true });
      const days = (new Date(rows[0].expires_at).getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(29.9);
      expect(days).toBeLessThan(30.1);
    }));

  it("returns the existing link for the same digest", () =>
    withDb(async ({ client }) => {
      await client.query(create, ["abcdefghijkl", result, "digest-1", "Dev", "hash-1"]);
      const { rows } = await client.query(create, ["zzzzzzzzzzzz", result, "digest-1", "Dev", "hash-2"]);
      expect(rows[0]).toMatchObject({ id: "abcdefghijkl", created: false });
    }));

  it("replaces an expired row with the same digest", () =>
    withDb(async ({ client }) => {
      await client.query(create, ["abcdefghijkl", result, "digest-1", "Dev", "hash-1"]);
      await client.query("update public.analyses set expires_at = now() - interval '1 second'");
      const { rows } = await client.query(create, ["zzzzzzzzzzzz", result, "digest-1", "Dev", "hash-2"]);
      expect(rows[0]).toMatchObject({ id: "zzzzzzzzzzzz", created: true });
    }));

  it("rejects an id that is not 12 URL-safe characters", () =>
    withDb(async ({ client }) => {
      await expect(client.query(create, ["short", result, "digest-1", "Dev", "hash-1"])).rejects.toThrow();
    }));
});

describe("delete_share", () => {
  it("deletes only with the right token hash", () =>
    withDb(async ({ client }) => {
      await client.query(create, ["abcdefghijkl", result, "digest-1", "Dev", "hash-1"]);
      const del = "select public.delete_share($1, $2) as ok";
      expect((await client.query(del, ["abcdefghijkl", "wrong"])).rows[0].ok).toBe(false);
      expect((await client.query(del, ["abcdefghijkl", "hash-1"])).rows[0].ok).toBe(true);
      expect((await client.query("select count(*)::int as n from public.analyses")).rows[0].n).toBe(0);
    }));
});

describe("cleanup_expired", () => {
  it("removes only expired shares and rate-limit rows older than yesterday", () =>
    withDb(async ({ client }) => {
      await client.query(create, ["keepkeepkeep", result, "d-keep", "Dev", "h"]);
      await client.query(create, ["gonegonegone", result, "d-gone", "Dev", "h"]);
      await client.query("update public.analyses set expires_at = now() - interval '1 minute' where id = 'gonegonegone'");
      await client.query(`
        insert into public.rate_limits (ip_hash, day, count) values
          ('today', (now() at time zone 'Asia/Manila')::date, 1),
          ('yesterday', (now() at time zone 'Asia/Manila')::date - 1, 1),
          ('old', (now() at time zone 'Asia/Manila')::date - 2, 1)`);
      await client.query("select public.cleanup_expired()");
      const ids = (await client.query("select id from public.analyses order by id")).rows.map((r) => r.id);
      const hashes = (await client.query("select ip_hash from public.rate_limits order by ip_hash")).rows.map((r) => r.ip_hash);
      expect(ids).toEqual(["keepkeepkeep"]);
      expect(hashes).toEqual(["today", "yesterday"]);
    }));
});
