"use client";

import { useEffect, useRef } from "react";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function AuroraBackground({
  parallaxX = 0,
  parallaxY = 0,
}: {
  parallaxX?: number;
  parallaxY?: number;
}) {
  const reduced = useRef(prefersReducedMotion());

  useEffect(() => {
    reduced.current = prefersReducedMotion();
  }, []);

  const px = reduced.current ? 0 : parallaxX;
  const py = reduced.current ? 0 : parallaxY;

  return (
    <div
      className="gate-aurora-layer pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-pulse-void"
        style={{ background: "var(--pulse-void)" }}
      />
      <div
        className="absolute -inset-[20%] opacity-70"
        style={{
          transform: `translate(${px}px, ${py}px)`,
          transition: reduced.current ? "none" : "transform 0.15s ease-out",
          animation: reduced.current ? "none" : "aurora-drift 18s ease-in-out infinite",
        }}
      >
        <div
          className="absolute left-[10%] top-[15%] h-[55%] w-[50%] rounded-full blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, rgba(52, 211, 153, 0.35) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute right-[5%] top-[25%] h-[50%] w-[45%] rounded-full blur-[90px]"
          style={{
            background:
              "radial-gradient(circle, rgba(34, 211, 238, 0.3) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[10%] left-[25%] h-[45%] w-[40%] rounded-full blur-[80px]"
          style={{
            background:
              "radial-gradient(circle, rgba(192, 132, 252, 0.25) 0%, transparent 70%)",
          }}
        />
      </div>
    </div>
  );
}
