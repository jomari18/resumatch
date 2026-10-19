import { ApiError } from "@google/genai";
import { describe, expect, it } from "vitest";
import { createGeminiProvider, type GeminiLike } from "@/lib/ai/gemini";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { AiInvalidOutputError, AiUnavailableError } from "@/lib/ai/provider";
import { rawAnalysisJsonSchema } from "@/lib/ai/schema";
import fixture from "./fixtures/raw-analysis.json";

const input = { resumeText: "My resume", jobText: "The job" };
const live = () => ({ signal: new AbortController().signal });

function clientReturning(result: () => Promise<{ text: string | undefined }>) {
  const calls: unknown[] = [];
  const client: GeminiLike = {
    models: {
      generateContent: (params) => {
        calls.push(params);
        return result();
      },
    },
  };
  return { client, calls };
}

describe("createGeminiProvider", () => {
  it("parses the JSON text and sends the schema, temperature and system prompt", async () => {
    const { client, calls } = clientReturning(async () => ({ text: JSON.stringify(fixture) }));
    const provider = createGeminiProvider({ apiKey: "k", model: "gemini-test", client });
    expect(await provider.analyze(input, live())).toEqual(fixture);

    const params = calls[0] as { model: string; contents: string; config: Record<string, unknown> };
    expect(params.model).toBe("gemini-test");
    expect(params.contents).toContain("<job_posting>");
    expect(params.config).toMatchObject({
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: "LOW" },
    });
    expect(Object.keys((params.config.responseJsonSchema as { properties: object }).properties)).toEqual(
      Object.keys((rawAnalysisJsonSchema as unknown as { properties: object }).properties),
    );
    expect(params.config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("rejects non-JSON text with AiInvalidOutputError", async () => {
    const { client } = clientReturning(async () => ({ text: "Sure! Here is your analysis" }));
    await expect(createGeminiProvider({ apiKey: "k", model: "m", client }).analyze(input, live())).rejects.toBeInstanceOf(
      AiInvalidOutputError,
    );
  });

  it("rejects empty text with AiInvalidOutputError", async () => {
    const { client } = clientReturning(async () => ({ text: undefined }));
    await expect(createGeminiProvider({ apiKey: "k", model: "m", client }).analyze(input, live())).rejects.toBeInstanceOf(
      AiInvalidOutputError,
    );
  });

  it.each([429, 503])("maps an API error with status %i to AiUnavailableError", async (status) => {
    const { client } = clientReturning(async () => {
      throw new ApiError({ message: "busy", status });
    });
    await expect(createGeminiProvider({ apiKey: "k", model: "m", client }).analyze(input, live())).rejects.toBeInstanceOf(
      AiUnavailableError,
    );
  });

  it("maps an aborted request to AiUnavailableError", async () => {
    const controller = new AbortController();
    controller.abort();
    const { client } = clientReturning(async () => {
      throw new DOMException("aborted", "AbortError");
    });
    await expect(
      createGeminiProvider({ apiKey: "k", model: "m", client }).analyze(input, { signal: controller.signal }),
    ).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it.each([[429, true], [503, true], [400, false]])("marks status %i as retryable=%s", async (status, retryable) => {
    const { client } = clientReturning(async () => {
      throw new ApiError({ message: "x", status });
    });
    const err = (await createGeminiProvider({ apiKey: "k", model: "m", client }).analyze(input, live()).catch((e: unknown) => e)) as AiUnavailableError;
    expect(err).toBeInstanceOf(AiUnavailableError);
    expect(err.retryable).toBe(retryable);
  });

  it("falls back to the next model when the first one is overloaded", async () => {
    const models: string[] = [];
    const client: GeminiLike = {
      models: {
        generateContent: async (params) => {
          models.push(params.model);
          if (params.model === "primary") throw new ApiError({ message: "overloaded", status: 503 });
          return { text: JSON.stringify(fixture) };
        },
      },
    };
    const provider = createGeminiProvider({ apiKey: "k", model: "primary", fallbackModels: ["backup"], client });
    expect(await provider.analyze(input, live())).toEqual(fixture);
    expect(models).toEqual(["primary", "backup"]);
  });

  it("does not fall back on a non-retryable error", async () => {
    const models: string[] = [];
    const client: GeminiLike = {
      models: {
        generateContent: async (params) => {
          models.push(params.model);
          throw new ApiError({ message: "bad", status: 400 });
        },
      },
    };
    await createGeminiProvider({ apiKey: "k", model: "primary", fallbackModels: ["backup"], client }).analyze(input, live()).catch(() => {});
    expect(models).toEqual(["primary"]);
  });
});
