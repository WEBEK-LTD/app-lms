"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";

/**
 * 132.13 The course editor's tabs: Details, Curriculum, Pricing and access,
 * Students, Certificate and Settings. The tab is kept in the address
 * (`?tab=`), so a link opens it; a tab with unsaved changes shows a dot, and
 * one with a field to fix shows that.
 */
export interface EditorTab {
  id: string;
  label: string;
  icon: IconName;
  count?: number;
}

const Ctx = createContext<{ tab: string; mark: (tab: string, state: { dirty?: boolean; error?: boolean }) => void; open: (tab: string) => void } | null>(null);

export function useEditorTab() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEditorTab needs CourseEditorTabs");
  return ctx;
}

export function CourseEditorTabs({ tabs, initial, label, children }: { tabs: EditorTab[]; initial: string; label: string; children: ReactNode }) {
  const [tab, setTab] = useState(tabs.some((t) => t.id === initial) ? initial : tabs[0]!.id);
  const [marks, setMarks] = useState<Record<string, { dirty?: boolean; error?: boolean }>>({});
  const bar = useRef<HTMLDivElement>(null);
  const open = useCallback((next: string) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  }, []);
  const mark = useCallback((id: string, state: { dirty?: boolean; error?: boolean }) => {
    setMarks((all) => (all[id]?.dirty === state.dirty && all[id]?.error === state.error ? all : { ...all, [id]: state }));
  }, []);
  useEffect(() => {
    bar.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);
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

/** One tab's content (a tab may have more than one, inside and after the course's form); hidden while another tab is open. */
export function TabPanel({ tab, children, className = "flex flex-col gap-5", first = true }: { tab: string; children: ReactNode; className?: string; first?: boolean }) {
  const { tab: current } = useEditorTab();
  return (
    <div role="tabpanel" id={first ? `panel-${tab}` : undefined} aria-labelledby={`tab-${tab}`} data-tab-panel={tab} hidden={current !== tab} className={className}>
      {children}
    </div>
  );
}

/** Shown while one of `tabs` is open. */
export function OnTabs({ tabs, children }: { tabs: string[]; children: ReactNode }) {
  const { tab } = useEditorTab();
  return tabs.includes(tab) ? <>{children}</> : null;
}
