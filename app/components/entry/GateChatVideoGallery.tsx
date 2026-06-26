"use client";

import { useEffect, useState } from "react";
import ChatArt from "./gate-art/ChatArt";
import VideoArt from "./gate-art/VideoArt";

const AUTO_MS = 5000;
const SLIDES = [
  { id: "chat", label: "Chat" },
  { id: "video", label: "Video" },
] as const;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function GateChatVideoGallery({ animated = false }: { animated?: boolean }) {
  const [index, setIndex] = useState(0);
  const [slideKey, setSlideKey] = useState(0);

  useEffect(() => {
    setSlideKey((k) => k + 1);
  }, [index]);

  useEffect(() => {
    if (!animated || prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [animated]);

  const activeClass = animated ? " gate-feature-art--active" : "";

  return (
    <div className="gate-chat-video-gallery relative h-full w-full bg-[#080818]">
      <div className="relative h-full w-full">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              i === index ? "z-10 opacity-100" : "z-0 opacity-0"
            }`}
            aria-hidden={i !== index}
          >
            {slide.id === "chat" ? (
              <ChatArt
                key={i === index ? `chat-${slideKey}` : "chat-idle"}
                className={i === index ? activeClass : ""}
              />
            ) : (
              <VideoArt
                key={i === index ? `video-${slideKey}` : "video-idle"}
                className={i === index ? activeClass : ""}
              />
            )}
          </div>
        ))}
      </div>

      <div
        className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2"
        role="tablist"
        aria-label="Chat and video preview"
      >
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={slide.label}
            onClick={() => setIndex(i)}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              i === index
                ? "scale-110 bg-[#00ffcc] shadow-[0_0_8px_rgba(0,255,204,0.55)]"
                : "bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
