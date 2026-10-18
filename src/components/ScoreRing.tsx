import type { Band } from "@/lib/scoring";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({ score, band }: { score: number; band: Band }) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="img"
        aria-label={`Match score ${clamped} out of 100, ${band}`}
        className="relative grid size-36 place-items-center"
      >
        <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="10" className="stroke-line" />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - clamped / 100)}
            className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <span aria-hidden="true" className="font-heading text-4xl font-bold tabular-nums text-ink">
          {clamped}
        </span>
      </div>
      <p className="font-heading text-base font-semibold text-ink">{band}</p>
    </div>
  );
}
