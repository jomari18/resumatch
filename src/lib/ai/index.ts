import "server-only";
import type { ServerConfig } from "@/lib/config";
import { createFakeProvider } from "@/lib/ai/fake";
import type { AIProvider } from "@/lib/ai/provider";

export async function getProvider(config: ServerConfig): Promise<AIProvider> {
  if (config.aiProvider === "fake") return createFakeProvider(config.fakeAiMode);
  throw new Error("The Gemini provider is added in Task 5");
}
