"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { SheetColors } from "@/components/FloatingSheets";
import { sheetCount } from "@/lib/sheets";

const FloatingSheets = dynamic(() => import("@/components/FloatingSheets"), {
  ssr: false,
});

function supportsWebGl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

function readColors(): SheetColors {
  const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return {
    sheet: css("--sheet"),
    line: css("--sheet-line"),
    accent: css("--accent"),
  };
}

/**
 * Decorative background of floating resume sheets behind every page. A static gradient is shown
 * on the server render, under reduced motion, and when WebGL is unavailable.
 */
export function SheetsBackground() {
  const pathname = usePathname();
  const [state, setState] = useState<{
    ok: boolean;
    wide: boolean;
    width: number;
    colors: SheetColors;
  } | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () =>
      setState({
        ok: !reduced.matches && supportsWebGl(),
        wide: window.innerWidth > 900,
        width: window.innerWidth,
        colors: readColors(),
      });
    update();
    reduced.addEventListener("change", update);
    dark.addEventListener("change", update);
    // The header toggle switches themes by setting data-theme on <html>.
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", update);
      dark.removeEventListener("change", update);
    };
  }, []);

  const count = state ? sheetCount(pathname === "/" ? "landing" : "app", state.width) : 0;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <div data-testid="sheets-fallback" className="sheets-fallback absolute inset-0" />
      {state?.ok && (
        <div className={pathname === "/" ? "absolute inset-0" : "absolute inset-0 opacity-60"}>
          <FloatingSheets
            key={`${count}-${state.colors.sheet}`}
            count={count}
            wide={state.wide}
            colors={state.colors}
          />
        </div>
      )}
      {/* Paper veil on the text side so copy stays readable where sheets drift behind it. */}
      <div className="sheets-veil absolute inset-0" />
    </div>
  );
}
