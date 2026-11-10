"use client";

import { useEffect, useRef, useState } from "react";
import { PhoneFrame } from "./device-frame";

/**
 * Yallapp Studio's page: the team's own short film in the phone frame at
 * the top. It plays muted and loops; the button turns its sound on and off.
 * With "reduce motion" it doesn't start by itself (the button plays it), and
 * until it loads, or without video, the poster frame shows.
 */
export function StudioHeroVideo({ src, poster, label, soundOn, soundOff, play }: { src: string; poster: string; label: string; soundOn: string; soundOff: string; play: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.play().catch(() => setPaused(true));
  }, []);

  const toggleSound = () => {
    const video = ref.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (video.paused) void video.play().catch(() => undefined);
  };
  const start = () => void ref.current?.play().catch(() => undefined);

  return (
    <figure className="m-0 flex max-w-full flex-none flex-col items-center">
      <PhoneFrame className="w-[248px]" screenClassName="relative aspect-[9/16] bg-midnight" island data-studio-video="">
        <video
          ref={ref}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={label}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {paused ? (
          <button type="button" onClick={start} aria-label={play} className="absolute inset-0 grid cursor-pointer place-items-center border-0 bg-black/20">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-[#0e0d24] shadow-lg">
              <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="currentColor">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            </span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? soundOn : soundOff}
          aria-pressed={!muted}
          className="absolute end-3 bottom-3 z-10 grid h-10 w-10 cursor-pointer place-items-center rounded-full border-0 bg-black/55 text-white backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
            <path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" />
            {muted ? (
              <path d="M15.5 9.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            ) : (
              <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            )}
          </svg>
        </button>
      </PhoneFrame>
    </figure>
  );
}
