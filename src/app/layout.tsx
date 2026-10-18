import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// next/font downloads the files at build time and serves them from this site (no third-party requests).
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ResuMatch · Honest resume and job matching",
  description:
    "Compare your resume with a job posting. Get a match score computed from real evidence, honest suggestions and a tailored cover letter draft.",
  openGraph: {
    title: "ResuMatch",
    description: "See how your resume matches the job, with evidence from your own resume.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ResuMatch: see how your resume matches the job" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <header className="border-b border-line bg-surface/80 backdrop-blur">
          <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6" aria-label="Main">
            <Link href="/" className="flex min-h-11 items-center gap-2 font-heading text-lg font-bold text-ink">
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG mark */}
              <img src="/favicon.svg" alt="" width={32} height={32} className="size-8" />
              ResuMatch
            </Link>
            <Link
              href="/analyze"
              className="min-h-11 content-center rounded-xl bg-primary px-4 font-semibold text-primary-ink hover:opacity-90"
            >
              Analyze
            </Link>
          </nav>
        </header>
        <div id="main" className="flex flex-1 flex-col">
          {children}
        </div>
        <footer className="border-t border-line">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:justify-between sm:px-6">
            <p>
              Built by{" "}
              <a className="font-medium text-ink underline underline-offset-4" href="https://jomaricandido.netlify.app">
                Jomari M. Candido
              </a>
              . A portfolio project; results are guidance, not a hiring decision.
            </p>
            <a className="font-medium text-ink underline underline-offset-4" href="https://github.com/jomari18/resumatch">
              Source on GitHub
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
