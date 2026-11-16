"use client";

import { useId, useState, type ReactNode } from "react";
import { Icon } from "../icon";

/**
 * 132.130 The premium page kit's parts that run in the browser (the rest is
 * in index.tsx): the line under a title with its long help folded behind
 * "?", and an entry that opens in place.
 */

/** The short line under a title, and its long help behind a "?" (`label` names the button) that opens it under the line. */
export function HeaderLine({ description, help, label, small = false }: { description?: ReactNode; help?: ReactNode; label: string; small?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <div className="flex min-w-0 items-start gap-1.5">
        {description ? <div className={`min-w-0 leading-relaxed text-(--sp-muted) ${small ? "text-sm" : "text-[15px]"}`}>{description}</div> : null}
        {help ? (
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
        ) : null}
      </div>
      {help ? (
        <div id={id} hidden={!open} className="mt-1.5 max-w-[680px] rounded-2xl bg-(--sp-soft) px-4 py-3 text-sm leading-relaxed text-(--sp-ink)">
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
      <div id={id} hidden={!open} className="px-5 pb-6 sm:px-7">
        {children}
      </div>
    </>
  );
}
