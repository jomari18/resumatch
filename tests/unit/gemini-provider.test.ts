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

  it.each([
    ["gemini-3.5-flash-lite", "MINIMAL"],
    ["gemini-3.6-flash", "MINIMAL"],
    ["gemini-3.8-flash", "LOW"],
    ["some-future-model", "LOW"],
  ])("uses the fastest thinking level %s supports (%s)", async (model, level) => {
    const { client, calls } = clientReturning(async () => ({ text: JSON.stringify(fixture) }));
    await createGeminiProvider({ apiKey: "k", model, client }).analyze(input, live());
    expect((calls[0] as { config: { thinkingConfig: unknown } }).config.thinkingConfig).toEqual({ thinkingLevel: level });
  });

  it("rejects non-JSON text with AiInvalidOutputError", async () => {
    const { client } = clientReturning(async () => ({ text: "Sure! Here is your analysis" }));
    await expect(
      createGeminiProvider({ apiKey: "k", model: "m", client }).analyze(input, live()),
    ).rejects.toBeInstanceOf(AiInvalidOutputError);
  });

  it("rejects empty text with AiInvalidOutputError", async () => {
    const { client } = clientReturning(async () => ({ text: undefined }));
    await expect(
      createGeminiProvider({ apiKey: "k", model: "m", client }).analyze(input, live()),
    ).rejects.toBeInstanceOf(AiInvalidOutputError);
  });

  it.each([429, 503])("maps an API error with status %i to AiUnavailableError", async (status) => {
    const { client } = clientReturning(async () => {
      throw new ApiError({ message: "busy", status });
    });
    await expect(
      createGeminiProvider({ apiKey: "k", model: "m", client }).analyze(input, live()),
    ).rejects.toBeInstanceOf(AiUnavailableError);
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

  it.each([
    [429, true],
    [503, true],
    [400, false],
  ])("marks status %i as retryable=%s", async (status, retryable) => {
    const { client } = clientReturning(async () => {
      throw new ApiError({ message: "x", status });
    });
    const err = (await createGeminiProvider({ apiKey: "k", model: "m", client })
      .analyze(input, live())
      .catch((e: unknown) => e)) as AiUnavailableError;
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

  it("gives up on a slow model after attemptTimeoutMs and falls back to the next one", async () => {
    const models: string[] = [];
    const client: GeminiLike = {
      models: {
        generateContent: (params) => {
          models.push(params.model);
          if (params.model === "backup") return Promise.resolve({ text: JSON.stringify(fixture) });
          // The slow model only settles when its own signal aborts.
          return new Promise((_, reject) =>
            params.config.abortSignal.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            ),
          );
        },
      },
    };
    const provider = createGeminiProvider({
      apiKey: "k",
      model: "primary",
      fallbackModels: ["backup"],
      attemptTimeoutMs: 20,
      client,
    });
    expect(await provider.analyze(input, live())).toEqual(fixture);
    expect(models).toEqual(["primary", "backup"]);
  });

  it("reports each model attempt with its outcome", async () => {
    const client: GeminiLike = {
      models: {
        generateContent: (params) => {
          if (params.model === "backup") return Promise.resolve({ text: JSON.stringify(fixture) });
          return new Promise((_, reject) =>
            params.config.abortSignal.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            ),
          );
        },
      },
    };
    const attempts: { model: string; outcome: string; ms: number }[] = [];
    const provider = createGeminiProvider({
      apiKey: "k",
      model: "primary",
      fallbackModels: ["backup"],
      attemptTimeoutMs: 20,
      client,
    });
    await provider.analyze(input, { signal: new AbortController().signal, onAttempt: (a) => attempts.push(a) });
    expect(attempts.map((a) => [a.model, a.outcome])).toEqual([
      ["primary", "slow"],
      ["backup", "ok"],
    ]);
    expect(attempts.every((a) => Number.isInteger(a.ms) && a.ms >= 0)).toBe(true);
  });

  it("includes the API status code when a model is unavailable", async () => {
    const client: GeminiLike = {
      models: {
        generateContent: async (params) => {
          if (params.model === "primary") throw new ApiError({ message: "quota", status: 429 });
          return { text: JSON.stringify(fixture) };
        },
      },
    };
    const attempts: { model: string; outcome: string; status?: number }[] = [];
    const provider = createGeminiProvider({ apiKey: "k", model: "primary", fallbackModels: ["backup"], client });
    await provider.analyze(input, { signal: new AbortController().signal, onAttempt: (a) => attempts.push(a) });
    expect(attempts[0]).toMatchObject({ model: "primary", outcome: "unavailable", status: 429 });
    expect(attempts[1]).toMatchObject({ model: "backup", outcome: "ok" });
    expect(attempts[1].status).toBeUndefined();
  });

  it("does not cap the last model, which keeps the whole remaining budget", async () => {
    const { client } = clientReturning(
      () => new Promise((resolve) => setTimeout(() => resolve({ text: JSON.stringify(fixture) }), 40)),
    );
    const provider = createGeminiProvider({ apiKey: "k", model: "only", attemptTimeoutMs: 10, client });
    expect(await provider.analyze(input, live())).toEqual(fixture);
  });

  it("does not fall back once the overall request is aborted", async () => {
    const models: string[] = [];
    const controller = new AbortController();
    const client: GeminiLike = {
      models: {
        generateContent: (params) => {
          models.push(params.model);
          controller.abort();
          return Promise.reject(new DOMException("aborted", "AbortError"));
        },
      },
    };
    const provider = createGeminiProvider({
      apiKey: "k",
      model: "primary",
      fallbackModels: ["backup"],
      attemptTimeoutMs: 1000,
      client,
    });
    await expect(provider.analyze(input, { signal: controller.signal })).rejects.toBeInstanceOf(AiUnavailableError);
    expect(models).toEqual(["primary"]);
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
    await createGeminiProvider({ apiKey: "k", model: "primary", fallbackModels: ["backup"], client })
      .analyze(input, live())
      .catch(() => {});
    expect(models).toEqual(["primary"]);
  });
});
