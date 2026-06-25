"use client";

const DOTS = [
  { id: 1, left: "12%", top: "22%", color: "#34d399", delay: "0s" },
  { id: 2, left: "78%", top: "18%", color: "#22d3ee", delay: "0.4s" },
  { id: 3, left: "85%", top: "62%", color: "#c084fc", delay: "0.8s" },
  { id: 4, left: "18%", top: "72%", color: "#34d399", delay: "1.2s" },
  { id: 5, left: "48%", top: "12%", color: "#22d3ee", delay: "0.6s" },
  { id: 6, left: "8%", top: "48%", color: "#c084fc", delay: "1s" },
  { id: 7, left: "62%", top: "78%", color: "#34d399", delay: "0.2s" },
  { id: 8, left: "92%", top: "38%", color: "#22d3ee", delay: "1.4s" },
] as const;

/** Decorative arcs between dot pairs (viewBox 0–100). */
const ARCS = [
  { d: "M 12 22 Q 45 8 48 12", delay: "0s" },
  { d: "M 48 12 Q 65 15 78 18", delay: "0.5s" },
  { d: "M 18 72 Q 40 55 62 78", delay: "1s" },
] as const;

export default function SignalDots() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {ARCS.map((arc, i) => (
          <path
            key={i}
            d={arc.d}
            fill="none"
            stroke="url(#gate-arc-gradient)"
            strokeWidth="0.15"
            className="gate-arc"
            style={{ animationDelay: arc.delay }}
          />
        ))}
        <defs>
          <linearGradient id="gate-arc-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
      </svg>
      {DOTS.map((dot) => (
        <div
          key={dot.id}
          className="gate-signal-dot absolute"
          style={{
            left: dot.left,
            top: dot.top,
            background: dot.color,
            animationDelay: dot.delay,
          }}
        />
      ))}
    </div>
  );
}
