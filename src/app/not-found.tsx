import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <p className="font-heading text-6xl font-bold text-primary">404</p>
      <h1 className="font-heading text-2xl font-bold text-ink">This page doesn&apos;t exist or has expired.</h1>
      <p className="text-muted">Shared results are deleted after 30 days, or earlier by the person who created them.</p>
      <Link
        href="/"
        className="min-h-11 content-center rounded-xl bg-primary px-5 font-semibold text-primary-ink hover:opacity-90"
      >
        Go to ResuMatch
      </Link>
    </main>
  );
}
