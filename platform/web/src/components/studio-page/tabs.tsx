"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * 132.160 A page's own parts as a segmented control in the console's look
 * (Delivery & offers' checkout, delivery times, zones…), the parts below
 * it: the part open is kept in the address (`?tab=`), so a link opens it,
 * and an old link to a part (`#h-delivery`) or a button that opens a part
 * (`aria-controls`) opens the part that holds it.
 */

const Ctx = createContext<string | null>(null);

export function KitTabs({ tabs, initial, label, children }: { tabs: { id: string; label: string; count?: number }[]; initial: string; label: string; children: ReactNode }) {
  const [tab, setTab] = useState(tabs.some((t) => t.id === initial) ? initial : tabs[0]!.id);
  const bar = useRef<HTMLDivElement>(null);
  const open = useCallback((next: string) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, []);
  useEffect(() => {
    bar.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);
  // A part asked for by an old link (`#h-delivery`) or a button (`aria-controls`): its tab opens, then the part is in sight.
  useEffect(() => {
    const show = (id: string) => {
      const el = id ? document.getElementById(id) : null;
      const panel = el?.closest<HTMLElement>("[data-kit-tab-panel]");
      if (!el || !panel || !panel.hidden) return false;
      open(panel.dataset.kitTabPanel!);
      requestAnimationFrame(() => {
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
    bar.current?.querySelector<HTMLElement>(`#kit-tab-${next.id}`)?.focus();
  };
  return (
    <Ctx.Provider value={tab}>
      <div ref={bar} className="max-w-full min-w-0">
        <div role="tablist" aria-label={label} className="flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-[13px] bg-(--sp-seg-track) p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t, i) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                id={`kit-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`kit-panel-${t.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => open(t.id)}
                onKeyDown={(e) => move(e, i)}
                data-tab={t.id}
                className={`flex h-[34px] shrink-0 cursor-pointer items-center gap-[7px] rounded-[10px] border-0 px-3.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors ${on ? "bg-(--sp-seg-on) text-(--sp-ink) shadow-(--sp-shadow)" : "bg-transparent text-(--sp-muted) hover:text-(--sp-ink)"}`}
              >
                {t.label}
                {t.count !== undefined ? <span className="font-sans text-[11px] font-semibold text-(--sp-faint) tabular-nums">{t.count}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      {children}
    </Ctx.Provider>
  );
}

/** One part's content, hidden while another is open (outside KitTabs it always shows). */
export function KitTabPanel({ tab, children, className = "flex flex-col gap-5" }: { tab: string; children: ReactNode; className?: string }) {
  const current = useContext(Ctx);
  return (
    <div role="tabpanel" id={`kit-panel-${tab}`} aria-labelledby={`kit-tab-${tab}`} data-kit-tab-panel={tab} hidden={current !== null && current !== tab} className={className}>
      {children}
    </div>
  );
}
