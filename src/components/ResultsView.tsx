"use client";

import type { ReactNode } from "react";
import { CoverLetterEditor } from "@/components/CoverLetterEditor";
import { RequirementList } from "@/components/RequirementList";
import { ScoreRing } from "@/components/ScoreRing";
import { ShareButton } from "@/components/ShareButton";
import { SuggestionList } from "@/components/SuggestionList";
import type { AnalysisResult } from "@/lib/ai/schema";
import type { Band } from "@/lib/scoring";

type Common = { analysis: AnalysisResult; score: number; band: Band; orb?: ReactNode };
type Props = (Common & { mode: "owner"; issuedAt: string; signature: string }) | (Common & { mode: "shared" });

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="font-heading text-lg font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function ResultsView(props: Props) {
  const { analysis, score, band, orb } = props;
  const matched = analysis.requirements.filter((r) => r.status === "matched").length;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center gap-6 rounded-2xl border border-line bg-surface p-6 shadow-sm sm:flex-row sm:p-8">
        <div className="relative grid place-items-center">
          {orb}
          <div className={orb ? "absolute inset-0 grid place-items-center" : undefined}>
            <ScoreRing score={score} band={band} />
          </div>
        </div>
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <p className="text-sm font-medium uppercase tracking-wide text-muted">Match for</p>
          <h1 className="font-heading text-2xl font-bold text-ink sm:text-3xl">
            {analysis.jobTitle}
            {analysis.company ? <span className="text-muted"> · {analysis.company}</span> : null}
          </h1>
          <p className="text-muted">
            {matched} of {analysis.requirements.length} requirements matched. The score is computed from the requirement
            list, not guessed by the AI.
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Requirements">
          <RequirementList requirements={analysis.requirements} />
        </Card>
        <Card title="Suggestions">
          <SuggestionList suggestions={analysis.suggestions} />
        </Card>
      </div>

      <Card title={props.mode === "owner" ? "Cover letter draft" : "Cover letter"}>
        <CoverLetterEditor initial={analysis.coverLetter} readOnly={props.mode === "shared"} />
      </Card>

      {props.mode === "owner" && (
        <Card title="Share this result">
          <ShareButton analysis={analysis} issuedAt={props.issuedAt} signature={props.signature} />
        </Card>
      )}
    </div>
  );
}
