"use client";

const ROW_CHIPS = [
  {
    label: "No accounts",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    ),
  },
  {
    label: "Offset 1–3 km",
    icon: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </>
    ),
  },
] as const;

export default function PrivacyChips() {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <ul className="flex w-full flex-wrap justify-center gap-2">
        {ROW_CHIPS.map((chip) => (
          <li key={chip.label} className="gate-privacy-chip">
            <svg
              className="h-3.5 w-3.5 shrink-0 text-[#00FFCC]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              {chip.icon}
            </svg>
            {chip.label}
          </li>
        ))}
      </ul>
      <div className="gate-privacy-chip">
        <svg
          className="h-3.5 w-3.5 shrink-0 text-[#8A2BE2]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        Nothing stored
      </div>
    </div>
  );
}
