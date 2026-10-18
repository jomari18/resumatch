// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { analyze } from "@/lib/client/api";

afterEach(() => vi.unstubAllGlobals());

describe("client api", () => {
  it("maps a 200 response with a non-JSON body to service_unavailable instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>Wi-Fi login</html>", { status: 200 })));
    const result = await analyze({ resumeText: "r", jobText: "j" });
    expect(result).toMatchObject({ ok: false, error: { code: "service_unavailable" } });
  });
});
