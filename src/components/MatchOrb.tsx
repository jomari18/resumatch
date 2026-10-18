"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { OrbFallback } from "@/components/OrbFallback";
import { orbColorFor } from "@/lib/orb-color";

const OrbCanvas = dynamic(() => import("@/components/OrbCanvas"), { ssr: false });

function supportsWebGl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Decorative 3D orb. The SVG fallback shows until the canvas is ready, and stays
 * when the user prefers reduced motion or WebGL is unavailable.
 */
export function MatchOrb({ score, className = "size-72" }: { score: number | null; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [allowed, setAllowed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const color = orbColorFor(score);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setAllowed(!reduced.matches && supportsWebGl());
    decide();
    reduced.addEventListener("change", decide);

    const node = ref.current;
    const observer = node ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting)) : null;
    if (node && observer) observer.observe(node);
    return () => {
      reduced.removeEventListener("change", decide);
      observer?.disconnect();
    };
  }, []);

  const showCanvas = allowed && visible;

  return (
    <div ref={ref} aria-hidden="true" className={`relative ${className}`}>
      {!(showCanvas && ready) && <OrbFallback color={color} />}
      {showCanvas && <OrbCanvas color={color} onReady={() => setReady(true)} />}
    </div>
  );
}
