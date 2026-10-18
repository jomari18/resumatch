import sample from "@/lib/ai/fixtures/sample-analysis.json";
import { AiUnavailableError, type AIProvider, type FakeMode } from "@/lib/ai/provider";

export type { FakeMode };

/** Deterministic provider for tests and E2E. Never used unless AI_PROVIDER=fake. */
export function createFakeProvider(mode: FakeMode): AIProvider {
  let calls = 0;
  return {
    async analyze(_input, { signal }) {
      calls += 1;
      switch (mode) {
        case "ok":
          return structuredClone(sample);
        case "invalid":
          return { nope: true };
        case "invalid_then_ok":
          return calls === 1 ? { nope: true } : structuredClone(sample);
        case "unavailable":
          throw new AiUnavailableError("Fake provider unavailable");
        case "timeout":
          return new Promise((_resolve, reject) => {
            const fail = () => reject(new AiUnavailableError("Fake provider timed out"));
            if (signal.aborted) fail();
            else signal.addEventListener("abort", fail, { once: true });
          });
      }
    },
  };
}
