import Link from "next/link";
import { connection } from "next/server";

const FEATURES = [
  {
    title: "Evidence, not guesses",
    body: "Every matched requirement quotes your own resume. Quotes that can't be found word-for-word are flagged and scored lower.",
  },
  {
    title: "A score you can trust",
    body: "The AI lists the job's requirements. Code calculates the score, so the same analysis always gives the same number.",
  },
  {
    title: "Private by default",
    body: "Your PDF is read on your device and resume text is never stored. Share links are optional and expire in 30 days.",
  },
];

export default async function Home() {
  await connection();
  return (
    <main className="mx-auto w-full max-w-[1080px] px-4">
      <section className="max-w-[620px] pb-[10vh] pt-[12vh]">
        <span className="glass mb-4 inline-block rounded-full border border-line px-3 py-1 text-sm text-muted">
          For fresh graduates and job seekers
        </span>
        <h1 className="mb-4 max-w-[15ch] font-heading text-[clamp(2.25rem,6vw,4rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">
          See how your resume <mark className="highlight">really</mark> matches the job.
        </h1>
        <p className="max-w-[52ch] text-lg text-muted">
          Paste a job posting and your resume. ResuMatch shows which requirements you meet, with proof from your resume,
          gives honest suggestions, and drafts a cover letter that only uses facts you actually have.
        </p>
        <div className="mb-3 mt-6 flex flex-wrap gap-3">
          <Link
            href="/analyze"
            className="min-h-12 content-center rounded-xl bg-primary px-6 font-semibold text-primary-ink hover:opacity-90 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Analyze my resume
          </Link>
          <a
            href="#how"
            className="glass min-h-12 content-center rounded-xl border-[1.5px] border-line px-6 font-semibold text-ink hover:border-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            How it works
          </a>
        </div>
        <p className="text-sm text-muted">Free · No account · 10 analyses per day</p>
      </section>

      <section id="how" aria-labelledby="how-title" className="scroll-mt-20 pb-12">
        <h2 id="how-title" className="sr-only">
          How it works
        </h2>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {FEATURES.map((f) => (
            <article key={f.title} className="glass rounded-2xl border border-line p-6">
              <h3 className="mb-2 font-heading text-lg font-bold text-ink">{f.title}</h3>
              <p className="text-muted">{f.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
