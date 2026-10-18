import { describe, expect, it } from "vitest";
import { ConfigError, getServerConfig } from "@/lib/config";

const secret = "s".repeat(32);
const required = {
  NODE_ENV: "development",
  GEMINI_API_KEY: "key",
  GEMINI_MODEL: "gemini-test-flash",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_x",
  IP_HASH_SALT: secret,
  RESULT_SIGNING_SECRET: secret,
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
} as NodeJS.ProcessEnv;

describe("getServerConfig", () => {
  it("applies the spec defaults", () => {
    const config = getServerConfig(required);
    expect(config).toMatchObject({
      aiProvider: "gemini",
      fakeAiMode: "ok",
      geminiModel: "gemini-test-flash",
      aiTimeoutMs: 20000,
      store: "supabase",
      perIpDailyLimit: 10,
      globalDailyLimit: 200,
      siteUrl: "http://localhost:3000",
    });
  });

  it("requires GEMINI_API_KEY when the provider is gemini", () => {
    expect(() => getServerConfig({ ...required, GEMINI_API_KEY: "" })).toThrow(ConfigError);
  });

  it("refuses test adapters in production unless explicitly allowed", () => {
    const fakeProd = { ...required, NODE_ENV: "production", AI_PROVIDER: "fake" } as NodeJS.ProcessEnv;
    expect(() => getServerConfig(fakeProd)).toThrow(ConfigError);
    expect(getServerConfig({ ...fakeProd, ALLOW_TEST_ADAPTERS: "1" }).aiProvider).toBe("fake");
    const memoryProd = { ...required, NODE_ENV: "production", STORE: "memory" } as NodeJS.ProcessEnv;
    expect(() => getServerConfig(memoryProd)).toThrow(ConfigError);
  });

  it("rejects a signing secret shorter than 32 characters", () => {
    expect(() => getServerConfig({ ...required, RESULT_SIGNING_SECRET: "s".repeat(31) })).toThrow(ConfigError);
  });

  it("does not require Supabase settings for the memory store", () => {
    const config = getServerConfig({ ...required, STORE: "memory", SUPABASE_URL: "", SUPABASE_SECRET_KEY: "" });
    expect(config.supabaseUrl).toBeNull();
  });
});
