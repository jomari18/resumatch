import { readFileSync } from "node:fs";
import type { ServerConfig } from "@/lib/config";

export const SAMPLE_RESUME = readFileSync("src/lib/ai/fixtures/sample-resume.txt", "utf8");
export const SAMPLE_JOB =
  "Junior Web Developer at Acme Digital. Requirements: React, PostgreSQL. Nice to have: Docker. Work with our team on web apps.";

export const testConfig: ServerConfig = {
  aiProvider: "fake",
  fakeAiMode: "ok",
  geminiApiKey: null,
  geminiModel: "test-model",
  geminiFallbackModels: [],
  aiTimeoutMs: 20000,
  store: "memory",
  supabaseUrl: null,
  supabaseSecretKey: null,
  ipHashSalt: "salt".repeat(8),
  resultSigningSecret: "secret".repeat(6),
  perIpDailyLimit: 10,
  globalDailyLimit: 200,
  siteUrl: "https://resumatch.test",
};

export function jsonRequest(url: string, body: unknown, init: { ip?: string; method?: string; headers?: Record<string, string> } = {}) {
  return new Request(url, {
    method: init.method ?? "POST",
    headers: {
      "content-type": "application/json",
      "x-nf-client-connection-ip": init.ip ?? "203.0.113.7",
      ...init.headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
