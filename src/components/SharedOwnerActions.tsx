"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteShare } from "@/lib/client/api";
import { STORAGE_KEYS, safeGet, safeRemove } from "@/lib/client/storage";

/** Shown only in the browser that created the link (it holds the delete token). */
export function SharedOwnerActions({ id }: { id: string }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<{ busy: boolean; message?: string }>({ busy: false });

  useEffect(() => {
    // localStorage is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(safeGet("local", STORAGE_KEYS.deleteToken(id)));
  }, [id]);

  if (!token) return null;

  async function remove() {
    if (!token) return;
    setState({ busy: true });
    const result = await deleteShare(id, token);
    if (!result.ok && result.error.code !== "not_found") {
      setState({ busy: false, message: result.error.message });
      return;
    }
    safeRemove("local", STORAGE_KEYS.deleteToken(id));
    router.push("/");
  }

  return (
    <div className="flex flex-wrap items-center gap-3 glass rounded-2xl border border-line p-4">
      <p className="text-sm text-muted">You created this link. Delete it to remove the shared result now.</p>
      <button
        type="button"
        onClick={remove}
        disabled={state.busy}
        className="min-h-11 rounded-xl border border-danger px-4 font-semibold text-danger hover:bg-danger-soft disabled:opacity-60"
      >
        {state.busy ? "Deleting…" : "Delete link"}
      </button>
      <p aria-live="polite" className="text-sm text-danger">
        {state.message}
      </p>
    </div>
  );
}
