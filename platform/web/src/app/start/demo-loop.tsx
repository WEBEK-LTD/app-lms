"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 128.9 A demo's short silent loop on its /start card (public/loops, made
 * by scripts/demo-loops.sh), over its screenshot. Its poster is the
 * screenshot, set as the card comes near; it plays muted and inline only
 * while the card is in view, and never with reduced motion (the poster
 * stays). A loop that doesn't load leaves the screenshot. Decorative: the
 * screenshot under it says what it shows.
 */
export function DemoLoop({ webm, mp4, poster }: { webm: string; mp4: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [play, setPlay] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Near: the poster; in view (and motion allowed): playing.
    const nearby = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setNear(true);
        nearby.disconnect();
      }
    }, { rootMargin: "400px 0px" });
    const inView = new IntersectionObserver(([entry]) => setPlay(Boolean(entry?.isIntersecting) && !still.matches), { threshold: 0.5 });
    const onMotion = () => {
      if (still.matches) setPlay(false);
    };
    nearby.observe(video);
    inView.observe(video);
    still.addEventListener("change", onMotion);
    return () => {
      nearby.disconnect();
      inView.disconnect();
      still.removeEventListener("change", onMotion);
    };
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video || broken) return;
    if (play) {
      // The sources are added the first time it plays; the browser picks one.
      if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) video.load();
      void video.play().catch(() => undefined);
    } else video.pause();
  }, [play, broken]);

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      poster={near ? poster : undefined}
      aria-hidden="true"
      tabIndex={-1}
      disablePictureInPicture
      data-loop={play ? "playing" : "still"}
      onPlaying={() => setPlaying(true)}
      onError={() => setBroken(true)}
      className={`pointer-events-none absolute inset-0 block h-full w-full object-cover object-top motion-safe:transition-opacity motion-safe:duration-300 ${playing && !broken ? "opacity-100" : "opacity-0"}`}
    >
      {play || playing ? (
        <>
          <source src={webm} type="video/webm" onError={() => undefined} />
          <source src={mp4} type="video/mp4" onError={() => setBroken(true)} />
        </>
      ) : null}
    </video>
  );
}
