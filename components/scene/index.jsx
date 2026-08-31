"use client";

import { useEffect, useRef } from "react";

export function CockpitScene() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay fallback: muted autoplay is supported in all modern browsers
        });
      }
    }
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[50%] max-w-[560px] items-center justify-center overflow-hidden lg:flex"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, transparent 4%, #000 24%, #000 92%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 8%, #000 92%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, transparent 4%, #000 24%, #000 92%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 8%, #000 92%, transparent 100%)",
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    >
      {/* Ambient bloom back-layer for warm radiance */}
      <div className="absolute inset-0 z-0 bg-radial from-signal/15 via-flame/5 to-transparent blur-2xl" />

      {/* Continuously looping video at original dimensions */}
      <div className="relative z-1 flex h-full w-full items-center justify-center">
        <video
          ref={videoRef}
          src="/this.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="h-full w-full object-contain object-right mix-blend-screen scale-105"
        />

        {/* Localized watermark overlay in the bottom right corner */}
        <div className="pointer-events-none absolute bottom-1 right-2 h-10 w-24 bg-bg/95 blur-sm" />
      </div>
    </div>
  );
}
