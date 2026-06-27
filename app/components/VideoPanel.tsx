"use client";

import { useEffect, useRef } from "react";

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
        className="flex items-center justify-center gap-3 bg-zinc-950 px-4 pt-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          onClick={onEnd}
          className="rounded-full border border-zinc-600 px-6 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-400 hover:text-white"
        >
          End video
        </button>
        <button
          onClick={onEndCall}
          className="rounded-full bg-red-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-400"
        >
          End connection
        </button>
      </div>
    </div>
  );
}
