import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const url = process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:55454/resumatch_test";
const host = new URL(url).hostname;
if (host !== "127.0.0.1" && host !== "localhost") {
  throw new Error(`Refusing to run database tests against ${host}: only a local disposable database is allowed`);
}

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");

/** Drops the ResuMatch objects and re-applies every migration except the pg_cron one. */
async function reset(client: pg.PoolClient) {
  await client.query(`
    drop table if exists public.analyses, public.rate_limits cascade;
    drop function if exists public.consume_quota(text, int, int);
    drop function if exists public.create_share(text, jsonb, text, text, text);
    drop function if exists public.delete_share(text, text);
    drop function if exists public.cleanup_expired();
  `);
  for (const file of readdirSync(MIGRATIONS).sort()) {
    if (file.endsWith("_cron.sql")) continue;
    await client.query(readFileSync(join(MIGRATIONS, file), "utf8"));
  }
}

/** Runs a test against a freshly migrated database; `pool` gives extra connections for concurrency tests. */
export async function withDb(fn: (ctx: { client: pg.PoolClient; pool: pg.Pool }) => Promise<void>) {
  const pool = new pg.Pool({ connectionString: url, max: 25 });
  const client = await pool.connect();
  try {
    await reset(client);
    await fn({ client, pool });
  } finally {
    client.release();
    await pool.end();
  }
}

export async function asRole<T>(client: pg.PoolClient, role: string, fn: () => Promise<T>): Promise<T> {
  await client.query(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await client.query("reset role");
  }
}
