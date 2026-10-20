"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { JobInput } from "@/components/JobInput";
import { LoadingSteps } from "@/components/LoadingSteps";
import { ResultsView } from "@/components/ResultsView";
import { ResumeInput } from "@/components/ResumeInput";
import { analyze, type AnalyzeResponse, type ApiError } from "@/lib/client/api";
import { STORAGE_KEYS, safeGet, safeRemove, safeSet } from "@/lib/client/storage";
import { MESSAGES } from "@/lib/http";
import { checkLength } from "@/lib/input";

type Phase = "input" | "loading" | "results";
type Field = "resumeText" | "jobText";

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

const prefersReducedMotion = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

export function AnalyzeApp() {
  const [resume, setResume] = useState("");
  const [job, setJob] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // After a failed submit every invalid field shows its message, and focus goes to the first one.
  const [showErrors, setShowErrors] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const inFlight = useRef(false);
  const justSubmitted = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Marks the form as interactive (used by E2E tests) and restores a result after a refresh.
    // Both can only happen after mount: the server has no sessionStorage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
    const saved = restore();
    if (saved) {
      setResult(saved);
      setPhase("results");
    }
  }, []);

  useEffect(() => {
    if (phase !== "results" || !justSubmitted.current) return;
    justSubmitted.current = false;
    // Move keyboard and screen-reader focus to the new content instead of leaving it on <body>.
    document.getElementById("results-title")?.focus();
    topRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }, [phase]);

  useEffect(() => {
    if (error && !error.field) alertRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (!focusRequest) return;
    // Next frame: a resume error first switches the resume panel back to the Paste tab.
    const frame = requestAnimationFrame(() =>
      formRef.current?.querySelector<HTMLTextAreaElement>('textarea[aria-invalid="true"]')?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [focusRequest]);

  function edit(field: Field, value: string) {
    if (field === "resumeText") setResume(value);
    else setJob(value);
    setError((current) => (current?.field === field ? null : current));
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (inFlight.current) return;
    const resumeCheck = checkLength("resume", resume);
    const jobCheck = checkLength("job", job);
    if (!resumeCheck.ok || !jobCheck.ok) {
      setShowErrors(true);
      setFocusRequest((n) => n + 1);
      if (!resumeCheck.ok) setError({ code: "invalid_input", message: resumeCheck.message, field: "resumeText" });
      else if (!jobCheck.ok) setError({ code: "invalid_input", message: jobCheck.message, field: "jobText" });
      return;
    }

    setShowErrors(false);
    inFlight.current = true;
    setError(null);
    setPhase("loading");
    try {
      const response = await analyze({ resumeText: resume, jobText: job });
      if (!response.ok) {
        setError(response.error);
        setPhase("input");
        return;
      }
      safeSet("session", STORAGE_KEYS.lastResult, JSON.stringify(response.data));
      justSubmitted.current = true;
      setResult(response.data);
      setPhase("results");
    } catch {
      setError({ code: "service_unavailable", message: MESSAGES.busy });
      setPhase("input");
    } finally {
      inFlight.current = false;
    }
  }

  function startOver() {
    safeRemove("session", STORAGE_KEYS.lastResult);
    setResult(null);
    setPhase("input");
  }

  const fieldError = (field: Field) =>
    error?.code === "invalid_input" && error.field === field ? error.message : undefined;
  const generalError = error && !(error.code === "invalid_input" && error.field) ? error : null;
  const loading = phase === "loading";

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
        <form ref={formRef} onSubmit={submit} noValidate data-ready={hydrated} className="flex flex-col gap-8">
          <ResumeInput
            value={resume}
            onChange={(v) => edit("resumeText", v)}
            serverError={fieldError("resumeText")}
            showErrors={showErrors}
          />
          <JobInput
            value={job}
            onChange={(v) => edit("jobText", v)}
            serverError={fieldError("jobText")}
            showErrors={showErrors}
          />

          <div aria-live="polite">
            {generalError && (
              <div
                ref={alertRef}
                role="alert"
                tabIndex={-1}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-danger-soft p-4 text-danger focus:outline-none"
              >
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

          <div className="flex flex-col gap-4">
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="min-h-12 self-start rounded-xl bg-primary px-8 text-lg font-semibold text-primary-ink shadow-sm hover:opacity-90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {loading ? "Analyzing…" : "Analyze"}
            </button>
            {loading && <LoadingSteps />}
          </div>
        </form>
      )}
    </div>
  );
}
