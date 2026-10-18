import type { Metadata } from "next";
import { connection } from "next/server";
import { AnalyzeApp } from "@/components/AnalyzeApp";

export const metadata: Metadata = {
  title: "Analyze your resume · ResuMatch",
  description: "Compare your resume with a job posting and get an honest match score and cover letter draft.",
};

export default async function AnalyzePage() {
  await connection();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold text-ink sm:text-4xl">Analyze your resume</h1>
        <p className="max-w-2xl text-muted">
          Paste or upload your resume, paste the job posting, and get a match score with evidence from your own resume.
          Nothing you enter is stored unless you create a share link.
        </p>
      </header>
      <AnalyzeApp />
    </main>
  );
}
