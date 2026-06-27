"use client";

import { useEffect, useRef, useState } from "react";

export default function VideoPanel({
  localStream,
  remoteStream,
  onEnd,
  onEndCall,
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEnd: () => void;
  onEndCall: () => void;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (localRef.current && localRef.current.srcObject !== localStream) {
      localRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteRef.current.srcObject !== remoteStream) {
      remoteRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Close dropdown when clicking outside.
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black">
      {/* Video area — min-h-0 prevents the flex item from overflowing and
          pushing the button bar below the viewport. */}
      <div className="relative min-h-0 flex-1">
        {/* Remote — object-contain shows the full frame without cropping */}
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="h-full w-full bg-zinc-900 object-contain"
        />
        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
            Waiting for stranger&rsquo;s video…
          </div>
        )}

        {/* Local PiP — landscape ratio + object-contain so the full camera
            frame is visible without cropping or zoom. */}
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-4 right-4 w-36 rounded-lg border border-zinc-700 bg-zinc-800 object-contain"
          style={{ aspectRatio: "16/9" }}
        />
      </div>

      {/* Button bar — pb accounts for iOS home-indicator safe area */}
      <div
        className="flex items-center justify-center bg-zinc-950 px-4 pt-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Split button: left side = End Video, right side = dropdown chevron */}
        <div ref={dropdownRef} className="relative flex">
          {/* Primary action */}
          <button
            onClick={onEnd}
            className="rounded-l-full bg-red-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-400 active:bg-red-600"
          >
            End video
          </button>

          {/* Divider */}
          <div className="w-px bg-red-400" />

          {/* Dropdown trigger */}
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            aria-label="More options"
            className="rounded-r-full bg-red-500 px-3 py-2.5 text-white hover:bg-red-400 active:bg-red-600"
          >
            <svg
              className={`h-4 w-4 transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown menu — opens upward */}
          {dropdownOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-44 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
              <button
                onClick={() => { setDropdownOpen(false); onEnd(); }}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-zinc-200 hover:bg-zinc-800"
              >
                <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
                End video
              </button>
              <div className="mx-3 h-px bg-zinc-800" />
              <button
                onClick={() => { setDropdownOpen(false); onEndCall(); }}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-red-400 hover:bg-zinc-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a16.003 16.003 0 0114 0M1 7a20.005 20.005 0 0122 0M10.586 10.586a2 2 0 012.828 2.828m-5.656-2.828a8 8 0 0110.99-.837M3 3l18 18" />
                </svg>
                End connection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
