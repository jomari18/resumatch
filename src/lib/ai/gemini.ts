import "server-only";
/**
 * Gemini provider (SDK @google/genai 2.30).
 * Call shape: ai.models.generateContent({ model, contents, config: { systemInstruction, temperature,
 * responseMimeType: "application/json", responseJsonSchema, thinkingConfig, abortSignal } }) → response.text
 */
import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";
import { AiInvalidOutputError, AiUnavailableError, type AIProvider } from "@/lib/ai/provider";
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

export function createGeminiProvider(opts: { apiKey: string; model: string; client?: GeminiLike }): AIProvider {
  // The real client's generateContent accepts a superset of GenerateParams.
  const client: GeminiLike = opts.client ?? (new GoogleGenAI({ apiKey: opts.apiKey }) as unknown as GeminiLike);

  return {
    async analyze(input, { signal }) {
      let text: string | undefined;
      try {
        const response = await client.models.generateContent({
          model: opts.model,
          contents: buildUserPrompt(input),
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.2,
            responseMimeType: "application/json",
            responseJsonSchema: GEMINI_SCHEMA,
            // Extraction needs no long reasoning; minimal thinking keeps replies inside the 20 s deadline.
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            abortSignal: signal,
          },
        });
        text = response.text;
      } catch (error) {
        if (signal.aborted) throw new AiUnavailableError("Gemini request timed out");
        if (error instanceof ApiError) {
          // 4xx messages describe the rejected parameter; the request text is not echoed back.
          const reason = error.status >= 400 && error.status < 500 ? `: ${String(error.message).slice(0, 300)}` : "";
          throw new AiUnavailableError(`Gemini API error ${error.status}${reason}`);
        }
        throw new AiUnavailableError(`Gemini request failed (${(error as Error)?.name ?? "unknown"})`);
      }

      if (!text) throw new AiInvalidOutputError("Gemini returned no text");
      try {
        return JSON.parse(text) as unknown;
      } catch {
        throw new AiInvalidOutputError("Gemini returned text that is not JSON");
      }
    },
  };
}
