"use client";

import { useEffect, useState } from "react";
import { poll } from "@/lib/api";

const PROBE_ID = "pulse-gate-probe";

const STATS = [
  {
    key: "online",
    label: "STRANGERS ONLINE",
    icon: "target",
    color: "teal",
    getValue: (peers: number) => formatNum(peers > 0 ? peers : 0),
  },
  {
    key: "connections",
    label: "CONNECTIONS TODAY",
    icon: "pulse",
    color: "purple",
    getValue: (peers: number) => formatNum(peers * 47 + 1200),
  },
  {
    key: "countries",
    label: "COUNTRIES",
    icon: "globe",
    color: "blue",
    getValue: () => "132",
  },
] as const;

function formatNum(n: number): string {
  return n.toLocaleString("en-US");
}

function StatIcon({ type, color }: { type: string; color: string }) {
  const cls = `gate-stat-icon gate-stat-icon--${color}`;
  if (type === "target") {
    return (
      <div className={cls}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      </div>
    );
  }
  if (type === "pulse") {
    return (
      <div className={cls}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M4 12h4l2-6 4 12 2-6h4" />
        </svg>
      </div>
    );
  }
  return (
    <div className={cls}>
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    </div>
  );
}

export default function GateStatsBar({
  earthReached = true,
}: {
  earthReached?: boolean;
}) {
  const [peerCount, setPeerCount] = useState(0);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const data = await poll(PROBE_ID);
        if (active) setPeerCount(data.peers.length);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div
      className={`gate-stats-bar absolute bottom-16 left-1/2 z-20 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 transition-all duration-700 sm:bottom-20 ${
        earthReached ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl sm:flex-row sm:divide-x sm:divide-y-0">
        {STATS.map((stat) => (
          <div
            key={stat.key}
            className="flex flex-1 items-center gap-3 px-4 py-3 sm:px-6 sm:py-4"
          >
            <StatIcon type={stat.icon} color={stat.color} />
            <div>
              <p className="gate-stat-value text-lg font-bold tracking-wide text-white sm:text-xl">
                {stat.getValue(peerCount)}
              </p>
              <p className="text-[10px] font-medium tracking-widest text-zinc-500 sm:text-xs">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
