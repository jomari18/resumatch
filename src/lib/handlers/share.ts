import "server-only";
import { z } from "zod";
import { AnalysisResultSchema } from "@/lib/ai/schema";
import type { ServerConfig } from "@/lib/config";
import { MESSAGES, errorResponse } from "@/lib/http";
import { LIMITS } from "@/lib/input";
import { randomId, randomToken, sha256Hex, stableStringify, verifyAnalysisSignature } from "@/lib/signing";
import type { ShareStore } from "@/lib/store/types";

export type CreateShareResponse = {
  id: string;
  url: string;
  expiresAt: string;
  created: boolean;
  deleteToken: string | null;
};

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SHARE_ID = /^[A-Za-z0-9_-]{12}$/;

const CreateShareSchema = z.object({
  analysis: AnalysisResultSchema,
  issuedAt: z.iso.datetime(),
  signature: z.string().min(1).max(200),
});

type Deps = { shares: ShareStore; config: ServerConfig; now?: () => number };

export function createShareHandlers({ shares, config, now = Date.now }: Deps) {
  async function create(req: Request): Promise<Response> {
    const raw = await req.text();
    if (Buffer.byteLength(raw) > LIMITS.bodyBytes) return errorResponse(400, "invalid_input", MESSAGES.invalidBody);
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return errorResponse(400, "invalid_input", MESSAGES.invalidBody);
    }
    const parsed = CreateShareSchema.safeParse(json);
    if (!parsed.success) return errorResponse(400, "invalid_input", MESSAGES.invalidBody);

    const { analysis, issuedAt, signature } = parsed.data;
    if (!verifyAnalysisSignature(analysis, issuedAt, signature, config.resultSigningSecret)) {
      return errorResponse(403, "invalid_signature", MESSAGES.shareGone);
    }
    if (now() - Date.parse(issuedAt) > MAX_AGE_MS) {
      return errorResponse(410, "analysis_expired", MESSAGES.shareGone);
    }

    const token = randomToken();
    try {
      const stored = await shares.create({
        id: randomId(),
        result: analysis,
        digest: sha256Hex(stableStringify(analysis)),
        jobTitle: analysis.jobTitle,
        deleteTokenHash: sha256Hex(token),
      });
      const body: CreateShareResponse = {
        id: stored.id,
        url: `${config.siteUrl}/r/${stored.id}`,
        expiresAt: stored.expiresAt,
        created: stored.created,
        deleteToken: stored.created ? token : null,
      };
      return Response.json(body, { headers: { "cache-control": "no-store" } });
    } catch {
      return errorResponse(503, "service_unavailable", MESSAGES.busy);
    }
  }

  async function remove(req: Request, id: string): Promise<Response> {
    const token = req.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
    if (!token || !SHARE_ID.test(id)) return errorResponse(404, "not_found", MESSAGES.notFound);
    try {
      const deleted = await shares.delete(id, sha256Hex(token));
      return deleted ? new Response(null, { status: 204 }) : errorResponse(404, "not_found", MESSAGES.notFound);
    } catch {
      return errorResponse(503, "service_unavailable", MESSAGES.busy);
    }
  }

  return { create, remove };
}
