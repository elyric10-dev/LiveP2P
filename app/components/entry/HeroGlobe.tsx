"use client";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function HeroGlobe() {
  const reduced = prefersReducedMotion();

  return (
    <div
      className="gate-hero-globe pointer-events-none absolute left-1/2 top-[42%] z-[1] -translate-x-1/2 -translate-y-1/2"
      aria-hidden
    >
      <div
        className={`gate-globe-rotate relative ${reduced ? "" : "gate-globe-rotate--spin"}`}
      >
        <div className="gate-orbit-ring gate-orbit-ring--outer" />
        <div className="gate-orbit-ring gate-orbit-ring--inner" />

        <div className="gate-globe-sphere relative">
          <div className="gate-globe-glow gate-globe-glow--teal" />
          <div className="gate-globe-glow gate-globe-glow--purple" />
          <svg
            viewBox="0 0 320 320"
            className="gate-globe-svg h-[min(52vw,380px)] w-[min(52vw,380px)] sm:h-[min(45vw,420px)] sm:w-[min(45vw,420px)]"
          >
            <defs>
              <radialGradient id="globe-shade" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="rgba(0,255,204,0.35)" />
                <stop offset="45%" stopColor="rgba(0,100,120,0.15)" />
                <stop offset="100%" stopColor="rgba(75,0,130,0.4)" />
              </radialGradient>
              <clipPath id="globe-clip">
                <circle cx="160" cy="160" r="138" />
              </clipPath>
            </defs>
            <g clipPath="url(#globe-clip)">
              {Array.from({ length: 28 }, (_, row) =>
                Array.from({ length: 36 }, (_, col) => {
                  const lat = (row / 27) * Math.PI - Math.PI / 2;
                  const lng = (col / 35) * Math.PI * 2;
                  const x = 160 + Math.cos(lat) * Math.cos(lng) * 138;
                  const y = 160 + Math.cos(lat) * Math.sin(lng) * 138 * 0.92;
                  const vis = Math.cos(lat) * Math.cos(lng);
                  if (vis < 0.05) return null;
                  const isLand =
                    Math.sin(lat * 3 + lng * 2) * Math.cos(lng * 1.5) > 0.1;
                  if (!isLand) return null;
                  return (
                    <circle
                      key={`${row}-${col}`}
                      cx={x}
                      cy={y}
                      r={1.8}
                      fill={
                        lng < Math.PI
                          ? "rgba(0,255,204,0.85)"
                          : "rgba(138,43,226,0.85)"
                      }
                      opacity={0.4 + vis * 0.6}
                    />
                  );
                }),
              ).flat()}
            </g>
            <circle
              cx="160"
              cy="160"
              r="138"
              fill="url(#globe-shade)"
              opacity="0.55"
            />
            <circle
              cx="160"
              cy="160"
              r="138"
              fill="none"
              stroke="rgba(0,255,204,0.25)"
              strokeWidth="1"
            />
          </svg>
        </div>
      </div>

      <div className="gate-platform" />
    </div>
  );
}
