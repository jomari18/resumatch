import { z } from "zod";

export const ImportanceSchema = z.enum(["required", "nice_to_have"]);
export const StatusSchema = z.enum(["matched", "partial", "missing"]);
export type Importance = z.infer<typeof ImportanceSchema>;
export type Status = z.infer<typeof StatusSchema>;

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

const RawRequirementSchema = z.object({
  skill: text(1, 80),
  importance: ImportanceSchema,
  status: StatusSchema,
  evidence: z.string().trim().max(300).nullable(),
});

/** What the AI must return (spec 6.1). The same shape is sent to Gemini as the response schema. */
export const RawAnalysisSchema = z.object({
  jobTitle: text(1, 120),
  company: text(1, 120).nullable(),
  requirements: z.array(RawRequirementSchema).min(1).max(25),
  suggestions: z.array(text(1, 300)).min(1).max(6),
  coverLetter: text(300, 3500),
});
export type RawAnalysis = z.infer<typeof RawAnalysisSchema>;

export const RequirementSchema = RawRequirementSchema.extend({ evidenceVerified: z.boolean() });
export type Requirement = z.infer<typeof RequirementSchema>;

/** The analysis after evidence verification: what the app shows, signs and shares. */
export const AnalysisResultSchema = RawAnalysisSchema.extend({
  requirements: z.array(RequirementSchema).min(1).max(25),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export const rawAnalysisJsonSchema = z.toJSONSchema(RawAnalysisSchema) as Record<string, unknown> & { type: string };

const clip = (v: unknown, max: number) => (typeof v === "string" && v.length > max ? v.slice(0, max).trimEnd() : v);

/**
 * Models sometimes return a well-formed answer that is merely too long. Trim strings and arrays
 * to the schema limits before validating, so a verbose answer is shortened instead of rejected.
 * Anything structurally wrong is left alone for the schema to reject.
 */
export function coerceRawAnalysis(output: unknown): unknown {
  if (output === null || typeof output !== "object" || Array.isArray(output)) return output;
  const o = output as Record<string, unknown>;
  const out: Record<string, unknown> = { ...o, jobTitle: clip(o.jobTitle, 120), company: clip(o.company, 120) };
  if (Array.isArray(o.requirements)) {
    out.requirements = o.requirements.slice(0, 25).map((r) =>
      r && typeof r === "object"
        ? { ...(r as Record<string, unknown>), skill: clip((r as Record<string, unknown>).skill, 80), evidence: clip((r as Record<string, unknown>).evidence, 300) }
        : r,
    );
  }
  if (Array.isArray(o.suggestions)) out.suggestions = o.suggestions.slice(0, 6).map((s) => clip(s, 300));
  if ("coverLetter" in o) out.coverLetter = clip(o.coverLetter, 3500);
  return out;
}
