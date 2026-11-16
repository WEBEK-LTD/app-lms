import type { CSSProperties, ReactNode } from "react";
import { Children, Fragment, isValidElement } from "react";
import Link from "next/link";
import { Icon } from "../icon";
import type { IconName } from "../icon-names";
import { kit } from "./classes";
import { HeaderLine, KitSplit } from "./client";

/**
 * 132.130 Studio's premium page kit: guided, calm pages. At a glance a page
 * shows its main state and one next step; everything else opens on demand
 * (a fold, a drawer, a "⋯" menu, a "?"), one click or tap away. Its own few
 * colours (globals.css `--sp-…`) are the dashboard's outside Studio and the
 * Studio console's canvas in it, light and dark, so a page both share reads
 * right in each. Logical sides only (right to left in Arabic); 390 px wide
 * without sideways scrolling.
 *
 * 132.151 In the console's look (the approved "control console" design):
 * a page is a big title with a one-line description, its one main action in
 * Ember and the rest in a "⋯" menu; its sibling pages as a segmented control
 * (manage-kit-client SectionTabs) with a slim note beside it (KitBar); its
 * numbers as tiles, the first dark with a bar (KitHero with `stats` of
 * KitStat); its list as a table with column heads (KitTableHead and the
 * `.kit-th`/`.kit-tr` grid); an entry's details in an inspector docked
 * beside the page on wide screens (KitInspector, or KitDrawer `docked`).
 *
 * A page:  KitPage > KitHeader (big title, a one-line subtitle, its long
 *          help behind "?", one `kit.main` action; the rest a KitMore menu)
 *          > one KitHero (the main state: the numbers that matter, the next
 *          step) > KitSection cards with a short KitList of KitRow (name,
 *          one KitStatus pill, one trailing action; details in a KitDrawer)
 *          > KitEmpty where a list is empty.
 * Settings: KitSettings of KitSettingRow. Facts: KitFacts of KitFact.
 * Long help: KitFold ("How it works") or a "?" (`help` on the header and
 * on sections). A quiet one-line note: KitCallout.
 *
 * Scale: title 26/30 px, a tile's figure 40 px (the first 56), a card's
 * title 16 px, text 14.5 px, labels 13 px. Rhythm: 20 px between parts.
 * Radii: 18 a tile, a card or a table, 12 a control, 8 a pill. Lines: one
 * hairline (`--sp-line`) round a card and between rows; colour only for
 * state and the one main action.
 */

export { kit } from "./classes";

/**
 * The page: its rhythm, and room for an inspector docked beside it on wide
 * screens (KitInspector). It measures its own width, so its tiles and
 * tables tighten when the inspector opens.
 */
export function KitPage({ children }: { children: ReactNode }) {
  return <KitSplit>{children}</KitSplit>;
}

/**
 * The top of the page: one big h1, a one-line subtitle, its long help
 * behind "?" (`help`, `helpLabel` naming the button), and its actions at
 * the end: a KitMore "⋯" and one `kit.main`. (`icon` is kept for the pages
 * that pass it; the console's header has none.)
 */
export function KitHeader({
  title,
  description,
  help,
  helpLabel,
  actions,
  back,
}: {
  icon?: IconName;
  title: ReactNode;
  description?: ReactNode;
  help?: ReactNode;
  helpLabel?: string;
  actions?: ReactNode;
  back?: { href: string; label: ReactNode };
}) {
  return (
    <header data-kit-header="" className="flex items-start justify-between gap-5 max-sm:flex-col max-sm:gap-3.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {back ? (
          <Link href={back.href} className="mb-1 flex w-fit items-center gap-1 text-sm font-semibold text-(--sp-muted) no-underline hover:text-(--sp-ink)">
            <Icon name="arrow_back" size={18} />
            {back.label}
          </Link>
        ) : null}
        <h1 className="m-0 text-[26px] leading-[1.2] font-extrabold tracking-[-0.3px] break-words text-(--sp-ink) sm:text-[30px]">{title}</h1>
        {description || help ? <HeaderLine description={description} help={help} label={helpLabel ?? ""} /> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2 max-sm:w-full">{actions}</div> : null}
    </header>
  );
}

/**
 * The line under the header: the page's sibling pages (SectionTabs, a
 * segmented control) and, at its other end, a slim note (the sample
 * entries) — one under the other on a phone.
 */
export function KitBar({ children }: { children: ReactNode }) {
  return <div className="-mt-0.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 max-sm:[&>*]:max-w-full">{children}</div>;
}

/**
 * The page's main state at a glance. With only `stats` (KitStat), its
 * numbers as tiles, the first dark with its bar; else a card with a status
 * pill and a title, a muted line, the numbers, what's in it (`children`)
 * and the one next step (`next`: a line and its action).
 */
export function KitHero({
  titleId,
  label,
  heading,
  status,
  title,
  description,
  stats,
  next,
  aside,
  children,
  ...data
}: {
  titleId?: string;
  /** Names the card when it has no title or heading. */
  label?: string;
  /** A small heading over the status and title (the title is then not the heading). */
  heading?: ReactNode;
  status?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  stats?: ReactNode;
  next?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
} & DataAttributes) {
  const tiles = stats ? <KitTiles>{stats}</KitTiles> : null;
  const nextLine = next ? <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] bg-(--sp-soft) px-4 py-3">{next}</div> : null;
  if (stats && !title && !heading && !status && !aside && !children) {
    return (
      <section {...data} aria-label={label} className="flex min-w-0 flex-col gap-3">
        {tiles}
        {nextLine}
      </section>
    );
  }
  return (
    <section
      {...data}
      aria-labelledby={title || heading ? titleId : undefined}
      aria-label={title || heading ? undefined : label}
      className="kit-hero flex min-w-0 flex-col gap-5 rounded-[18px] border border-(--sp-line) bg-(--sp-surface) p-5 sm:gap-6 sm:p-7"
    >
      {title || heading || status || aside ? (
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2">
            {heading || status ? (
              <div className="flex flex-wrap items-center gap-2.5">
                {heading ? (
                  <h2 id={titleId} className="m-0 text-[13px] font-bold text-(--sp-muted)">
                    {heading}
                  </h2>
                ) : null}
                {status}
              </div>
            ) : null}
            {title && heading ? <p className="m-0 text-[22px] leading-tight font-extrabold tracking-[-0.3px] break-words text-(--sp-ink) sm:text-[26px]">{title}</p> : null}
            {title && !heading ? (
              <h2 id={titleId} className="m-0 text-[22px] leading-tight font-extrabold tracking-[-0.3px] break-words text-(--sp-ink) sm:text-[26px]">
                {title}
              </h2>
            ) : null}
            {description ? <div className="text-[14.5px] leading-relaxed text-(--sp-muted)">{description}</div> : null}
          </div>
          {aside ? <div className="flex min-w-0 flex-wrap items-center gap-2">{aside}</div> : null}
        </div>
      ) : null}
      {tiles}
      {children}
      {next ? <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-(--sp-line) pt-5">{next}</div> : null}
    </section>
  );
}

/** The tiles of a hero's numbers: the first wider and dark, the rest beside it. */
function KitTiles({ children }: { children: ReactNode }) {
  // The tiles, also those in a fragment (`stats={<>…</>}`).
  const count = (nodes: ReactNode): number =>
    Children.toArray(nodes).reduce<number>((sum, node) => sum + (isValidElement<{ children?: ReactNode }>(node) && node.type === Fragment ? count(node.props.children) : node ? 1 : 0), 0);
  const tiles = count(children);
  return (
    <div className="kit-bento" style={{ ["--kit-rest" as string]: Math.max(tiles - 1, 1) } as CSSProperties}>
      {children}
    </div>
  );
}

/**
 * One number of a hero, as a tile: its icon and label, a large figure; the
 * first tile also a quiet line (`hint`) and a bar (`progress`, 0 to 1).
 * With `href`, the tile opens what it counts (an arrow in its corner).
 */
export function KitStat({
  label,
  value,
  icon,
  hint,
  tone = "neutral",
  href,
  progress,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: IconName;
  hint?: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warn";
  href?: string;
  progress?: number;
}) {
  const body = (
    <>
      <span className="kit-tile-hd">
        {icon ? (
          <span className="kit-tile-ib" aria-hidden="true">
            <Icon name={icon} size={18} filled={tone === "success"} />
          </span>
        ) : null}
        <span className="min-w-0">{label}</span>
      </span>
      <span className="kit-tile-v">{value}</span>
      {hint || progress !== undefined ? (
        <span className="kit-tile-ft">
          {hint ? <span className="min-w-0">{hint}</span> : null}
          {progress !== undefined ? (
            <span className="kit-tile-bar" aria-hidden="true">
              <i style={{ width: `${Math.round(Math.min(Math.max(progress, 0), 1) * 100)}%` }} />
            </span>
          ) : null}
        </span>
      ) : null}
      {href ? (
        <span className="kit-tile-go">
          <Icon name="north_east" size={18} />
        </span>
      ) : null}
    </>
  );
  return href ? (
    <Link href={href} className="kit-tile" data-tone={tone}>
      {body}
    </Link>
  ) : (
    <div className="kit-tile" data-tone={tone}>
      {body}
    </div>
  );
}

/** A hero's next step: its icon, one line, and its action at the end. */
export function KitNext({ icon, children, action, tone = "accent" }: { icon: IconName; children: ReactNode; action?: ReactNode; tone?: "accent" | "warn" | "success" }) {
  const tones = { accent: "bg-(--sp-surface) text-accent", warn: "bg-warn-bg text-warn", success: "bg-success-bg text-success" }[tone];
  return (
    <>
      <span className="flex min-w-0 flex-[1_1_260px] items-center gap-3">
        <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${tones}`}>
          <Icon name={icon} size={19} />
        </span>
        <span className="min-w-0 text-sm leading-relaxed text-(--sp-ink)">{children}</span>
      </span>
      {action ? <span className="flex shrink-0 flex-wrap items-center gap-2">{action}</span> : null}
    </>
  );
}

type DataAttributes = { [key: `data-${string}`]: string | number | undefined };

/**
 * A card with its heading. `flush` leaves the body without padding (a list
 * or a table to the card's edges); `help` folds long help behind "?".
 */
export function KitSection({
  id,
  title,
  titleId,
  description,
  help,
  helpLabel,
  actions,
  children,
  flush = false,
  level = 2,
  className = "",
  ...data
}: {
  id?: string;
  title: ReactNode;
  titleId: string;
  description?: ReactNode;
  help?: ReactNode;
  helpLabel?: string;
  actions?: ReactNode;
  children?: ReactNode;
  flush?: boolean;
  level?: 2 | 3;
  className?: string;
} & DataAttributes) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section {...data} id={id} aria-labelledby={titleId} className={`${kit.card} flex min-w-0 scroll-mt-6 flex-col overflow-hidden ${className}`}>
      <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 pt-4 ${flush ? "pb-3" : ""}`}>
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
          <HeaderLine
            small
            heading={
              <Heading id={titleId} className="m-0 text-base leading-snug font-bold text-(--sp-ink)">
                {title}
              </Heading>
            }
            description={description}
            help={help}
            label={helpLabel ?? ""}
          />
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className={flush ? "flex min-w-0 flex-col" : "flex min-w-0 flex-col gap-5 px-5 pt-4 pb-6"}>{children}</div> : null}
    </section>
  );
}

/** A small, quiet label over a few cards that belong together. */
export function KitGroup({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 px-1 text-[13px] font-bold text-(--sp-muted)">{title}</p>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

/** A toolbar's search field; `label` names it (and is its placeholder). */
export function KitSearch({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-10 min-w-0 flex-[0_1_340px] items-center gap-2 rounded-[11px] border border-(--sp-line) bg-(--sp-surface) px-3 text-sm text-(--sp-faint) transition-colors focus-within:border-(--sp-ink) hover:border-(--sp-muted) max-sm:order-first max-sm:flex-[1_1_100%]">
      <Icon name="search" size={19} />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} aria-label={label} className="min-w-0 flex-1 border-0 bg-transparent text-sm text-(--sp-ink) outline-0 placeholder:text-(--sp-faint)" />
    </label>
  );
}

/** A table's column heads, on the rows' grid (`columns`: CSS grid columns); hidden on phones, where rows are cards. */
export function KitTableHead({ columns, children }: { columns: string; children: ReactNode }) {
  return (
    <div className="kit-th max-sm:hidden" aria-hidden="true" style={{ ["--kit-cols" as string]: columns } as CSSProperties}>
      {children}
    </div>
  );
}

/** The list of a flush section. */
export function KitList({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className="m-0 flex list-none flex-col p-0">
      {children}
    </ul>
  );
}

/**
 * One entry of a KitList: its picture, its name and one quiet line (the
 * entry's link with `href`), one status pill (`aside`), one trailing
 * action (`actions`: a button, or a KitMore menu).
 */
export function KitRow({
  href,
  media,
  title,
  badges,
  meta,
  aside,
  actions,
  ...data
}: {
  href?: string;
  media?: ReactNode;
  title: ReactNode;
  badges?: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
  actions?: ReactNode;
} & DataAttributes) {
  const body = (
    <>
      {media}
      <span className="flex min-w-0 flex-[1_1_160px] flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 text-[14.5px] font-bold break-words text-(--sp-ink)">{title}</span>
          {badges}
        </span>
        {meta ? (
          <span className="text-[13px] text-(--sp-muted)" dir="auto">
            {meta}
          </span>
        ) : null}
      </span>
      {aside ? <span className="flex shrink-0 flex-wrap items-center gap-2">{aside}</span> : null}
    </>
  );
  return (
    <li {...data} className="flex min-h-[66px] flex-wrap items-center gap-x-3 gap-y-2 border-t border-(--sp-line) px-5 py-2.5 transition-colors first:border-t-0 hover:bg-(--sp-soft)">
      {href ? (
        <Link href={href} className="group flex min-w-0 flex-[1_1_280px] items-center gap-x-3.5 gap-y-2 text-(--sp-ink) no-underline hover:text-(--sp-ink)">
          {body}
          <Icon name="chevron_right" size={20} className="shrink-0 text-(--sp-faint) max-sm:hidden" />
        </Link>
      ) : (
        <div className="flex min-w-0 flex-[1_1_280px] items-center gap-x-3.5 gap-y-2">{body}</div>
      )}
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </li>
  );
}

/** A row's picture: its image, or its icon on a soft tile. */
export function KitThumb({ src, icon, dim = false, size = 44 }: { src?: string | null; icon: IconName; dim?: boolean; size?: 40 | 44 | 48 | 52 }) {
  const box = { 40: "h-10 w-10", 44: "h-11 w-11", 48: "h-12 w-12", 52: "h-[52px] w-[52px]" }[size];
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- An uploaded picture, already sized by the platform.
    <img src={src} alt="" loading="lazy" className={`${box} shrink-0 rounded-xl object-cover ${dim ? "opacity-60" : ""}`} />
  ) : (
    <span aria-hidden="true" className={`${box} flex shrink-0 items-center justify-center rounded-xl bg-(--sp-tile) text-(--sp-muted) ${dim ? "opacity-60" : ""}`}>
      <Icon name={icon} size={21} />
    </span>
  );
}

const STATUS_TONES = {
  success: "bg-success-bg text-success",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
  info: "bg-(--sp-tile) text-(--sp-ink-2)",
  neutral: "bg-(--sp-soft) text-(--sp-muted)",
} as const;

/** A status as a small pill (an icon, or a dot): Shown, Paid, Connected, In use. */
export function KitStatus({ tone, children, icon }: { tone: keyof typeof STATUS_TONES; children: ReactNode; icon?: IconName }) {
  return (
    <span className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-bold whitespace-nowrap ${STATUS_TONES[tone]}`}>
      {icon ? <Icon name={icon} size={16} /> : <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Where a list is empty: one icon, what will be here, one line and the one thing to do. */
export function KitEmpty({ icon, title, children, action }: { icon: IconName; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div data-kit-empty="" className="flex flex-col items-center gap-3 px-6 py-14 text-center sm:py-20">
      <span aria-hidden="true" className="mb-1 flex h-16 w-16 items-center justify-center rounded-[18px] bg-(--sp-tile) text-accent">
        <Icon name={icon} size={30} />
      </span>
      <p className="m-0 text-[19px] font-bold text-(--sp-ink)">{title}</p>
      {children ? <div className="m-0 max-w-[420px] text-[14.5px] leading-relaxed text-(--sp-muted)">{children}</div> : null}
      {action ? <div className="pt-3">{action}</div> : null}
    </div>
  );
}

/** Facts as label and value (a plan, an app); `columns` side by side, a hero's figures. */
export function KitFacts({ children, columns = false }: { children: ReactNode; columns?: boolean }) {
  return <dl className={`m-0 ${columns ? "grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr))]" : "flex flex-col"}`}>{children}</dl>;
}

/** One fact of KitFacts (`stacked`: a small label over a large value, on a soft tile). */
export function KitFact({ label, children, stacked = false }: { label: ReactNode; children: ReactNode; stacked?: boolean }) {
  return stacked ? (
    <div className="flex min-w-0 flex-col gap-2 rounded-[14px] bg-(--sp-cell) px-4 py-3.5">
      <dt className="text-[13px] font-bold text-(--sp-muted)">{label}</dt>
      <dd className="m-0 min-w-0 text-[19px] leading-snug font-bold break-words text-(--sp-ink)">{children}</dd>
    </div>
  ) : (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-(--sp-line) py-3 first:border-t-0">
      <dt className="w-[150px] flex-none text-[13.5px] text-(--sp-muted)">{label}</dt>
      <dd className="m-0 min-w-0 flex-1 text-[14.5px] font-bold break-words text-(--sp-ink)">{children}</dd>
    </div>
  );
}

/** Settings in one card, one KitSettingRow under the other. */
export function KitSettings({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div role={label ? "group" : undefined} aria-label={label} className={`${kit.card} flex flex-col px-5 sm:px-6`}>
      {children}
    </div>
  );
}

/**
 * One setting of KitSettings: its icon and name with one status pill, a
 * quiet line or its help behind "?", its one action at the end, and what
 * opens from it (`children`) under it.
 */
export function KitSettingRow({
  id,
  titleId,
  title,
  icon,
  status,
  description,
  help,
  helpLabel,
  action,
  children,
  tone = "neutral",
  ...data
}: {
  id?: string;
  titleId: string;
  title: ReactNode;
  icon: IconName;
  status?: ReactNode;
  description?: ReactNode;
  help?: ReactNode;
  helpLabel?: string;
  action?: ReactNode;
  children?: ReactNode;
  tone?: "neutral" | "danger";
} & DataAttributes) {
  return (
    <section {...data} id={id} aria-labelledby={titleId} className="flex scroll-mt-24 flex-col gap-4 border-t border-(--sp-line) py-5 first:border-t-0 sm:py-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone === "danger" ? "bg-danger-bg text-danger" : "bg-(--sp-cell) text-(--sp-ink-2)"}`}>
          <Icon name={icon} size={21} />
        </span>
        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
          <HeaderLine
            small
            heading={
              <>
                <h2 id={titleId} className="m-0 text-[15px] leading-snug font-bold text-(--sp-ink)">
                  {title}
                </h2>
                {status}
              </>
            }
            description={description}
            help={help}
            label={helpLabel ?? ""}
          />
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2 max-sm:basis-full max-sm:ps-14">{action}</div> : null}
      </div>
      {children ? <div className="flex min-w-0 flex-col gap-4 sm:ps-14">{children}</div> : null}
    </section>
  );
}

/** Long help or a secondary part, folded behind one quiet line ("How it works"). */
export function KitFold({ summary, children, open, tone = "neutral", icon, ...data }: { summary: ReactNode; children: ReactNode; open?: boolean; tone?: "neutral" | "danger"; icon?: IconName } & DataAttributes) {
  return (
    <details {...data} className="group rounded-[14px] bg-(--sp-soft)" open={open}>
      <summary className={`flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-[14px] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-(--sp-tile) [&::-webkit-details-marker]:hidden ${tone === "danger" ? "text-danger" : "text-(--sp-ink)"}`}>
        {icon ? <Icon name={icon} size={19} className={tone === "danger" ? "" : "text-(--sp-muted)"} /> : null}
        <span className="min-w-0 flex-1">{summary}</span>
        <Icon name="expand_more" size={20} className="shrink-0 text-(--sp-muted) transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="kit-fold-body flex flex-col gap-4 px-4 pt-1 pb-5 text-sm leading-relaxed text-(--sp-ink)">{children}</div>
    </details>
  );
}

const CALLOUT_TONES = {
  info: { box: "bg-(--sp-surface) border-(--sp-line)", icon: "text-accent" },
  success: { box: "bg-success-bg border-transparent", icon: "text-success" },
  warn: { box: "bg-warn-bg border-transparent", icon: "text-warn" },
  danger: { box: "bg-danger-bg border-transparent", icon: "text-danger" },
} as const;

/** A quiet note on one line: its icon, a bold line, a muted line, an action at the end. */
export function KitCallout({ icon, tone = "info", title, children, action, role }: { icon: IconName; tone?: keyof typeof CALLOUT_TONES; title?: ReactNode; children?: ReactNode; action?: ReactNode; role?: "status" | "alert" }) {
  return (
    <div role={role} className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] border px-4 py-3 ${CALLOUT_TONES[tone].box}`}>
      <span className="flex min-w-0 flex-[1_1_280px] items-start gap-3">
        <Icon name={icon} size={20} className={`mt-0.5 ${CALLOUT_TONES[tone].icon}`} />
        <span className="flex min-w-0 flex-col gap-0.5 text-[14.5px] leading-relaxed text-(--sp-ink)">
          {title ? <span className="font-bold">{title}</span> : null}
          {children ? <span className={title ? "text-[13.5px] text-(--sp-muted)" : ""}>{children}</span> : null}
        </span>
      </span>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export { HeaderLine, KitDemoLine, KitDisclosure, KitDrawer, KitInspector, KitMore, KitSwitch } from "./client";
