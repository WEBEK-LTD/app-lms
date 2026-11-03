import type { ReactNode } from "react";
import { Icon } from "./icon";
import type { IconName } from "./icon-names";

/**
 * Page kit additions (to fold into page-kit.tsx): an ItemRow that opens in
 * place (its form under it, for lists edited where they are, like a gym's
 * plans or a timetable), the list's "Add …" row that opens the same way, and
 * a Panel: a quiet box inside a Section for a status or a small form.
 */

type DataAttributes = { [key: `data-${string}`]: string | number | undefined };

/** One entry of an ItemList that opens in place: the row is its summary, `children` (its form) under it. */
export function ItemDetails({
  media,
  title,
  badges,
  meta,
  extra,
  aside,
  open,
  children,
  ...data
}: {
  media?: ReactNode;
  title: ReactNode;
  badges?: ReactNode;
  meta?: ReactNode;
  extra?: ReactNode;
  aside?: ReactNode;
  open?: boolean;
  children: ReactNode;
} & DataAttributes) {
  return (
    <li {...data} className="border-t border-line-soft first:border-t-0">
      <details className="group" open={open}>
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3.5 gap-y-2 px-5 py-3.5 hover:bg-sand sm:flex-nowrap sm:px-6 [&::-webkit-details-marker]:hidden">
          {media}
          <span className="flex min-w-0 flex-[1_1_160px] flex-col gap-0.5">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="min-w-0 text-[15px] font-bold break-words text-midnight">{title}</span>
              {badges}
            </span>
            {meta ? (
              <span className="text-[13px] text-muted" dir="auto">
                {meta}
              </span>
            ) : null}
            {extra ? <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-4">{extra}</span> : null}
          </span>
          {aside ? <span className="flex shrink-0 flex-wrap items-center gap-2 max-sm:order-last max-sm:basis-full">{aside}</span> : null}
          <Icon name="expand_more" size={20} className="shrink-0 text-faint transition-transform group-open:rotate-180 max-sm:hidden" />
        </summary>
        <div className="flex flex-col gap-4 border-t border-line-soft bg-sand px-5 py-4 sm:px-6">{children}</div>
      </details>
    </li>
  );
}

/** The "Add …" row at the foot of a flush Section's list, opening in place (open while the list is empty); `id` for a DetailsButton. */
export function AddDetails({ id, label, hint, open, children }: { id?: string; label: ReactNode; hint?: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <details id={id} className="group scroll-mt-6 border-t border-line-soft" open={open}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 text-midnight hover:bg-sand sm:px-6 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-peach text-accent">
          <Icon name="add" size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-bold">{label}</span>
          {hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
        </span>
        <Icon name="expand_more" size={20} className="shrink-0 text-faint transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-4 px-5 pt-1 pb-5 sm:px-6">{children}</div>
    </details>
  );
}

/** A quiet box inside a Section: a status line with its icon and an action, or a small form. */
export function Panel({ icon, tone = "neutral", children, action, ...data }: { icon?: IconName; tone?: "neutral" | "success" | "warn" | "info"; children: ReactNode; action?: ReactNode } & DataAttributes) {
  const tones = { neutral: "bg-sand text-ink-2", success: "bg-success-bg text-success", warn: "bg-warn-bg text-warn", info: "bg-peach text-midnight" }[tone];
  return (
    <div {...data} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 ${tones}`}>
      <span className="flex min-w-0 items-center gap-2 text-[15px] font-semibold">
        {icon ? <Icon name={icon} size={20} /> : null}
        <span className="min-w-0">{children}</span>
      </span>
      {action}
    </div>
  );
}
