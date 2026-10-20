import "server-only";
/**
 * Gemini provider (SDK @google/genai 2.30).
 * Call shape: ai.models.generateContent({ model, contents, config: { systemInstruction, temperature,
 * responseMimeType: "application/json", responseJsonSchema, thinkingConfig, abortSignal } }) → response.text
 */
import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";
import { AiInvalidOutputError, AiUnavailableError, type AIProvider, type AttemptLog } from "@/lib/ai/provider";
import { rawAnalysisJsonSchema } from "@/lib/ai/schema";

type GenerateParams = {
  model: string;
  contents: string;
  config: {
    systemInstruction: string;
    temperature: number;
    responseMimeType: "application/json";
    responseJsonSchema: unknown;
    thinkingConfig: { thinkingLevel: ThinkingLevel };
    abortSignal: AbortSignal;
  };
};

/** The slice of the SDK client this provider uses, so tests can inject a fake. */
export type GeminiLike = {
  models: { generateContent(params: GenerateParams): Promise<{ text: string | undefined }> };
};

/** zod emits a `$schema` URI that the Gemini API does not need; everything else is sent unchanged. */
function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const { $schema: _ignored, ...rest } = schema;
  return rest;
}

const GEMINI_SCHEMA = toGeminiSchema(rawAnalysisJsonSchema);

export function createGeminiProvider(opts: {
  apiKey: string;
  model: string;
  /** Models tried in order when the previous one is rate-limited or overloaded. */
  fallbackModels?: string[];
  /**
   * Longest wait for a model that still has a fallback behind it. A slow model is treated like an
   * overloaded one, so the fallback gets the rest of the budget instead of the request timing out.
   */
  attemptTimeoutMs?: number;
  client?: GeminiLike;
}): AIProvider {
  // The real client's generateContent accepts a superset of GenerateParams.
  const client: GeminiLike = opts.client ?? (new GoogleGenAI({ apiKey: opts.apiKey }) as unknown as GeminiLike);

  async function call(
    model: string,
    input: Parameters<AIProvider["analyze"]>[0],
    signal: AbortSignal,
  ): Promise<unknown> {
    let text: string | undefined;
    try {
      const response = await client.models.generateContent({
        model,
        contents: buildUserPrompt(input),
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseJsonSchema: GEMINI_SCHEMA,
          // Extraction needs no long reasoning; low thinking keeps replies well inside the deadline.
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          abortSignal: signal,
        },
      });
      text = response.text;
    } catch (error) {
      if (signal.aborted) throw new AiUnavailableError("Gemini request timed out");
      if (error instanceof ApiError) {
        // 4xx messages describe the rejected parameter; the request text is not echoed back.
        const reason = error.status >= 400 && error.status < 500 ? `: ${String(error.message).slice(0, 300)}` : "";
        const retryable = error.status === 429 || error.status >= 500;
        throw new AiUnavailableError(`Gemini API error ${error.status}${reason}`, { retryable, status: error.status });
      }
      throw new AiUnavailableError(`Gemini request failed (${(error as Error)?.name ?? "unknown"})`);
    }

    if (!text) throw new AiInvalidOutputError("Gemini returned no text");
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new AiInvalidOutputError("Gemini returned text that is not JSON");
    }
  }

  const models = [opts.model, ...(opts.fallbackModels ?? [])];
  return {
    async analyze(input, { signal, onAttempt }) {
      for (let i = 0; ; i++) {
        const startedAt = Date.now();
        const report = (outcome: AttemptLog["outcome"], status?: number) =>
          onAttempt?.({ model: models[i], ms: Date.now() - startedAt, outcome, ...(status ? { status } : {}) });
        const hasFallback = i + 1 < models.length;
        const attempt = new AbortController();
        const stop = () => attempt.abort();
        signal.addEventListener("abort", stop);
        if (signal.aborted) attempt.abort();
        const timer = hasFallback && opts.attemptTimeoutMs ? setTimeout(stop, opts.attemptTimeoutMs) : undefined;
        try {
          const output = await call(models[i], input, attempt.signal);
          report("ok");
          return output;
        } catch (error) {
          const slow = attempt.signal.aborted && !signal.aborted;
          if (slow) report("slow");
          else if (error instanceof AiInvalidOutputError) report("invalid");
          else report("unavailable", error instanceof AiUnavailableError ? error.status : undefined);
          const failure = slow
            ? new AiUnavailableError(`Gemini model ${models[i]} was too slow`, { retryable: true })
            : error;
          const canFallBack =
            failure instanceof AiUnavailableError && failure.retryable && hasFallback && !signal.aborted;
          if (!canFallBack) throw failure;
        } finally {
          clearTimeout(timer);
          signal.removeEventListener("abort", stop);
        }
      }
    },
  };
}
