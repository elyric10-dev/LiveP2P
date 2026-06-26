"use client";

import { GATE_FEATURES, type GateFeatureId } from "@/lib/gate-features";

export default function GateSideNav({
  activeId,
  onSelect,
  disabled,
}: {
  activeId: GateFeatureId | null;
  onSelect: (id: GateFeatureId) => void;
  disabled?: boolean;
}) {
  return (
    <nav
      className="gate-side-nav fixed left-3 top-1/2 z-[45] flex -translate-y-1/2 flex-col gap-2 rounded-full border p-2 backdrop-blur-xl sm:left-5"
      aria-label="Feature navigation"
    >
      {GATE_FEATURES.map((feature) => {
        const active = feature.id === activeId;
        return (
          <button
            key={feature.id}
            type="button"
            title={feature.label}
            disabled={disabled}
            aria-label={feature.label}
            aria-current={active ? "true" : undefined}
            onClick={() => onSelect(feature.id)}
            className={`gate-side-nav-btn group relative flex h-9 w-9 items-center justify-center rounded-full transition disabled:opacity-40 sm:h-10 sm:w-10 ${
              active ? "gate-side-nav-btn--active" : ""
            }`}
          >
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={feature.iconPath}
              />
            </svg>
            <span className="gate-side-nav-tip pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-full border border-white/10 bg-black/70 px-2.5 py-1 text-[10px] font-medium tracking-wider text-zinc-200 opacity-0 backdrop-blur-md transition group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
              {feature.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
