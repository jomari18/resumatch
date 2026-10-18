import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { MatchOrb } from "@/components/MatchOrb";
import { ResultsView } from "@/components/ResultsView";
import { SharedOwnerActions } from "@/components/SharedOwnerActions";
import { getServerConfig } from "@/lib/config";
import { loadShared } from "@/lib/shared";
import { getStores } from "@/lib/store";

export const metadata: Metadata = {
  title: "Shared result · ResuMatch",
  robots: { index: false, follow: false },
};

const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" });

export default async function SharedPage({ params }: PageProps<"/r/[id]">) {
  await connection();
  const { id } = await params;
  const { shares } = await getStores(getServerConfig());
  const view = await loadShared(id, shares);
  if (!view) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-muted">Shared result · expires {dateFormat.format(new Date(view.expiresAt))}</p>
      <SharedOwnerActions id={id} />
      <ResultsView
        mode="shared"
        analysis={view.result}
        score={view.score}
        band={view.band}
        orb={<MatchOrb score={view.score} className="size-56" />}
      />
    </main>
  );
}
