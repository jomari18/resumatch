import "server-only";
import type { ServerConfig } from "@/lib/config";
import { createFakeProvider } from "@/lib/ai/fake";
import type { AIProvider } from "@/lib/ai/provider";

export async function getProvider(config: ServerConfig): Promise<AIProvider> {
  if (config.aiProvider === "fake") return createFakeProvider(config.fakeAiMode);
  // Loaded lazily so tests and fake-provider runs never load the SDK.
  const { createGeminiProvider } = await import("@/lib/ai/gemini");
  if (!config.geminiApiKey) throw new Error("GEMINI_API_KEY is required for the Gemini provider");
  return createGeminiProvider({ apiKey: config.geminiApiKey, model: config.geminiModel });
}
