import { describe, expect, it } from "vitest";
import { asRole, withDb } from "./helpers";

describe("database access", () => {
  it.each(["anon", "authenticated"])("%s cannot read tables or call the functions", (role) =>
    withDb(async ({ client }) => {
      await asRole(client, role, async () => {
        await expect(client.query("select * from public.analyses")).rejects.toThrow(/permission denied/);
        await expect(client.query("select * from public.rate_limits")).rejects.toThrow(/permission denied/);
        await expect(client.query("select public.consume_quota('x', 1, 1)")).rejects.toThrow(/permission denied/);
        await expect(client.query("select public.delete_share('abcdefghijkl', 'x')")).rejects.toThrow(/permission denied/);
        await expect(client.query("select public.cleanup_expired()")).rejects.toThrow(/permission denied/);
      });
    }),
  );

  it("service_role can use the functions and tables", () =>
    withDb(async ({ client }) => {
      await asRole(client, "service_role", async () => {
        expect((await client.query("select public.consume_quota('x', 1, 1) as r")).rows[0].r).toBe("ok");
        await client.query("select * from public.create_share('abcdefghijkl', '{}'::jsonb, 'd', 'Dev', 'h')");
        expect((await client.query("select count(*)::int as n from public.analyses")).rows[0].n).toBe(1);
      });
    }));

  it("has row level security enabled on both tables", () =>
    withDb(async ({ client }) => {
      const { rows } = await client.query(
        "select relname, relrowsecurity from pg_class where relname in ('analyses', 'rate_limits') order by relname",
      );
      expect(rows).toEqual([
        { relname: "analyses", relrowsecurity: true },
        { relname: "rate_limits", relrowsecurity: true },
      ]);
    }));
});
