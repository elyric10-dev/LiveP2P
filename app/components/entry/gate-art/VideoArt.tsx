export default function VideoArt({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 400 240" className={`h-full w-full gate-feature-art${className}`} aria-hidden>
      <defs>
        <linearGradient id="video-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8a2be2" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#00d2ff" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="#080818" />
      <rect x="36" y="28" width="328" height="184" rx="18" fill="url(#video-grad)" stroke="rgba(255,255,255,0.08)" />

      <rect
        className="gate-art-video-pane gate-art-video-pane--main"
        x="48"
        y="42"
        width="210"
        height="128"
        rx="14"
        fill="rgba(138,43,226,0.18)"
        stroke="rgba(138,43,226,0.35)"
      />
      <circle className="gate-art-video-face gate-art-video-face--stranger" cx="153" cy="100" r="32" fill="rgba(138,43,226,0.28)" />
      <circle cx="153" cy="92" r="12" fill="rgba(216,191,216,0.35)" />
      <ellipse cx="153" cy="118" rx="18" ry="10" fill="rgba(216,191,216,0.2)" />

      <rect
        className="gate-art-video-pane gate-art-video-pane--pip"
        x="268"
        y="42"
        width="84"
        height="64"
        rx="10"
        fill="rgba(0,255,204,0.12)"
        stroke="rgba(0,255,204,0.4)"
      />
      <circle className="gate-art-video-face gate-art-video-face--self" cx="310" cy="70" r="18" fill="rgba(0,255,204,0.22)" />
      <circle cx="310" cy="64" r="7" fill="rgba(0,255,204,0.4)" />
      <ellipse cx="310" cy="78" rx="10" ry="6" fill="rgba(0,255,204,0.25)" />

      <g className="gate-art-video-live">
        <circle cx="58" cy="50" r="4" fill="#ef4444" className="gate-art-video-live-dot" />
        <text x="68" y="54" fill="#fca5a5" fontSize="10" fontWeight="600">
          LIVE
        </text>
      </g>

      <text className="gate-art-video-label gate-art-video-label--stranger" x="153" y="186" textAnchor="middle" fill="#a0a0a0" fontSize="10">
        Stranger
      </text>
      <text className="gate-art-video-label gate-art-video-label--you" x="310" y="118" textAnchor="middle" fill="#666" fontSize="9">
        You
      </text>

      <g className="gate-art-video-controls">
        <rect x="108" y="178" width="184" height="28" rx="14" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.08)" />
        <circle cx="138" cy="192" r="9" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" />
        <rect x="134" y="189" width="4" height="6" rx="1" fill="#c0c0c0" />
        <circle cx="200" cy="192" r="11" fill="rgba(239,68,68,0.85)" />
        <rect x="196" y="188" width="8" height="8" rx="1" fill="#1a0505" />
        <circle cx="262" cy="192" r="9" fill="rgba(0,255,204,0.2)" stroke="rgba(0,255,204,0.45)" />
        <path d="M258 188 L266 192 L258 196 Z" fill="#00ffcc" />
      </g>
    </svg>
  );
}
