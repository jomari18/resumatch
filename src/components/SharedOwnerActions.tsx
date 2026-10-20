"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { deleteShare } from "@/lib/client/api";
import { STORAGE_KEYS, safeGet, safeRemove } from "@/lib/client/storage";

type Phase = "idle" | "confirm" | "busy" | "deleted";

const button = "min-h-11 rounded-xl px-4 font-semibold disabled:opacity-60";

/** Shown only in the browser that created the link (it holds the delete token). */
export function SharedOwnerActions({ id }: { id: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string>();
  const deleteRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // localStorage is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(safeGet("local", STORAGE_KEYS.deleteToken(id)));
  }, [id]);

  useEffect(() => {
    // Keep keyboard focus on the control that replaced the one just pressed.
    if (phase === "confirm") cancelRef.current?.focus();
    if (phase === "deleted") doneRef.current?.focus();
  }, [phase]);

  if (!token) return null;

  function cancel() {
    setPhase("idle");
    requestAnimationFrame(() => deleteRef.current?.focus());
  }

  async function remove() {
    if (!token) return;
    setPhase("busy");
    setError(undefined);
    const result = await deleteShare(id, token);
    if (!result.ok && result.error.code !== "not_found") {
      setError(result.error.message);
      setPhase("idle");
      return;
    }
    safeRemove("local", STORAGE_KEYS.deleteToken(id));
    setPhase("deleted");
  }

  if (phase === "deleted") {
    return (
      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl border border-line p-4">
        <p ref={doneRef} tabIndex={-1} role="status" className="text-sm font-semibold text-ink focus:outline-none">
          Link deleted. Anyone who opens it now sees a not-found page.
        </p>
        <Link href="/" className="text-sm font-semibold text-primary underline underline-offset-4">
          Go to ResuMatch
        </Link>
      </div>
    );
  }

  return (
    <div className="glass flex flex-wrap items-center gap-3 rounded-2xl border border-line p-4">
      {phase === "idle" ? (
        <>
          <p className="text-sm text-muted">You created this link. Delete it to remove the shared result now.</p>
          <button
            ref={deleteRef}
            type="button"
            onClick={() => setPhase("confirm")}
            className={`${button} border border-danger text-danger hover:bg-danger-soft`}
          >
            Delete link
          </button>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-ink">Delete this link? This can&apos;t be undone.</p>
          <button
            type="button"
            onClick={remove}
            disabled={phase === "busy"}
            className={`${button} bg-danger text-bg hover:opacity-90`}
          >
            {phase === "busy" ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={cancel}
            disabled={phase === "busy"}
            className={`${button} border border-line text-ink hover:border-ink`}
          >
            Cancel
          </button>
        </>
      )}
      <p aria-live="polite" className="text-sm text-danger">
        {error}
      </p>
    </div>
  );
}
