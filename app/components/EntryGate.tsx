"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import GateFeaturesSection from "./entry/GateFeaturesSection";
import GateSideNav from "./entry/GateSideNav";
import GateStatsBar from "./entry/GateStatsBar";
import GlassPanel from "./entry/GlassPanel";
import PrivacyChips from "./entry/PrivacyChips";
import type { GateFeatureId } from "@/lib/gate-features";

type GatePhase = "idle" | "exiting";

const EXIT_MS = 700;
/** Scroll distance for Milky Way → globe → enter. */
const COSMIC_SCROLL_VH = 320;
/** Extra scroll after enter for the features list. */
const FEATURES_SCROLL_VH = 420;
const EARTH_THRESHOLD = 0.62;

/** Scroll progress for the enter-globe screen (exported for return-home). */
export const GATE_ENTER_PROGRESS = EARTH_THRESHOLD;

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
  scrollToEnterOnMount = false,
  onEnterScrollApplied,
}: {
  onEnter: () => void;
  onRequestLocation: () => void;
  onProgressChange: (progress: number) => void;
  scrollToEnterOnMount?: boolean;
  onEnterScrollApplied?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const enterScrollAppliedRef = useRef(false);
  const onEnterScrollAppliedRef = useRef(onEnterScrollApplied);
  onEnterScrollAppliedRef.current = onEnterScrollApplied;
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const reduced = prefersReducedMotion();
  const startAtEnter = scrollToEnterOnMount || reduced;
  const [phase, setPhase] = useState<GatePhase>("idle");
  const [progress, setProgress] = useState(() => (startAtEnter ? EARTH_THRESHOLD : 0));
  const [featuresSlide, setFeaturesSlide] = useState(0);
  const [inFeatures, setInFeatures] = useState(false);
  const [activeFeature, setActiveFeature] = useState<GateFeatureId | null>(() =>
    scrollToEnterOnMount ? "map" : null,
  );
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(() => !scrollToEnterOnMount || reduced);
  const onEnterRef = useRef(onEnter);
  const onRequestLocationRef = useRef(onRequestLocation);
  const onProgressChangeRef = useRef(onProgressChange);
  onEnterRef.current = onEnter;
  onRequestLocationRef.current = onRequestLocation;
  onProgressChangeRef.current = onProgressChange;

  const enterPeek = reduced
    ? 1
    : Math.min(1, Math.max(0, (progress - (EARTH_THRESHOLD - 0.14)) / 0.14));
  /** Enter card is clickable once it is visibly on screen (before full earth threshold). */
  const enterReady = reduced || enterPeek >= 0.4;

  const mapReveal = reduced
    ? 1
    : Math.min(1, Math.max(0, (progress - 0.32) / 0.52));

  const getHeights = useCallback(() => {
    const vhUnit = typeof window !== "undefined" ? window.innerHeight / 100 : 0;
    const cosmicPx = COSMIC_SCROLL_VH * vhUnit;
    const featuresPx = FEATURES_SCROLL_VH * vhUnit;
    const viewport = scrollRef.current?.clientHeight ?? vhUnit * 100;
    const cosmicMax = Math.max(0, cosmicPx - viewport);
    const totalMax = Math.max(0, cosmicPx + featuresPx - viewport);
    return { cosmicMax, totalMax, featuresPx };
  }, []);

  const updateScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || reduced) return;

    const { cosmicMax, totalMax } = getHeights();
    const scrollTop = el.scrollTop;

    const cosmicProgress =
      cosmicMax > 0 ? Math.min(1, Math.max(0, scrollTop / cosmicMax)) : 1;

    const postEarth =
      cosmicProgress >= EARTH_THRESHOLD
        ? Math.min(
            1,
            (cosmicProgress - EARTH_THRESHOLD) / (1 - EARTH_THRESHOLD),
          )
        : 0;

    const pastCosmic = scrollTop > cosmicMax + 4;
    const featuresProgress = pastCosmic
      ? Math.min(1, (scrollTop - cosmicMax) / Math.max(1, totalMax - cosmicMax))
      : 0;

    setProgress(cosmicProgress);
    setFeaturesSlide(Math.max(postEarth, pastCosmic ? 1 : 0));
    setInFeatures(postEarth > 0.08 || pastCosmic);
    onProgressChangeRef.current(cosmicProgress);
    void featuresProgress;
  }, [reduced, getHeights]);

  useEffect(() => {
    if (reduced) {
      onProgressChangeRef.current(1);
      setFeaturesSlide(1);
      setInFeatures(true);
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    updateScroll();
    el.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      el.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, [reduced, updateScroll]);

  useLayoutEffect(() => {
    if (!scrollToEnterOnMount || reduced || enterScrollAppliedRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    enterScrollAppliedRef.current = true;
    const { cosmicMax } = getHeights();
    el.scrollTop = cosmicMax * EARTH_THRESHOLD;
    updateScroll();
    onProgressChangeRef.current(EARTH_THRESHOLD);
    onEnterScrollAppliedRef.current?.();
    requestAnimationFrame(() => setRevealed(true));
  }, [scrollToEnterOnMount, reduced, scrollEl, getHeights, updateScroll]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const observed: { el: HTMLElement; id: GateFeatureId }[] = [];
    const enterEl = document.getElementById("gate-enter");
    if (enterEl) observed.push({ el: enterEl, id: "map" });

    for (const id of ["connect", "chat", "privacy"] as const) {
      const el = document.getElementById(`gate-feature-${id}`);
      if (el) observed.push({ el, id });
    }
    if (!observed.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const match = observed.find((o) => o.el === visible.target);
        if (!match) return;
        if (match.id === "map") {
          const { cosmicMax } = getHeights();
          const cosmicProgress =
            cosmicMax > 0 ? root.scrollTop / cosmicMax : 1;
          if (cosmicProgress < EARTH_THRESHOLD) return;
        }
        setActiveFeature(match.id);
      },
      { threshold: [0.2, 0.45], root, rootMargin: "-12% 0px" },
    );

    observed.forEach(({ el }) => observer.observe(el));
    return () => observer.disconnect();
  }, [scrollEl, getHeights]);

  const scrollToEnter = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { cosmicMax } = getHeights();
    el.scrollTo({ top: cosmicMax * EARTH_THRESHOLD, behavior: "smooth" });
  }, [getHeights]);

  const scrollToFeature = useCallback(
    (id: GateFeatureId) => {
      if (id === "map") {
        scrollToEnter();
        return;
      }
      const el = scrollRef.current;
      if (!el) return;
      const target = document.getElementById(`gate-feature-${id}`);
      if (!target) return;
      const top = target.getBoundingClientRect().top + el.scrollTop - 24;
      el.scrollTo({ top, behavior: "smooth" });
    },
    [scrollToEnter],
  );

  function finishEnter() {
    onEnterRef.current();
  }

  function enter() {
    if (phase !== "idle" || !enterReady) return;
    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support location access.");
      return;
    }
    setError("");
    onRequestLocationRef.current();
    if (reduced) {
      finishEnter();
      return;
    }
    setPhase("exiting");
    window.setTimeout(finishEnter, EXIT_MS);
  }

  const enterOpacity = Math.max(0, 1 - featuresSlide * 1.35);
  const enterLift = featuresSlide * -72;
  const effectiveEnterOpacity = enterPeek * enterOpacity;
  const enterInteractive =
    enterReady && effectiveEnterOpacity > 0.25 && phase !== "exiting";

  return (
    <div
      className={`gate-root gate-root--cosmic fixed inset-0 z-40 ${
        phase === "exiting" ? "gate-root--exiting" : ""
      } ${scrollToEnterOnMount && revealed ? "gate-root--returning" : ""} ${
        scrollToEnterOnMount && !revealed ? "pointer-events-none opacity-0" : ""
      }`}
    >
      <GateSideNav
        activeId={activeFeature}
        onSelect={scrollToFeature}
        disabled={phase === "exiting"}
      />

      {!enterReady && !reduced && (
        <div className="gate-scroll-hint pointer-events-none fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] left-1/2 z-[46] flex -translate-x-1/2 flex-col items-center gap-1 text-[10px] tracking-[0.25em] text-zinc-400">
          <span>SCROLL INTO THE GLOBE</span>
          <svg
            className="gate-scroll-chevron h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      )}

      {enterReady && featuresSlide < 0.12 && !reduced && (
        <div className="gate-scroll-hint pointer-events-none fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] left-1/2 z-[46] flex -translate-x-1/2 flex-col items-center gap-1 text-[10px] tracking-[0.25em] text-[#00ffcc]">
          <span>KEEP SCROLLING — FEATURES</span>
          <svg
            className="gate-scroll-chevron h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      )}

      <div
        ref={(el) => {
          scrollRef.current = el;
          setScrollEl(el);
        }}
        className="gate-scroll-driver absolute inset-0 overflow-y-scroll overflow-x-hidden overscroll-y-contain"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        <div className="gate-scroll-track relative">
          <div
            className="relative"
            style={{ height: reduced ? "100vh" : `${COSMIC_SCROLL_VH}vh` }}
          >
            <div className="sticky top-0 h-[100dvh] min-h-0 w-full overflow-hidden">
              <div
                className="pointer-events-none absolute inset-0 z-[11]"
                style={{
                  opacity: inFeatures ? 0.35 : 1 - mapReveal * 0.85,
                  background: inFeatures
                    ? "linear-gradient(180deg, rgba(5,5,20,0.25) 0%, rgba(5,5,16,0.45) 100%)"
                    : "radial-gradient(ellipse 75% 65% at 50% 50%, transparent 28%, rgba(10, 10, 35, 0.9) 100%)",
                }}
                aria-hidden
              />

              <div
                id="gate-enter"
                className="relative z-20 flex min-h-full flex-col items-center justify-center px-4 pb-36 pt-16 sm:pb-40"
                style={{
                  opacity: effectiveEnterOpacity,
                  transform: `translateY(${enterLift + (1 - enterPeek) * 24}px)`,
                  pointerEvents: enterInteractive ? "auto" : "none",
                  transition: "transform 0.15s linear, opacity 0.15s linear",
                }}
              >
                <div
                  className={`gate-enter-item w-full max-w-md ${
                    scrollToEnterOnMount && revealed ? "gate-enter-item--return" : ""
                  }`}
                >
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

              <GateStatsBar earthReached={enterReady && featuresSlide < 0.2} />
            </div>
          </div>

          {!reduced && (
            <div
              className="gate-features-phase relative z-[30]"
              style={{ minHeight: `${FEATURES_SCROLL_VH}vh` }}
            >
              <GateFeaturesSection
                scrollRoot={scrollEl}
                onScrollToEnter={scrollToEnter}
              />
            </div>
          )}

          {reduced && (
            <div className="gate-features-phase relative z-[30]">
              <GateFeaturesSection
                scrollRoot={scrollEl}
                onScrollToEnter={scrollToEnter}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
