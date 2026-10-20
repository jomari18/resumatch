"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CountedTextarea } from "@/components/CountedTextarea";
import { normalizeText } from "@/lib/input";

type Tab = "paste" | "upload";
const TABS: { id: Tab; label: string }[] = [
  { id: "paste", label: "Paste text" },
  { id: "upload", label: "Upload PDF" },
];

const PDF_MESSAGES = {
  no_text: "We couldn't read text from this PDF. Paste your resume text instead.",
  other: "This PDF can't be opened here. Use a text-based PDF under 5 MB, or paste your resume.",
} as const;

type Props = { value: string; onChange: (value: string) => void; serverError?: string; showErrors?: boolean };

export function ResumeInput({ value, onChange, serverError, showErrors }: Props) {
  const baseId = useId();
  const [tab, setTab] = useState<Tab>("paste");
  const [status, setStatus] = useState<{ kind: "idle" | "reading" | "done" | "error"; message?: string }>({
    kind: "idle",
  });
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ paste: null, upload: null });

  useEffect(() => {
    // A resume error is shown in the Paste panel, so make that panel visible.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (serverError) setTab("paste");
  }, [serverError]);

  function select(next: Tab, focus = false) {
    setTab(next);
    if (focus) tabRefs.current[next]?.focus();
  }

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    const index = TABS.findIndex((t) => t.id === tab);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      select(TABS[(index + step + TABS.length) % TABS.length].id, true);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      select(TABS[e.key === "Home" ? 0 : TABS.length - 1].id, true);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setStatus({ kind: "reading", message: `Reading ${file.name}…` });
    let result: Awaited<ReturnType<typeof import("@/lib/pdf/extract-text").extractPdfText>>;
    try {
      const { extractPdfText } = await import("@/lib/pdf/extract-text");
      result = await extractPdfText(file);
    } catch {
      result = { ok: false, reason: "unreadable" };
    }
    if (!result.ok) {
      setStatus({ kind: "error", message: result.reason === "no_text" ? PDF_MESSAGES.no_text : PDF_MESSAGES.other });
      return;
    }
    onChange(normalizeText(result.text));
    setStatus({
      kind: "done",
      message: `Text extracted from ${file.name}. Check it below and fix anything that looks wrong.`,
    });
    select("paste");
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby={`${baseId}-heading`}>
      <h2 id={`${baseId}-heading`} className="font-heading text-lg font-semibold text-ink">
        1. Your resume
      </h2>
      <div
        role="tablist"
        aria-label="Resume input method"
        className="glass inline-flex w-fit rounded-xl border border-line p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            id={`${baseId}-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`${baseId}-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => select(t.id)}
            onKeyDown={onTabKey}
            className="min-h-11 rounded-lg px-4 text-sm font-semibold text-muted transition aria-selected:bg-ink aria-selected:text-bg focus-visible:outline-2 focus-visible:outline-primary"
          >
            {t.label}
          </button>
        ))}
      </div>

      <p aria-live="polite" className={status.kind === "error" ? "text-sm text-danger" : "text-sm text-muted"}>
        {status.message}
      </p>

      <div
        id={`${baseId}-panel-paste`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-paste`}
        hidden={tab !== "paste"}
      >
        <CountedTextarea
          kind="resume"
          label="Resume"
          value={value}
          onChange={onChange}
          placeholder="Paste the text of your resume here."
          rows={12}
          serverError={serverError}
          showErrors={showErrors}
        />
      </div>

      <div
        id={`${baseId}-panel-upload`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-upload`}
        hidden={tab !== "upload"}
        className="glass rounded-xl border-2 border-dashed border-line p-6 text-center"
      >
        <label htmlFor={`${baseId}-file`} className="flex cursor-pointer flex-col items-center gap-2">
          <span className="font-heading font-semibold text-ink">Choose a PDF resume</span>
          <span className="text-sm text-muted">
            Text-based PDF, up to 5 MB. The file is read on your device and never uploaded.
          </span>
        </label>
        <input
          id={`${baseId}-file`}
          type="file"
          accept="application/pdf,.pdf"
          className="mx-auto mt-4 block text-sm text-muted file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:font-semibold file:text-primary-ink"
          onChange={(e) => onFile(e.target.files?.[0])}
          disabled={status.kind === "reading"}
        />
      </div>
    </section>
  );
}
