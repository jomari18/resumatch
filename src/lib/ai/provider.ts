export type AnalyzeInput = { resumeText: string; jobText: string };

/** One model call, for logs: never contains request or response text. */
export type AttemptLog = { model: string; ms: number; outcome: "ok" | "slow" | "unavailable" | "invalid" };

/**
 * An LLM backend. It returns `unknown` on purpose: the caller validates the output with zod,
 * so no provider can pass unchecked data into the app.
 */
export interface AIProvider {
  analyze(
    input: AnalyzeInput,
    opts: { signal: AbortSignal; onAttempt?: (attempt: AttemptLog) => void },
  ): Promise<unknown>;
}

/** Timeout, provider 429/5xx, or a missing key. Maps to 503 `ai_unavailable`. */
export class AiUnavailableError extends Error {
  override name = "AiUnavailableError";
  /** True for temporary provider failures (rate limit or overload) that are worth one retry. */
  readonly retryable: boolean;
  constructor(message: string, opts: { retryable?: boolean } = {}) {
    super(message);
    this.retryable = opts.retryable ?? false;
  }
}

/** The provider answered, but not with usable JSON. Maps to a retry, then 502 `ai_invalid_output`. */
export class AiInvalidOutputError extends Error {
  override name = "AiInvalidOutputError";
}

export const FAKE_MODES = ["ok", "invalid", "invalid_then_ok", "timeout", "unavailable"] as const;
export type FakeMode = (typeof FAKE_MODES)[number];
