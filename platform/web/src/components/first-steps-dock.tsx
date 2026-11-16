"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "./icon";

/** 132.72 The cookie that remembers the first steps folded or open in this browser (components/first-steps.tsx reads it). */
const STEPS_DOCK_COOKIE = "yallapp_steps_dock";
export type DockState = "open" | "folded";

/**
 * 132.72 Studio editor's "Your first steps", docked on the elements' side:
 * never over the inspector, never the whole phone screen. Folded it is a
 * small pill with the progress; open it is the panel, as tall as the space
 * allows. The choice is remembered in this browser (a cookie, so the page
 * opens as it was left); until one is made it is open on a computer and
 * folded on a phone.
 */
export function FirstStepsDock({ initial, title, progress, fold, open, children }: { initial: DockState | null; title: string; progress: string; fold: string; open: string; children: ReactNode }) {
  const [state, setState] = useState<DockState | null>(initial);
  const choose = (next: DockState) => {
    setState(next);
    document.cookie = `${STEPS_DOCK_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
  };
  // Unchosen: the panel from 1024 pixels, the pill below.
  const panelClass = state === "folded" ? "hidden" : state === "open" ? "flex" : "hidden lg:flex";
  const pillClass = state === "folded" ? "flex" : state === "open" ? "hidden" : "flex lg:hidden";
  return (
    <div data-first-steps-dock={state ?? "auto"}>
      <div className={`${panelClass} fixed start-4 bottom-4 z-40 max-h-[min(70dvh,640px)] w-[min(320px,calc(100vw-32px))] flex-col overflow-hidden rounded-[22px] shadow-[0_24px_60px_rgba(14,13,36,0.35)]`} data-first-steps-float="">
        <button
          type="button"
          onClick={() => choose("folded")}
          aria-label={fold}
          title={fold}
          className="absolute end-14 top-4 z-10 flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[var(--pk-ink2)]"
          data-first-steps-fold=""
        >
          <Icon name="expand_more" size={22} />
        </button>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
      <button
        type="button"
        onClick={() => choose("open")}
        aria-label={open}
        className={`${pillClass} fixed start-4 bottom-4 z-40 cursor-pointer items-center gap-2 rounded-full border-0 bg-[#0E0D24] py-2.5 ps-3 pe-4 text-[13px] font-bold text-[#F4EFE6] shadow-[0_12px_30px_rgba(14,13,36,0.3)]`}
        data-first-steps-pill=""
      >
        <Icon name="task_alt" size={18} />
        <span>{title}</span>
        <span className="font-semibold opacity-75">{progress}</span>
        <Icon name="expand_less" size={18} />
      </button>
    </div>
  );
}
