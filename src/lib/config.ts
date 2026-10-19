import "server-only";
import { FAKE_MODES, type FakeMode } from "@/lib/ai/provider";

export class ConfigError extends Error {
  override name = "ConfigError";
}

export type ServerConfig = {
  aiProvider: "gemini" | "fake";
  fakeAiMode: FakeMode;
  geminiApiKey: string | null;
  geminiModel: string;
  aiTimeoutMs: number;
  store: "supabase" | "memory";
  supabaseUrl: string | null;
  supabaseSecretKey: string | null;
  ipHashSalt: string;
  resultSigningSecret: string;
  perIpDailyLimit: number;
  globalDailyLimit: number;
  siteUrl: string;
};

const MIN_SECRET_LENGTH = 32;

function value(env: NodeJS.ProcessEnv, name: string): string | null {
  const v = env[name]?.trim();
  return v ? v : null;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const v = value(env, name);
  if (!v) throw new ConfigError(`${name} is required`);
  return v;
}

function oneOf<T extends string>(env: NodeJS.ProcessEnv, name: string, options: readonly T[], fallback: T): T {
  const v = value(env, name) ?? fallback;
  if (!options.includes(v as T)) throw new ConfigError(`${name} must be one of ${options.join(", ")}`);
  return v as T;
}

function positiveInt(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = value(env, name);
  const n = raw === null ? fallback : Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new ConfigError(`${name} must be a positive integer`);
  return n;
}

function secret(env: NodeJS.ProcessEnv, name: string): string {
  const v = required(env, name);
  if (v.length < MIN_SECRET_LENGTH) throw new ConfigError(`${name} must be at least ${MIN_SECRET_LENGTH} characters`);
  return v;
}

/**
 * Reads and validates server configuration (spec section 12). Throws ConfigError on any problem.
 * scope "store" is for the share paths: they never call the AI, so a missing AI key must not break them.
 */
export function getServerConfig(
  env: NodeJS.ProcessEnv = process.env,
  opts: { scope?: "all" | "store" } = {},
): ServerConfig {
  const needsAi = opts.scope !== "store";
  const aiProvider = oneOf(env, "AI_PROVIDER", ["gemini", "fake"] as const, "gemini");
  const store = oneOf(env, "STORE", ["supabase", "memory"] as const, "supabase");

  const usesTestAdapter = aiProvider === "fake" || store === "memory";
  if (usesTestAdapter && env.NODE_ENV === "production" && env.ALLOW_TEST_ADAPTERS !== "1") {
    throw new ConfigError("Test adapters (AI_PROVIDER=fake or STORE=memory) are not allowed in production");
  }

  return {
    aiProvider,
    fakeAiMode: oneOf(env, "FAKE_AI_MODE", FAKE_MODES, "ok"),
    geminiApiKey: needsAi && aiProvider === "gemini" ? required(env, "GEMINI_API_KEY") : value(env, "GEMINI_API_KEY"),
    geminiModel: value(env, "GEMINI_MODEL") ?? "gemini-3.6-flash",
    aiTimeoutMs: positiveInt(env, "AI_TIMEOUT_MS", 20000),
    store,
    supabaseUrl: store === "supabase" ? required(env, "SUPABASE_URL") : value(env, "SUPABASE_URL"),
    supabaseSecretKey: store === "supabase" ? required(env, "SUPABASE_SECRET_KEY") : value(env, "SUPABASE_SECRET_KEY"),
    ipHashSalt: secret(env, "IP_HASH_SALT"),
    resultSigningSecret: secret(env, "RESULT_SIGNING_SECRET"),
    perIpDailyLimit: positiveInt(env, "PER_IP_DAILY_LIMIT", 10),
    globalDailyLimit: positiveInt(env, "GLOBAL_DAILY_LIMIT", 200),
    siteUrl: required(env, "NEXT_PUBLIC_SITE_URL").replace(/\/+$/, ""),
  };
}
