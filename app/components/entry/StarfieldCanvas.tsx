"use client";

import { useEffect, useRef } from "react";

const STAR_COUNT = 60;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function StarfieldCanvas({
  parallaxX = 0,
  parallaxY = 0,
}: {
  parallaxX?: number;
  parallaxY?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parallaxRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    parallaxRef.current = { x: parallaxX, y: parallaxY };
  }, [parallaxX, parallaxY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = prefersReducedMotion();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      a: Math.random() * 0.5 + 0.2,
      twinkle: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    let w = 0;
    let h = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(now: number) {
      if (!ctx || w === 0) return;
      const { x: px, y: py } = parallaxRef.current;
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        const tw = reduced
          ? s.a
          : s.a * (0.7 + 0.3 * Math.sin(now * 0.001 + s.twinkle));
        ctx.beginPath();
        ctx.arc(
          s.x * w + px * (0.3 + s.y),
          s.y * h + py * (0.3 + s.x),
          s.r,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${tw})`;
        ctx.fill();
      }
    }

    function tick(now: number) {
      if (document.hidden) {
        raf = requestAnimationFrame(tick);
        return;
      }
      draw(now);
      if (!reduced) raf = requestAnimationFrame(tick);
    }

    resize();
    draw(0);
    if (!reduced) raf = requestAnimationFrame(tick);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
