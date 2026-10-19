"use client";

import { useEffect, useState } from "react";

const STEPS = ["Reading resume", "Matching requirements", "Writing cover letter"];
const STEP_MS = 2500;

/** Purely visual progress while the single analyze request is in flight. */
export function LoadingSteps() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActive((i) => Math.min(i + 1, STEPS.length - 1)), STEP_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3 glass rounded-2xl border border-line p-6">
      <p className="sr-only">{STEPS[active]}…</p>
      <ol className="flex flex-col gap-3" aria-hidden="true">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-3">
            <span
              className={`grid size-7 place-items-center rounded-full text-sm font-bold ${
                i < active ? "bg-primary text-primary-ink" : i === active ? "animate-pulse bg-primary/20 text-primary" : "bg-line text-muted"
              }`}
            >
              {i < active ? "✓" : i + 1}
            </span>
            <span className={i <= active ? "font-medium text-ink" : "text-muted"}>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
