import type { AnalysisResult } from "@/lib/ai/schema";

export type QuotaResult = "ok" | "ip_limit" | "global_limit";

export interface RateLimitStore {
  consume(ipHash: string, perIpLimit: number, globalLimit: number): Promise<QuotaResult>;
}

export type StoredShare = { result: AnalysisResult; jobTitle: string; createdAt: string; expiresAt: string };

export type NewShare = { id: string; result: AnalysisResult; digest: string; jobTitle: string; deleteTokenHash: string };

export interface ShareStore {
  create(input: NewShare): Promise<{ id: string; created: boolean; expiresAt: string }>;
  get(id: string): Promise<StoredShare | null>;
  delete(id: string, deleteTokenHash: string): Promise<boolean>;
}

/** The database could not be reached or returned an error. Maps to 503 `service_unavailable`. */
export class StoreUnavailableError extends Error {
  override name = "StoreUnavailableError";
}
