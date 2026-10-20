import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";
import { SheetsBackground } from "@/components/SheetsBackground";
import { type Theme, ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

// next/font downloads the files at build time and serves them from this site (no third-party requests).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ResuMatch · Honest resume and job matching",
  description:
    "Compare your resume with a job posting. Get a match score computed from real evidence, honest suggestions and a tailored cover letter draft.",
  openGraph: {
    title: "ResuMatch",
    description: "See how your resume really matches the job, with evidence from your own resume.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "ResuMatch: see how your resume really matches the job",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#14130f" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // A theme picked with the header toggle; without one the CSS follows the device setting.
  const saved = (await cookies()).get("theme")?.value;
  const theme: Theme | null = saved === "light" || saved === "dark" ? saved : null;
  return (
    <html
      lang="en"
      data-theme={theme ?? undefined}
      className={`${inter.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full flex-col">
        <SheetsBackground />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <header className="relative z-10">
          <nav className="mx-auto flex w-full max-w-[1080px] items-center justify-between px-4 py-4" aria-label="Main">
            <Link href="/" className="flex min-h-11 items-center gap-2.5 font-heading text-xl font-extrabold text-ink">
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG mark */}
              <img src="/favicon.svg" alt="" width={32} height={32} className="size-8" />
              ResuMatch
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle initial={theme} />
              <Link
                href="/analyze"
                className="glass min-h-12 content-center rounded-xl border-[1.5px] border-line px-6 font-semibold text-ink hover:border-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Analyze
              </Link>
            </div>
          </nav>
        </header>
        <div id="main" className="relative z-10 flex flex-1 flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
