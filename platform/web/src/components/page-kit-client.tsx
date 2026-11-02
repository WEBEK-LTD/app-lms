"use client";

import { Fragment, useRef, useState, type ReactNode } from "react";
import { useOptionalDashT } from "./dashboard-i18n";
import { Icon } from "./icon";
import type { IconName } from "./icon-names";
import { btn } from "./ui";

/**
 * Studio page kit, the parts that run in the browser (page-kit.tsx has the
 * rest): a Sheet for secondary forms and a FilterList for lists that grow.
 */

/**
 * A secondary form ("Add a course", "Edit") in a panel from the side, opened
 * by a SheetButton with its `id` (anywhere on the page). With `inline` (an
 * empty list: the form is the page's one next step) it shows in place as a
 * card instead; the first render decides, so a form that just added the
 * first entry keeps its message until the page is opened again.
 */
export function Sheet({ id, title, description, inline = false, children }: { id: string; title: ReactNode; description?: ReactNode; inline?: boolean; children: ReactNode }) {
  const t = useOptionalDashT();
  const [asCard] = useState(inline);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = `${id}-title`;
  const head = (
    <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
      <h2 id={titleId} className="m-0 text-lg font-extrabold">
        {title}
      </h2>
      {description ? <div className="text-sm leading-relaxed text-muted">{description}</div> : null}
    </div>
  );
  if (asCard) {
    return (
      <section id={id} aria-labelledby={titleId} className="flex min-w-0 scroll-mt-6 flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        {head}
        {children}
      </section>
    );
  }
  return (
    <dialog
      ref={dialog}
      id={id}
      aria-labelledby={titleId}
      className="fixed inset-y-0 start-auto end-0 m-0 h-dvh max-h-none w-full max-w-[620px] border-0 border-s border-line bg-white p-0 text-midnight shadow-[0_0_48px_rgba(14,13,36,0.25)] backdrop:bg-[#0e0d24]/45"
      onClick={(e) => {
        if (e.target === dialog.current) dialog.current?.close();
      }}
    >
      <section aria-labelledby={titleId} className="flex h-full flex-col">
        <div className="flex items-start gap-3 border-b border-line-soft px-5 py-4 sm:px-6">
          {head}
          <button type="button" onClick={() => dialog.current?.close()} className={`${btn.ghost} h-9 w-9 shrink-0 px-0 hover:bg-sand`} aria-label={t ? t("common.close") : "Close"}>
            <Icon name="close" size={22} />
          </button>
        </div>
        {/* No bottom padding: a form's FormActions stay at the panel's foot. */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-5 sm:px-6">{children}</div>
      </section>
    </dialog>
  );
}

/** The button that opens the Sheet `target`; on a Sheet shown in place, it goes to it. */
export function SheetButton({ target, children, icon = "add", variant = "main", className = "h-11" }: { target: string; children: ReactNode; icon?: IconName | null; variant?: keyof typeof btn; className?: string }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      className={`${btn[variant]} ${className}`}
      onClick={() => {
        const el = document.getElementById(target);
        if (el instanceof HTMLDialogElement) el.showModal();
        else if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          el.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select")?.focus({ preventScroll: true });
        }
      }}
    >
      {icon ? <Icon name={icon} size={20} /> : null}
      {children}
    </button>
  );
}

export interface FilterItem {
  id: string | number;
  /** What the search looks in (a name, a title, subjects). */
  text: string;
  /** The filter chip it falls under. */
  group?: string;
  /** The entry as the page draws it: an ItemRow or ItemCard. */
  node: ReactNode;
}

/**
 * A list with a search field (from `searchFrom` entries) and filter chips
 * with their counts (when the entries fall under two chips or more); the
 * entries are drawn by the page and only shown or hidden here.
 */
export function FilterList({
  items,
  filters = [],
  allLabel,
  searchLabel,
  noMatch,
  searchFrom = 6,
  layout = "rows",
}: {
  items: FilterItem[];
  filters?: { value: string; label: string }[];
  allLabel: string;
  searchLabel: string;
  /** Shown when nothing is left. */
  noMatch: ReactNode;
  searchFrom?: number;
  layout?: "rows" | "cards";
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const q = query.trim().toLocaleLowerCase();
  const counts = new Map(filters.map((f) => [f.value, items.filter((i) => i.group === f.value).length]));
  const chips = filters.filter((f) => (counts.get(f.value) ?? 0) > 0);
  const searchable = items.length >= searchFrom;
  const shown = items.filter((i) => (filter === "all" || i.group === filter) && (!q || i.text.toLocaleLowerCase().includes(q)));
  const chip = (value: string, label: string, count: number) => {
    const on = filter === value;
    return (
      <button
        key={value}
        type="button"
        aria-pressed={on}
        onClick={() => setFilter(value)}
        className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] ${on ? "border-midnight bg-midnight font-bold text-ivory" : "border-line bg-white text-midnight hover:border-line-strong"}`}
      >
        {label}
        <span className={`rounded-full px-1.5 text-xs tabular-nums ${on ? "bg-white/20" : "bg-sand text-muted"}`}>{count}</span>
      </button>
    );
  };
  return (
    <>
      {searchable || chips.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-5 py-3 sm:px-6">
          {searchable ? (
            <label className="flex h-10 min-w-0 flex-[0_1_320px] items-center gap-2 rounded-[10px] border border-line bg-white px-3 text-sm text-muted focus-within:border-midnight">
              <Icon name="search" size={18} />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchLabel} aria-label={searchLabel} className="min-w-0 flex-1 border-0 bg-transparent text-sm text-midnight outline-0" />
            </label>
          ) : null}
          {chips.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {chip("all", allLabel, items.length)}
              {chips.map((f) => chip(f.value, f.label, counts.get(f.value) ?? 0))}
            </div>
          ) : null}
        </div>
      ) : null}
      {shown.length ? (
        layout === "cards" ? (
          <ul className="m-0 grid list-none gap-4 p-5 sm:p-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
            {shown.map((i) => (
              <Fragment key={i.id}>{i.node}</Fragment>
            ))}
          </ul>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {shown.map((i) => (
              <Fragment key={i.id}>{i.node}</Fragment>
            ))}
          </ul>
        )
      ) : (
        <p role="status" className="m-0 px-5 py-8 text-center text-[15px] text-muted sm:px-6">
          {noMatch}
        </p>
      )}
    </>
  );
}
