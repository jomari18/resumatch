import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "@/lib/ai/schema";
import { createShareHandlers } from "@/lib/handlers/share";
import { sha256Hex, signAnalysis, stableStringify } from "@/lib/signing";
import { createMemoryStores } from "@/lib/store/memory";
import { StoreUnavailableError, type NewShare, type ShareStore } from "@/lib/store/types";
import raw from "../unit/fixtures/raw-analysis.json";
import { jsonRequest, testConfig } from "./helpers";

const NOW = Date.parse("2026-10-19T03:00:00.000Z");
const issuedAt = new Date(NOW).toISOString();
const analysis = {
  ...raw,
  requirements: raw.requirements.map((r) => ({ ...r, evidenceVerified: r.status !== "missing" })),
} as AnalysisResult;
const signature = signAnalysis(analysis, issuedAt, testConfig.resultSigningSecret);
const payload = { analysis, issuedAt, signature };

function setup(shares?: ShareStore, now = NOW) {
  const memory = createMemoryStores({ now: () => new Date(now) }).shares;
  const store = shares ?? memory;
  return { ...createShareHandlers({ shares: store, config: testConfig, now: () => now }), store };
}

const createReq = (body: unknown) => jsonRequest("https://resumatch.test/api/share", body);
const deleteReq = (id: string, token?: string) =>
  new Request(`https://resumatch.test/api/share/${id}`, {
    method: "DELETE",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

describe("POST /api/share", () => {
  it("creates a link and returns the delete token once", async () => {
    const { create } = setup();
    const first = await create(createReq(payload));
    expect(first.status).toBe(200);
    const data = await first.json();
    expect(data).toMatchObject({ created: true, url: `https://resumatch.test/r/${data.id}` });
    expect(data.deleteToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const again = await (await create(createReq(payload))).json();
    expect(again).toMatchObject({ id: data.id, created: false, deleteToken: null });
  });

  it("stores the digest of the analysis and the hash of the token", async () => {
    const seen: NewShare[] = [];
    const memory = createMemoryStores().shares;
    const spy: ShareStore = { ...memory, create: (input) => (seen.push(input), memory.create(input)) };
    const data = await (await setup(spy).create(createReq(payload))).json();
    expect(seen[0].digest).toBe(sha256Hex(stableStringify(analysis)));
    expect(seen[0].deleteTokenHash).toBe(sha256Hex(data.deleteToken));
    expect(seen[0].jobTitle).toBe(analysis.jobTitle);
  });

  it("rejects a tampered analysis with 403", async () => {
    const tampered = structuredClone(analysis);
    tampered.requirements[2].status = "matched";
    const res = await setup().create(createReq({ ...payload, analysis: tampered }));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("invalid_signature");
  });

  it("rejects an analysis older than 24 hours with 410", async () => {
    const res = await setup(undefined, NOW + 24 * 3600_000 + 1000).create(createReq(payload));
    expect(res.status).toBe(410);
    expect((await res.json()).error.code).toBe("analysis_expired");
  });

  it("rejects an invalid body with 400", async () => {
    expect((await setup().create(createReq({ analysis: { nope: true }, issuedAt, signature }))).status).toBe(400);
    expect((await setup().create(createReq("not json"))).status).toBe(400);
  });

  it("returns 503 when the store is down", async () => {
    const down: ShareStore = {
      create: async () => {
        throw new StoreUnavailableError("down");
      },
      get: async () => null,
      delete: async () => false,
    };
    const res = await setup(down).create(createReq(payload));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("service_unavailable");
  });
});

describe("DELETE /api/share/[id]", () => {
  it("needs the right bearer token and deletes once", async () => {
    const { create, remove } = setup();
    const { id, deleteToken } = await (await create(createReq(payload))).json();
    expect((await remove(deleteReq(id), id)).status).toBe(404);
    expect((await remove(deleteReq(id, "wrong-token"), id)).status).toBe(404);
    expect((await remove(deleteReq(id, deleteToken), id)).status).toBe(204);
    expect((await remove(deleteReq(id, deleteToken), id)).status).toBe(404);
  });
});
