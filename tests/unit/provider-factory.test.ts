import { describe, expect, it } from "vitest";
import { getProvider } from "@/lib/ai";
import type { ServerConfig } from "@/lib/config";

const config = { aiProvider: "gemini", geminiApiKey: "key", geminiModel: "m", fakeAiMode: "ok" } as ServerConfig;

describe("getProvider", () => {
  it("returns a Gemini provider for aiProvider gemini", async () => {
    const provider = await getProvider(config);
    expect(typeof provider.analyze).toBe("function");
  });

  it("returns the fake provider for aiProvider fake", async () => {
    const provider = await getProvider({ ...config, aiProvider: "fake" });
    expect(await provider.analyze({ resumeText: "r", jobText: "j" }, { signal: new AbortController().signal })).toHaveProperty("jobTitle");
  });
});
