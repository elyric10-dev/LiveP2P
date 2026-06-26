"use client";

import { useEffect, useRef, useState } from "react";
import GateFeatureBackdrop, {
  type FeatureScrollMotion,
} from "./GateFeatureBackdrop";
import GateFeatureIllustration from "./GateFeatureIllustration";
import { GATE_FEATURES, type GateFeature } from "@/lib/gate-features";

function computeMotion(el: HTMLElement, root: HTMLElement): FeatureScrollMotion {
  const rootRect = root.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const range = rect.height + rootRect.height;
  const progress = Math.max(0, Math.min(1, (rootRect.height - rect.top) / range));
  const center = rect.top + rect.height / 2;
  const rootCenter = rootRect.top + rootRect.height / 2;
  const shift = Math.max(-1, Math.min(1, (center - rootCenter) / (rootRect.height * 0.45)));
  return { progress, shift };
}

function FeatureBlock({
  feature,
  reverse,
  scrollRoot,
}: {
  feature: GateFeature;
  reverse: boolean;
  scrollRoot: HTMLElement | null;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [motion, setMotion] = useState<FeatureScrollMotion>({ progress: 0, shift: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.08, root: scrollRoot, rootMargin: "10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => {
    const el = ref.current;
    const root = scrollRoot;
    if (!el || !root) return;

    const onScroll = () => setMotion(computeMotion(el, root));
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      root.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [scrollRoot]);

  const contentLift = motion.shift * -32;
  const visualTilt = motion.shift * 4;
  const visualScale = 0.92 + motion.progress * 0.1;

  return (
    <article
      ref={ref}
      id={`gate-feature-${feature.id}`}
      className={`gate-feature-block relative min-h-[100vh] overflow-hidden ${
        visible ? "gate-feature-block--visible" : ""
      }`}
    >
      <GateFeatureBackdrop id={feature.id} active motion={motion} />

      <div
        className="relative z-10 flex min-h-[inherit] items-center px-4 py-20 sm:px-8 sm:py-24"
        style={{
          transform: `translateY(${contentLift}px)`,
          transition: "transform 0.08s linear",
        }}
      >
        <div
          className={`mx-auto flex w-full max-w-5xl flex-col items-center gap-10 lg:gap-14 ${
            reverse ? "lg:flex-row-reverse" : "lg:flex-row"
          }`}
        >
          <div
            className="gate-feature-visual w-full max-w-lg shrink-0 overflow-hidden rounded-2xl border border-white/20 shadow-2xl"
            style={{
              transform: `perspective(900px) rotateY(${reverse ? -visualTilt : visualTilt}deg) scale(${visualScale})`,
              transition: "transform 0.1s linear",
            }}
          >
            <div className="aspect-[16/10] w-full">
              <GateFeatureIllustration id={feature.id} animated={visible} />
            </div>
          </div>

          <div
            className="gate-feature-copy gate-feature-glass flex-1 rounded-2xl p-6 sm:p-9 lg:text-left"
            style={{
              transform: `translateX(${motion.shift * (reverse ? 16 : -16)}px)`,
              opacity: 0.7 + motion.progress * 0.3,
            }}
          >
            <p className="text-center text-xs font-semibold uppercase tracking-[0.35em] text-[#c8a0ff] lg:text-left">
              {feature.tagline}
            </p>
            <h3 className="mt-2 text-center text-2xl font-bold text-white sm:text-4xl lg:text-left">
              {feature.title}
            </h3>
            <p className="mt-4 text-center text-sm leading-relaxed text-[#e0e0f0] sm:text-base lg:text-left">
              {feature.summary}
            </p>
            <ul className="mt-6 space-y-3">
              {feature.points.map((point, i) => (
                <li
                  key={point}
                  className="gate-feature-point flex gap-3 text-sm text-zinc-100 sm:text-base"
                  style={{ transitionDelay: `${0.1 + i * 0.1}s` }}
                >
                  <span className="gate-feature-point-dot mt-2 shrink-0" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
}

function IntroSection({ scrollRoot }: { scrollRoot: HTMLElement | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState<FeatureScrollMotion>({ progress: 0.5, shift: 0 });

  useEffect(() => {
    const el = ref.current;
    const root = scrollRoot;
    if (!el || !root) return;
    const onScroll = () => setMotion(computeMotion(el, root));
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [scrollRoot]);

  return (
    <div ref={ref} className="gate-features-intro relative min-h-screen overflow-hidden">
      <GateFeatureBackdrop id="intro" active motion={motion} />
      <div
        className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-24 text-center"
        style={{ transform: `translateY(${motion.shift * -40}px)` }}
      >
        <p className="gate-features-intro-label text-[11px] font-bold uppercase tracking-[0.4em] text-[#00ffcc]">
          Features
        </p>
        <h2 className="mt-4 text-3xl font-bold text-white sm:text-5xl">
          What Pulse gives you
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base text-[#e8e8f8] sm:text-lg">
          Anonymous strangers on a living map — connect, chat, and vanish without
          a trace.
        </p>
        <svg
          className="gate-scroll-chevron mt-12 h-6 w-6 text-[#00ffcc]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export default function GateFeaturesSection({
  scrollRoot,
  onScrollToEnter,
}: {
  scrollRoot: HTMLElement | null;
  onScrollToEnter: () => void;
}) {
  return (
    <section className="gate-features-section relative" aria-label="Pulse features">
      <IntroSection scrollRoot={scrollRoot} />

      {GATE_FEATURES.map((feature, i) => (
        <FeatureBlock
          key={feature.id}
          feature={feature}
          reverse={i % 2 === 1}
          scrollRoot={scrollRoot}
        />
      ))}

      <div className="gate-features-footer relative min-h-[50vh] overflow-hidden px-4 pb-28 pt-16">
        <GateFeatureBackdrop id="privacy" active motion={{ progress: 0.5, shift: 0 }} />
        <div className="relative z-10 flex min-h-[40vh] flex-col items-center justify-center gap-5">
          <p className="text-base text-zinc-200">Ready to drop in?</p>
          <button
            type="button"
            onClick={onScrollToEnter}
            className="gate-enter-btn rounded-full px-10 py-3.5 text-sm font-bold tracking-wider text-[#050510] transition hover:brightness-110"
          >
            BACK TO ENTER
          </button>
        </div>
      </div>
    </section>
  );
}
