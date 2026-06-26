export default function PrivacyArt({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 400 240" className={`h-full w-full gate-feature-art${className}`} aria-hidden>
      <defs>
        <linearGradient id="shield-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00ffcc" />
          <stop offset="100%" stopColor="#8a2be2" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="#080818" />
      <path
        className="gate-art-shield"
        d="M200 44 L268 68 V118 C268 162 200 196 200 196 C200 196 132 162 132 118 V68 Z"
        fill="rgba(0,255,204,0.1)"
        stroke="url(#shield-grad)"
        strokeWidth="2.5"
      />
      <path
        className="gate-art-check"
        d="M178 118 L194 134 L226 100"
        fill="none"
        stroke="#00ffcc"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {[
        ["No accounts", 58],
        ["1–3 km offset", 118],
        ["Zero history", 178],
      ].map(([label, y], i) => (
        <g key={String(label)} className="gate-art-chip" style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
          <rect x="44" y={Number(y) - 12} width="140" height="26" rx="13" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.1)" />
          <circle cx="58" cy={Number(y)} r="3.5" fill="#8a2be2" />
          <text x="70" y={Number(y) + 4} fill="#b0b0b0" fontSize="11">
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}
