"use client";

import { Children, createContext, isValidElement, useContext, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../icon";
import { KitInspector } from "./client";
import { KitSearch } from "./index";

/**
 * 132.170 A table whose rows the page renders on the server and whose
 * entries open in the inspector (KitInspector: docked beside the page from
 * 1280 px wide, a drawer below that), as Products' table does in the
 * browser: the column heads, one row per entry (its picture, its name as
 * the button that opens it, its cells and its state at the end), and the
 * entry's details as the row's children. One entry is open at a time.
 *
 * The page measures its own width (`.kit-page`): from 820 px down the
 * columns marked `wide` go, and on a phone (560 px) each row is a short
 * card of its name, one line under it (`line`) and its state.
 */

/** A column after the name's: its head and its width on the grid; `wide` only while the page is wider than 820 px. */
export interface KitColumn {
  label: ReactNode;
  width: string;
  wide?: boolean;
}

interface TableState {
  open: string | null;
  setOpen: (key: string | null) => void;
  columns: readonly KitColumn[];
  media: boolean;
  closeLabel: string;
  matches: (row: Findable) => boolean;
}

const TableContext = createContext<TableState | null>(null);

const grid = (parts: (string | false)[]) => parts.filter(Boolean).join(" ");

/** What a row is found by: its words for the search (`text`) and its group (`group`, one of the table's `groups`). */
type Findable = { text?: string; group?: string };

/**
 * The table: the name's column (`name`, the rest of the width), the other
 * columns (`columns`), the state's (`end`) and the way in. Its rows are
 * KitTableRow; `media` when they have a picture. From `search.from` rows
 * (6) a search field finds them by their `text`; with two `groups` or more
 * among the rows, a segmented control shows one group.
 */
export function KitTable({
  label,
  name,
  columns,
  end,
  media = false,
  closeLabel,
  search,
  groups,
  children,
  ...data
}: {
  /** Names the list of rows. */
  label: string;
  name: ReactNode;
  columns: readonly KitColumn[];
  end?: KitColumn;
  media?: boolean;
  closeLabel: string;
  search?: { label: string; noMatch: ReactNode; from?: number };
  groups?: { all: string; items: readonly { value: string; label: string }[] };
  children: ReactNode;
} & { [key: `data-${string}`]: string | number | undefined }) {
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const rows = Children.toArray(children).flatMap((child) => (isValidElement<Findable>(child) ? [child.props] : []));
  const searchable = Boolean(search) && rows.length >= (search?.from ?? 6);
  const chips = (groups?.items ?? []).map((g) => ({ ...g, count: rows.filter((r) => r.group === g.value).length })).filter((g) => g.count > 0);
  const q = searchable ? query.trim().toLocaleLowerCase() : "";
  const g = chips.length > 1 ? group : "all";
  const matches = (row: Findable) => (g === "all" || row.group === g) && (!q || (row.text ?? "").toLocaleLowerCase().includes(q));
  const shown = rows.filter(matches).length;
  const cols = (wideToo: boolean) => grid([media && "40px", "minmax(0,1fr)", ...columns.filter((c) => wideToo || !c.wide).map((c) => c.width), end ? end.width : false, "20px"]);
  const style = {
    ["--kit-wide" as string]: cols(true),
    ["--kit-mid" as string]: cols(false),
    ["--kit-phone" as string]: grid([media && "40px", "minmax(0,1fr)", end ? "auto" : false]),
  } as CSSProperties;
  const chip = (value: string, text: string, count: number) => (
    <button
      key={value}
      type="button"
      aria-pressed={g === value}
      onClick={() => setGroup(value)}
      className={`inline-flex h-[30px] shrink-0 cursor-pointer items-center gap-[7px] rounded-[10px] border-0 px-3 text-[13px] font-semibold whitespace-nowrap transition-colors ${g === value ? "bg-(--sp-seg-on) text-(--sp-ink) shadow-(--sp-shadow)" : "bg-transparent text-(--sp-muted) hover:text-(--sp-ink)"}`}
    >
      {text}
      <span className="font-sans text-[11px] font-semibold text-(--sp-faint) tabular-nums">{count}</span>
    </button>
  );
  return (
    <TableContext.Provider value={{ open, setOpen, columns, media, closeLabel, matches }}>
      <div {...data} style={style} className="flex min-w-0 flex-col [--kit-cols:var(--kit-wide)] @max-[820px]/kit-page:[--kit-cols:var(--kit-mid)] @max-[561px]/kit-page:[--kit-cols:var(--kit-phone)]">
        {searchable || chips.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
            {searchable && search ? <KitSearch label={search.label} value={query} onChange={setQuery} /> : null}
            {chips.length > 1 && groups ? (
              <div className="flex max-w-full gap-0.5 overflow-x-auto rounded-[13px] bg-(--sp-seg-track) p-1 [scrollbar-width:none]">
                {chip("all", groups.all, rows.length)}
                {chips.map((c) => chip(c.value, c.label, c.count))}
              </div>
            ) : null}
          </div>
        ) : null}
        {shown ? (
          <>
            <div className="kit-th @max-[820px]/kit-page:gap-3! @max-[561px]/kit-page:hidden!" aria-hidden="true">
              <span style={media ? { gridColumn: "span 2" } : undefined}>{name}</span>
              {columns.map((c, i) => (
                <span key={i} className={c.wide ? "@max-[820px]/kit-page:hidden" : ""}>
                  {c.label}
                </span>
              ))}
              {end ? <span>{end.label}</span> : null}
              <span />
            </div>
            <ul aria-label={label} className="m-0 list-none p-0">
              {children}
            </ul>
          </>
        ) : (
          <p role="status" className="m-0 border-t border-(--sp-line) px-5 py-8 text-center text-[14.5px] text-(--sp-muted)">
            {search?.noMatch}
          </p>
        )}
      </div>
    </TableContext.Provider>
  );
}

/**
 * One row of a KitTable: `name` is the button that opens the entry (words
 * only); `line` shows under it on a phone in place of the cells; `cells`
 * follow the table's columns; `end` (a pill) stays on a phone too. The
 * row's children are the entry's details in the inspector (`inspector`:
 * its name for screen readers, the small title of its bar, a "⋯" menu, the
 * action at its foot). A cell with a link or a button of its own gives it
 * `kit-tr-top`, so it sits above the row's button.
 */
export function KitTableRow({
  id,
  media,
  name,
  line,
  cells = [],
  end,
  inspector,
  text,
  group,
  children,
  ...data
}: {
  id: string;
  media?: ReactNode;
  name: ReactNode;
  line?: ReactNode;
  cells?: ReactNode[];
  end?: ReactNode;
  inspector: { label: string; title: ReactNode; actions?: ReactNode; footer?: ReactNode };
  children: ReactNode;
} & Findable & { [key: `data-${string}`]: string | number | undefined }) {
  const table = useContext(TableContext);
  const open = table?.open === id;
  if (table && !table.matches({ text, group })) return null;
  const at = table?.media ? 2 : 1;
  return (
    <li
      {...data}
      data-open={open ? "" : undefined}
      className="kit-tr last:rounded-b-[17px] @max-[820px]/kit-page:gap-3! @max-[561px]/kit-page:gap-x-3! @max-[561px]/kit-page:gap-y-0.5! @max-[561px]/kit-page:px-4! @max-[561px]/kit-page:py-3!"
    >
      {media ? <span className="flex @max-[561px]/kit-page:col-start-1 @max-[561px]/kit-page:row-[1/span_2]">{media}</span> : null}
      <span className={`flex min-w-0 ${at === 2 ? "@max-[561px]/kit-page:col-start-2" : "@max-[561px]/kit-page:col-start-1"} @max-[561px]/kit-page:row-start-1 @max-[561px]/kit-page:self-end`}>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => table?.setOpen(id)}
          className="kit-tr-open flex min-w-0 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-start text-[14.5px] font-bold text-(--sp-ink) focus-visible:outline-offset-4"
        >
          {name}
        </button>
      </span>
      {line ? (
        <span className={`hidden min-w-0 text-[13px] text-(--sp-muted) @max-[561px]/kit-page:block ${at === 2 ? "@max-[561px]/kit-page:col-start-2" : "@max-[561px]/kit-page:col-start-1"} @max-[561px]/kit-page:row-start-2 @max-[561px]/kit-page:self-start`}>
          {line}
        </span>
      ) : null}
      {cells.map((cell, i) => (
        <span key={i} className={`min-w-0 text-[14px] text-(--sp-ink-2) @max-[561px]/kit-page:hidden! ${table?.columns[i]?.wide ? "@max-[820px]/kit-page:hidden!" : ""}`}>
          {cell}
        </span>
      ))}
      {end !== undefined ? (
        <span className={`flex min-w-0 items-center ${at === 2 ? "@max-[561px]/kit-page:col-start-3" : "@max-[561px]/kit-page:col-start-2"} @max-[561px]/kit-page:row-[1/span_2]`}>{end}</span>
      ) : null}
      <Icon name="chevron_right" size={20} className="text-(--sp-faint) @max-[561px]/kit-page:hidden!" />
      <KitInspector open={open} onClose={() => table?.setOpen(null)} label={inspector.label} title={inspector.title} actions={inspector.actions} footer={inspector.footer} closeLabel={table?.closeLabel ?? ""}>
        {children}
      </KitInspector>
    </li>
  );
}

/** An entry's facts in the inspector: one box, each fact a label and its value on a line. */
export function KitInspectorFacts({ facts }: { facts: readonly (readonly [ReactNode, ReactNode] | null | false)[] }) {
  return (
    <dl className="m-0 rounded-xl border border-(--sp-line)">
      {facts.map((fact, i) =>
        fact ? (
          <div key={i} className="flex items-baseline justify-between gap-4 border-b border-(--sp-line) px-3.5 py-2.5 text-[13.5px] last:border-b-0">
            <dt className="shrink-0 text-(--sp-muted)">{fact[0]}</dt>
            <dd className="m-0 min-w-0 text-end font-bold break-words text-(--sp-ink)">{fact[1]}</dd>
          </div>
        ) : null,
      )}
    </dl>
  );
}

/** The top of an entry in the inspector: its picture or pills (`top`), its name, and one quiet line. */
export function KitInspectorHead({ top, title, line }: { top?: ReactNode; title: ReactNode; line?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {top ? <div className="mb-1 flex flex-wrap items-center gap-1.5">{top}</div> : null}
      <h2 className="m-0 text-[21px] leading-[1.25] font-bold break-words text-(--sp-ink)">{title}</h2>
      {line ? <div className="text-[13.5px] leading-relaxed text-(--sp-muted)">{line}</div> : null}
    </div>
  );
}

const GroupContext = createContext<{ open: string | null; setOpen: (key: string | null) => void; closeLabel: string } | null>(null);

/** 132.171 Entries that open in the inspector without a table (a page's tiles): one open at a time. */
export function KitInspectGroup({ closeLabel, children }: { closeLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  return <GroupContext.Provider value={{ open, setOpen, closeLabel }}>{children}</GroupContext.Provider>;
}

/**
 * One entry of a KitInspectGroup: the button that opens it (`className`,
 * `children` its words) and its details in the inspector (`details`).
 */
export function KitInspectButton({
  id,
  className,
  children,
  inspector,
  details,
  ...data
}: {
  id: string;
  className: string;
  children: ReactNode;
  inspector: { label: string; title: ReactNode; actions?: ReactNode; footer?: ReactNode };
  details: ReactNode;
} & { [key: `data-${string}`]: string | number | undefined }) {
  const group = useContext(GroupContext);
  const open = group?.open === id;
  return (
    <>
      <button {...data} type="button" aria-haspopup="dialog" aria-expanded={open} data-open={open ? "" : undefined} onClick={() => group?.setOpen(id)} className={className}>
        {children}
      </button>
      <KitInspector open={open} onClose={() => group?.setOpen(null)} label={inspector.label} title={inspector.title} actions={inspector.actions} footer={inspector.footer} closeLabel={group?.closeLabel ?? ""}>
        {details}
      </KitInspector>
    </>
  );
}
