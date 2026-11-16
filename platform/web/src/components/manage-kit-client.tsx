"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { useFormStatus } from "react-dom";
import { useDashT } from "./dashboard-i18n";
import { Icon } from "./icon";
import type { IconName } from "./icon-names";
import { btn } from "./ui";

/**
 * 132.10 The management kit's parts that run in the browser (manage-kit.tsx
 * has the rest): the tabs between a manager's own pages (Products,
 * Categories, Coupons…), an editor's sticky save bar with its "unsaved
 * changes" warning, a list that is reordered by dragging (or with the
 * keyboard and the arrow buttons), and the list or grid switch.
 */

/** A dashboard address as the tabs compare it: Studio's frame and the language's prefix taken off. */
function dashboardPath(path: string): string {
  return path.replace(/^\/(?:ar|tr)(?=\/)/, "").replace(/^\/studio\/project(?=\/|$)/, "/dashboard").replace(/\/+$/, "");
}

export interface SectionTab {
  /** The page's dashboard address (Studio's frame opens its own). */
  href: string;
  label: string;
  icon?: IconName;
  /** A small number beside the name (how many there are). */
  count?: number;
}

/**
 * The tabs of a manager's own pages, under its header: the current one is
 * the tab whose address is the longest start of the page's (so a product's
 * editor keeps Products current). They scroll sideways on a phone.
 */
export function SectionTabs({ label, items }: { label: string; items: SectionTab[] }) {
  const path = dashboardPath(usePathname() ?? "");
  const current = items
    .map((item) => item.href.split("?")[0]!)
    .filter((href) => path === href || path.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
  const list = useRef<HTMLUListElement>(null);
  // The current tab in sight on a phone.
  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);
  return (
    <nav aria-label={label} data-section-tabs="" className="-mx-1 border-b border-line">
      <ul ref={list} className="m-0 flex list-none gap-1 overflow-x-auto p-0 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const on = item.href.split("?")[0] === current;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`relative -mb-px flex h-11 items-center gap-2 border-b-2 px-3 text-[15px] no-underline transition-colors ${
                  on ? "border-ember font-extrabold text-midnight hover:text-midnight" : "border-transparent font-semibold text-muted hover:border-line-strong hover:text-midnight"
                }`}
              >
                {item.icon ? <Icon name={item.icon} size={19} className={on ? "text-accent" : ""} /> : null}
                {item.label}
                {item.count !== undefined ? <span className={`rounded-full px-1.5 text-xs tabular-nums ${on ? "bg-peach text-accent" : "bg-sand text-muted"}`}>{item.count}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** What a form holds, to tell whether anything changed (a chosen file by its name and size). */
function snapshot(form: HTMLFormElement): string {
  const parts: string[] = [];
  for (const [key, value] of new FormData(form)) parts.push(`${key}=${typeof value === "string" ? value : `${value.name}:${value.size}`}`);
  return parts.join("\u0001");
}

/**
 * Whether the form has unsaved changes: what it holds now against what it
 * held when it opened (or when `markClean` was last called). Typing,
 * choosing and the editors' own buttons all count; undoing a change clears it.
 */
export function useDirtyForm(form: RefObject<HTMLFormElement | null>): { dirty: boolean; markClean: () => void } {
  const [dirty, setDirty] = useState(false);
  // Each call of markClean takes what the form holds now as its start again.
  const [cleanAt, setCleanAt] = useState(0);
  useEffect(() => {
    const el = form.current;
    if (!el) return;
    let base: string | null = null;
    const frame = requestAnimationFrame(() => {
      base = snapshot(el);
      setDirty(false);
    });
    let pending = 0;
    const later = () => {
      window.clearTimeout(pending);
      pending = window.setTimeout(() => {
        if (base === null) base = snapshot(el);
        setDirty(snapshot(el) !== base);
      }, 0);
    };
    el.addEventListener("input", later);
    el.addEventListener("change", later);
    el.addEventListener("click", later);
    // The editors' hidden fields change without an event of their own.
    const observer = new MutationObserver(later);
    observer.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ["value", "checked"] });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(pending);
      el.removeEventListener("input", later);
      el.removeEventListener("change", later);
      el.removeEventListener("click", later);
      observer.disconnect();
    };
  }, [form, cleanAt]);
  const markClean = useCallback(() => setCleanAt((n) => n + 1), []);
  return { dirty, markClean };
}

/**
 * While `dirty`, leaving the page asks first: closing or reloading the tab
 * (the browser's own question), and a link on the page (`message`).
 */
export function useLeaveGuard(dirty: boolean, message: string) {
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download") || link.hasAttribute("data-leave-ok")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    // Before Next's own link handling and Studio's.
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, message]);
}

/**
 * An editor's bar at the foot of the screen while its form scrolls: whether
 * there are unsaved changes (or how many fields need fixing), a way out and
 * the Save button. Inside the form; `pending` while it saves.
 */
export function SaveBar({
  dirty,
  pending,
  saveLabel,
  errorCount = 0,
  words,
  cancel,
  children,
}: {
  dirty: boolean;
  pending: boolean;
  saveLabel: string;
  errorCount?: number;
  words: { unsaved: string; saved: string; saving: string; errors: string };
  /** A link back (to the list). */
  cancel?: { href: string; label: string };
  /** More buttons before Save. */
  children?: ReactNode;
}) {
  const state = pending ? "saving" : errorCount ? "errors" : dirty ? "unsaved" : "saved";
  return (
    <div data-save-bar={state} className="sticky bottom-3 z-20 mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-[0_8px_30px_rgba(14,13,36,0.12)] backdrop-blur sm:px-5">
      <p role="status" aria-live="polite" className="m-0 flex min-w-0 flex-[1_1_180px] items-center gap-2 text-sm font-semibold">
        {state === "saving" ? (
          <>
            <Icon name="progress_activity" size={18} className="animate-spin text-muted" />
            <span className="text-muted">{words.saving}</span>
          </>
        ) : state === "errors" ? (
          <>
            <Icon name="error" size={18} className="text-danger" />
            <span className="text-danger">{words.errors}</span>
          </>
        ) : state === "unsaved" ? (
          <>
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-ember" />
            <span>{words.unsaved}</span>
          </>
        ) : (
          <>
            <Icon name="cloud_done" size={18} className="text-success" />
            <span className="text-muted">{words.saved}</span>
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {cancel ? (
          <Link href={cancel.href} className={`${btn.ghost} h-10 px-3 hover:bg-sand`}>
            {cancel.label}
          </Link>
        ) : null}
        {children}
        <button type="submit" disabled={pending} className={`${btn.main} h-11`} data-save-button="">
          {pending ? <Icon name="progress_activity" size={20} className="animate-spin" /> : <Icon name="check" size={20} />}
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * A SaveBar for a form that runs its action itself (`<form action>`): put
 * it last in the form. Its unsaved changes are the form's; leaving asks.
 */
export function FormSaveBar({ saveLabel, cancel }: { saveLabel: string; cancel?: { href: string; label: string } }) {
  const t = useDashT();
  const { pending } = useFormStatus();
  const marker = useRef<HTMLSpanElement>(null);
  const form = useMemo(() => ({ get current() { return marker.current?.closest("form") ?? null; } }), []) as RefObject<HTMLFormElement | null>;
  const { dirty } = useDirtyForm(form);
  useLeaveGuard(dirty && !pending, t("common.leaveUnsaved"));
  return (
    <>
      <span ref={marker} hidden />
      <SaveBar dirty={dirty} pending={pending} saveLabel={saveLabel} cancel={cancel} words={{ unsaved: t("manage.unsaved"), saved: t("manage.noChanges"), saving: t("common.saving"), errors: "" }} />
    </>
  );
}

export interface SortableHandle {
  /** Props of the drag handle (a button: arrow keys move the entry too). */
  handle: { onPointerDown: () => void; onKeyDown: (event: React.KeyboardEvent) => void; "aria-describedby": string };
  moveUp: (() => void) | null;
  moveDown: (() => void) | null;
  index: number;
  count: number;
  dragging: boolean;
}

/**
 * A list reordered by dragging an entry by its handle, or with the arrow
 * keys on the handle and the up and down buttons (phones can't drag). The
 * order shows at once; `onReorder` gets the new order of ids to save, and a
 * new `items` from the server puts the list back to what was saved.
 */
export function SortableList<T>({
  items,
  idOf,
  onReorder,
  render,
  className = "m-0 flex list-none flex-col p-0",
  itemClassName = "",
  hint,
  moved,
  as = "ul",
  axis = "y",
}: {
  items: T[];
  idOf: (item: T) => string | number;
  onReorder: (ids: (string | number)[]) => void;
  render: (item: T, sortable: SortableHandle) => ReactNode;
  className?: string;
  itemClassName?: string;
  /** For the handle: "Drag, or use the arrow keys." */
  hint: string;
  /** Said after a move: "Moved to place {n} of {count}." filled in by the caller. */
  moved: (place: number, count: number) => string;
  as?: "ul" | "ol";
  /** "x" for a row or grid of entries (photos): dropped before or after by the side. */
  axis?: "y" | "x";
}) {
  const [order, setOrder] = useState(items);
  const [dragId, setDragId] = useState<string | number | null>(null);
  const [over, setOver] = useState<{ id: string | number; after: boolean } | null>(null);
  const [said, setSaid] = useState("");
  // The entry whose handle is held: only it can be dragged (so text in it can still be chosen).
  const [armed, setArmed] = useState<string | number | null>(null);
  const uid = useId();
  const hintId = `sortable-hint-${uid}`;
  const listId = `sortable-${uid}`;
  // A new list from the server (saved, or changed elsewhere) is the order now.
  const [from, setFrom] = useState(items);
  if (from !== items) {
    setFrom(items);
    setOrder(items);
  }

  const commit = (next: T[], focusId?: string | number) => {
    setOrder(next);
    onReorder(next.map(idOf));
    if (focusId !== undefined) {
      const place = next.findIndex((x) => idOf(x) === focusId) + 1;
      setSaid(moved(place, next.length));
      requestAnimationFrame(() => document.getElementById(listId)?.querySelector<HTMLElement>(`[data-sortable-id="${String(focusId)}"] [data-sortable-handle]`)?.focus());
    }
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    commit(next, idOf(item!));
  };
  const List = as;
  return (
    <>
      <span id={hintId} className="sr-only">
        {hint}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {said}
      </span>
      <List id={listId} className={className}>
        {order.map((item, index) => {
          const id = idOf(item);
          const isOver = over?.id === id && dragId !== null && dragId !== id;
          return (
            <li
              key={String(id)}
              data-sortable-id={String(id)}
              draggable={dragId === id || armed === id}
              onDragStart={(event) => {
                if (armed !== id) {
                  event.preventDefault();
                  return;
                }
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(id));
                setDragId(id);
              }}
              onDragOver={(event) => {
                if (dragId === null) return;
                event.preventDefault();
                const box = event.currentTarget.getBoundingClientRect();
                const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
                const after = axis === "x" ? (event.clientX > box.left + box.width / 2) !== rtl : event.clientY > box.top + box.height / 2;
                if (over?.id !== id || over.after !== after) setOver({ id, after });
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragId === null || dragId === id) return;
                const from = order.findIndex((x) => idOf(x) === dragId);
                let to = order.findIndex((x) => idOf(x) === id);
                if (over?.after) to += 1;
                if (from < to) to -= 1;
                move(from, to);
              }}
              onDragEnd={() => {
                setArmed(null);
                setDragId(null);
                setOver(null);
              }}
              className={`${itemClassName} relative ${dragId === id ? "opacity-50" : ""} ${
                !isOver
                  ? ""
                  : axis === "x"
                    ? over!.after
                      ? "after:absolute after:inset-y-1 after:-end-2 after:w-0.5 after:rounded after:bg-ember"
                      : "before:absolute before:inset-y-1 before:-start-2 before:w-0.5 before:rounded before:bg-ember"
                    : over!.after
                      ? "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded after:bg-ember"
                      : "before:absolute before:inset-x-2 before:-top-px before:h-0.5 before:rounded before:bg-ember"
              }`}
            >
              {render(item, {
                handle: {
                  onPointerDown: () => {
                    setArmed(id);
                    // A drag that starts ends with dragend instead (the browser sends no pointerup).
                    const release = () => {
                      setArmed(null);
                      window.removeEventListener("pointerup", release);
                    };
                    window.addEventListener("pointerup", release);
                  },
                  onKeyDown: (event) => {
                    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                      event.preventDefault();
                      move(index, index + (event.key === "ArrowUp" ? -1 : 1));
                    }
                  },
                  "aria-describedby": hintId,
                },
                moveUp: index > 0 ? () => move(index, index - 1) : null,
                moveDown: index < order.length - 1 ? () => move(index, index + 1) : null,
                index,
                count: order.length,
                dragging: dragId === id,
              })}
            </li>
          );
        })}
      </List>
    </>
  );
}

/** A sortable entry's handle and its up and down buttons. */
export function SortControls({ sortable, name, words }: { sortable: SortableHandle; name: string; words: { drag: string; up: string; down: string } }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <button type="button" data-sortable-handle="" {...sortable.handle} aria-label={`${words.drag}: ${name}`} className="flex h-9 w-7 cursor-grab items-center justify-center rounded-lg border-0 bg-transparent text-faint hover:bg-sand hover:text-midnight active:cursor-grabbing">
        <Icon name="drag_indicator" size={20} />
      </button>
      <span className="flex flex-col">
        <button type="button" onClick={sortable.moveUp ?? undefined} disabled={!sortable.moveUp} aria-label={`${words.up}: ${name}`} className="flex h-[18px] w-7 cursor-pointer items-center justify-center rounded border-0 bg-transparent text-faint hover:text-midnight disabled:cursor-default disabled:opacity-30">
          <Icon name="expand_less" size={18} />
        </button>
        <button type="button" onClick={sortable.moveDown ?? undefined} disabled={!sortable.moveDown} aria-label={`${words.down}: ${name}`} className="flex h-[18px] w-7 cursor-pointer items-center justify-center rounded border-0 bg-transparent text-faint hover:text-midnight disabled:cursor-default disabled:opacity-30">
          <Icon name="expand_more" size={18} />
        </button>
      </span>
    </span>
  );
}

/** The list or grid switch of a list page; the choice is remembered in this browser (or for this visit, without storage). */
const viewMemory = new Map<string, string>();
const viewListeners = new Set<() => void>();
function subscribeView(listener: () => void) {
  viewListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    viewListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useViewChoice(key: string, initial: "list" | "grid" = "list"): ["list" | "grid", (v: "list" | "grid") => void] {
  const name = `yallapp-view-${key}`;
  const read = () => {
    let saved = viewMemory.get(name) ?? null;
    if (saved === null) {
      try {
        saved = localStorage.getItem(name);
      } catch {
        // No storage: the page's own choice.
      }
    }
    return saved === "list" || saved === "grid" ? saved : initial;
  };
  const view = useSyncExternalStore(subscribeView, read, () => initial);
  const choose = (v: "list" | "grid") => {
    viewMemory.set(name, v);
    try {
      localStorage.setItem(name, v);
    } catch {
      // No storage: only for this visit.
    }
    for (const listener of viewListeners) listener();
  };
  return [view, choose];
}

export function ViewToggle({ view, onChange, words }: { view: "list" | "grid"; onChange: (v: "list" | "grid") => void; words: { label: string; list: string; grid: string } }) {
  return (
    <div role="group" aria-label={words.label} className="inline-flex h-10 shrink-0 items-center rounded-[10px] border border-line bg-white p-0.5">
      {(["list", "grid"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => onChange(v)}
          title={words[v]}
          className={`flex h-8 w-9 cursor-pointer items-center justify-center rounded-lg border-0 ${view === v ? "bg-midnight text-ivory" : "bg-transparent text-muted hover:text-midnight"}`}
        >
          <Icon name={v === "list" ? "view_agenda" : "grid_view"} size={18} />
          <span className="sr-only">{words[v]}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * 132.10 Old addresses into a long page's parts (`/dashboard/catalog#h-payments`)
 * open the part's own page now: the browser never sends a link's `#part`,
 * so this happens here. `map` is the part's id to its page's address.
 */
export function AnchorRedirect({ map }: { map: Record<string, string> }) {
  useEffect(() => {
    const go = () => {
      const target = map[window.location.hash.slice(1)];
      if (!target) return;
      const studio = window.location.pathname.startsWith("/studio/project");
      window.location.replace(studio ? target.replace(/^\/dashboard(?=\/|$)/, "/studio/project") : target);
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, [map]);
  return null;
}
