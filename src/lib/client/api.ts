import type { AnalysisResult } from "@/lib/ai/schema";
import type { AnalyzeResponse } from "@/lib/handlers/analyze";
import type { CreateShareResponse } from "@/lib/handlers/share";
import { MESSAGES, type ApiErrorBody, type ErrorCode } from "@/lib/http";

export type { AnalyzeResponse, CreateShareResponse };

/** `network` is client-only: the request never reached the server. */
export type ApiError = { code: ErrorCode | "network"; message: string; field?: string; resetsAt?: string };
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

async function request<T>(url: string, init: RequestInit, parse: (res: Response) => Promise<T>): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    return { ok: false, error: { code: "network", message: MESSAGES.offline } };
  }
  if (res.ok) {
    try {
      return { ok: true, data: await parse(res) };
    } catch {
      // A 200 with a body we cannot read (captive portal, truncated proxy response).
      return { ok: false, error: { code: "service_unavailable", message: MESSAGES.busy } };
    }
  }
  try {
    const body = (await res.json()) as ApiErrorBody;
    if (body?.error?.code) return { ok: false, error: body.error };
  } catch {
    // Fall through to the generic message.
  }
  return { ok: false, error: { code: "service_unavailable", message: MESSAGES.busy } };
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export function analyze(input: { resumeText: string; jobText: string }): Promise<ApiResult<AnalyzeResponse>> {
  return request("/api/analyze", json(input), (res) => res.json());
}

export function createShare(payload: {
  analysis: AnalysisResult;
  issuedAt: string;
  signature: string;
}): Promise<ApiResult<CreateShareResponse>> {
  return request("/api/share", json(payload), (res) => res.json());
}

export function deleteShare(id: string, token: string): Promise<ApiResult<null>> {
  return request(
    `/api/share/${encodeURIComponent(id)}`,
    { method: "DELETE", headers: { authorization: `Bearer ${token}` } },
    async () => null,
  );
}
