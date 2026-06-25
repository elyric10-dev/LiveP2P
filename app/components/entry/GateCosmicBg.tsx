"use client";

import StarfieldCanvas from "./StarfieldCanvas";

export default function GateCosmicBg({
  parallaxX = 0,
  parallaxY = 0,
}: {
  parallaxX?: number;
  parallaxY?: number;
}) {
  return (
    <div className="gate-cosmic-bg pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-[#050510]" />
      <div className="gate-nebula gate-nebula--teal" />
      <div className="gate-nebula gate-nebula--purple" />
      <StarfieldCanvas parallaxX={parallaxX} parallaxY={parallaxY} />
    </div>
  );
}
