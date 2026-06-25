"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GateSideNav from "./entry/GateSideNav";
import GateStatsBar from "./entry/GateStatsBar";
import GlassPanel from "./entry/GlassPanel";
import PrivacyChips from "./entry/PrivacyChips";

type GatePhase = "idle" | "exiting";

const EXIT_MS = 700;
const SCROLL_HEIGHT_VH = 380;
const EARTH_THRESHOLD = 0.78;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function EntryGate({
  onEnter,
  onRequestLocation,
  onProgressChange,
}: {
  onEnter: () => void;
  onRequestLocation: () => void;
  onProgressChange: (progress: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<GatePhase>("idle");
  const [progress, setProgress] = useState(() => (prefersReducedMotion() ? 1 : 0));
  const [error, setError] = useState("");
  const onEnterRef = useRef(onEnter);
  const onRequestLocationRef = useRef(onRequestLocation);
  const onProgressChangeRef = useRef(onProgressChange);
  onEnterRef.current = onEnter;
  onRequestLocationRef.current = onRequestLocation;
  onProgressChangeRef.current = onProgressChange;

  const reduced = prefersReducedMotion();
  const earthReached = progress >= EARTH_THRESHOLD || reduced;

  const mapReveal = reduced
    ? 1
    : Math.min(1, Math.max(0, (progress - 0.38) / 0.5));

  const updateProgress = useCallback(() => {
    const el = scrollRef.current;
    if (!el || reduced) return;
    const max = el.scrollHeight - el.clientHeight;
    const p = max > 0 ? el.scrollTop / max : 0;
    const next = Math.min(1, Math.max(0, p));
    setProgress(next);
    onProgressChangeRef.current(next);
  }, [reduced]);

  useEffect(() => {
    if (reduced) {
      onProgressChangeRef.current(1);
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    updateProgress();
    el.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      el.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [reduced, updateProgress]);

  function finishEnter() {
    onEnterRef.current();
  }

  function enter() {
    if (phase !== "idle" || !earthReached) return;
    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support location access.");
      return;
    }
    setError("");
    // Must start geolocation on the click — browsers require a user gesture.
    onRequestLocationRef.current();
    if (reduced) {
      finishEnter();
      return;
    }
    setPhase("exiting");
    window.setTimeout(finishEnter, EXIT_MS);
  }

  return (
    <div
      className={`gate-root gate-root--cosmic fixed inset-0 z-40 ${
        phase === "exiting" ? "gate-root--exiting" : ""
      }`}
    >
      <div
        ref={scrollRef}
        className="gate-scroll-driver absolute inset-0 overflow-y-auto overflow-x-hidden"
        style={{ scrollbarWidth: "none" }}
      >
        <div
          className="relative"
          style={{ height: reduced ? "100vh" : `${SCROLL_HEIGHT_VH}vh` }}
        >
          <div className="sticky top-0 h-screen w-full overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0 z-[11]"
              style={{
                opacity: 1 - mapReveal * 0.85,
                background:
                  "radial-gradient(ellipse 75% 65% at 50% 50%, transparent 28%, rgba(10, 10, 35, 0.9) 100%)",
              }}
              aria-hidden
            />

            <GateSideNav />

            <div className="gate-flash pointer-events-none absolute inset-0 z-30 opacity-0" aria-hidden />
            <div className="gate-fade-overlay pointer-events-none absolute inset-0 z-50 bg-black opacity-0" aria-hidden />

            <div
              className={`relative z-20 flex min-h-full flex-col items-center justify-center px-4 pb-36 pt-16 transition-all duration-700 sm:pb-40 ${
                earthReached
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-6 opacity-0"
              }`}
            >
              <div className="gate-enter-item gate-enter-item--1 w-full max-w-md">
                <GlassPanel error={!!error}>
                  <div className="flex flex-col items-center gap-5 text-center sm:gap-6">
                    <h1 className="text-3xl font-bold tracking-[0.4em] text-white sm:text-4xl">
                      PULSE
                    </h1>
                    <p className="max-w-xs text-sm leading-relaxed text-[#A0A0A0] sm:max-w-sm">
                      A living globe of anonymous strangers. Drop onto the map
                      and connect.
                    </p>
                    <div className="w-full">
                      <button
                        type="button"
                        onClick={enter}
                        disabled={phase === "exiting"}
                        className="gate-enter-btn group flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold tracking-wider text-[#050510] transition hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70 sm:text-base"
                      >
                        ENTER THE GLOBE
                        <svg
                          className="h-4 w-4 transition group-hover:translate-x-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </button>
                      {error && (
                        <p className="mt-3 text-sm text-red-400" role="alert">
                          {error}
                        </p>
                      )}
                    </div>
                    <div className="w-full">
                      <PrivacyChips />
                    </div>
                  </div>
                </GlassPanel>
              </div>
            </div>

            <GateStatsBar earthReached={earthReached} />

            {!earthReached && !reduced && (
              <div className="gate-scroll-hint absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 text-[10px] tracking-[0.25em] text-zinc-400">
                <span>SCROLL INTO THE GLOBE</span>
                <svg
                  className="gate-scroll-chevron h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            )}

            <div
              className="absolute bottom-4 left-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/50 text-xs font-bold text-white backdrop-blur-md"
              aria-hidden
            >
              N
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
