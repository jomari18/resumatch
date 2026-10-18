const PRIMARY = [0x0f, 0x76, 0x6e] as const; // #0F766E
const ACCENT = [0xf5, 0x9e, 0x0b] as const; // #F59E0B

const hex = (rgb: readonly number[]) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;

/** Orb color for a score: amber at 0 → teal at 100 (linear RGB); the brand primary when there is no score. */
export function orbColorFor(score: number | null): string {
  if (score === null) return hex(PRIMARY);
  const t = Math.max(0, Math.min(100, score)) / 100;
  return hex(ACCENT.map((a, i) => a + (PRIMARY[i] - a) * t));
}
