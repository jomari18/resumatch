"use client";

import { MeshDistortMaterial } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Mesh } from "three";

function Blob({ color }: { color: string }) {
  const mesh = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += delta * 0.25;
    mesh.current.rotation.x += delta * 0.08;
  });
  return (
    <mesh ref={mesh} scale={1.55}>
      <icosahedronGeometry args={[1, 24]} />
      <MeshDistortMaterial color={color} distort={0.32} speed={1.4} roughness={0.25} metalness={0.15} />
    </mesh>
  );
}

/** The WebGL orb. Loaded only through next/dynamic with ssr: false. */
export default function OrbCanvas({ color, onReady }: { color: string; onReady: () => void }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return (
    <div data-testid="orb-canvas" className="absolute inset-0">
      <Canvas
        dpr={[1, 1.5]}
        frameloop={hidden ? "never" : "always"}
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={onReady}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 5]} intensity={1.4} />
        <pointLight position={[-4, -2, -3]} intensity={0.9} color="#f59e0b" />
        <Blob color={color} />
      </Canvas>
    </div>
  );
}
