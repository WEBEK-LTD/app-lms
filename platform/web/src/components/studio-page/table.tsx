"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { useDashT } from "../dashboard-i18n";
import { Icon } from "../icon";
import { kit } from "./classes";
import { KitInspector } from "./client";

/**
 * 132.160 A list as the console's table, for a page drawn on the server:
 * a card with its toolbar (its title, a search, Filters with the list's
 * groups behind it, how many show, its own actions), the column heads, the
 * rows on one grid, and the open row's details in the inspector (docked
 * beside the page from 1280 px, a drawer below that). A row opens from its
 * first cell (its picture and name), which covers the row; anything else a
 * row can be clicked on (a pill) has `kit-tr-top`. On a phone (the page
 * under 560 px) the heads go and a row is its first cell with a column
 * under it ("sub") and one at its end ("end"); the others hide.
 *
 * With `open`, the open row is the address's (`?open=`, its details drawn
 * by the server): a row is a link, and closing the inspector goes back to
 * the address without it.
 */

export interface KitColumn {
  /** The column's head. */
  label: ReactNode;
  /** Its track on the grid: "minmax(0,1fr)", "140px". */
  width: string;
  /** On a phone: under the first cell, at the row's end, or hidden (the default). */
  phone?: "sub" | "end" | "hide";
  /** Hidden while the page is under 820 px (an inspector docked beside it): a column that isn't needed. */
  wide?: boolean;
}

export interface KitRowInspector {
  /** The inspector bar's small title ("Flash sale"). */
  title: ReactNode;
  body: ReactNode;
  /** The bar's "⋯" (KitMore `look="row"`). */
  actions?: ReactNode;
  /** Its foot: the one action. */
  footer?: ReactNode;
}

export interface KitTableRow {
  id: string;
  /** Names the row's button and its inspector. */
  name: string;
  /** One per column; the first is the row's button (words and pictures only). */
  cells: ReactNode[];
  inspector?: KitRowInspector;
  /** What the search looks in. */
  text?: string;
  /** The group (a filter) it falls under. */
  group?: string;
  /** A row that leads to its own page instead of the inspector. */
  href?: string;
  /** The row's own `data-…` attributes. */
  data?: Record<string, string | undefined>;
}

// `!` where `.kit-tr` and `.kit-th` (globals.css, outside the layers) set the same property: a phone's card wins over the grid.
const ROW =
  "kit-tr @max-[560px]/kit-page:[--kit-cols:minmax(0,1fr)_auto] @max-[560px]/kit-page:gap-x-3! @max-[560px]/kit-page:gap-y-1! @max-[560px]/kit-page:px-3.5! @max-[560px]/kit-page:py-3!";
const CELL = {
  main: "flex min-w-0 items-center @max-[560px]/kit-page:col-start-1 @max-[560px]/kit-page:row-start-1",
  end: "flex min-w-0 flex-wrap items-center gap-1.5 @max-[560px]/kit-page:col-start-2 @max-[560px]/kit-page:row-span-2 @max-[560px]/kit-page:row-start-1 @max-[560px]/kit-page:justify-end",
  sub: "min-w-0 text-[13.5px] text-(--sp-ink-2) @max-[560px]/kit-page:col-start-1 @max-[560px]/kit-page:text-[13px] @max-[560px]/kit-page:text-(--sp-muted)",
  hide: "min-w-0 text-[13.5px] text-(--sp-ink-2) @max-[560px]/kit-page:hidden",
} as const;
const WIDE = "@max-[820px]/kit-page:hidden";
/** The event a table sends when one of its rows opens. */
const OPENED = "kit-table-opened";

export function KitTable({
  label,
  title,
  titleId,
  columns,
  rows,
  empty,
  noMatch,
  search,
  groups,
  actions,
  toolbar,
  open,
  initialOpen = null,
  className = "",
  ...data
}: {
  /** Names the list (and the card when it has no title). */
  label: string;
  /** A visible heading at the toolbar's start. */
  title?: ReactNode;
  titleId?: string;
  columns: KitColumn[];
  rows: KitTableRow[];
  /** Shown instead of the table when there are no rows. */
  empty?: ReactNode;
  /** The words when a search or a filter leaves none. */
  noMatch?: ReactNode;
  /** A search over the rows' `text`, named by `search`. */
  search?: string;
  /** The rows' groups, behind Filters (a segmented control): `all` names them all. */
  groups?: { label: string; all: string; items: { id: string; label: string }[]; initial?: string };
  /** The toolbar's own actions, at its end. */
  actions?: ReactNode;
  /** More at the toolbar's start (a search sent to the server). */
  toolbar?: ReactNode;
  /** The open row is the address's: `param` (`open`), the address's other `query`, the `id` open, and its `row` when the list doesn't show it (filtered out). */
  open?: { param: string; query: string; id: string | null; row?: KitTableRow | null };
  initialOpen?: string | null;
  className?: string;
} & { [key: `data-${string}`]: string | undefined }) {
  const t = useDashT();
  const router = useRouter();
  const path = usePathname() ?? "";
  const headId = useId();
  const [chosen, setChosen] = useState<string | null>(initialOpen);
  const [going, setGoing] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState(groups?.initial ?? "all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const openId = open ? (going ?? open.id) : chosen;
  // One inspector at a time on a page: a row opened in another table closes this one's.
  useEffect(() => {
    const onOther = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== headId) setChosen(null);
    };
    window.addEventListener(OPENED, onOther);
    return () => window.removeEventListener(OPENED, onOther);
  }, [headId]);
  const choose = (id: string) => {
    setChosen(id);
    window.dispatchEvent(new CustomEvent(OPENED, { detail: headId }));
  };
  const hrefOf = (id: string | null) => {
    const params = new URLSearchParams(open?.query ?? "");
    if (id !== null) params.set(open?.param ?? "open", id);
    const query = params.toString();
    return `${path}${query ? `?${query}` : ""}`;
  };
  if (open && going !== null && going === open.id) setGoing(null);

  const words = q.trim().toLowerCase();
  const shown = rows.filter((row) => (group === "all" || row.group === group) && (!words || (row.text ?? row.name).toLowerCase().includes(words)));
  const filtered = Boolean(words) || group !== "all";
  const current = rows.find((row) => row.id === openId && row.inspector) ?? (open?.row && open.row.id === openId && open.row.inspector ? open.row : null);
  const cols = [...columns.map((c) => c.width), "20px"].join(" ");
  const narrow = [...columns.filter((c) => !c.wide).map((c) => c.width), "20px"].join(" ");
  const close = () => {
    if (open) {
      setGoing(null);
      router.replace(hrefOf(null), { scroll: false });
    } else setChosen(null);
  };
  const heading = title ? (
    <h2 id={titleId ?? headId} className="m-0 me-1 text-[15px] font-bold text-(--sp-ink)">
      {title}
    </h2>
  ) : null;
  const bar = heading || search || groups || actions || toolbar;

  return (
    <section {...data} aria-labelledby={title ? (titleId ?? headId) : undefined} aria-label={title ? undefined : label} className={`${kit.card} flex min-w-0 flex-col [--kit-cols:var(--kit-wide)] @max-[820px]/kit-page:[--kit-cols:var(--kit-narrow)] ${className}`} style={{ ["--kit-wide" as string]: cols, ["--kit-narrow" as string]: narrow } as CSSProperties}>
      {bar ? (
        <div className="flex flex-wrap items-center gap-2 p-3 ps-4">
          {heading}
          {toolbar}
          {search ? <SearchField label={search} value={q} onChange={setQ} /> : null}
          {groups ? (
            <button type="button" aria-expanded={filtersOpen} aria-controls={`${headId}-filters`} onClick={() => setFiltersOpen((o) => !o)} className={`${kit.quiet} h-10 ${filtersOpen ? "bg-(--sp-soft)" : ""}`}>
              <Icon name="tune" size={18} />
              {t("studioPage.filters")}
              {group !== "all" ? <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-ember px-1.5 font-sans text-xs font-extrabold text-[#0e0d24] tabular-nums">1</span> : null}
            </button>
          ) : null}
          <span className="flex-1" />
          {search || groups ? (
            <span className="flex items-center gap-3 px-1 text-[13px] text-(--sp-muted)">
              {t("manage.showing", { shown: shown.length, count: rows.length })}
              {filtered ? (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setGroup("all");
                  }}
                  className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-accent underline"
                >
                  {t("manage.clearFilters")}
                </button>
              ) : null}
            </span>
          ) : null}
          {actions ? <span className="flex flex-wrap items-center gap-2">{actions}</span> : null}
        </div>
      ) : null}
      {groups ? (
        <div id={`${headId}-filters`} hidden={!filtersOpen} className="kit-reveal mx-3 mb-3 rounded-[14px] bg-(--sp-soft) p-2.5">
          <div role="group" aria-label={groups.label} className="flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-[13px] bg-(--sp-seg-track) p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[{ id: "all", label: groups.all }, ...groups.items].map((g) => {
              const on = group === g.id;
              const count = g.id === "all" ? rows.length : rows.filter((row) => row.group === g.id).length;
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setGroup(g.id)}
                  className={`flex h-[34px] shrink-0 cursor-pointer items-center gap-[7px] rounded-[10px] border-0 px-3.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors ${on ? "bg-(--sp-seg-on) text-(--sp-ink) shadow-(--sp-shadow)" : "bg-transparent text-(--sp-muted) hover:text-(--sp-ink)"}`}
                >
                  {g.label}
                  <span className="font-sans text-[11px] font-semibold text-(--sp-faint) tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className={bar ? "border-t border-(--sp-line)" : ""}>{empty}</div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border-t border-(--sp-line) px-6 py-12 text-center">
          <p className="m-0 text-[15px] font-semibold text-(--sp-ink)">{noMatch}</p>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setGroup("all");
            }}
            className={kit.quiet}
          >
            {t("manage.clearFilters")}
          </button>
        </div>
      ) : (
        <>
          <div className={`kit-th @max-[560px]/kit-page:hidden! ${bar ? "" : "rounded-t-[17px] border-t-0"}`} aria-hidden="true">
            {columns.map((c, i) => (
              <span key={i} className={`min-w-0 truncate ${c.wide ? WIDE : ""}`}>
                {c.label}
              </span>
            ))}
            <span />
          </div>
          <ul aria-label={label} className="m-0 list-none p-0">
            {shown.map((row) => {
              const isOpen = row.id === openId;
              const opener = row.href ? (
                <Link href={row.href} className="kit-tr-open flex min-w-0 flex-1 items-center gap-3 text-start text-(--sp-ink) no-underline hover:text-(--sp-ink) focus-visible:outline-offset-4">
                  {row.cells[0]}
                </Link>
              ) : open ? (
                <Link
                  href={hrefOf(row.id)}
                  scroll={false}
                  aria-current={isOpen ? "true" : undefined}
                  onClick={() => setGoing(row.id)}
                  className="kit-tr-open flex min-w-0 flex-1 items-center gap-3 text-start text-(--sp-ink) no-underline hover:text-(--sp-ink) focus-visible:outline-offset-4"
                >
                  {row.cells[0]}
                </Link>
              ) : (
                <button
                  type="button"
                  aria-haspopup={row.inspector ? "dialog" : undefined}
                  aria-expanded={row.inspector ? isOpen : undefined}
                  aria-label={row.name}
                  onClick={() => choose(row.id)}
                  className="kit-tr-open flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-start text-(--sp-ink) focus-visible:outline-offset-4"
                >
                  {row.cells[0]}
                </button>
              );
              return (
                <li key={row.id} {...row.data} data-open={isOpen ? "" : undefined} className={`${ROW} last:rounded-b-[17px]`}>
                  <span className={CELL.main}>{opener}</span>
                  {row.cells.slice(1).map((cell, i) => (
                    <span key={i} className={columns[i + 1]?.wide ? `${CELL.hide} ${WIDE}` : CELL[columns[i + 1]?.phone ?? "hide"]}>
                      {cell}
                    </span>
                  ))}
                  <Icon name="chevron_right" size={20} className="text-(--sp-faint) @max-[560px]/kit-page:hidden!" />
                </li>
              );
            })}
          </ul>
        </>
      )}

      <KitInspector open={current !== null} onClose={close} label={current?.name ?? ""} title={current?.inspector?.title ?? ""} actions={current?.inspector?.actions} footer={current?.inspector?.footer} closeLabel={t("common.close")}>
        {current?.inspector?.body ?? null}
      </KitInspector>
    </section>
  );
}

/** The toolbar's search field. */
function SearchField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-10 min-w-0 flex-[0_1_300px] items-center gap-2 rounded-[11px] border border-(--sp-line) bg-(--sp-surface) px-3 text-sm text-(--sp-faint) transition-colors focus-within:border-(--sp-ink) hover:border-(--sp-muted) max-sm:order-last max-sm:flex-[1_1_100%]">
      <Icon name="search" size={19} />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} aria-label={label} className="min-w-0 flex-1 border-0 bg-transparent text-sm text-(--sp-ink) outline-0 placeholder:text-(--sp-faint)" />
    </label>
  );
}
