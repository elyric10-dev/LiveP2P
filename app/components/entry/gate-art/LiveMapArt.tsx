export default function LiveMapArt({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 400 240" className={`h-full w-full gate-feature-art${className}`} aria-hidden>
      <defs>
        <radialGradient id="map-glow" cx="35%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#00ffcc" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#050510" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="#080818" />
      <rect width="400" height="240" fill="url(#map-glow)" />
      <path
        className="gate-art-land"
        d="M60 150 Q120 90 200 110 T340 130"
        fill="none"
        stroke="#1a3a4a"
        strokeWidth="1.5"
        opacity="0.6"
      />
      {[
        [120, 105, "#00ffcc"],
        [175, 118, "#8a2be2"],
        [230, 98, "#00d2ff"],
        [285, 125, "#d8bfd8"],
        [155, 145, "#00ffcc"],
        [310, 108, "#8a2be2"],
      ].map(([cx, cy, color], i) => (
        <g key={i} className="gate-art-dot" style={{ animationDelay: `${i * 0.2}s` }}>
          <circle cx={cx} cy={cy} r="12" fill={String(color)} className="gate-art-dot-ring" opacity="0.2" />
          <circle cx={cx} cy={cy} r="5" fill={String(color)} />
        </g>
      ))}
      <rect x="24" y="28" width="128" height="30" rx="15" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.1)" />
      <circle cx="42" cy="43" r="5" fill="#00ffcc" className="gate-art-pulse" />
      <text x="56" y="47" fill="#c0c0c0" fontSize="11">
        Strangers online now
      </text>
    </svg>
  );
}
