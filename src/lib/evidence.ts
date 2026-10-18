import type { AnalysisResult, RawAnalysis, Requirement, Status } from "@/lib/ai/schema";

/** Lowercases and folds typographic characters so a quote matches the resume it came from. */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[•·]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "React", "react.js " and "ReactJS" share one key; a bare "JS" keeps its own. */
function skillKey(skill: string): string {
  const key = normalizeForMatch(skill).replace(/[.\-\s]/g, "");
  return key.length > 2 && key.endsWith("js") ? key.slice(0, -2) : key;
}

const isWordChar = (c: string | undefined) => c !== undefined && /[a-z0-9]/.test(c);

/** True when `needle` occurs in `haystack` with no letter or digit directly before or after it. */
function includesWord(haystack: string, needle: string): boolean {
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + 1)) {
    if (!isWordChar(haystack[i - 1]) && !isWordChar(haystack[i + needle.length])) return true;
  }
  return false;
}

/** Short quotes such as "and" match every resume, so they never count as evidence. */
const isSubstantive = (quote: string) => quote.split(" ").length >= 3 || quote.length >= 15;

/** A quote supports a skill only if it mentions it (any 2+ character token of the skill, or its key). */
function mentionsSkill(quote: string, skill: string): boolean {
  const tokens = normalizeForMatch(skill)
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length >= 2);
  return [...tokens, skillKey(skill)].some((t) => t.length >= 2 && includesWord(quote, t));
}

const DOWNGRADE: Record<Exclude<Status, "missing">, Status> = { matched: "partial", partial: "missing" };
const RANK: Record<Status, number> = { matched: 2, partial: 1, missing: 0 };

function verifyOne(req: RawAnalysis["requirements"][number], haystack: string): Requirement {
  if (req.status === "missing" || !req.evidence) {
    return { ...req, status: "missing", evidence: null, evidenceVerified: false };
  }
  const quote = normalizeForMatch(req.evidence);
  if (isSubstantive(quote) && includesWord(haystack, quote)) {
    if (mentionsSkill(quote, req.skill)) return { ...req, evidenceVerified: true };
    // A real quote that does not mention the skill proves at most a partial match.
    return { ...req, status: "partial", evidence: null, evidenceVerified: false };
  }
  const status = DOWNGRADE[req.status];
  return { ...req, status, evidence: status === "missing" ? null : req.evidence, evidenceVerified: false };
}

/**
 * Applies spec 6.4: only claims backed by a substantive, word-boundary quote found in the resume keep their status.
 * Duplicate skills are merged after verification: the best verified status wins, and the skill is
 * required if any duplicate is required.
 */
export function verifyEvidence(raw: RawAnalysis, resumeText: string): AnalysisResult {
  const haystack = normalizeForMatch(resumeText);
  const byKey = new Map<string, Requirement>();
  for (const req of raw.requirements) {
    const verified = verifyOne(req, haystack);
    const key = skillKey(req.skill);
    const kept = byKey.get(key);
    if (!kept) {
      byKey.set(key, verified);
      continue;
    }
    const importance = kept.importance === "required" || verified.importance === "required" ? "required" : "nice_to_have";
    const best = RANK[verified.status] > RANK[kept.status] ? verified : kept;
    byKey.set(key, { ...best, skill: kept.skill, importance });
  }
  return { ...raw, requirements: [...byKey.values()] };
}
