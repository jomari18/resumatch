"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import { makeSheets, type SheetSpec } from "@/lib/sheets";

export type SheetColors = { sheet: string; line: string; accent: string };

function Sheet({ spec, colors, xScale }: { spec: SheetSpec; colors: SheetColors; xScale: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.y += 0.002 * spec.speed * 10;
    g.rotation.x += 0.0008;
    g.position.y = spec.y + Math.sin(clock.getElapsedTime() * spec.speed + spec.phase) * 0.5;
  });
  return (
    <group ref={ref} position={[spec.x * xScale, spec.y, spec.z]} rotation={spec.rotation}>
      <mesh>
        <boxGeometry args={[2.2, 3, 0.05]} />
        <meshStandardMaterial color={colors.sheet} roughness={0.9} />
      </mesh>
      {spec.lines.map((line, r) => (
        <mesh key={r} position={[0, 1.05 - r * 0.4, 0.04]} scale={[line.width, 1, 1]}>
          <planeGeometry args={[1.5, 0.12]} />
          <meshBasicMaterial color={line.highlight ? colors.accent : colors.line} />
        </mesh>
      ))}
    </group>
  );
}

/** Follows the pointer and scroll position, easing toward them each frame (from the design mockup). */
function Parallax({ children }: { children: React.ReactNode }) {
  const group = useRef<Group>(null);
  const target = useRef({ x: 0, y: 0, scroll: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = e.clientX / window.innerWidth - 0.5;
      target.current.y = e.clientY / window.innerHeight - 0.5;
    };
    const onScroll = () => {
      target.current.scroll = window.scrollY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += (target.current.x * 0.4 - g.rotation.y) * 0.03;
    g.rotation.x += (target.current.y * 0.25 - g.rotation.x) * 0.03;
    g.position.y = target.current.scroll * 3;
  });
  return <group ref={group}>{children}</group>;
}

/** Pulls sheets toward the centre on portrait screens so some stay in view on phones. */
function Sheets({ sheets, colors }: { sheets: SheetSpec[]; colors: SheetColors }) {
  const aspect = useThree((s) => s.viewport.aspect);
  const xScale = Math.min(1, Math.max(0.45, aspect / 1.4));
  return (
    <>
      {sheets.map((spec, i) => (
        <Sheet key={i} spec={spec} colors={colors} xScale={xScale} />
      ))}
    </>
  );
}

function PauseWhenHidden() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    const update = () => setFrameloop(document.hidden ? "never" : "always");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [setFrameloop]);
  return null;
}

/** The WebGL scene. Loaded only through next/dynamic with ssr: false. */
export default function FloatingSheets({ count, wide, colors }: { count: number; wide: boolean; colors: SheetColors }) {
  const sheets = useMemo(() => makeSheets(count, 2026, wide), [count, wide]);
  return (
    <div data-testid="sheets-canvas" className="absolute inset-0">
      {/* flat: no tone mapping, so sheet colours match the CSS palette like the design mockup */}
      <Canvas flat camera={{ position: [0, 0, 14], fov: 45 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        {/* three r155+ uses physical light units; x PI matches the legacy (r128) brightness of the mockup */}
        <ambientLight intensity={0.75 * Math.PI} />
        <directionalLight position={[4, 6, 8]} intensity={0.7 * Math.PI} />
        <PauseWhenHidden />
        <Parallax>
          <Sheets sheets={sheets} colors={colors} />
        </Parallax>
      </Canvas>
    </div>
  );
}
