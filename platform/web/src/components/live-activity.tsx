"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "@/i18n/config";
import type { LiveFeed, LiveItem } from "@/lib/live-activity/types";
import { liveOnPath, relativeTime } from "@/lib/live-activity/time";
import { Icon } from "./icon";
import "./live-activity.css";

/**
 * The live activity card (Admin › Live activity) in the bottom start corner
 * of the marketing pages: bottom left in English and Turkish, bottom right
 * in Arabic. One real activity at a time from GET /api/live-activity, each
 * for a few seconds with a shrinking ember line, a pause between them, and
 * at most the team's number per visit. Closed, it stays away for the rest of
 * the visit (the tab's sessionStorage). Hovering or focusing it pauses it.
 * With reduced motion it appears and goes without moving.
 */

const CLOSED_KEY = "yallapp-live-closed";
const SHOWN_KEY = "yallapp-live-shown";
/** How long the card takes to slide away before the next one. */
const OUT_MS = 450;

function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Storage blocked (a private window): the card still works for this page.
  }
}

const TONE: Record<LiveItem["tone"], string> = {
  ember: "bg-ember text-white",
  night: "bg-midnight text-white",
  ok: "bg-success text-white",
  earth: "bg-warn text-white",
};

/** How many cards this visit has shown. */
function shownSoFar(): number {
  return Number(readSession(SHOWN_KEY) ?? "0") || 0;
}

export function LiveActivity({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const [feed, setFeed] = useState<LiveFeed | null>(null);
  /** The how-manyth card of this page (its item is `step % items`); null before the first and after the last. */
  const [step, setStep] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [closed, setClosed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The wait running now: when it ends, what comes next, and how long was left when it was paused. */
  const due = useRef<{ at: number; left: number; next: () => void } | null>(null);

  const wait = useCallback((ms: number, next: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    due.current = { at: Date.now() + ms, left: ms, next };
    timer.current = setTimeout(() => {
      due.current = null;
      next();
    }, ms);
  }, []);

  // The feed, once per page, unless the visitor closed the card in this visit.
  useEffect(() => {
    if (readSession(CLOSED_KEY) === "1") return;
    const controller = new AbortController();
    fetch(`/api/live-activity?lang=${lang}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<LiveFeed>) : null))
      .then((data) => {
        if (data?.on && data.items?.length) setFeed(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [lang]);

  const here = Boolean(feed && !closed && liveOnPath(feed.pages, pathname));

  // The first card after the team's delay.
  useEffect(() => {
    if (!feed || !here || shownSoFar() >= feed.maxPerVisit) return;
    wait(feed.firstDelayMs, () => setStep(0));
    return () => {
      if (timer.current) clearTimeout(timer.current);
      due.current = null;
    };
  }, [feed, here, wait]);

  const counted = useRef<number | null>(null);
  // Each card: in, its time, out, the pause, then the next one until the visit's number.
  useEffect(() => {
    if (!feed || step === null) return;
    // Counted once per card (React may run this twice in development).
    if (counted.current !== step) {
      counted.current = step;
      writeSession(SHOWN_KEY, String(shownSoFar() + 1));
    }
    const frame = requestAnimationFrame(() => setVisible(true));
    wait(feed.showMs, () => {
      setVisible(false);
      wait(OUT_MS + feed.gapMs, () => setStep(shownSoFar() >= feed.maxPerVisit ? null : step + 1));
    });
    return () => cancelAnimationFrame(frame);
  }, [feed, step, wait]);

  // Hover or focus pauses the card's time; leaving it resumes.
  const wasPaused = useRef(false);
  useEffect(() => {
    const d = due.current;
    if (paused === wasPaused.current || !d) return;
    wasPaused.current = paused;
    if (paused) {
      if (timer.current) clearTimeout(timer.current);
      d.left = Math.max(0, d.at - Date.now());
    } else {
      wait(d.left, d.next);
    }
  }, [paused, wait]);

  if (!feed || !here) return null;
  const item = step === null ? null : feed.items[step % feed.items.length];

  const close = () => {
    if (timer.current) clearTimeout(timer.current);
    due.current = null;
    writeSession(CLOSED_KEY, "1");
    setClosed(true);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={feed.words.region}
      data-live-activity=""
      className="pointer-events-none fixed start-4 bottom-[calc(16px+env(safe-area-inset-bottom,0px))] z-40 w-[min(360px,calc(100vw-32px))] sm:start-5 sm:bottom-[calc(20px+env(safe-area-inset-bottom,0px))]"
    >
      {item ? <Card key={step} item={item} lang={lang} feed={feed} visible={visible} paused={paused} onPause={setPaused} onClose={close} /> : null}
    </div>
  );
}

function Card({
  item,
  lang,
  feed,
  visible,
  paused,
  onPause,
  onClose,
}: {
  item: LiveItem;
  lang: Lang;
  feed: LiveFeed;
  visible: boolean;
  paused: boolean;
  onPause: (paused: boolean) => void;
  onClose: () => void;
}) {
  const when = item.at ? relativeTime(lang, new Date(item.at), new Date(), { day: item.day }) : feed.words.brand;
  return (
    <div
      onMouseEnter={() => onPause(true)}
      onMouseLeave={() => onPause(false)}
      onFocus={() => onPause(true)}
      onBlur={() => onPause(false)}
      data-live-kind={item.kind}
      className={`pointer-events-auto relative grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-[18px] border border-line bg-white py-3 ps-3.5 pe-2.5 text-midnight shadow-[0_24px_48px_-24px_rgba(14,13,36,0.45),0_2px_6px_rgba(14,13,36,0.06)] transition-[translate,opacity] duration-[600ms] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0 motion-reduce:translate-y-0"
      }`}
    >
      <span aria-hidden="true" className={`relative grid h-12 w-12 place-items-center rounded-[14px] text-lg font-extrabold ${TONE[item.tone]}`}>
        {"letter" in item.avatar ? item.avatar.letter : <Icon name={item.avatar.icon} size={24} />}
        <span className="absolute -end-[3px] -bottom-[3px] h-3.5 w-3.5 rounded-full border-2 border-white bg-success" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm leading-[1.45] font-semibold">
          {item.text.map((part, i) => (
            <span key={i} className={part.em ? "text-accent" : undefined}>
              {part.text}
            </span>
          ))}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-4">
          <span aria-hidden="true" className="h-[7px] w-[7px] flex-none rounded-full bg-success" />
          <span className="min-w-0 truncate">
            {item.detail ? (
              <>
                <bdi>{item.detail}</bdi>
                {" · "}
              </>
            ) : null}
            {when}
          </span>
        </span>
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label={feed.words.close}
        className="grid h-8 w-8 cursor-pointer place-items-center self-start rounded-lg border-0 bg-transparent text-ink-4 hover:bg-ivory hover:text-midnight"
      >
        <Icon name="close" size={18} />
      </button>
      <span aria-hidden="true" className="absolute inset-x-3.5 bottom-1.5 h-0.5 overflow-hidden rounded-full bg-peach">
        <i
          className={`live-bar block h-full w-full origin-left bg-ember rtl:origin-right ${paused ? "[animation-play-state:paused]" : ""}`}
          style={{ animationDuration: `${feed.showMs}ms` }}
        />
      </span>
    </div>
  );
}
