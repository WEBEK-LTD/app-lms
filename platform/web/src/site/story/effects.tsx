"use client";

import { useEffect } from "react";

/**
 * The story pages' motion, in one small script for the whole page (the
 * page itself is server-rendered and readable without it):
 *
 * - `[data-reveal]` fades and rises into view once (notifications slide in);
 * - `[data-timeline]` fills its line as the day is scrolled (`--fill`);
 * - `[data-parallax]` drifts a little with the scroll (`--py`);
 * - `[data-count]` counts up to its number once seen;
 * - `[data-route]` draws its route and starts the vehicle on it;
 * - `[data-gate]` shows a new six-digit code every 30 seconds, as the gate does.
 *
 * With "reduce motion" on, everything is shown at once and nothing moves.
 */
export function StoryEffects() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-story]");
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.dataset.motion = reduce ? "reduced" : "on";
    const timers: number[] = [];

    const count = (el: HTMLElement) => {
      const to = Number(el.dataset.count);
      if (!Number.isFinite(to) || reduce || to === 0) return;
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / 1400);
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(step);
      };
      el.textContent = "0";
      requestAnimationFrame(step);
    };

    const show = (el: HTMLElement) => {
      el.dataset.shown = "";
      el.querySelectorAll<HTMLElement>("[data-count]").forEach(count);
      if (!reduce) {
        el.querySelectorAll<SVGAnimationElement>("animateMotion, animate").forEach((a) => {
          try {
            a.beginElement();
          } catch {
            // SMIL missing: the route stays drawn, the vehicle at its end.
          }
        });
      }
    };

    const targets = root.querySelectorAll<HTMLElement>("[data-reveal]");
    let observer: IntersectionObserver | null = null;
    if (reduce || !("IntersectionObserver" in window)) {
      targets.forEach(show);
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            show(entry.target as HTMLElement);
            observer?.unobserve(entry.target);
          }
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
      );
      targets.forEach((el) => observer!.observe(el));
    }

    // The gate's code, new every 30 seconds.
    if (!reduce) {
      root.querySelectorAll<HTMLElement>("[data-gate]").forEach((el) => {
        timers.push(
          window.setInterval(() => {
            el.textContent = String(Math.floor(100000 + Math.random() * 900000));
          }, 30000),
        );
      });
    }

    const lines = root.querySelectorAll<HTMLElement>("[data-timeline]");
    const drifting = root.querySelectorAll<HTMLElement>("[data-parallax]");
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      lines.forEach((el) => {
        const r = el.getBoundingClientRect();
        const fill = Math.min(1, Math.max(0, (vh * 0.55 - r.top) / Math.max(1, r.height)));
        el.style.setProperty("--fill", fill.toFixed(4));
      });
      if (reduce) return;
      drifting.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const speed = Number(el.dataset.parallax) || 0.08;
        const offset = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.setProperty("--py", `${offset.toFixed(1)}px`);
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      observer?.disconnect();
      timers.forEach((t) => window.clearInterval(t));
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
