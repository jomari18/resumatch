import Link from "next/link";
import { connection } from "next/server";
import { MatchOrb } from "@/components/MatchOrb";

const FEATURES = [
  {
    title: "Evidence, not guesses",
    body: "Every matched requirement comes with a quote from your own resume. Quotes that can't be found word-for-word are flagged and scored lower.",
  },
  {
    title: "A score you can trust",
    body: "The AI lists the job's requirements; the score is calculated by code from that list, so the same analysis always gives the same number.",
  },
  {
    title: "Private by default",
    body: "Your PDF is read on your device. Resume text is never stored. Share links are optional and expire after 30 days.",
  },
];

export default async function Home() {
  await connection();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16">
      <section className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-6">
          <p className="w-fit rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
            For fresh graduates and job seekers
          </p>
          <h1 className="font-heading text-4xl font-bold leading-tight text-ink sm:text-5xl">
            See how your resume really matches the job.
          </h1>
          <p className="max-w-xl text-lg text-muted">
            Paste a job posting and your resume. ResuMatch shows which requirements you meet, with proof from your resume,
            gives honest suggestions, and drafts a cover letter that only uses facts you actually have.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/analyze"
              className="min-h-12 content-center rounded-xl bg-primary px-6 text-lg font-semibold text-primary-ink shadow-sm hover:opacity-90"
            >
              Analyze my resume
            </Link>
            <a href="#how" className="min-h-12 content-center rounded-xl border border-line px-6 font-semibold text-ink hover:bg-line/50">
              How it works
            </a>
          </div>
          <p className="text-sm text-muted">Free · No account · 10 analyses per day</p>
        </div>
        <div className="grid place-items-center">
          <MatchOrb score={null} className="size-64 sm:size-80" />
        </div>
      </section>

      <section id="how" className="flex scroll-mt-20 flex-col gap-6">
        <h2 className="font-heading text-2xl font-bold text-ink">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-6 shadow-sm">
              <h3 className="font-heading text-lg font-semibold text-ink">{f.title}</h3>
              <p className="text-muted">{f.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
