"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";
import { MESSAGES } from "@/lib/http";

/** Friendly fallback when a page fails to render (for example, the database is paused or unreachable). */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Only the digest reaches the browser in production; it matches the server log line.
    console.error(error instanceof Error && "digest" in error ? `error digest ${String(error.digest)}` : "page error");
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h1 className="font-heading text-2xl font-bold text-ink">Something went wrong</h1>
      <p role="alert" className="text-muted">
        {MESSAGES.busy}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-ink hover:opacity-90"
        >
          Try again
        </button>
        <Link href="/" className="min-h-11 content-center rounded-xl border border-line px-5 font-semibold text-ink hover:bg-line/50">
          Go to ResuMatch
        </Link>
      </div>
    </main>
  );
}
