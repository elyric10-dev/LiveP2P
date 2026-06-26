export default function ChatArt({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 400 240" className={`h-full w-full gate-feature-art${className}`} aria-hidden>
      <defs>
        <linearGradient id="chat-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8a2be2" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#00ffcc" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="#080818" />
      <rect x="36" y="28" width="328" height="184" rx="18" fill="url(#chat-grad)" stroke="rgba(255,255,255,0.08)" />
      <rect
        className="gate-art-bubble gate-art-bubble--1"
        x="54"
        y="52"
        width="156"
        height="36"
        rx="14"
        fill="rgba(138,43,226,0.22)"
        stroke="rgba(138,43,226,0.35)"
      />
      <text className="gate-art-bubble gate-art-bubble--1" x="68" y="74" fill="#d8bfd8" fontSize="12">
        hey, where are you from?
      </text>
      <rect
        className="gate-art-bubble gate-art-bubble--2"
        x="190"
        y="100"
        width="148"
        height="36"
        rx="14"
        fill="rgba(0,255,204,0.14)"
        stroke="rgba(0,255,204,0.35)"
      />
      <text className="gate-art-bubble gate-art-bubble--2" x="204" y="122" fill="#00ffcc" fontSize="12">
        somewhere on the map
      </text>
      <rect
        className="gate-art-bubble gate-art-bubble--3"
        x="54"
        y="148"
        width="112"
        height="36"
        rx="14"
        fill="rgba(138,43,226,0.16)"
        stroke="rgba(138,43,226,0.28)"
      />
      <text className="gate-art-bubble gate-art-bubble--3" x="68" y="170" fill="#a0a0a0" fontSize="12">
        want to video?
      </text>
      <g className="gate-art-video">
        <circle cx="330" cy="188" r="22" fill="rgba(0,210,255,0.18)" stroke="#00d2ff" strokeWidth="2" />
        <path d="M322 180 L336 188 L322 196 Z" fill="#00d2ff" />
      </g>
    </svg>
  );
}
