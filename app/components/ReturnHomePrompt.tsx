"use client";

type ReturnHomePromptProps = {
  title: string;
  subtitle: string;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
};

export default function ReturnHomePrompt({
  title,
  subtitle,
  acceptLabel,
  declineLabel,
  onAccept,
  onDecline,
}: ReturnHomePromptProps) {
  return (
    <div
      className="fixed inset-0 z-[50] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-home-title"
    >
      <div className="gate-panel w-full max-w-sm rounded-2xl border border-white/10 bg-[#080818]/95 p-6 text-center shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#00ffcc]">
          Outer space
        </p>
        <h2 id="return-home-title" className="mt-3 text-xl font-bold text-white sm:text-2xl">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#b0b0c8]">{subtitle}</p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            {declineLabel}
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="gate-enter-btn flex-1 rounded-full px-4 py-2.5 text-sm font-bold tracking-wide text-[#050510] transition hover:brightness-110"
          >
            {acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
