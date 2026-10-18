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

const DOWNGRADE: Record<Exclude<Status, "missing">, Status> = { matched: "partial", partial: "missing" };

function dedupe(requirements: RawAnalysis["requirements"]): RawAnalysis["requirements"] {
  const byKey = new Map<string, RawAnalysis["requirements"][number]>();
  for (const req of requirements) {
    const key = skillKey(req.skill);
    const kept = byKey.get(key);
    if (!kept) byKey.set(key, { ...req });
    else if (req.importance === "required") kept.importance = "required";
  }
  return [...byKey.values()];
}

/** Applies the spec 6.4 table: only claims backed by a quote found in the resume keep their status. */
export function verifyEvidence(raw: RawAnalysis, resumeText: string): AnalysisResult {
  const haystack = normalizeForMatch(resumeText);
  const requirements = dedupe(raw.requirements).map((req): Requirement => {
    if (req.status === "missing" || !req.evidence) {
      return { ...req, status: "missing", evidence: null, evidenceVerified: false };
    }
    if (haystack.includes(normalizeForMatch(req.evidence))) {
      return { ...req, evidenceVerified: true };
    }
    const status = DOWNGRADE[req.status];
    return { ...req, status, evidence: status === "missing" ? null : req.evidence, evidenceVerified: false };
  });
  return { ...raw, requirements };
}
