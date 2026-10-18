"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { JobInput } from "@/components/JobInput";
import { LoadingSteps } from "@/components/LoadingSteps";
import { MatchOrb } from "@/components/MatchOrb";
import { ResultsView } from "@/components/ResultsView";
import { ResumeInput } from "@/components/ResumeInput";
import { analyze, type AnalyzeResponse, type ApiError } from "@/lib/client/api";
import { STORAGE_KEYS, safeGet, safeRemove, safeSet } from "@/lib/client/storage";
import { checkLength } from "@/lib/input";

type Phase = "input" | "loading" | "results";

function restore(): AnalyzeResponse | null {
  const raw = safeGet("session", STORAGE_KEYS.lastResult);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AnalyzeResponse;
    return parsed?.analysis?.requirements ? parsed : null;
  } catch {
    return null;
  }
}

export function AnalyzeApp() {
  const [resume, setResume] = useState("");
  const [job, setJob] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const inFlight = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = restore();
    if (saved) {
      // Restoring from sessionStorage can only happen after mount (the server has no session).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(saved);
      setPhase("results");
    }
  }, []);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (inFlight.current) return;
    const resumeCheck = checkLength("resume", resume);
    const jobCheck = checkLength("job", job);
    if (!resumeCheck.ok || !jobCheck.ok) {
      const field = !resumeCheck.ok ? "resumeText" : "jobText";
      const message = !resumeCheck.ok ? resumeCheck.message : (jobCheck as { message: string }).message;
      setError({ code: "invalid_input", message, field });
      return;
    }

    inFlight.current = true;
    setError(null);
    setPhase("loading");
    const response = await analyze({ resumeText: resume, jobText: job });
    inFlight.current = false;

    if (!response.ok) {
      setError(response.error);
      setPhase("input");
      return;
    }
    safeSet("session", STORAGE_KEYS.lastResult, JSON.stringify(response.data));
    setResult(response.data);
    setPhase("results");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startOver() {
    safeRemove("session", STORAGE_KEYS.lastResult);
    setResult(null);
    setPhase("input");
  }

  const fieldError = (field: string) => (error?.code === "invalid_input" && error.field === field ? error.message : undefined);
  const generalError = error && !(error.code === "invalid_input" && error.field) ? error : null;

  return (
    <div ref={topRef} className="flex scroll-mt-6 flex-col gap-6">
      {phase === "results" && result ? (
        <>
          <ResultsView
            mode="owner"
            analysis={result.analysis}
            score={result.score}
            band={result.band}
            issuedAt={result.issuedAt}
            signature={result.signature}
            orb={<MatchOrb score={result.score} className="size-56" />}
          />
          <button
            type="button"
            onClick={startOver}
            className="min-h-11 self-start rounded-xl border border-line px-5 font-semibold text-ink hover:bg-line/50"
          >
            Analyze another job
          </button>
        </>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-8">
          <ResumeInput value={resume} onChange={setResume} serverError={fieldError("resumeText")} />
          <JobInput value={job} onChange={setJob} serverError={fieldError("jobText")} />

          <div aria-live="polite">
            {generalError && (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-danger-soft p-4 text-danger">
                <p className="font-medium">{generalError.message}</p>
                {generalError.code !== "ip_limit" && generalError.code !== "global_limit" && (
                  <button
                    type="button"
                    onClick={() => submit()}
                    className="min-h-11 rounded-lg border border-danger px-4 font-semibold"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>

          {phase === "loading" ? (
            <LoadingSteps />
          ) : (
            <button
              type="submit"
              disabled={phase !== "input"}
              className="min-h-12 self-start rounded-xl bg-primary px-8 text-lg font-semibold text-primary-ink shadow-sm hover:opacity-90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Analyze
            </button>
          )}
        </form>
      )}
    </div>
  );
}
