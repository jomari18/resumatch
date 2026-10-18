import type { Importance, Status } from "@/lib/ai/schema";

export type Band = "Strong match" | "Good match" | "Fair match" | "Low match";

const WEIGHT: Record<Importance, number> = { required: 2, nice_to_have: 1 };
const CREDIT: Record<Status, number> = { matched: 1, partial: 0.5, missing: 0 };

/** Deterministic 0–100 score (spec 6.5). The schema guarantees at least one requirement. */
export function scoreFromRequirements(reqs: ReadonlyArray<{ importance: Importance; status: Status }>): number {
  let earned = 0;
  let total = 0;
  for (const req of reqs) {
    earned += WEIGHT[req.importance] * CREDIT[req.status];
    total += WEIGHT[req.importance];
  }
  return total === 0 ? 0 : Math.round((100 * earned) / total);
}

export function bandFor(score: number): Band {
  if (score >= 80) return "Strong match";
  if (score >= 60) return "Good match";
  if (score >= 40) return "Fair match";
  return "Low match";
}
