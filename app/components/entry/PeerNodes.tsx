"use client";

const PEERS = [
  {
    name: "Luna",
    distance: "2 km away",
    theme: "purple" as const,
    className: "left-[4%] top-[18%] sm:left-[8%] sm:top-[20%]",
    line: "M 85 95 Q 120 60 160 55",
  },
  {
    name: "Atlas",
    distance: "3 km away",
    theme: "teal" as const,
    className: "right-[4%] top-[16%] sm:right-[8%] sm:top-[18%]",
    line: "M 235 90 Q 200 55 160 50",
  },
  {
    name: "Kai",
    distance: "1 km away",
    theme: "teal" as const,
    className: "left-[6%] bottom-[32%] sm:left-[10%] sm:bottom-[30%]",
    line: "M 80 200 Q 110 170 155 165",
  },
  {
    name: "Nova",
    distance: "0.5 km away",
    theme: "purple" as const,
    className: "right-[6%] bottom-[30%] sm:right-[10%] sm:bottom-[28%]",
    line: "M 240 205 Q 210 175 165 168",
  },
] as const;

function Avatar({ name, theme }: { name: string; theme: "teal" | "purple" }) {
  const initial = name[0];
  return (
    <div
      className={`gate-peer-avatar gate-peer-avatar--${theme} flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white sm:h-10 sm:w-10`}
    >
      {initial}
    </div>
  );
}

export default function PeerNodes() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[2] hidden sm:block" aria-hidden>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 320 320"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="peer-line-teal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00FFCC" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00D2FF" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="peer-line-purple" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8A2BE2" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#4B0082" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {PEERS.map((p) => (
          <path
            key={p.name}
            d={p.line}
            fill="none"
            stroke={
              p.theme === "teal"
                ? "url(#peer-line-teal)"
                : "url(#peer-line-purple)"
            }
            strokeWidth="0.6"
            className="gate-peer-line"
          />
        ))}
      </svg>

      {PEERS.map((p, i) => (
        <div
          key={p.name}
          className={`gate-peer-card absolute flex items-center gap-2 ${p.className}`}
          style={{ animationDelay: `${-i * 1.2}s` }}
        >
          <Avatar name={p.name} theme={p.theme} />
          <div
            className={`gate-peer-label gate-peer-label--${p.theme} rounded-full px-3 py-1.5 text-xs sm:text-sm`}
          >
            <span className="font-semibold text-white">{p.name}</span>
            <span className="ml-1.5 text-zinc-400">{p.distance}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
