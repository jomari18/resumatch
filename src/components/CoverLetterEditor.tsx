"use client";

import { useId, useState } from "react";

type Props = { initial: string; readOnly?: boolean };

/** Edits stay on this device; shared links always show the original letter. */
export function CoverLetterEditor({ initial, readOnly = false }: Props) {
  const id = useId();
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied to clipboard.");
    } catch {
      setStatus("Copy failed. Select the text and copy it manually.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="sr-only">
        Cover letter
      </label>
      <textarea
        id={id}
        value={text}
        readOnly={readOnly}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        className="w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 leading-relaxed text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Copy
        </button>
        {!readOnly && text !== initial && (
          <button
            type="button"
            onClick={() => setText(initial)}
            className="min-h-11 rounded-xl border border-line px-5 font-semibold text-ink hover:bg-line/50"
          >
            Reset to original
          </button>
        )}
        <p aria-live="polite" className="text-sm text-muted">
          {status}
        </p>
      </div>
    </div>
  );
}
