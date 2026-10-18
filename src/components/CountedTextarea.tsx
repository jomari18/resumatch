"use client";

import { useId, useState } from "react";
import { LIMITS, checkLength } from "@/lib/input";

type Props = {
  kind: "resume" | "job";
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  serverError?: string;
};

/** Labelled textarea with a live counter; the length message appears after the first blur. */
export function CountedTextarea({ kind, label, value, onChange, placeholder, rows = 10, serverError }: Props) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const check = checkLength(kind, value);
  const message = serverError ?? (touched && !check.ok ? check.message : null);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-heading text-sm font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={message ? true : undefined}
        aria-describedby={`${id}-count${message ? ` ${id}-error` : ""}`}
        className="w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink shadow-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 aria-invalid:border-danger"
      />
      <div className="flex items-start justify-between gap-4 text-sm">
        <p id={`${id}-error`} className="text-danger" role={message ? "alert" : undefined}>
          {message}
        </p>
        <p id={`${id}-count`} className="shrink-0 tabular-nums text-muted">
          {value.length.toLocaleString("en-US")} / {LIMITS[kind].max.toLocaleString("en-US")}
        </p>
      </div>
    </div>
  );
}
