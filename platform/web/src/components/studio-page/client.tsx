"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "../icon";

/**
 * 132.130 The premium page kit's parts that run in the browser (the rest is
 * in index.tsx): the line under a title with its long help folded behind
 * "?", an entry that opens in place, and an entry whose details open in a
 * drawer.
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
          <div className={`min-w-0 leading-relaxed text-(--sp-muted) ${small ? "text-sm" : "text-[15px]"}`}>{description}</div>
          {button}
        </div>
      ) : heading ? null : (
        button
      )}
      {help ? (
        <div id={id} hidden={!open} className="kit-reveal mt-1.5 max-w-[680px] rounded-2xl bg-(--sp-soft) px-4 py-3 text-sm leading-relaxed text-(--sp-ink)">
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
        className="flex w-full cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 border-0 bg-transparent px-5 py-4 text-start text-(--sp-ink) transition-colors hover:bg-(--sp-soft) sm:flex-nowrap sm:px-7"
      >
        {media}
        <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-1">{summary}</span>
        {aside ? <span className="flex shrink-0 flex-wrap items-center gap-2 max-sm:order-last max-sm:basis-full max-sm:ps-16">{aside}</span> : null}
        <Icon name="expand_more" size={22} className={`shrink-0 text-(--sp-muted) transition-transform max-sm:hidden ${open ? "rotate-180" : ""}`} />
      </button>
      <div id={id} hidden={!open} className="kit-reveal px-5 pb-6 sm:px-7">
        {children}
      </div>
    </>
  );
}

/**
 * An entry whose details open in a drawer from the page's end side: the
 * entry's row (`trigger`, words only) is the button that opens it; the
 * drawer has `title`, its close button (`closeLabel`) and `children`.
 */
export function KitDrawer({
  title,
  description,
  trigger,
  closeLabel,
  children,
  triggerClassName = "group -mx-2 flex min-w-0 flex-[1_1_260px] cursor-pointer items-center gap-x-4 gap-y-2 rounded-2xl border-0 bg-transparent px-2 py-1.5 text-start text-(--sp-ink) transition-colors hover:bg-(--sp-soft)",
}: {
  title: ReactNode;
  description?: ReactNode;
  trigger: ReactNode;
  closeLabel: string;
  children: ReactNode;
  triggerClassName?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
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
          <div className="flex items-start gap-3 border-b border-(--sp-line-soft) px-5 py-4 sm:px-7 sm:py-5">
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
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">{children}</div>
        </div>
      </dialog>
    </>
  );
}
