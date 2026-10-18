export type ErrorCode =
  | "invalid_input"
  | "ip_limit"
  | "global_limit"
  | "ai_invalid_output"
  | "ai_unavailable"
  | "service_unavailable"
  | "invalid_signature"
  | "analysis_expired"
  | "not_found";

export type ApiErrorBody = { error: { code: ErrorCode; message: string; field?: string; resetsAt?: string } };

/** User-facing copy from spec section 8. */
export const MESSAGES = {
  ipLimit: (limit: number) => `You've used today's ${limit} analyses. It resets at 12:00 AM (PH time).`,
  globalLimit: "The demo has reached today's limit. Please try again tomorrow.",
  aiInvalid: "The AI gave an unexpected answer. Please try again.",
  busy: "The service is busy. Please try again in a few minutes.",
  shareGone: "This result can no longer be shared. Run the analysis again.",
  offline: "You seem to be offline. Check your connection and try again.",
  invalidBody: "The request could not be read. Please try again.",
  notFound: "This link doesn't exist or has expired.",
} as const;

export function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  extra: { field?: string; resetsAt?: string } = {},
): Response {
  const body: ApiErrorBody = { error: { code, message, ...extra } };
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
