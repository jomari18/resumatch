"use client";

import { CountedTextarea } from "@/components/CountedTextarea";

type Props = { value: string; onChange: (value: string) => void; serverError?: string; showErrors?: boolean };

export function JobInput({ value, onChange, serverError, showErrors }: Props) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-semibold text-ink">2. The job posting</h2>
      <CountedTextarea
        kind="job"
        label="Job posting"
        value={value}
        onChange={onChange}
        placeholder="Paste the full job posting, including requirements."
        rows={10}
        serverError={serverError}
        showErrors={showErrors}
      />
    </section>
  );
}
