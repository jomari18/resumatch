import "server-only";
/**
 * Gemini provider (SDK @google/genai 2.30).
 * Call shape: ai.models.generateContent({ model, contents, config: { systemInstruction, temperature,
 * responseMimeType: "application/json", responseJsonSchema, abortSignal } }) → response.text
 */
import { ApiError, GoogleGenAI } from "@google/genai";
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
            abortSignal: signal,
          },
        });
        text = response.text;
      } catch (error) {
        if (signal.aborted) throw new AiUnavailableError("Gemini request timed out");
        if (error instanceof ApiError) throw new AiUnavailableError(`Gemini API error ${error.status}`);
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
