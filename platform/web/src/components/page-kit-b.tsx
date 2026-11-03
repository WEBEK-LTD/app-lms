import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "./icon";
import type { IconName } from "./icon-names";

/**
 * More of the Studio page kit (page-kit.tsx), for lists the server filters
 * and pages (orders, shipments, rides, questions) and for detail pages: the
 * bar over a flush Section's list with FilterLinks and a ListSearch, a
 * Pager under it, Facts and a Timeline for a detail page's side, a table in
 * the kit's look, and the "Live" badge of the live maps.
 */

/** The bar over a flush Section's list: its filters and search, as FilterList draws them. */
export function ListBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-5 py-3 sm:px-6">{children}</div>;
}

/** Filter chips that are links (the server filters the list), with their counts when the page has them. */
export function FilterLinks({ label, items }: { label: string; items: { href: string; label: ReactNode; current: boolean; count?: number }[] }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] no-underline ${
            item.current ? "border-midnight bg-midnight font-bold text-ivory hover:text-ivory" : "border-line bg-white text-midnight hover:border-line-strong hover:text-midnight"
          }`}
        >
          {item.label}
          {item.count !== undefined ? <span className={`rounded-full px-1.5 text-xs tabular-nums ${item.current ? "bg-white/20" : "bg-sand text-muted"}`}>{item.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

/** A search field the server answers (a GET form), keeping the list's other choices in `keep`. */
export function ListSearch({ id, name = "q", value, label, placeholder, button, keep = {} }: { id: string; name?: string; value: string; label: string; placeholder?: string; button: string; keep?: Record<string, string> }) {
  return (
    <form method="get" role="search" className="flex min-w-0 flex-[0_1_360px] items-center gap-2">
      {Object.entries(keep).map(([key, v]) => (
        <input key={key} type="hidden" name={key} value={v} />
      ))}
      <label htmlFor={id} className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-line bg-white px-3 text-sm text-muted focus-within:border-midnight">
        <Icon name="search" size={18} />
        <span className="sr-only">{label}</span>
        <input id={id} name={name} type="search" defaultValue={value} placeholder={placeholder} className="min-w-0 flex-1 border-0 bg-transparent text-sm text-midnight outline-0" />
      </label>
      <button type="submit" className="inline-flex h-10 shrink-0 cursor-pointer items-center rounded-[10px] border border-line bg-white px-3.5 text-sm font-semibold text-midnight hover:border-line-strong">
        {button}
      </button>
    </form>
  );
}

/** Newer and older pages under a flush Section's list. */
export function Pager({ label, page, pages, newer, older, newerLabel, olderLabel, pageLabel }: { label: string; page: number; pages: number; newer: string; older: string; newerLabel: string; olderLabel: string; pageLabel: string }) {
  if (pages <= 1) return null;
  const link = "inline-flex h-9 items-center gap-1 rounded-[10px] border border-line bg-white px-3 text-sm font-semibold text-midnight no-underline hover:border-line-strong hover:text-midnight";
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-3 border-t border-line-soft px-5 py-3 sm:px-6">
      {page > 1 ? (
        <Link href={newer} className={link}>
          <Icon name="chevron_left" size={18} />
          {newerLabel}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted">{pageLabel}</span>
      {page < pages ? (
        <Link href={older} className={link}>
          {olderLabel}
          <Icon name="chevron_right" size={18} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** A detail page's facts: small labels over their values, two to a row where there's room. */
export function Facts({ items, columns = 2 }: { items: { label: ReactNode; value: ReactNode; wide?: boolean }[]; columns?: 1 | 2 }) {
  return (
    <dl className={`m-0 grid gap-x-6 gap-y-3.5 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {items.map((item, i) => (
        <div key={i} className={`flex min-w-0 flex-col gap-0.5 ${item.wide ? "sm:col-span-2" : ""}`}>
          <dt className="text-[13px] font-semibold text-muted">{item.label}</dt>
          <dd className="m-0 text-[15px] break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** What happened to an order, a parcel or a ride, the first step on top, on a line of dots. */
export function Timeline({ items }: { items: { key: string; title: ReactNode; meta?: ReactNode; note?: ReactNode }[] }) {
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {items.map((item, i) => (
        <li key={item.key} className="relative flex gap-3 pb-4 last:pb-0">
          {i < items.length - 1 ? <span aria-hidden="true" className="absolute start-[4.5px] top-4 bottom-0 w-px bg-line" /> : null}
          <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${i === items.length - 1 ? "bg-ember" : "bg-midnight"}`} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{item.title}</span>
            {item.meta ? <span className="text-[13px] text-muted">{item.meta}</span> : null}
            {item.note ? <span className="text-[13px] text-ink-4">{item.note}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A small card of the side of a detail page: an icon, a title, then its body. */
export function SideCard({ title, icon, titleId, children }: { title: ReactNode; icon: IconName; titleId: string; children: ReactNode }) {
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-white p-5">
      <h2 id={titleId} className="m-0 flex items-center gap-2 text-base font-bold">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-ivory text-midnight">
          <Icon name={icon} size={18} />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A table in a flush Section, scrolling sideways on phones; `th`, `td` style its cells, `start` and `num` (numbers, at the end) align them. */
export const kitTable = {
  wrap: "overflow-x-auto",
  table: "w-full border-collapse text-[15px]",
  head: "border-b border-line-soft bg-sand text-[13px] text-muted",
  th: "px-4 py-3 font-semibold first:ps-5 last:pe-5 sm:first:ps-6 sm:last:pe-6",
  row: "border-b border-line-soft align-top last:border-b-0",
  td: "px-4 py-3 first:ps-5 last:pe-5 sm:first:ps-6 sm:last:pe-6",
  start: "text-start",
  num: "text-end tabular-nums whitespace-nowrap",
  foot: "border-t border-line font-bold",
} as const;

/** The live maps' "Live" badge: the page updates by itself. */
export function LiveBadge({ label, hint }: { label: string; hint: string }) {
  return (
    <p className="m-0 inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold text-success" title={hint}>
      <span aria-hidden="true" className="size-2.5 animate-pulse rounded-full bg-success" />
      {label}
      <span className="sr-only">{hint}</span>
    </p>
  );
}
