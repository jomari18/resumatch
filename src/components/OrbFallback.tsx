/** Static orb used while the 3D chunk loads, under reduced motion, or without WebGL. */
export function OrbFallback({ color }: { color: string }) {
  return (
    <svg data-testid="orb-fallback" viewBox="0 0 200 200" className="size-full" aria-hidden="true">
      <defs>
        <radialGradient id="orb-fill" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="35%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </radialGradient>
        <radialGradient id="orb-glow" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="url(#orb-glow)" />
      <circle cx="100" cy="100" r="72" fill="url(#orb-fill)" />
    </svg>
  );
}
