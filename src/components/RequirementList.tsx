import type { Requirement, Status } from "@/lib/ai/schema";

const STATUS: Record<Status, { label: string; className: string }> = {
  matched: { label: "Matched", className: "bg-success-soft text-success" },
  partial: { label: "Partial", className: "bg-warning-soft text-warning" },
  missing: { label: "Missing", className: "bg-danger-soft text-danger" },
};

export function RequirementList({ requirements }: { requirements: Requirement[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {requirements.map((req) => (
        <li key={req.skill} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{req.skill}</span>
            <span className="text-xs uppercase tracking-wide text-muted">
              {req.importance === "required" ? "Required" : "Nice to have"}
            </span>
            <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${STATUS[req.status].className}`}>
              {STATUS[req.status].label}
            </span>
          </div>
          {req.evidence && (
            <blockquote className="border-l-2 border-line pl-3 text-sm text-muted">
              “{req.evidence}”
              {!req.evidenceVerified && (
                <span className="mt-1 block text-xs font-medium text-warning">Not found word-for-word in your resume</span>
              )}
            </blockquote>
          )}
        </li>
      ))}
    </ul>
  );
}
