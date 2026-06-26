export default function ConnectArt({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 400 240" className={`h-full w-full gate-feature-art${className}`} aria-hidden>
      <rect width="400" height="240" fill="#080818" />
      <circle cx="120" cy="120" r="42" fill="#0d1a2a" stroke="#00ffcc" strokeWidth="2" />
      <circle cx="120" cy="120" r="8" fill="#00ffcc" className="gate-art-pulse" />
      <text x="120" y="182" textAnchor="middle" fill="#666" fontSize="10">
        You
      </text>
      <circle cx="280" cy="120" r="42" fill="#0d1a2a" stroke="#8a2be2" strokeWidth="2" />
      <circle cx="280" cy="120" r="8" fill="#8a2be2" className="gate-art-pulse" style={{ animationDelay: "0.5s" }} />
      <text x="280" y="182" textAnchor="middle" fill="#666" fontSize="10">
        Stranger
      </text>
      <line
        className="gate-art-line"
        x1="162"
        y1="120"
        x2="238"
        y2="120"
        stroke="#00ffcc"
        strokeWidth="2"
        strokeDasharray="8 6"
      />
      <g className="gate-art-request">
        <rect x="138" y="52" width="124" height="28" rx="14" fill="rgba(0,255,204,0.12)" stroke="rgba(0,255,204,0.4)" />
        <text x="200" y="70" textAnchor="middle" fill="#00ffcc" fontSize="11" fontWeight="600">
          Connection request
        </text>
      </g>
    </svg>
  );
}
