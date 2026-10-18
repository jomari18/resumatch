import "server-only";
import { createHmac } from "node:crypto";

/** Netlify sets x-nf-client-connection-ip; x-forwarded-for is the fallback for other hosts. */
export function getClientIp(headers: Headers): string {
  const netlify = headers.get("x-nf-client-connection-ip")?.trim();
  if (netlify) return netlify;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

/** Salted HMAC so the raw IP is never stored or logged. */
export function hashIp(ip: string, salt: string): string {
  return createHmac("sha256", salt).update(ip).digest("hex");
}
