import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// Vitest runs without globals, so Testing Library's automatic cleanup is registered here.
afterEach(async () => {
  if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  }
});
