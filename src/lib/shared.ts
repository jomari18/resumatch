import "server-only";
import type { AnalysisResult } from "@/lib/ai/schema";
import { bandFor, scoreFromRequirements, type Band } from "@/lib/scoring";
import type { ShareStore } from "@/lib/store/types";

export type SharedView = { result: AnalysisResult; score: number; band: Band; jobTitle: string; expiresAt: string };

const SHARE_ID = /^[A-Za-z0-9_-]{12}$/;

/** Loads a live shared result; the score is recomputed, never read from storage. */
export async function loadShared(id: string, shares: ShareStore): Promise<SharedView | null> {
  if (!SHARE_ID.test(id)) return null;
  const stored = await shares.get(id);
  if (!stored) return null;
  const score = scoreFromRequirements(stored.result.requirements);
  return { result: stored.result, score, band: bandFor(score), jobTitle: stored.jobTitle, expiresAt: stored.expiresAt };
}
