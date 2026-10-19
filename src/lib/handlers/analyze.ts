import "server-only";
import { randomUUID } from "node:crypto";
import { AiInvalidOutputError, AiUnavailableError, type AIProvider } from "@/lib/ai/provider";
import { RawAnalysisSchema, coerceRawAnalysis, type AnalysisResult, type RawAnalysis } from "@/lib/ai/schema";
import { getClientIp, hashIp } from "@/lib/client-ip";
import type { ServerConfig } from "@/lib/config";
import { verifyEvidence } from "@/lib/evidence";
import { MESSAGES, errorResponse, type ErrorCode } from "@/lib/http";
import { AnalyzeRequestSchema, LIMITS, checkLength } from "@/lib/input";
import { bandFor, scoreFromRequirements, type Band } from "@/lib/scoring";
import { signAnalysis } from "@/lib/signing";
import type { RateLimitStore } from "@/lib/store/types";
import { nextManilaMidnight } from "@/lib/time";

export type AnalyzeResponse = { analysis: AnalysisResult; score: number; band: Band; issuedAt: string; signature: string };

const MIN_RETRY_BUDGET_MS = 8000;

type Deps = { provider: AIProvider; rateLimits: RateLimitStore; config: ServerConfig; now?: () => number };

class Failure {
  constructor(
    readonly response: Response,
    readonly code: ErrorCode,
    /** Provider error summary for the log line (status codes only, never user text). */
    readonly detail?: string,
  ) {}
}

const fail = (status: number, code: ErrorCode, message: string, extra?: { field?: string; resetsAt?: string }) =>
  new Failure(errorResponse(status, code, message, extra), code);

export function createAnalyzeHandler({ provider, rateLimits, config, now = Date.now }: Deps) {
  async function readInput(req: Request) {
    const raw = await req.text();
    if (Buffer.byteLength(raw) > LIMITS.bodyBytes) throw fail(400, "invalid_input", MESSAGES.invalidBody);
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw fail(400, "invalid_input", MESSAGES.invalidBody);
    }
    const parsed = AnalyzeRequestSchema.safeParse(json);
    if (parsed.success) return parsed.data;

    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    const value = (json as Record<string, unknown> | null)?.[field];
    const kind = field === "jobText" ? "job" : "resume";
    const check = typeof value === "string" ? checkLength(kind, value) : null;
    const message = check && !check.ok ? check.message : MESSAGES.invalidBody;
    throw fail(400, "invalid_input", message, field ? { field } : {});
  }

  async function claimQuota(ipHash: string) {
    let result;
    try {
      result = await rateLimits.consume(ipHash, config.perIpDailyLimit, config.globalDailyLimit);
    } catch {
      // Fail closed: without the counter there is no protection for the AI quota.
      throw fail(503, "service_unavailable", MESSAGES.busy);
    }
    const resetsAt = nextManilaMidnight(new Date(now()));
    if (result === "ip_limit") throw fail(429, "ip_limit", MESSAGES.ipLimit(config.perIpDailyLimit), { resetsAt });
    if (result === "global_limit") throw fail(429, "global_limit", MESSAGES.globalLimit, { resetsAt });
  }

  async function runAi(input: { resumeText: string; jobText: string }, started: number): Promise<RawAnalysis> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.aiTimeoutMs);
    const deadline = started + config.aiTimeoutMs;
    try {
      for (let attempt = 1; ; attempt++) {
        let output: unknown;
        try {
          output = await provider.analyze(input, { signal: controller.signal });
        } catch (error) {
          if (error instanceof AiUnavailableError && error.retryable && attempt < 2 && deadline - now() >= MIN_RETRY_BUDGET_MS) {
            continue;
          }
          if (!(error instanceof AiInvalidOutputError)) {
            const detail = error instanceof AiUnavailableError ? error.message : "unexpected provider error";
            throw new Failure(errorResponse(503, "ai_unavailable", MESSAGES.busy), "ai_unavailable", detail);
          }
          output = undefined;
        }
        const parsed = RawAnalysisSchema.safeParse(coerceRawAnalysis(output));
        if (parsed.success) return parsed.data;
        if (attempt >= 2 || deadline - now() < MIN_RETRY_BUDGET_MS) {
          // Field paths only (for example "requirements.3.status"), never values.
          const detail = parsed.error.issues.slice(0, 5).map((i) => i.path.join(".") || "(root)").join(", ");
          throw new Failure(errorResponse(502, "ai_invalid_output", MESSAGES.aiInvalid), "ai_invalid_output", detail);
        }
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return async function handle(req: Request): Promise<Response> {
    const requestId = randomUUID();
    const started = now();
    let code: ErrorCode | "ok" = "ok";
    let detail: string | undefined;
    try {
      const input = await readInput(req);
      const ipHash = hashIp(getClientIp(req.headers), config.ipHashSalt);
      await claimQuota(ipHash);
      let raw: RawAnalysis;
      try {
        raw = await runAi(input, started);
      } catch (error) {
        // The provider failed, not the visitor: give the quota slot back (best effort).
        if (error instanceof Failure && error.code === "ai_unavailable") await rateLimits.refund(ipHash).catch(() => {});
        throw error;
      }

      const analysis = verifyEvidence(raw, input.resumeText);
      const score = scoreFromRequirements(analysis.requirements);
      const issuedAt = new Date(now()).toISOString();
      const body: AnalyzeResponse = {
        analysis,
        score,
        band: bandFor(score),
        issuedAt,
        signature: signAnalysis(analysis, issuedAt, config.resultSigningSecret),
      };
      return Response.json(body, { headers: { "cache-control": "no-store" } });
    } catch (error) {
      if (error instanceof Failure) {
        code = error.code;
        detail = error.detail;
        return error.response;
      }
      code = "service_unavailable";
      return errorResponse(503, "service_unavailable", MESSAGES.busy);
    } finally {
      // Never log request content: only the id, the outcome and the duration.
      console.info(JSON.stringify({ route: "analyze", requestId, code, ...(detail ? { detail } : {}), ms: now() - started }));
    }
  };
}
