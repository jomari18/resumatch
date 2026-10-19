export type SheetSpec = {
  x: number;
  y: number;
  z: number;
  rotation: [number, number, number];
  speed: number;
  phase: number;
  /** One entry per text line on the sheet: its width scale and whether it is a highlighted line. */
  lines: { width: number; highlight: boolean }[];
};

/** The landing page gets the full scene; app pages get a calmer one so reading stays easy. */
export function sheetCount(page: "landing" | "app", viewportWidth: number): number {
  if (page === "app") return 6;
  return viewportWidth < 700 ? 8 : 14;
}

/** Small deterministic PRNG so the scene is stable across renders. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sheets alternate left/right and stay at least 3 units from the centre; wide screens shift right. */
export function makeSheets(count: number, seed: number, wide: boolean): SheetSpec[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    return {
      x: side * (3 + rand() * 7) + (wide ? 2 : 0),
      y: (rand() - 0.5) * 12,
      z: -rand() * 10 - 1,
      rotation: [rand() * 0.6, rand() * Math.PI, rand() * 0.6],
      speed: 0.1 + rand() * 0.25,
      phase: rand() * 6,
      lines: Array.from({ length: 6 }, () => {
        const highlight = rand() < 0.3;
        return { width: highlight ? 1 : 0.6 + rand() * 0.4, highlight };
      }),
    };
  });
}
