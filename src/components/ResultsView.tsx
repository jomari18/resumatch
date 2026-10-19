"use client";

import type { ReactNode } from "react";
import { CoverLetterEditor } from "@/components/CoverLetterEditor";
import { RequirementList } from "@/components/RequirementList";
import { ScoreRing } from "@/components/ScoreRing";
import { ShareButton } from "@/components/ShareButton";
import { SuggestionList } from "@/components/SuggestionList";
import type { AnalysisResult } from "@/lib/ai/schema";
import type { Band } from "@/lib/scoring";

type Common = { analysis: AnalysisResult; score: number; band: Band };
type Props = (Common & { mode: "owner"; issuedAt: string; signature: string }) | (Common & { mode: "shared" });

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass flex flex-col gap-4 rounded-2xl border border-line p-5 sm:p-6">
      <h2 className="font-heading text-lg font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function ResultsView(props: Props) {
  const { analysis, score, band } = props;
  const matched = analysis.requirements.filter((r) => r.status === "matched").length;
  // The shared page has no other heading; on the analyze page the page title is the h1.
  const Title = props.mode === "shared" ? "h1" : "h2";

  return (
    <div className="flex flex-col gap-6">
      <section className="glass flex flex-col items-center gap-6 rounded-2xl border border-line p-6 sm:flex-row sm:p-8">
        <ScoreRing score={score} band={band} />
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <p className="text-sm font-medium uppercase tracking-wide text-muted">Match for</p>
          <Title id="results-title" tabIndex={-1} className="font-heading text-2xl font-extrabold tracking-tight text-ink focus:outline-none sm:text-3xl">
            {analysis.jobTitle}
            {analysis.company ? <span className="text-muted"> · {analysis.company}</span> : null}
          </Title>
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
