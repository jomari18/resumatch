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
