"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";

/**
 * The home page's hero, the parts that move (src/site/home.tsx renders the
 * rest, and globals.css "The home page's hero" draws it):
 *
 * - `RotatingWord`: the coloured word in the title, one app kind after
 *   another, its underline drawn again each time;
 * - `HeroStage`: the fan of real screens, leaning a little towards the
 *   pointer, with two notices that take turns.
 *
 * Both render their first state on the server, so the page reads the same
 * without the script. They stand still with "reduce motion" on, and pause
 * while the hero is off screen or the tab is hidden.
 */

const WORD_EVERY = 2600;
const NOTICE_EVERY = 3200;
const NOTICE_SWAP = 520;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Calls `tick` every `every` ms while `el` is on screen and the tab is visible; nothing with reduced motion. */
function useTicker(ref: React.RefObject<HTMLElement | null>, every: number, tick: () => void, enabled: boolean) {
  const latest = useRef(tick);
  useEffect(() => {
    latest.current = tick;
  });
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || prefersReducedMotion()) return;
    let seen = true;
    const observer = "IntersectionObserver" in window ? new IntersectionObserver(([entry]) => (seen = entry?.isIntersecting ?? true)) : null;
    observer?.observe(el);
    const id = window.setInterval(() => {
      if (seen && !document.hidden) latest.current();
    }, every);
    return () => {
      window.clearInterval(id);
      observer?.disconnect();
    };
  }, [ref, every, enabled]);
}

/**
 * 1 The coloured word. Its box is as wide as the longest word (drawn
 * invisibly from `data-sizer`), so the title never reflows as words change.
 * Hidden from assistive technology: the heading's own text is the title.
 */
export function RotatingWord({ words }: { words: string[] }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [turn, setTurn] = useState(0);
  useTicker(ref, WORD_EVERY, () => setTurn((n) => n + 1), words.length > 1);
  const current = words[turn % words.length]!;
  const previous = turn > 0 ? words[(turn - 1) % words.length]! : null;
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");
  return (
    <span ref={ref} aria-hidden="true" className="hero-word" data-sizer={longest}>
      {previous !== null ? (
        <span key={`out-${turn}`} className="hero-word-item" data-leaving="">
          {previous}
        </span>
      ) : null}
      <span key={`in-${turn}`} className="hero-word-item" data-entering={turn > 0 ? "" : undefined}>
        {current}
      </span>
    </span>
  );
}

export interface HeroNotice {
  /** The app's name, as on the phone's notification. */
  app: string;
  text: string;
  /** The app's colour (the demo's brand colour) and the letter or icon on it. */
  color: string;
  ink: string;
  mark: string | { icon: "storefront" };
}

function NoticeCard({ notice, off, slot }: { notice: HeroNotice; off: boolean; slot: 0 | 1 }) {
  return (
    <div className="hero-notice" data-slot={slot} data-off={off ? "" : undefined}>
      <span className="hero-notice-mark" style={{ background: notice.color, color: notice.ink }}>
        {typeof notice.mark === "string" ? notice.mark : <Icon name={notice.mark.icon} size={20} />}
      </span>
      <span className="min-w-0">
        <b className="block truncate text-[13.5px] font-bold text-ivory">{notice.app}</b>
        <small className="mt-0.5 block text-[12.5px] leading-snug text-night-text">{notice.text}</small>
      </span>
    </div>
  );
}

/**
 * 2 The stage: the phones (`children`, server-rendered with their pictures)
 * in a fan that leans towards the pointer, and two notices that take turns
 * showing the apps' real kinds of messages. The notices are decoration:
 * hidden from assistive technology, which reads the phones' descriptions.
 */
export function HeroStage({ notices, label, children }: { notices: HeroNotice[]; label: string; children?: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);
  const fan = useRef<HTMLDivElement>(null);
  // Which notice each card shows, and the card being swapped (faded out) right now.
  const [shown, setShown] = useState<{ slots: [number, number]; next: number; swapping: 0 | 1 | null }>({ slots: [0, 1], next: 2, swapping: null });
  const swapTimer = useRef(0);

  useTicker(
    stage,
    NOTICE_EVERY,
    () => {
      setShown((s) => ({ ...s, swapping: (s.next % 2) as 0 | 1 }));
      window.clearTimeout(swapTimer.current);
      swapTimer.current = window.setTimeout(() => {
        setShown((s) => {
          if (s.swapping === null) return s;
          const slots: [number, number] = [...s.slots];
          slots[s.swapping] = s.next % notices.length;
          return { slots, next: s.next + 1, swapping: null };
        });
      }, NOTICE_SWAP);
    },
    notices.length > 2,
  );
  useEffect(() => () => window.clearTimeout(swapTimer.current), []);

  // The fan leans gently towards the pointer (mouse and pen; touch scrolls the page).
  useEffect(() => {
    const el = stage.current;
    const target = fan.current;
    if (!el || !target || prefersReducedMotion()) return;
    let frame = 0;
    let lean = "";
    const apply = () => {
      frame = 0;
      target.style.transform = lean;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      lean = `rotateY(${(x * 10).toFixed(2)}deg) rotateX(${(-y * 8).toFixed(2)}deg)`;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const leave = () => {
      lean = "";
      if (!frame) frame = requestAnimationFrame(apply);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={stage} className="hero-stage" role="group" aria-label={label}>
      <div className="hero-scene">
        <div ref={fan} className="hero-fan">
          {children}
        </div>
        <div aria-hidden="true">
          {([0, 1] as const).map((slot) => (
            <NoticeCard key={slot} slot={slot} notice={notices[shown.slots[slot] % notices.length]!} off={shown.swapping === slot} />
          ))}
        </div>
      </div>
    </div>
  );
}
