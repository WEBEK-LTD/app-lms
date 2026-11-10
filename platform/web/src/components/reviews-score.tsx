"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The real reviews' score box on the home page (reviews-section.tsx): its
 * stars pop in and the average counts up once it scrolls into view. The
 * page renders the final average and the stars; without the script, or
 * with reduced motion, they stay as they are.
 */
export function ReviewsScore({ average, label, children }: { average: number; label: string; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [shown, setShown] = useState(average);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // With reduced motion (the stylesheet shows the stars as they are) or no observer, nothing moves.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    el.dataset.armed = "";
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        setOn(true);
        const start = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - start) / 1200);
          setShown(average * (1 - Math.pow(1 - p, 3)));
          if (p < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [average]);
  return (
    <div ref={box} data-on={on ? "" : undefined} data-reviews-score="" className="rv-score grid min-w-[170px] justify-self-start justify-items-start gap-1.5 rounded-[18px] px-[18px] py-4 md:justify-self-auto md:justify-items-end">
      <span className="sr-only">{label}</span>
      {children}
      <b aria-hidden="true" className="text-[44px] leading-none font-extrabold tabular-nums">
        {shown.toFixed(1)}
      </b>
    </div>
  );
}
