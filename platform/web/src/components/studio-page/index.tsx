import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "../icon";
import type { IconName } from "../icon-names";
import { btn } from "../ui";
import { HeaderLine } from "./client";

/**
 * 132.130 Studio's premium page kit: calm, spacious pages with one main
 * action, in the kit's own few colours (globals.css `--sp-…`): the
 * dashboard's outside Studio and the Studio frame's (`--sf-…`) in it, light
 * and dark, so a page shared by both reads right in each. Right to left
 * with logical sides only; 390 px wide without sideways scrolling.
 *
 * A page:  KitPage > KitHeader (its icon, title, one line, `help` folded
 * behind "?", one `kit.main` action) > KitTiles of 3–4 KitTile > KitSection
 * cards (`flush` for a KitList of KitRow, a KitToolbar on top) > KitEmpty
 * where a list is empty. Settings: KitSetting rows. Facts: KitFacts of
 * KitFact. Long help inside a card: KitFold. A quiet note: KitCallout.
 * Client parts (components/studio-page/client.tsx): HeaderLine, KitDisclosure.
 *
 * Scale: the title 24/28 px, a card's title 17 px, text 15 px, lines 13 px.
 * Space: 24 px between parts (32 on wide screens), 20/28 px inside a card.
 * Radii: 20 a card, 16 a tile, 12 a control. Lines: `--sp-line`, inside a
 * card `--sp-line-soft`.
 */

/** Class names of the kit's controls and surfaces. */
export const kit = {
  /** The page's one main action (Ember, as Studio's "New project"). */
  main: `${btn.main} h-11`,
  /** A secondary action: a quiet outline. */
  quiet:
    "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-(--sp-line) bg-(--sp-surface) px-4 text-sm font-semibold text-(--sp-ink) no-underline transition-colors hover:border-(--sp-muted) hover:bg-(--sp-soft) hover:text-(--sp-ink) disabled:cursor-not-allowed disabled:opacity-60",
  /** A tertiary action: words and an icon, a fill only when hovered. */
  ghost:
    "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-transparent px-3 text-sm font-semibold text-(--sp-ink) no-underline transition-colors hover:bg-(--sp-soft) hover:text-(--sp-ink) disabled:cursor-not-allowed disabled:opacity-60",
  /** A square icon button (give it an aria-label). */
  icon: "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-(--sp-muted) transition-colors hover:bg-(--sp-soft) hover:text-(--sp-ink) disabled:opacity-50",
  /** A card: the one surface of the kit. */
  card: "rounded-[20px] border border-(--sp-line) bg-(--sp-surface) shadow-(--sp-lift)",
  /** A field of a KitToolbar (a select). */
  field:
    "h-10 min-w-0 cursor-pointer rounded-xl border border-(--sp-line) bg-(--sp-surface) ps-3 pe-8 text-sm text-(--sp-ink) transition-colors hover:border-(--sp-muted) focus:border-(--sp-ink) focus:outline-2 focus:outline-offset-0 focus:outline-(--sp-ink)",
  /** A filter chip, on or off (with aria-pressed). */
  chip: (on: boolean) =>
    `inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] transition-colors ${
      on ? "border-(--sp-ink) bg-(--sp-ink) font-bold text-(--sp-surface)" : "border-(--sp-line) bg-(--sp-surface) font-semibold text-(--sp-ink) hover:border-(--sp-muted)"
    }`,
  /** A chip's count. */
  chipCount: (on: boolean) => `rounded-full px-1.5 text-xs tabular-nums ${on ? "bg-white/20" : "bg-(--sp-soft) text-(--sp-muted)"}`,
} as const;

/** The page: its width and the space between its parts. */
export function KitPage({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div data-kit-page="" className={`mx-auto flex w-full min-w-0 flex-col gap-6 lg:gap-8 ${wide ? "max-w-[1320px]" : "max-w-[1180px]"}`}>
      {children}
    </div>
  );
}

/**
 * The top of the page: its icon in a soft tile, one h1, one short line
 * (`description`), its long help behind "?" (`help`, `helpLabel` naming the
 * button), and the page's actions at the end: one `kit.main`, the rest quiet.
 */
export function KitHeader({
  icon,
  title,
  description,
  help,
  helpLabel,
  actions,
  back,
}: {
  icon: IconName;
  title: ReactNode;
  description?: ReactNode;
  help?: ReactNode;
  helpLabel?: string;
  actions?: ReactNode;
  back?: { href: string; label: ReactNode };
}) {
  return (
    <header data-kit-header="" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-[1_1_320px] items-start gap-3.5 sm:gap-4">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-(--sp-tile) text-accent sm:h-12 sm:w-12">
          <Icon name={icon} size={26} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {back ? (
            <Link href={back.href} className="flex w-fit items-center gap-1 text-sm font-semibold text-(--sp-muted) no-underline hover:text-(--sp-ink)">
              <Icon name="arrow_back" size={18} />
              {back.label}
            </Link>
          ) : null}
          <h1 className="m-0 text-[24px] leading-tight font-bold tracking-[-0.4px] break-words text-(--sp-ink) sm:text-[28px]">{title}</h1>
          {description || help ? <HeaderLine description={description} help={help} label={helpLabel ?? ""} /> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </header>
  );
}

/** The page's few numbers that matter (3–4), side by side; two a row on phones. */
export function KitTiles({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="grid gap-3 sm:gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))" }}>
      {children}
    </div>
  );
}

const TILE_TONES = { neutral: "text-(--sp-muted)", accent: "text-accent", success: "text-success", warn: "text-warn" } as const;

/** One number: its name with a small icon, the number, a quiet line; with `href`, it opens what it counts. */
export function KitTile({ label, value, icon, hint, tone = "neutral", href }: { label: ReactNode; value: ReactNode; icon: IconName; hint?: ReactNode; tone?: keyof typeof TILE_TONES; href?: string }) {
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-(--sp-muted)">
        <Icon name={icon} size={18} className={TILE_TONES[tone]} />
        <span className="min-w-0 truncate">{label}</span>
      </span>
      <span className="text-[28px] leading-none font-bold tracking-[-0.5px] text-(--sp-ink) tabular-nums">{value}</span>
      {hint ? <span className="text-xs text-(--sp-muted)">{hint}</span> : null}
    </>
  );
  const box = `flex min-w-0 flex-col gap-3 rounded-2xl border border-(--sp-line) bg-(--sp-surface) px-4 py-4 shadow-(--sp-lift) sm:px-5`;
  return href ? (
    <Link href={href} className={`${box} text-(--sp-ink) no-underline transition-colors hover:border-(--sp-muted) hover:text-(--sp-ink)`}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}

/** A small, quiet label over a few cards that belong together. */
export function KitGroup({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 px-1 text-[13px] font-semibold text-(--sp-muted)">{title}</p>
      <div className="flex flex-col gap-4 lg:gap-5">{children}</div>
    </div>
  );
}

type DataAttributes = { [key: `data-${string}`]: string | number | undefined };

/**
 * A card with its heading: the kit's section. `flush` leaves the body
 * without padding (a list to the card's edges); `help` folds long help
 * behind "?" beside the line about it.
 */
export function KitSection({
  id,
  title,
  titleId,
  description,
  help,
  helpLabel,
  icon,
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
  icon?: IconName;
  actions?: ReactNode;
  children?: ReactNode;
  flush?: boolean;
  level?: 2 | 3;
  className?: string;
} & DataAttributes) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section {...data} id={id} aria-labelledby={titleId} className={`${kit.card} flex min-w-0 scroll-mt-6 flex-col ${className}`}>
      <div className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-5 sm:px-7 sm:pt-6 ${flush ? "border-b border-(--sp-line-soft) pb-4 sm:pb-5" : ""}`}>
        <div className="flex min-w-0 flex-[1_1_240px] items-start gap-3">
          {icon ? (
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--sp-tile) text-(--sp-ink)">
              <Icon name={icon} size={20} />
            </span>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Heading id={titleId} className="m-0 text-[17px] leading-snug font-bold text-(--sp-ink)">
              {title}
            </Heading>
            {description || help ? <HeaderLine small description={description} help={help} label={helpLabel ?? ""} /> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className={flush ? "flex min-w-0 flex-col" : "flex min-w-0 flex-col gap-5 px-5 pt-5 pb-6 sm:px-7 sm:pb-7"}>{children}</div> : null}
    </section>
  );
}

/** The search and filters above a flush section's list. */
export function KitToolbar({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div data-kit-toolbar="" className="flex flex-col gap-3 border-b border-(--sp-line-soft) px-4 py-4 sm:px-7">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {footer ? <div className="flex flex-wrap items-center gap-2">{footer}</div> : null}
    </div>
  );
}

/** A KitToolbar's search field; `label` names it (and is its placeholder). */
export function KitSearch({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-10 min-w-0 flex-[1_1_240px] items-center gap-2 rounded-xl border border-(--sp-line) bg-(--sp-soft) px-3 text-sm text-(--sp-muted) transition-colors focus-within:border-(--sp-ink) focus-within:bg-(--sp-surface) hover:border-(--sp-muted)">
      <Icon name="search" size={18} />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} aria-label={label} className="min-w-0 flex-1 border-0 bg-transparent text-sm text-(--sp-ink) outline-0" />
    </label>
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
 * One entry of a KitList: its picture, its title (with badges), one quiet
 * line, all of it the entry's link with `href`; `aside` (a status) at the
 * link's end, `actions` after it.
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
      <span className="flex min-w-0 flex-[1_1_160px] flex-col gap-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 text-[15px] font-semibold break-words text-(--sp-ink)">{title}</span>
          {badges}
        </span>
        {meta ? (
          <span className="text-[13px] text-(--sp-muted)" dir="auto">
            {meta}
          </span>
        ) : null}
      </span>
      {aside ? <span className="flex shrink-0 flex-wrap items-center gap-2 max-sm:order-last max-sm:basis-full">{aside}</span> : null}
    </>
  );
  return (
    <li {...data} className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-(--sp-line-soft) px-5 py-4 first:border-t-0 sm:px-7">
      {href ? (
        <Link href={href} className="group -my-2 -ms-2.5 flex min-w-0 flex-[1_1_320px] flex-wrap items-center gap-x-4 gap-y-2 rounded-xl py-2 ps-2.5 pe-2 text-(--sp-ink) no-underline transition-colors hover:bg-(--sp-soft) hover:text-(--sp-ink) sm:flex-nowrap">
          {body}
          <Icon name="chevron_right" size={20} className="shrink-0 text-(--sp-muted) max-sm:hidden" />
        </Link>
      ) : (
        <div className="flex min-w-0 flex-[1_1_320px] flex-wrap items-center gap-x-4 gap-y-2 sm:flex-nowrap">{body}</div>
      )}
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </li>
  );
}

/** A KitRow's picture: its image, or its icon on a soft tile. */
export function KitThumb({ src, icon, dim = false }: { src?: string | null; icon: IconName; dim?: boolean }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- An uploaded picture, already sized by the platform.
    <img src={src} alt="" loading="lazy" className={`h-12 w-12 shrink-0 rounded-xl border border-(--sp-line-soft) object-cover ${dim ? "opacity-60" : ""}`} />
  ) : (
    <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-(--sp-tile) text-(--sp-muted) ${dim ? "opacity-60" : ""}`}>
      <Icon name={icon} size={22} />
    </span>
  );
}

const STATUS_TONES = {
  success: "bg-success-bg text-success",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
  info: "bg-(--sp-tile) text-(--sp-ink)",
  neutral: "bg-(--sp-soft) text-(--sp-muted)",
} as const;

/** A status as a soft pill with a dot: Shown, Paid, Active. */
export function KitStatus({ tone, children }: { tone: keyof typeof STATUS_TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${STATUS_TONES[tone]}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

/** Where a list is empty: one icon, what will be here, one line and the one thing to do. */
export function KitEmpty({ icon, title, children, action }: { icon: IconName; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div data-kit-empty="" className="flex flex-col items-center gap-3 px-6 py-12 text-center sm:py-16">
      <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-(--sp-tile) text-(--sp-muted)">
        <Icon name={icon} size={28} />
      </span>
      <p className="m-0 text-[17px] font-bold text-(--sp-ink)">{title}</p>
      {children ? <div className="m-0 max-w-[440px] text-sm leading-relaxed text-(--sp-muted)">{children}</div> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

/** Facts as label and value (a plan, an app); `columns` side by side on wide screens. */
export function KitFacts({ children, columns = false }: { children: ReactNode; columns?: boolean }) {
  return <dl className={`m-0 ${columns ? "grid gap-x-8 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr))]" : "flex flex-col"}`}>{children}</dl>;
}

/** One fact of KitFacts. */
export function KitFact({ label, children, stacked = false }: { label: ReactNode; children: ReactNode; stacked?: boolean }) {
  return stacked ? (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[13px] text-(--sp-muted)">{label}</dt>
      <dd className="m-0 min-w-0 text-[17px] font-bold break-words text-(--sp-ink)">{children}</dd>
    </div>
  ) : (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-(--sp-line-soft) py-3.5 first:border-t-0">
      <dt className="w-[150px] flex-none text-sm text-(--sp-muted)">{label}</dt>
      <dd className="m-0 min-w-0 flex-1 text-[15px] font-semibold break-words text-(--sp-ink)">{children}</dd>
    </div>
  );
}

/**
 * A setting as a row: its name, a line about it and a status on one side,
 * what to do on the other (stacked on phones and narrow screens).
 */
export function KitSetting({
  id,
  titleId,
  title,
  icon,
  badge,
  description,
  children,
  ...data
}: {
  id?: string;
  titleId: string;
  title: ReactNode;
  icon?: IconName;
  badge?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
} & DataAttributes) {
  return (
    <section {...data} id={id} aria-labelledby={titleId} className={`${kit.card} grid scroll-mt-6 gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10`}>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          {icon ? <Icon name={icon} size={22} className="text-accent" /> : null}
          <h2 id={titleId} className="m-0 text-[17px] leading-snug font-bold text-(--sp-ink)">
            {title}
          </h2>
          {badge}
        </div>
        {description ? <div className="text-sm leading-relaxed text-(--sp-muted)">{description}</div> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

/** Long help or a secondary part, folded: a quiet line that opens it. */
export function KitFold({ summary, children, open, tone = "neutral", ...data }: { summary: ReactNode; children: ReactNode; open?: boolean; tone?: "neutral" | "danger" } & DataAttributes) {
  return (
    <details {...data} className="group rounded-2xl border border-(--sp-line-soft) bg-(--sp-soft)" open={open}>
      <summary className={`flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden ${tone === "danger" ? "text-danger" : "text-(--sp-ink)"}`}>
        <span className="min-w-0 flex-1">{summary}</span>
        <Icon name="expand_more" size={20} className="shrink-0 text-(--sp-muted) transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-4 px-4 pt-1 pb-4 text-sm leading-relaxed text-(--sp-ink)">{children}</div>
    </details>
  );
}

const CALLOUT_TONES = {
  info: { box: "border-(--sp-line) bg-(--sp-surface)", icon: "text-accent" },
  success: { box: "border-transparent bg-success-bg", icon: "text-success" },
  warn: { box: "border-transparent bg-warn-bg", icon: "text-warn" },
  danger: { box: "border-transparent bg-danger-bg", icon: "text-danger" },
} as const;

/** A quiet note in one strip: its icon, a bold line, a muted line, and an action at the end. */
export function KitCallout({ icon, tone = "info", title, children, action, role }: { icon: IconName; tone?: keyof typeof CALLOUT_TONES; title?: ReactNode; children?: ReactNode; action?: ReactNode; role?: "status" | "alert" }) {
  return (
    <div role={role} className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border px-4 py-3.5 sm:px-5 ${CALLOUT_TONES[tone].box}`}>
      <span className="flex min-w-0 flex-[1_1_280px] items-start gap-3">
        <Icon name={icon} size={22} className={`mt-px ${CALLOUT_TONES[tone].icon}`} />
        <span className="flex min-w-0 flex-col gap-0.5 text-[15px] leading-relaxed text-(--sp-ink)">
          {title ? <span className="font-bold">{title}</span> : null}
          {children ? <span className={title ? "text-sm text-(--sp-muted)" : ""}>{children}</span> : null}
        </span>
      </span>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export { HeaderLine, KitDisclosure } from "./client";
