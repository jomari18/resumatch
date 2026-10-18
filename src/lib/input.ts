import { z } from "zod";

export const LIMITS = {
  resume: { min: 200, max: 15000 },
  job: { min: 100, max: 10000 },
  pdfBytes: 5_242_880,
  bodyBytes: 65_536,
} as const;

type Kind = "resume" | "job";

const LABELS: Record<Kind, string> = { resume: "Resume", job: "Job posting" };

/** Normalizes pasted or extracted text so limits and evidence matching see the same characters. */
export function normalizeText(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]/g, " ")
    .split("\n")
    .map((line) => line.replace(/ {2,}/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function checkLength(kind: Kind, text: string): { ok: true } | { ok: false; message: string } {
  const { min, max } = LIMITS[kind];
  const length = normalizeText(text).length;
  if (length < min) {
    return { ok: false, message: `${LABELS[kind]} must be at least ${min.toLocaleString("en-US")} characters.` };
  }
  if (length > max) {
    return { ok: false, message: `${LABELS[kind]} must be at most ${max.toLocaleString("en-US")} characters.` };
  }
  return { ok: true };
}

const field = (kind: Kind) =>
  z
    .string()
    .transform(normalizeText)
    .pipe(z.string().min(LIMITS[kind].min).max(LIMITS[kind].max));

export const AnalyzeRequestSchema = z.object({
  resumeText: field("resume"),
  jobText: field("job"),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
