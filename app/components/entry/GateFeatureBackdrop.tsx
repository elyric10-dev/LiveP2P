import type { GateFeatureId } from "@/lib/gate-features";
import type { CSSProperties } from "react";

export type FeatureBackdropId = GateFeatureId | "intro";

export type FeatureScrollMotion = {
  /** 0 → entering viewport, 1 → leaving */
  progress: number;
  /** -1…1 centred on viewport */
  shift: number;
};

type Props = {
  id: FeatureBackdropId;
  active?: boolean;
  motion?: FeatureScrollMotion;
};

export default function GateFeatureBackdrop({
  id,
  active = true,
  motion = { progress: 0.5, shift: 0 },
}: Props) {
  const style = {
    "--feat-scroll": motion.progress,
    "--feat-shift": motion.shift,
  } as CSSProperties;

  return (
    <div
      className={`gate-feat-bg gate-feat-bg--${id} ${active ? "gate-feat-bg--active" : ""}`}
      style={style}
      aria-hidden
    >
      <div
        className="gate-feat-layer gate-feat-layer--far"
        style={{
          transform: `translateY(${motion.shift * -100}px) scale(${1 + motion.progress * 0.12})`,
        }}
      >
        {id === "intro" && <IntroFar />}
        {id === "map" && <MapFar />}
        {id === "connect" && <ConnectFar />}
        {id === "chat" && <ChatFar />}
        {id === "privacy" && <PrivacyFar />}
      </div>

      <div
        className="gate-feat-layer gate-feat-layer--mid"
        style={{
          transform: `translateY(${motion.shift * -55}px) translateX(${motion.shift * 20}px)`,
        }}
      >
        {id === "intro" && <IntroMid />}
        {id === "map" && <MapMid />}
        {id === "connect" && <ConnectMid />}
        {id === "chat" && <ChatMid />}
        {id === "privacy" && <PrivacyMid />}
      </div>

      <div
        className="gate-feat-layer gate-feat-layer--near"
        style={{
          transform: `translateY(${motion.shift * -25}px) scale(${1.05 - motion.progress * 0.05})`,
        }}
      >
        {id === "intro" && <IntroNear />}
        {id === "map" && <MapNear />}
        {id === "connect" && <ConnectNear />}
        {id === "chat" && <ChatNear />}
        {id === "privacy" && <PrivacyNear />}
      </div>

      <div className="gate-feat-bg-scrim" />
    </div>
  );
}

/* ── Intro ── */
function IntroFar() {
  return (
    <>
      <div className="gate-feat-orb gate-feat-orb--1" />
      <div className="gate-feat-orb gate-feat-orb--2" />
      <div className="gate-feat-orb gate-feat-orb--3" />
      <div className="gate-feat-aurora gate-feat-aurora--1" />
      <div className="gate-feat-aurora gate-feat-aurora--2" />
    </>
  );
}

function IntroMid() {
  return (
    <>
      {Array.from({ length: 48 }).map((_, i) => (
        <span
          key={i}
          className={`gate-feat-star ${i % 4 === 0 ? "gate-feat-star--lg" : ""}`}
          style={{
            left: `${(i * 13 + 3) % 100}%`,
            top: `${(i * 19 + 5) % 100}%`,
            animationDelay: `${(i % 7) * 0.45}s`,
            animationDuration: `${2 + (i % 5) * 0.6}s`,
          }}
        />
      ))}
      <div className="gate-feat-ring gate-feat-ring--giant" />
    </>
  );
}

function IntroNear() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="gate-feat-shooting" style={{ animationDelay: `${i * 2.8}s` }} />
      ))}
    </>
  );
}

/* ── Map ── */
function MapFar() {
  return (
    <>
      <div className="gate-feat-horizon gate-feat-horizon--bright" />
      <div className="gate-feat-grid" />
    </>
  );
}

function MapMid() {
  return (
    <svg className="gate-feat-globe-wire" viewBox="0 0 400 400" aria-hidden>
      <ellipse cx="200" cy="200" rx="160" ry="160" fill="none" stroke="rgba(0,255,204,0.15)" strokeWidth="1.5" />
      <ellipse cx="200" cy="200" rx="160" ry="60" fill="none" stroke="rgba(0,210,255,0.2)" strokeWidth="1" />
      <ellipse cx="200" cy="200" rx="160" ry="110" fill="none" stroke="rgba(0,210,255,0.12)" strokeWidth="1" />
      <ellipse cx="200" cy="200" rx="60" ry="160" fill="none" stroke="rgba(0,255,204,0.15)" strokeWidth="1" />
      <ellipse cx="200" cy="200" rx="110" ry="160" fill="none" stroke="rgba(0,255,204,0.1)" strokeWidth="1" />
      <circle cx="200" cy="200" r="8" fill="#00ffcc" className="gate-feat-globe-core" />
    </svg>
  );
}

function MapNear() {
  return (
    <>
      <div className="gate-feat-radar gate-feat-radar--lg" />
      <div className="gate-feat-radar gate-feat-radar--lg gate-feat-radar--2" />
      <div className="gate-feat-radar gate-feat-radar--lg gate-feat-radar--3" />
      <div className="gate-feat-radar gate-feat-radar--lg gate-feat-radar--4" />
      {[
        [15, 30], [35, 55], [55, 25], [72, 48], [85, 68], [25, 75], [48, 38], [62, 82], [90, 22],
      ].map(([x, y], i) => (
        <span
          key={i}
          className="gate-feat-ping gate-feat-ping--lg"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.55}s` }}
        />
      ))}
    </>
  );
}

/* ── Connect ── */
function ConnectFar() {
  return (
    <>
      <div className="gate-feat-beam gate-feat-beam--1" />
      <div className="gate-feat-beam gate-feat-beam--2" />
      <div className="gate-feat-beam gate-feat-beam--3" />
    </>
  );
}

function ConnectMid() {
  return (
    <>
      <div className="gate-feat-orbit gate-feat-orbit--a gate-feat-orbit--lg" />
      <div className="gate-feat-orbit gate-feat-orbit--b gate-feat-orbit--lg" />
      <div className="gate-feat-orbit gate-feat-orbit--c" />
      <svg className="gate-feat-link-svg" viewBox="0 0 400 200" aria-hidden>
        <path
          className="gate-feat-link-path"
          d="M 60 100 Q 200 40 340 100"
          fill="none"
          stroke="url(#linkGrad)"
          strokeWidth="3"
          strokeDasharray="8 6"
        />
        <defs>
          <linearGradient id="linkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00ffcc" />
            <stop offset="100%" stopColor="#8a2be2" />
          </linearGradient>
        </defs>
        <circle className="gate-feat-signal-dot" cx="60" cy="100" r="6" fill="#00ffcc" />
        <circle className="gate-feat-signal-dot gate-feat-signal-dot--b" cx="340" cy="100" r="6" fill="#8a2be2" />
      </svg>
    </>
  );
}

function ConnectNear() {
  return (
    <>
      <div className="gate-feat-node gate-feat-node--left gate-feat-node--lg" />
      <div className="gate-feat-node gate-feat-node--right gate-feat-node--lg" />
      <div className="gate-feat-link-pulse gate-feat-link-pulse--lg" />
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="gate-feat-spark" style={{ animationDelay: `${i * 0.4}s` }} />
      ))}
    </>
  );
}

/* ── Chat ── */
function ChatFar() {
  return (
    <>
      <div className="gate-feat-wave gate-feat-wave--1 gate-feat-wave--bright" />
      <div className="gate-feat-wave gate-feat-wave--2 gate-feat-wave--bright" />
      <div className="gate-feat-wave gate-feat-wave--3" />
    </>
  );
}

function ChatMid() {
  return (
    <>
      {[
        [12, 20, 72, 36, 0],
        [65, 15, 88, 28, 0.5],
        [78, 45, 100, 32, 1],
        [8, 55, 56, 30, 1.4],
        [42, 70, 80, 34, 0.8],
        [88, 72, 64, 28, 1.8],
      ].map(([x, y, w, h, d], i) => (
        <div
          key={i}
          className="gate-feat-bubble-drift gate-feat-bubble-drift--lg"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: w,
            height: h,
            animationDelay: `${d}s`,
          }}
        />
      ))}
    </>
  );
}

function ChatNear() {
  return (
    <>
      <div className="gate-feat-scanline gate-feat-scanline--bright" />
      <div className="gate-feat-scanline gate-feat-scanline--bright gate-feat-scanline--2" />
      <div className="gate-feat-video-ring" />
    </>
  );
}

/* ── Privacy ── */
function PrivacyFar() {
  return (
    <>
      <div className="gate-feat-dissolve gate-feat-dissolve--bright" />
      <div className="gate-feat-hex-field" />
    </>
  );
}

function PrivacyMid() {
  return (
    <svg className="gate-feat-shield-svg" viewBox="0 0 200 240" aria-hidden>
      <path
        className="gate-feat-shield-path"
        d="M100 20 L175 50 V120 C175 175 100 220 100 220 C100 220 25 175 25 120 V50 Z"
        fill="rgba(0,255,204,0.06)"
        stroke="url(#shieldGrad)"
        strokeWidth="2.5"
      />
      <defs>
        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00ffcc" />
          <stop offset="100%" stopColor="#8a2be2" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function PrivacyNear() {
  return (
    <>
      <div className="gate-feat-shield-glow gate-feat-shield-glow--lg" />
      {Array.from({ length: 32 }).map((_, i) => (
        <span
          key={i}
          className={`gate-feat-fragment ${i % 3 === 0 ? "gate-feat-fragment--lg" : ""}`}
          style={{
            left: `${(i * 11 + 2) % 98}%`,
            animationDelay: `${i * 0.22}s`,
            animationDuration: `${3.5 + (i % 4)}s`,
          }}
        />
      ))}
    </>
  );
}
