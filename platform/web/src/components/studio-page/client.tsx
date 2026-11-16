"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../icon";
import { kit } from "./classes";

/**
 * 132.130 The premium page kit's parts that run in the browser (the rest is
 * in index.tsx): the line under a title with its long help folded behind
 * "?", an entry that opens in place, and an entry whose details open in a
 * drawer. 132.151 The console's look: the page's split for a docked
 * inspector, the inspector, the "⋯" menu, the slim note of sample entries
 * and a switch.
 */

/**
 * A title's heading (optional) and its short line, with its long help
 * behind a "?" (`label` names the button) that opens under them: the "?"
 * at the line's end, or beside the heading when there's no line.
 */
export function HeaderLine({ heading, description, help, label, small = false }: { heading?: ReactNode; description?: ReactNode; help?: ReactNode; label: string; small?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = help ? (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={id}
      aria-label={label}
      title={label}
      onClick={() => setOpen((o) => !o)}
      className="-my-0.5 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-(--sp-muted) transition-colors hover:bg-(--sp-soft) hover:text-(--sp-ink) aria-expanded:bg-(--sp-soft) aria-expanded:text-(--sp-ink)"
    >
      <Icon name="help" size={19} />
    </button>
  ) : null;
  return (
    <>
      {heading ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {heading}
          {description ? null : button}
        </div>
      ) : null}
      {description ? (
        <div className="flex min-w-0 items-start gap-1.5">
          <div className={`min-w-0 leading-relaxed text-(--sp-muted) ${small ? "text-[13.5px]" : "text-[14.5px] max-sm:text-[13.5px]"}`}>{description}</div>
          {button}
        </div>
      ) : heading ? null : (
        button
      )}
      {help ? (
        <div id={id} hidden={!open} className="kit-reveal mt-1.5 max-w-[680px] rounded-[14px] bg-(--sp-soft) px-4 py-3 text-sm leading-relaxed text-(--sp-ink)">
          {help}
        </div>
      ) : null}
    </>
  );
}

/**
 * An entry of a list that opens in place (an order): `summary` (words only)
 * and `aside` (its statuses) on a row that opens or closes `children` under
 * it; open from the start with `defaultOpen` (what still needs the owner).
 */
export function KitDisclosure({ summary, aside, media, defaultOpen = false, children }: { summary: ReactNode; aside?: ReactNode; media?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[66px] w-full cursor-pointer flex-wrap items-center gap-x-3.5 gap-y-2 border-0 bg-transparent px-5 py-3 text-start text-(--sp-ink) transition-colors hover:bg-(--sp-soft) sm:flex-nowrap"
      >
        {media}
        <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5">{summary}</span>
        {aside ? <span className="flex shrink-0 flex-wrap items-center gap-2 max-sm:order-last max-sm:basis-full max-sm:ps-14">{aside}</span> : null}
        <Icon name="expand_more" size={22} className={`shrink-0 text-(--sp-faint) transition-transform max-sm:hidden ${open ? "rotate-180" : ""}`} />
      </button>
      <div id={id} hidden={!open} className="kit-reveal px-5 pb-6">
        {children}
      </div>
    </>
  );
}

/** Whether a media query matches; false on the server and until the page is live. */
function useMedia(query: string): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setOn(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return on;
}

/** Where a docked inspector goes (KitSplit) and how it tells the page it is there. */
const SplitContext = createContext<{ host: HTMLElement | null; dock: (on: boolean) => void } | null>(null);

/**
 * The page (KitPage) and, on wide screens, an inspector docked beside it:
 * a second column that shows while a KitInspector is open. The page is a
 * container its parts measure, so they tighten as the inspector docks.
 */
export function KitSplit({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [docked, setDocked] = useState(0);
  const dock = useCallback((on: boolean) => setDocked((n) => Math.max(0, n + (on ? 1 : -1))), []);
  return (
    <SplitContext.Provider value={{ host, dock }}>
      <div data-kit-page="" className="kit-split mx-auto w-full max-w-[1120px] min-w-0" data-docked={docked ? "" : undefined}>
        <div className="kit-page flex min-w-0 flex-col gap-5">{children}</div>
        <div ref={setHost} className="kit-split-dock" />
      </div>
    </SplitContext.Provider>
  );
}

const WIDE = "(min-width: 80rem)";

/**
 * An entry's details beside the page: docked in the page's second column on
 * screens 1280 px wide and more (inside a KitPage), else a drawer from the
 * page's end side. Its bar has `title` (small), `actions` (a KitMore) and
 * its close button (`closeLabel`); `footer` stays at its foot (the one
 * action, "Edit product"). Esc closes it.
 */
export function KitInspector({
  open,
  onClose,
  label,
  title,
  actions,
  footer,
  closeLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Names the inspector (the entry's name). */
  label: string;
  title: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  closeLabel: string;
  children: ReactNode;
}) {
  const split = useContext(SplitContext);
  const wide = useMedia(WIDE);
  const docked = Boolean(open && wide && split?.host);
  const dockedRef = useRef(docked);
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    dockedRef.current = docked;
    close.current = onClose;
  });

  // Docked: the page makes room; Esc closes it (unless a dialog over the page has it).
  useEffect(() => {
    if (!docked || !split) return;
    split.dock(true);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) close.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      split.dock(false);
      document.removeEventListener("keydown", onKey);
    };
  }, [docked, split]);

  // Not docked: a modal drawer.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const modal = open && !docked;
    if (modal && !el.open) el.showModal();
    if (!modal && el.open) el.close();
  }, [open, docked]);

  const body = (
    <div className="kit-insp">
      <div className="flex h-14 shrink-0 items-center gap-1.5 border-b border-(--sp-line) ps-5 pe-3">
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-(--sp-muted)">{title}</span>
        {actions}
        <button type="button" onClick={onClose} aria-label={closeLabel} title={closeLabel} className={kit.icon}>
          <Icon name="close" size={19} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-[18px]">{children}</div>
      {footer ? <div className="shrink-0 border-t border-(--sp-line) px-5 py-3.5">{footer}</div> : null}
    </div>
  );
  return (
    <>
      {docked && split?.host
        ? createPortal(
            <section aria-label={label} data-kit-inspector="docked" className="h-full">
              {body}
            </section>,
            split.host,
          )
        : null}
      <dialog
        ref={dialog}
        aria-label={label}
        data-kit-inspector="drawer"
        onClose={() => {
          if (!dockedRef.current) close.current();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
        className="kit-drawer fixed inset-y-0 start-auto end-0 m-0 h-dvh max-h-none w-full max-w-[420px] border-0 bg-(--sp-surface) p-0 text-(--sp-ink) shadow-[0_0_60px_rgba(14,13,36,0.28)] backdrop:bg-[#0e0d24]/45"
      >
        {open && !docked ? body : null}
      </dialog>
    </>
  );
}

/**
 * An entry whose details open in a drawer from the page's end side: the
 * entry's row (`trigger`, words only) is the button that opens it; the
 * drawer has `title`, its close button (`closeLabel`) and `children`.
 * 132.151 `docked`: an inspector docked beside the page on wide screens
 * (KitInspector), the same drawer below that.
 */
export function KitDrawer({
  title,
  description,
  trigger,
  closeLabel,
  children,
  docked = false,
  triggerClassName = "group -mx-2 flex min-w-0 flex-[1_1_260px] cursor-pointer items-center gap-x-3.5 gap-y-2 rounded-xl border-0 bg-transparent px-2 py-1.5 text-start text-(--sp-ink) transition-colors hover:bg-(--sp-soft)",
}: {
  title: ReactNode;
  description?: ReactNode;
  trigger: ReactNode;
  closeLabel: string;
  children: ReactNode;
  docked?: boolean;
  triggerClassName?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();
  if (docked) {
    return (
      <>
        <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} className={triggerClassName}>
          {trigger}
        </button>
        <KitInspector open={open} onClose={() => setOpen(false)} label={typeof title === "string" ? title : ""} title={title} closeLabel={closeLabel}>
          {description ? <div className="mb-4 text-sm text-(--sp-muted)">{description}</div> : null}
          <div className="flex flex-col gap-5">{children}</div>
        </KitInspector>
      </>
    );
  }
  return (
    <>
      <button type="button" aria-haspopup="dialog" aria-controls={id} onClick={() => dialog.current?.showModal()} className={triggerClassName}>
        {trigger}
      </button>
      <dialog
        ref={dialog}
        id={id}
        aria-labelledby={`${id}-title`}
        className="kit-drawer fixed inset-y-0 start-auto end-0 m-0 h-dvh max-h-none w-full max-w-[560px] border-0 bg-(--sp-surface) p-0 text-(--sp-ink) shadow-[0_0_60px_rgba(14,13,36,0.28)] backdrop:bg-[#0e0d24]/45"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start gap-3 border-b border-(--sp-line) px-5 py-4 sm:px-6">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 id={`${id}-title`} className="m-0 text-lg leading-snug font-bold">
                {title}
              </h2>
              {description ? <div className="text-sm text-(--sp-muted)">{description}</div> : null}
            </div>
            <button type="button" onClick={() => dialog.current?.close()} aria-label={closeLabel} title={closeLabel} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-(--sp-muted) hover:bg-(--sp-soft) hover:text-(--sp-ink)">
              <Icon name="close" size={22} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">{children}</div>
        </div>
      </dialog>
    </>
  );
}

/**
 * A "⋯" menu of a page's other actions (Import), or a row's (`look="row"`):
 * `label` names its button; `children` are its entries (`kit.menuItem`).
 * It closes on a pick, on Esc and on a click beside it.
 */
export function KitMore({ label, children, look = "page" }: { label: string; children: ReactNode; look?: "page" | "row" }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      box.current?.querySelector("button")?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={box} className="relative" data-kit-more="">
      <button type="button" aria-label={label} title={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className={look === "page" ? kit.square : kit.icon}>
        <span aria-hidden="true" className="font-sans text-base leading-none font-bold tracking-[1px]">
          ⋯
        </span>
      </button>
      <div
        id={id}
        hidden={!open}
        onClick={(event) => {
          if ((event.target as Element).closest("a, button")) setOpen(false);
        }}
        className="kit-reveal absolute end-0 top-[calc(100%+6px)] z-30 flex min-w-[220px] flex-col gap-0.5 rounded-[14px] border border-(--sp-line) bg-(--sp-surface) p-1.5 shadow-[0_16px_40px_-12px_rgba(14,13,36,0.3)]"
      >
        {children}
      </div>
    </div>
  );
}

/**
 * The slim note of sample entries beside a page's tabs: how many there are
 * (`title`), removing them (`action`, the form), what they are behind
 * `learnLabel`, and a close button (`closeLabel`) that puts it away for
 * this visit (the browser's session).
 */
export function KitDemoLine({ id, title, text, action, learnLabel, closeLabel }: { id: string; title: ReactNode; text: ReactNode; action: ReactNode; learnLabel: string; closeLabel: string }) {
  const [gone, setGone] = useState(false);
  const [more, setMore] = useState(false);
  const textId = useId();
  const key = `kit.demo.${id}`;
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser's own memory, read after hydration
      if (sessionStorage.getItem(key)) setGone(true);
    } catch {
      // A browser that keeps nothing: the note shows.
    }
  }, [key]);
  if (gone) return null;
  return (
    <div role="status" className="relative flex min-h-9 max-w-full flex-wrap items-center gap-x-2.5 gap-y-0.5 rounded-[11px] bg-(--sp-peach) py-1 ps-3 pe-10 text-[13px] text-(--sp-peach-ink) max-sm:w-full max-sm:py-2">
      <Icon name="info" size={17} />
      <span className="font-bold">{title}</span>
      {action}
      <button type="button" aria-expanded={more} aria-controls={textId} onClick={() => setMore((m) => !m)} className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-medium text-inherit underline underline-offset-[3px] opacity-80 hover:opacity-100">
        {learnLabel}
      </button>
      <button
        type="button"
        aria-label={closeLabel}
        title={closeLabel}
        onClick={() => {
          setGone(true);
          try {
            sessionStorage.setItem(key, "1");
          } catch {
            // Gone for this page only.
          }
        }}
        className="absolute end-1 top-[3px] grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-inherit hover:bg-black/5"
      >
        <Icon name="close" size={17} />
      </button>
      <p id={textId} hidden={!more} className="kit-reveal m-0 basis-full pt-0.5 pb-1 text-[13px] leading-relaxed">
        {text}
      </p>
    </div>
  );
}

/** A setting on or off: a switch named by its visible label (`labelledBy`). */
export function KitSwitch({ checked, onChange, labelledBy, describedBy, disabled = false }: { checked: boolean; onChange: (next: boolean) => void; labelledBy: string; describedBy?: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-labelledby={labelledBy} aria-describedby={describedBy} disabled={disabled} onClick={() => onChange(!checked)} className="kit-switch" />;
}
