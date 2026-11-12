"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import type { Lang } from "@/i18n/config";
import { formatMessage, formatNumber } from "@/i18n/format";

/**
 * 124 The live parts of Black Friday's page: the flip-clock countdown, the
 * coupon you tear off to copy, the plans' families, the shop window's
 * shelf, and the page's motion (the scenes' scroll progress, what rises
 * into view, the gold dust and the confetti). The words and every panel
 * come from the server, already in the page's language and complete: with
 * no script, or with "reduce motion", the page reads the same, still.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const REDUCE = "(prefers-reduced-motion: reduce)";

function parts(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  const left = Math.max(0, ms);
  return { days: Math.floor(left / DAY), hours: Math.floor((left % DAY) / HOUR), minutes: Math.floor((left % HOUR) / MINUTE), seconds: Math.floor((left % MINUTE) / SECOND) };
}

export interface CountdownWords {
  heading: string;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  label: string;
}

/**
 * One digit of the clock. When it changes, its upper flap falls on the old
 * digit and the lower one closes on the new (`.bf-flip` in black-friday.css).
 * The server and the first render draw it still.
 */
function FlipDigit({ value }: { value: string }) {
  const [shown, setShown] = useState(value);
  const [old, setOld] = useState<string | null>(null);
  if (value !== shown) {
    setOld(shown);
    setShown(value);
  }
  useEffect(() => {
    if (old === null) return;
    const id = window.setTimeout(() => setOld(null), 620);
    return () => window.clearTimeout(id);
  }, [old, shown]);
  return (
    <span className="bf-flip" data-flipping={old !== null ? "" : undefined}>
      <span className="bf-flip-half bf-flip-top">
        <span>{shown}</span>
      </span>
      <span className="bf-flip-half bf-flip-bottom">
        <span>{old ?? shown}</span>
      </span>
      {old !== null ? (
        <>
          <span key={`a${shown}`} className="bf-flip-half bf-flip-top bf-flip-fall">
            <span>{old}</span>
          </span>
          <span key={`b${shown}`} className="bf-flip-half bf-flip-bottom bf-flip-rise">
            <span>{shown}</span>
          </span>
        </>
      ) : null}
    </span>
  );
}

/**
 * The time left to `to`, as a flip clock. The first render uses the
 * server's clock (`serverNow`), so the server's HTML and the browser's
 * first render are the same; the browser's clock takes over after. Screen
 * readers get one label to the minute (role="timer" is never announced on
 * its own), and with reduced motion the seconds are left out and it ticks
 * each minute. At zero the page is fetched again, in its new state.
 */
export function Countdown({ lang, to, serverNow, words }: { lang: Lang; to: string; serverNow: string; words: CountdownWords }) {
  const target = Date.parse(to);
  const [now, setNow] = useState(() => Date.parse(serverNow));
  const [still, setStill] = useState(false);
  const router = useRouter();
  const refreshed = useRef(false);

  useEffect(() => {
    const query = window.matchMedia(REDUCE);
    const sync = () => setStill(query.matches);
    const first = window.setTimeout(() => {
      sync();
      setNow(Date.now());
    }, 0);
    query.addEventListener("change", sync);
    return () => {
      window.clearTimeout(first);
      query.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), still ? 15 * SECOND : SECOND);
    return () => window.clearInterval(id);
  }, [still]);

  const left = target - now;
  useEffect(() => {
    if (left > 0 || refreshed.current) return;
    refreshed.current = true;
    router.refresh();
  }, [left, router]);

  const p = parts(left);
  const units: { key: keyof typeof p; word: string }[] = [
    { key: "days", word: words.days },
    { key: "hours", word: words.hours },
    { key: "minutes", word: words.minutes },
    ...(still ? [] : [{ key: "seconds" as const, word: words.seconds }]),
  ];
  const label = `${words.heading} ${formatMessage(lang, words.label, { days: p.days, hours: p.hours, minutes: p.minutes })}`;
  return (
    <div role="timer" aria-label={label} className="bf-clock" data-countdown="" data-target={to}>
      <span aria-hidden="true" className="bf-clock-heading">
        {words.heading}
      </span>
      <ol aria-hidden="true" className="bf-clock-units" dir="ltr">
        {units.map((u) => (
          <li key={u.key} className="bf-clock-unit">
            <span className="bf-clock-digits" data-unit={u.key}>
              {[...formatNumber(lang, p[u.key], { minimumIntegerDigits: 2, useGrouping: false })].map((d, i, all) => (
                <FlipDigit key={all.length - i} value={d} />
              ))}
            </span>
            <span className="bf-clock-word">{formatMessage(lang, u.word, { count: p[u.key] })}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The code on a coupon: pressing its stub copies the code and tears the
 * stub along the perforation (it comes back after a moment). The code is
 * text in the server's HTML; the button only copies it.
 */
export function CouponTicket({ code, label, copy, copied, children }: { code: string; label: string; copy: string; copied: string; children?: ReactNode }) {
  const [done, setDone] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), []);
  const tear = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      return;
    }
    setDone(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 2200);
  };
  return (
    <div className="bf-coupon" data-coupon-code={code} data-torn={done ? "" : undefined}>
      <div className="bf-coupon-main">
        <span className="bf-coupon-label">{label}</span>
        <span dir="ltr" className="bf-coupon-code">
          {code}
        </span>
        {children}
      </div>
      <button type="button" className="bf-coupon-stub" onClick={tear}>
        <Icon name={done ? "check" : "content_cut"} size={22} />
        <span aria-live="polite">{done ? copied : copy}</span>
      </button>
    </div>
  );
}

export interface TabItem {
  id: string;
  label: string;
  icon?: IconName;
  /** A short line under the label. */
  note?: string;
}

/**
 * Tabs over panels rendered by the server: arrow keys, Home and End move
 * between them (in the page's direction), and every panel is in the HTML,
 * the others `hidden`.
 */
export function Tabs({ label, items, panels }: { label: string; items: TabItem[]; panels: ReactNode[] }) {
  const [active, setActive] = useState(0);
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    let next: number | null = null;
    if (event.key === forward || event.key === "ArrowDown") next = (index + 1) % items.length;
    else if (event.key === back || event.key === "ArrowUp") next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  };
  return (
    <div className="bf-tabs">
      <div role="tablist" aria-label={label} className="bf-tablist" style={{ "--bf-tab": active, "--bf-tabs": items.length } as React.CSSProperties}>
        <span aria-hidden="true" className="bf-tab-glow" />
        {items.map((item, i) => (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${item.id}`}
            aria-selected={i === active}
            aria-controls={`${base}-panel-${item.id}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => move(e, i)}
            className="bf-tab"
            data-tab={item.id}
          >
            <span className="bf-tab-name">
              {item.icon ? <Icon name={item.icon} size={20} /> : null}
              {item.label}
            </span>
            {item.note ? <span className="bf-tab-note">{item.note}</span> : null}
          </button>
        ))}
      </div>
      {panels.map((panel, i) => (
        <div key={items[i]!.id} role="tabpanel" id={`${base}-panel-${items[i]!.id}`} aria-labelledby={`${base}-tab-${items[i]!.id}`} hidden={i !== active} tabIndex={0} className="bf-tabpanel">
          {panel}
        </div>
      ))}
    </div>
  );
}

/**
 * The shop window: a shelf of displays that scrolls sideways, in the
 * page's direction. The buttons move it a display at a time, the arrow keys
 * scroll it once it has focus, a mouse can drag it, and each display's
 * spotlight follows the pointer (`--mx`, `--my`).
 */
export function Shelf({ label, prev, next, children }: { label: string; prev: string; next: string; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [ends, setEnds] = useState({ start: true, end: false });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const sync = () => {
      raf = 0;
      const max = el.scrollWidth - el.clientWidth;
      const at = Math.abs(el.scrollLeft);
      setEnds({ start: at < 4, end: at > max - 4 });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };
    sync();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const step = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const item = el.querySelector<HTMLElement>("[data-kind]");
    const width = (item?.getBoundingClientRect().width ?? 320) + 20;
    const reduce = window.matchMedia(REDUCE).matches;
    el.scrollBy({ left: width * dir * (rtl ? -1 : 1), behavior: reduce ? "auto" : "smooth" });
  };

  const light = (event: PointerEvent<HTMLDivElement>) => {
    const display = (event.target as HTMLElement).closest<HTMLElement>(".bf-display");
    if (display) {
      const r = display.getBoundingClientRect();
      display.style.setProperty("--mx", `${(((event.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      display.style.setProperty("--my", `${(((event.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    }
    const d = drag.current;
    const el = track.current;
    if (d && el) {
      const dx = event.clientX - d.x;
      if (Math.abs(dx) > 6) d.moved = true;
      if (d.moved) el.scrollLeft = d.left - dx;
    }
  };

  return (
    <div className="bf-shelf">
      <div
        ref={track}
        className="bf-shelf-track"
        role="region"
        aria-label={label}
        tabIndex={0}
        data-bleed=""
        onPointerMove={light}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || e.button !== 0 || (e.target as HTMLElement).closest("a, button, summary")) return;
          drag.current = { x: e.clientX, left: track.current?.scrollLeft ?? 0, moved: false };
          track.current?.setAttribute("data-dragging", "");
        }}
        onPointerUp={() => {
          drag.current = null;
          track.current?.removeAttribute("data-dragging");
        }}
        onPointerLeave={() => {
          drag.current = null;
          track.current?.removeAttribute("data-dragging");
        }}
      >
        {children}
      </div>
      <div className="bf-shelf-buttons">
        <button type="button" className="bf-round" onClick={() => step(-1)} disabled={ends.start} aria-label={prev} data-shelf-prev="">
          <Icon name="arrow_back" size={22} />
        </button>
        <button type="button" className="bf-round" onClick={() => step(1)} disabled={ends.end} aria-label={next} data-shelf-next="">
          <Icon name="arrow_forward" size={22} />
        </button>
      </div>
    </div>
  );
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** "$96.00" → 96, "EGP 4,800" → 4800. */
function amountOf(text: string): { value: number; decimals: number; match: string } | null {
  const m = /\d[\d,]*(?:\.(\d+))?/.exec(text);
  if (!m) return null;
  return { value: Number(m[0].replace(/,/g, "")), decimals: m[1]?.length ?? 0, match: m[0] };
}

/**
 * The page's motion, for the whole page at once (`[data-bf]`):
 *
 * - `[data-reveal]` rises into view once (`data-shown`);
 * - `[data-progress]` scenes get their scroll progress as `--p`, from one
 *   passive scroll listener, once per frame, only while they're near the
 *   screen ("pin": through a pinned scene; "pass": across the screen;
 *   "exit": the opening, leaving the top);
 * - `[data-count-to]` counts from its normal price down to the offer's
 *   with its scene's progress, and always ends on the text as written.
 *
 * With "reduce motion" (or no script) nothing is hidden, nothing is pinned
 * and every scene stands in its final state.
 */
export function BlackFridayMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-bf]");
    if (!root) return;
    const query = window.matchMedia(REDUCE);
    if (query.matches || !("IntersectionObserver" in window)) {
      root.dataset.motion = "reduced";
      return;
    }
    root.dataset.motion = "on";

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.shown = "";
          reveal.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    root.querySelectorAll<HTMLElement>("[data-reveal], [data-print]").forEach((el) => reveal.observe(el));

    const near = new Set<HTMLElement>();
    let raf = 0;
    const counters = new Map<HTMLElement, HTMLElement[]>();
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of near) {
        const r = el.getBoundingClientRect();
        const mode = el.dataset.progress;
        const p = mode === "pin" ? clamp(-r.top / Math.max(1, r.height - vh)) : mode === "exit" ? clamp(-r.top / Math.max(1, r.height)) : clamp((vh - r.top) / (vh + r.height));
        el.style.setProperty("--p", p.toFixed(4));
        for (const c of counters.get(el) ?? []) {
          const from = amountOf(c.dataset.countFrom ?? "");
          const written = c.dataset.countTo ?? "";
          const to = amountOf(written);
          if (!from || !to) continue;
          const t = clamp((p - Number(c.dataset.countStart ?? 0.5)) / Number(c.dataset.countSpan ?? 0.3));
          const eased = 1 - Math.pow(1 - t, 3);
          const value = from.value + (to.value - from.value) * eased;
          const text = t >= 1 ? written : written.replace(to.match, value.toLocaleString("en-US", { minimumFractionDigits: to.decimals, maximumFractionDigits: to.decimals }));
          if (c.textContent !== text) c.textContent = text;
        }
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const scenes = [...root.querySelectorAll<HTMLElement>("[data-progress]")];
    for (const el of scenes) counters.set(el, [...el.querySelectorAll<HTMLElement>("[data-count-to]")]);
    const watch = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) near.add(entry.target as HTMLElement);
          else near.delete(entry.target as HTMLElement);
        }
        schedule();
      },
      { rootMargin: "25% 0px" },
    );
    scenes.forEach((el) => watch.observe(el));
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const off = () => {
      if (!query.matches) return;
      root.dataset.motion = "reduced";
      root.querySelectorAll<HTMLElement>("[data-count-to]").forEach((c) => (c.textContent = c.dataset.countTo ?? c.textContent));
    };
    query.addEventListener("change", off);
    schedule();
    return () => {
      reveal.disconnect();
      watch.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      query.removeEventListener("change", off);
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}

/** Runs `draw` once per frame while the canvas is on screen and the tab is visible; never with reduced motion. */
function useCanvasLoop(ref: React.RefObject<HTMLCanvasElement | null>, setup: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => ((t: number) => boolean | void) | null, threshold = 0) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia(REDUCE).matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const draw = setup(canvas, ctx);
    if (!draw) return;
    let raf = 0;
    let seen = false;
    let done = false;
    const loop = (t: number) => {
      raf = 0;
      if (done || !seen || document.hidden) return;
      if (draw(t) === false) {
        done = true;
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!raf && seen && !document.hidden && !done) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        seen = Boolean(entry?.isIntersecting);
        start();
      },
      { threshold },
    );
    io.observe(canvas);
    document.addEventListener("visibilitychange", start);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", start);
      cancelAnimationFrame(raf);
    };
  }, [ref, setup, threshold]);
}

function sizeCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): { w: number; h: number } {
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}

const dustSetup = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
  let { w, h } = sizeCanvas(canvas, ctx);
  const count = w < 640 ? 26 : 56;
  const dots = Array.from({ length: count }, () => ({ x: Math.random() * w, y: Math.random() * h, r: 0.6 + Math.random() * 1.8, v: 0.08 + Math.random() * 0.25, drift: Math.random() * Math.PI * 2, tw: Math.random() * Math.PI * 2 }));
  const color = () => getComputedStyle(canvas).color || "#ff7a45";
  let fill = color();
  let last = 0;
  const onResize = () => {
    ({ w, h } = sizeCanvas(canvas, ctx));
    fill = color();
  };
  window.addEventListener("resize", onResize);
  return (t: number) => {
    const dt = last ? Math.min(50, t - last) : 16;
    last = t;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = fill;
    for (const d of dots) {
      d.y -= d.v * dt * 0.06;
      d.x += Math.sin(t / 2400 + d.drift) * 0.12;
      if (d.y < -4) {
        d.y = h + 4;
        d.x = Math.random() * w;
      }
      ctx.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t / 700 + d.tw));
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
};

/** Slow gold dust in the opening: a few dozen points, paused off screen and in a hidden tab. */
export function GoldDust() {
  const ref = useRef<HTMLCanvasElement>(null);
  useCanvasLoop(ref, dustSetup);
  return <canvas ref={ref} aria-hidden="true" className="bf-dust" data-bleed="" />;
}

const confettiSetup = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
  const { w, h } = sizeCanvas(canvas, ctx);
  const colors = ["#ff7a45", "#ffc2a6", "#c2410c", "#ff5a1f", "#fff6f0"];
  const n = w < 640 ? 100 : 180;
  const bits = Array.from({ length: n }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
    const speed = 8 + Math.random() * 11;
    return { x: w / 2 + (Math.random() - 0.5) * 80, y: h * 0.78, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, s: 4 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[Math.floor(Math.random() * colors.length)]! };
  });
  let start = 0;
  return (t: number) => {
    if (!start) start = t;
    const age = t - start;
    ctx.clearRect(0, 0, w, h);
    for (const b of bits) {
      b.vy += 0.16;
      b.vx *= 0.985;
      b.vy *= 0.985;
      b.x += b.vx;
      b.y += b.vy;
      b.rot += b.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - age / 3600);
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
      ctx.restore();
    }
    if (age > 3600) {
      ctx.clearRect(0, 0, w, h);
      return false;
    }
  };
};

/** One burst of gold confetti behind the closing call, the first time it comes into view. */
export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useCanvasLoop(ref, confettiSetup, 0.45);
  return <canvas ref={ref} aria-hidden="true" className="bf-confetti" data-bleed="" />;
}
