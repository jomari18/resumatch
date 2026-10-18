export type AnalyzeInput = { resumeText: string; jobText: string };

/**
 * An LLM backend. It returns `unknown` on purpose: the caller validates the output with zod,
 * so no provider can pass unchecked data into the app.
 */
export interface AIProvider {
  analyze(input: AnalyzeInput, opts: { signal: AbortSignal }): Promise<unknown>;
}

/** Timeout, provider 429/5xx, or a missing key. Maps to 503 `ai_unavailable`. */
export class AiUnavailableError extends Error {
  override name = "AiUnavailableError";
}

/** The provider answered, but not with usable JSON. Maps to a retry, then 502 `ai_invalid_output`. */
export class AiInvalidOutputError extends Error {
  override name = "AiInvalidOutputError";
}

export const FAKE_MODES = ["ok", "invalid", "invalid_then_ok", "timeout", "unavailable"] as const;
export type FakeMode = (typeof FAKE_MODES)[number];
