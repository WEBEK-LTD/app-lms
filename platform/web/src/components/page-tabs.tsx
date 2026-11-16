"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";

/**
 * 132.13 A page's own tabs (the course editor's; 132.17 a restaurant's, a
 * service list's, an event's…): the tab is kept in the address (`?tab=`), so
 * a link opens it; a tab with unsaved changes shows a dot, and one with a
 * field to fix shows that. An old link to a part (`#h-hours`) opens the tab
 * that holds it, and so does a button that opens a part (`aria-controls`).
 */
export interface PageTab {
  id: string;
  label: string;
  icon: IconName;
  count?: number;
}

const Ctx = createContext<{ tab: string; mark: (tab: string, state: { dirty?: boolean; error?: boolean }) => void; open: (tab: string) => void } | null>(null);

export function usePageTab() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePageTab needs PageTabs");
  return ctx;
}

export function PageTabs({ tabs, initial, label, children }: { tabs: PageTab[]; initial: string; label: string; children: ReactNode }) {
  const [tab, setTab] = useState(tabs.some((t) => t.id === initial) ? initial : tabs[0]!.id);
  const [marks, setMarks] = useState<Record<string, { dirty?: boolean; error?: boolean }>>({});
  const bar = useRef<HTMLDivElement>(null);
  const open = useCallback((next: string) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, []);
  const mark = useCallback((id: string, state: { dirty?: boolean; error?: boolean }) => {
    setMarks((all) => (all[id]?.dirty === state.dirty && all[id]?.error === state.error ? all : { ...all, [id]: state }));
  }, []);
  useEffect(() => {
    bar.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);
  // A part asked for by an old link (`#h-hours`) or a button (`aria-controls`): its tab opens, then the part is in sight.
  useEffect(() => {
    const show = (id: string) => {
      const el = id ? document.getElementById(id) : null;
      const panel = el?.closest<HTMLElement>("[data-tab-panel]");
      if (!el || !panel || !panel.hidden) return false;
      open(panel.dataset.tabPanel!);
      requestAnimationFrame(() => {
        if (el instanceof HTMLDetailsElement) el.open = true;
        el.scrollIntoView({ block: "start" });
        el.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select")?.focus({ preventScroll: true });
      });
      return true;
    };
    const fromHash = () => show(decodeURIComponent(window.location.hash.slice(1)));
    fromHash();
    const onClick = (event: MouseEvent) => {
      const control = (event.target as Element | null)?.closest?.("[aria-controls]");
      if (control && !control.closest('[role="tablist"]')) show(control.getAttribute("aria-controls") ?? "");
    };
    window.addEventListener("hashchange", fromHash);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("hashchange", fromHash);
      document.removeEventListener("click", onClick, true);
    };
  }, [open]);
  const move = (event: React.KeyboardEvent, i: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const next = tabs[(i + (rtl ? -step : step) + tabs.length) % tabs.length]!;
    open(next.id);
    bar.current?.querySelector<HTMLElement>(`#tab-${next.id}`)?.focus();
  };
  return (
    <Ctx.Provider value={{ tab, mark, open }}>
      <div ref={bar} className="-mx-1 border-b border-line">
        <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t, i) => {
            const on = t.id === tab;
            const m = marks[t.id];
            return (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`panel-${t.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => open(t.id)}
                onKeyDown={(e) => move(e, i)}
                data-tab={t.id}
                className={`relative -mb-px flex h-11 shrink-0 cursor-pointer items-center gap-2 border-0 border-b-2 bg-transparent px-3 text-[15px] ${on ? "border-ember font-extrabold text-midnight" : "border-transparent font-semibold text-muted hover:border-line-strong hover:text-midnight"}`}
              >
                <Icon name={t.icon} size={19} className={on ? "text-accent" : ""} />
                {t.label}
                {t.count !== undefined ? <span className={`rounded-full px-1.5 text-xs tabular-nums ${on ? "bg-peach text-accent" : "bg-sand text-muted"}`}>{t.count}</span> : null}
                {m?.error ? <Icon name="error" size={16} className="text-danger" /> : m?.dirty ? <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ember" /> : null}
              </button>
            );
          })}
        </div>
      </div>
      {children}
    </Ctx.Provider>
  );
}

/**
 * One tab's content (a tab may have more than one, inside and after a form);
 * hidden while another tab is open. With `also`, it shows on those tabs too
 * (a form's card around its tabs' parts). Outside PageTabs it always shows.
 */
export function TabPanel({ tab, also = [], children, className = "flex flex-col gap-5", first = true }: { tab: string; also?: string[]; children: ReactNode; className?: string; first?: boolean }) {
  const current = useContext(Ctx)?.tab;
  const shown = current === undefined || current === tab || also.includes(current);
  return (
    <div role="tabpanel" id={first ? `panel-${tab}` : undefined} aria-labelledby={`tab-${tab}`} data-tab-panel={also.length ? undefined : tab} hidden={!shown} className={className}>
      {children}
    </div>
  );
}

/** Shown while one of `tabs` is open (always outside PageTabs). */
export function OnTabs({ tabs, children }: { tabs: string[]; children: ReactNode }) {
  const tab = useContext(Ctx)?.tab;
  return tab === undefined || tabs.includes(tab) ? <>{children}</> : null;
}
