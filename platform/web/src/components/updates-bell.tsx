"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { loadBellAction, markUpdatesReadAction } from "@/app/actions/updates";
import { badgeText, bellLabel, shownLine } from "@/lib/updates-words";
import type { BellData, BellItem } from "@/lib/updates-view";
import { Icon } from "./icon";
import { KIND_CHIP, KIND_ICON_BG, updateIcon } from "./update-look";

const PANEL_ID = "yallapp-updates";
/** The full list (Dashboard › Announcements) tells the bell what it marked read. */
export const UPDATES_EVENT = "yallapp:updates";
/** On focus, the bell asks again when it is older than this. */
const STALE_MS = 60_000;

function ItemLink({ item, onFollow }: { item: BellItem; onFollow: () => void }) {
  if (!item.linkUrl || !item.linkLabel) return null;
  const className = "inline-flex items-center gap-1 self-start text-sm font-semibold";
  return item.linkUrl.startsWith("/") ? (
    <Link href={item.linkUrl} onClick={onFollow} className={className}>
      {item.linkLabel}
      <Icon name="arrow_forward" size={16} />
    </Link>
  ) : (
    <a href={item.linkUrl} target="_blank" rel="noreferrer" className={className}>
      {item.linkLabel}
      <Icon name="open_in_new" size={16} />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/**
 * 57 The dashboard's bell, "Notifications from Yallapp": the unread count on
 * the button, and a panel with the newest updates (a popover from md up, a
 * full-width sheet on phones). Opening it marks what it shows as read; the
 * items stay marked as new until it closes. Escape or a click outside closes
 * it and focus goes back to the button.
 */
export function UpdatesBell({ initial }: { initial: BellData }) {
  const pathname = usePathname();
  const [data, setData] = useState(initial);
  const [open, setOpen] = useState(false);
  // What was unread when the panel opened: marked as new until it closes.
  const [fresh, setFresh] = useState<string[]>([]);
  const [, startTransition] = useTransition();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const loadedAt = useRef(0);

  // The layout rendered again (a refresh after a save): take its count.
  const [shownInitial, setShownInitial] = useState(initial);
  if (shownInitial !== initial) {
    setShownInitial(initial);
    setData(initial);
  }
  // A link was followed: close the panel.
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setOpen(false);
    setFresh([]);
  }

  useEffect(() => {
    loadedAt.current = Date.now();
  }, [data]);

  const close = (focusButton: boolean) => {
    setOpen(false);
    setFresh([]);
    if (focusButton) button.current?.focus();
  };

  const show = () => {
    const unread = data.items.filter((item) => item.unread).map((item) => item.key);
    setFresh(unread);
    setOpen(true);
    if (unread.length) {
      startTransition(async () => {
        const next = await markUpdatesReadAction({ keys: unread });
        if (next) setData(next);
      });
    }
  };

  const markAll = () => {
    setFresh([]);
    startTransition(async () => {
      const next = await markUpdatesReadAction({ all: true });
      if (next) setData(next);
    });
  };

  // While open: Escape and clicks outside close it; focus starts on its heading.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        setFresh([]);
        button.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) {
        setOpen(false);
        setFresh([]);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    document.body.classList.add("max-md:overflow-hidden");
    heading.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      document.body.classList.remove("max-md:overflow-hidden");
    };
  }, [open]);

  // The full list marked items read, or the window came back after a while: take the new count.
  useEffect(() => {
    const onUpdates = (event: Event) => {
      const next = (event as CustomEvent<BellData | null>).detail;
      if (next) setData(next);
    };
    const onFocus = () => {
      if (open || Date.now() - loadedAt.current < STALE_MS) return;
      loadedAt.current = Date.now();
      startTransition(async () => {
        const next = await loadBellAction();
        if (next) setData(next);
      });
    };
    window.addEventListener(UPDATES_EVENT, onUpdates);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener(UPDATES_EVENT, onUpdates);
      window.removeEventListener("focus", onFocus);
    };
  }, [open]);

  const badge = badgeText(data.unread);
  const canMarkAll = data.unread > 0 || fresh.length > 0;

  return (
    <div className="relative flex">
      <button
        ref={button}
        type="button"
        aria-label={bellLabel(data.unread)}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        aria-haspopup="dialog"
        onClick={() => (open ? close(false) : show())}
        className={`relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border text-midnight ${
          open ? "border-midnight bg-ivory" : "border-line-strong bg-white hover:border-midnight"
        }`}
      >
        <Icon name="notifications" size={22} filled={open} />
        {badge ? (
          <span
            aria-hidden="true"
            data-badge
            className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1 text-[11px] leading-none font-extrabold text-midnight ring-2 ring-white"
          >
            {badge}
          </span>
        ) : null}
      </button>
      {/* Rendered only while open, so its texts are never in the page twice. */}
      {open ? (
        <div
          ref={panel}
          id={PANEL_ID}
          role="dialog"
          aria-labelledby={`${PANEL_ID}-title`}
          className="fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col bg-white md:absolute md:inset-x-auto md:top-full md:bottom-auto md:left-0 md:mt-2 md:max-h-[min(600px,calc(100vh-110px))] md:w-[400px] md:rounded-2xl md:border md:border-line md:shadow-[0_18px_48px_-12px_rgba(14,13,36,0.28)]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
            <h2 ref={heading} id={`${PANEL_ID}-title`} tabIndex={-1} className="m-0 text-base font-bold text-midnight outline-none">
              Notifications from Yallapp
            </h2>
            <button
              type="button"
              onClick={() => close(true)}
              aria-label="Close notifications"
              className="-my-1 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] text-ink-3 hover:bg-ivory md:hidden"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          {data.items.length ? (
            <ul aria-label="Newest notifications" className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-0">
              {data.items.map((item) => {
                const isNew = fresh.includes(item.key) || (item.unread && !open);
                return (
                  <li
                    key={item.key}
                    data-update={item.key}
                    data-new={isNew ? "" : undefined}
                    className={`flex gap-3 border-b border-line-soft px-4 py-3.5 last:border-b-0 ${isNew ? "bg-peach-soft" : ""}`}
                  >
                    <span className={`mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full ${KIND_ICON_BG[item.kind]}`}>
                      <Icon name={updateIcon(item)} size={20} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span className={`rounded-full px-2 py-0.5 font-bold ${KIND_CHIP[item.kind]}`}>{item.kindLabel}</span>
                        <time dateTime={item.datetime}>{item.date}</time>
                        {item.app ? <span className="truncate">{item.app}</span> : null}
                        {isNew ? <span className="sr-only">Unread</span> : null}
                      </div>
                      <p lang={item.lang} dir={item.lang === "ar" ? "rtl" : undefined} className="m-0 text-[15px] leading-snug font-semibold text-midnight">
                        {item.title}
                      </p>
                      {item.summary ? (
                        <p lang={item.lang} dir={item.lang === "ar" ? "rtl" : undefined} className="m-0 line-clamp-2 text-sm leading-relaxed text-ink-3">
                          {item.summary}
                        </p>
                      ) : null}
                      <ItemLink item={item} onFollow={() => setOpen(false)} />
                    </div>
                    {isNew ? <span aria-hidden="true" className="mt-2 h-2 w-2 flex-none rounded-full bg-ember" /> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-1 flex-col items-center gap-2 px-6 py-10 text-center">
              <Icon name="notifications" size={32} className="text-faint" />
              <p className="m-0 font-semibold text-midnight">Nothing new from Yallapp</p>
              <p className="m-0 text-sm text-muted">
                Updates, announcements, maintenance notices and offers from our team show up here, with news about your account.
              </p>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-line-soft px-4 py-3">
            {canMarkAll ? (
              <button
                type="button"
                onClick={markAll}
                className="-ml-2.5 inline-flex h-9 cursor-pointer items-center gap-1 rounded-[10px] px-2.5 text-sm font-semibold text-accent hover:bg-ivory"
              >
                <Icon name="check" size={18} />
                Mark all as read
              </button>
            ) : (
              <span className="text-xs text-muted">{shownLine(data.items.length, data.total)}</span>
            )}
            <Link href="/dashboard/announcements" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 text-sm font-semibold">
              See all
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
