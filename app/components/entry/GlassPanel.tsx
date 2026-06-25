"use client";

export default function GlassPanel({
  children,
  className = "",
  error = false,
}: {
  children: React.ReactNode;
  className?: string;
  error?: boolean;
}) {
  return (
    <div
      className={`gate-panel relative rounded-3xl border px-6 py-8 shadow-2xl backdrop-blur-2xl sm:px-10 sm:py-9 ${className}`}
      style={{
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(5,5,16,0.75) 50%, rgba(5,5,16,0.85) 100%)",
        borderColor: error
          ? "rgba(248, 113, 113, 0.5)"
          : "rgba(255, 255, 255, 0.12)",
        boxShadow: error
          ? "0 0 32px rgba(248, 113, 113, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)"
          : "0 0 60px rgba(0, 255, 204, 0.08), 0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
        aria-hidden
      />
      {children}
    </div>
  );
}
