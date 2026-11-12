"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import type { Lang } from "@/i18n/config";
import { formatMessage, formatNumber } from "@/i18n/format";

/**
 * 124 The live parts of Black Friday's page: the countdown, and the tabs
 * of the plans' families and of the kinds of app. The words and the
 * panels come from the server, already in the page's language.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

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
 * The time left to `to`. The first render uses the server's clock
 * (`serverNow`), so the server's HTML and the browser's first render are
 * the same; the browser's clock takes over after. Screen readers get one
 * label to the minute (role="timer" is never announced on its own), and
 * with reduced motion the seconds are left out and it ticks each minute.
 * At zero the page is fetched again, in its new state.
 */
export function Countdown({ lang, to, serverNow, words }: { lang: Lang; to: string; serverNow: string; words: CountdownWords }) {
  const target = Date.parse(to);
  const [now, setNow] = useState(() => Date.parse(serverNow));
  const [still, setStill] = useState(false);
  const router = useRouter();
  const refreshed = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
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
    <div role="timer" aria-label={label} className="flex flex-col gap-2" data-countdown="" data-target={to}>
      <span aria-hidden="true" className="text-[13px] font-bold tracking-[0.8px] text-white/70 uppercase">
        {words.heading}
      </span>
      <ol aria-hidden="true" className="m-0 flex list-none gap-2 p-0 sm:gap-3">
        {units.map((u) => (
          <li key={u.key} className="flex min-w-[64px] flex-col items-center rounded-2xl border border-white/15 bg-white/8 px-2.5 py-2 sm:min-w-[76px]">
            <span className="text-[30px] leading-none font-extrabold tabular-nums sm:text-[38px]" data-unit={u.key}>
              {formatNumber(lang, p[u.key], { minimumIntegerDigits: 2 })}
            </span>
            <span className="mt-1 text-[12px] font-semibold text-white/70">{formatMessage(lang, u.word, { count: p[u.key] })}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export interface TabItem {
  id: string;
  label: string;
  icon?: IconName;
  /** A short line under the label (the segmented style). */
  note?: string;
}

/**
 * Tabs over panels rendered by the server: arrow keys, Home and End move
 * between them (in the page's direction), and every panel is in the HTML,
 * the others `hidden`.
 */
export function Tabs({ label, items, panels, variant = "pills" }: { label: string; items: TabItem[]; panels: ReactNode[]; variant?: "pills" | "segmented" }) {
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
  const tabClass = (on: boolean) =>
    variant === "segmented"
      ? `flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-xl px-4 py-3 text-start transition-colors ${on ? "bg-midnight text-ivory" : "text-ink-3 hover:bg-sand"}`
      : `flex items-center gap-2 rounded-full border px-3.5 py-2 text-[14px] font-bold transition-colors ${on ? "border-midnight bg-midnight text-ivory" : "border-line bg-white text-ink-3 hover:border-midnight"}`;
  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label={label}
        className={variant === "segmented" ? "flex flex-col gap-1 rounded-2xl border border-line bg-white p-1.5 sm:flex-row" : "flex flex-wrap gap-2"}
      >
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
            className={tabClass(i === active)}
            data-tab={item.id}
          >
            <span className="flex items-center gap-2">
              {item.icon ? <Icon name={item.icon} size={18} /> : null}
              <span className={variant === "segmented" ? "text-[16px] font-extrabold" : ""}>{item.label}</span>
            </span>
            {item.note ? <span className={`text-[13px] leading-snug ${i === active ? "text-ivory/80" : "text-muted"}`}>{item.note}</span> : null}
          </button>
        ))}
      </div>
      {panels.map((panel, i) => (
        <div key={items[i]!.id} role="tabpanel" id={`${base}-panel-${items[i]!.id}`} aria-labelledby={`${base}-tab-${items[i]!.id}`} hidden={i !== active} tabIndex={0} className="focus-visible:outline-offset-4">
          {panel}
        </div>
      ))}
    </div>
  );
}
