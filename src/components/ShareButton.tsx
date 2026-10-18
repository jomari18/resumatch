"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/ai/schema";
import { createShare } from "@/lib/client/api";
import { STORAGE_KEYS, safeSet } from "@/lib/client/storage";

type Props = { analysis: AnalysisResult; issuedAt: string; signature: string };

export const SHARE_NOTICE =
  "The link shows the original analysis and cover letter, not your edits. Anyone with the link can view it for 30 days.";

export function ShareButton({ analysis, issuedAt, signature }: Props) {
  const [state, setState] = useState<{ kind: "idle" | "busy" | "done" | "error"; url?: string; message?: string }>({
    kind: "idle",
  });

  async function share() {
    setState({ kind: "busy" });
    const result = await createShare({ analysis, issuedAt, signature });
    if (!result.ok) {
      setState({ kind: "error", message: result.error.message });
      return;
    }
    const { id, url, deleteToken } = result.data;
    if (deleteToken) safeSet("local", STORAGE_KEYS.deleteToken(id), deleteToken);
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      // The link is still shown below.
    }
    setState({ kind: "done", url, message: copied ? "Link copied to clipboard." : "Copy the link below." });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{SHARE_NOTICE}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={share}
          disabled={state.kind === "busy"}
          className="min-h-11 rounded-xl border border-primary px-5 font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
        >
          {state.kind === "busy" ? "Creating link…" : "Create share link"}
        </button>
        {state.url && (
          <a href={state.url} className="break-all font-medium text-primary underline underline-offset-4">
            {state.url}
          </a>
        )}
      </div>
      <p aria-live="polite" className={state.kind === "error" ? "text-sm text-danger" : "text-sm text-muted"}>
        {state.message}
      </p>
    </div>
  );
}
