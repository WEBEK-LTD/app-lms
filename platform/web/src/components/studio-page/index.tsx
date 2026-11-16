import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "../icon";
import type { IconName } from "../icon-names";
import { btn } from "../ui";
import { HeaderLine } from "./client";

/**
 * 132.130 Studio's premium page kit: guided, calm pages. At a glance a page
 * shows its main state and one next step; everything else opens on demand
 * (a fold, a drawer, a "⋯" menu, a "?"), one click or tap away. Its own few
 * colours (globals.css `--sp-…`) are the dashboard's outside Studio and the
 * Studio frame's (`--sf-…`) in it, light and dark, so a page both share
 * reads right in each. Logical sides only (right to left in Arabic); 390 px
 * wide without sideways scrolling.
 *
 * A page:  KitPage > KitHeader (big title, a one-line subtitle, its long
 *          help behind "?", one `kit.main` action; the rest `kit.ghost` or
 *          a KitMore menu) > one KitHero (the main state: a status pill,
 *          KitStat numbers, the next step) > KitSection cards with a short
 *          KitList of KitRow (name, one KitStatus pill, one trailing action;
 *          details in a KitDrawer) > KitEmpty where a list is empty.
 * Settings: KitSettings of KitSettingRow. Facts: KitFacts of KitFact.
 * Long help: KitFold ("How it works") or a "?" (`help` on the header and
 * on sections). A quiet one-line note: KitCallout.
 *
 * Scale: title 26/32 px, a hero's figure 30 px, a card's title 17 px, text
 * 15 px, labels 13 px. Rhythm: 24 px between parts, 32 on wide screens;
 * 20/32 px inside a card. Radii: 28 the hero, 24 a card, 16 a tile or a
 * row's hover, 12 a control. Lines: one hairline (`--sp-edge`) round a
 * card, `--sp-line-soft` between rows; colour only for state and the one
 * main action.
 */

/** Class names of the kit's controls and surfaces. */
export const kit = {
  /** The page's one main action (Ember, as Studio's "New project"). */
  main: `${btn.main} h-11`,
  /** A secondary action that needs a box (in a form, beside a field). */
  quiet:
    "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-(--sp-line) bg-(--sp-surface) px-4 text-sm font-semibold text-(--sp-ink) no-underline transition-colors hover:border-(--sp-muted) hover:bg-(--sp-soft) hover:text-(--sp-ink) disabled:cursor-not-allowed disabled:opacity-60",
  /** The rest: words and an icon, a soft fill only when hovered. */
  ghost:
    "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-transparent px-3.5 text-sm font-semibold text-(--sp-ink) no-underline transition-colors hover:bg-(--sp-soft) hover:text-(--sp-ink) disabled:cursor-not-allowed disabled:opacity-60",
  /** A row's one trailing action: a small outlined pill (`btn.pill`, for a SubmitButton's `variant="pill"`). */
  row: `${btn.pill} h-9 cursor-pointer`,
  /** A square icon button (give it an aria-label). */
  icon: "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-(--sp-muted) transition-colors hover:bg-(--sp-soft) hover:text-(--sp-ink) disabled:opacity-50",
  /** A card: the kit's surface, told apart by a hairline and space. */
  card: "rounded-3xl border border-(--sp-edge) bg-(--sp-surface)",
  /** A field of a toolbar (a select). */
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

/** The page: its width and its rhythm. */
export function KitPage({ children }: { children: ReactNode }) {
  return (
    <div data-kit-page="" className="mx-auto flex w-full max-w-[1120px] min-w-0 flex-col gap-6 lg:gap-8">
      {children}
    </div>
  );
}

/**
 * The top of the page: its icon in a soft tile, one big h1, a one-line
 * subtitle, its long help behind "?" (`help`, `helpLabel` naming the
 * button), and its actions at the end: one `kit.main`, the rest ghost.
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
    <header data-kit-header="" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 pt-1">
      <div className="flex min-w-0 flex-[1_1_320px] items-start gap-4">
        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-(--sp-surface) text-accent shadow-[0_1px_2px_rgba(14,13,36,0.06)] ring-1 ring-(--sp-edge)">
          <Icon name={icon} size={26} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {back ? (
            <Link href={back.href} className="flex w-fit items-center gap-1 text-sm font-semibold text-(--sp-muted) no-underline hover:text-(--sp-ink)">
              <Icon name="arrow_back" size={18} />
              {back.label}
            </Link>
          ) : null}
          <h1 className="m-0 text-[26px] leading-[1.15] font-bold tracking-[-0.5px] break-words text-(--sp-ink) sm:text-[32px]">{title}</h1>
          {description || help ? <HeaderLine description={description} help={help} label={helpLabel ?? ""} /> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/**
 * The page's one hero card: its main state at a glance. A status pill and
 * a title, a muted line, the numbers that matter (KitStat), and the one
 * next step (`next`: a line and its action). The only card that lifts.
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
  return (
    <section
      {...data}
      aria-labelledby={title || heading ? titleId : undefined}
      aria-label={title || heading ? undefined : label}
      className="kit-hero flex min-w-0 flex-col gap-6 rounded-[28px] border border-(--sp-edge) bg-(--sp-surface) p-5 shadow-(--sp-lift) sm:gap-7 sm:p-8"
    >
      {title || heading || status || aside ? (
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2">
            {heading || status ? (
              <div className="flex flex-wrap items-center gap-2.5">
                {heading ? (
                  <h2 id={titleId} className="m-0 text-[13px] font-semibold text-(--sp-muted)">
                    {heading}
                  </h2>
                ) : null}
                {status}
              </div>
            ) : null}
            {title && heading ? <p className="m-0 text-[22px] leading-tight font-bold tracking-[-0.3px] break-words text-(--sp-ink) sm:text-[26px]">{title}</p> : null}
            {title && !heading ? (
              <h2 id={titleId} className="m-0 text-[22px] leading-tight font-bold tracking-[-0.3px] break-words text-(--sp-ink) sm:text-[26px]">
                {title}
              </h2>
            ) : null}
            {description ? <div className="text-[15px] leading-relaxed text-(--sp-muted)">{description}</div> : null}
          </div>
          {aside ? <div className="flex min-w-0 flex-wrap items-center gap-2">{aside}</div> : null}
        </div>
      ) : null}
      {stats ? <div className="grid gap-x-6 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(min(140px,100%),1fr))]">{stats}</div> : null}
      {children}
      {next ? <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-(--sp-line-soft) pt-5 sm:pt-6">{next}</div> : null}
    </section>
  );
}

const STAT_TONES = { neutral: "text-(--sp-muted)", accent: "text-accent", success: "text-success", warn: "text-warn" } as const;

/** One number of a hero: a small label, a large figure, a quiet line; with `href`, it opens what it counts. */
export function KitStat({ label, value, icon, hint, tone = "neutral", href }: { label: ReactNode; value: ReactNode; icon?: IconName; hint?: ReactNode; tone?: keyof typeof STAT_TONES; href?: string }) {
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-(--sp-muted)">
        {icon ? <Icon name={icon} size={17} className={STAT_TONES[tone]} /> : null}
        <span className="min-w-0 truncate">{label}</span>
      </span>
      <span className="text-[30px] leading-none font-bold tracking-[-0.6px] text-(--sp-ink) tabular-nums">{value}</span>
      {hint ? <span className="text-xs text-(--sp-muted)">{hint}</span> : null}
    </>
  );
  return href ? (
    <Link href={href} className="-m-2 flex min-w-0 flex-col gap-2.5 rounded-2xl p-2 text-(--sp-ink) no-underline transition-colors hover:bg-(--sp-soft) hover:text-(--sp-ink)">
      {body}
    </Link>
  ) : (
    <div className="flex min-w-0 flex-col gap-2.5">{body}</div>
  );
}

/** A hero's next step: its icon, one line, and its action at the end. */
export function KitNext({ icon, children, action, tone = "accent" }: { icon: IconName; children: ReactNode; action?: ReactNode; tone?: "accent" | "warn" | "success" }) {
  const tones = { accent: "bg-(--sp-tile) text-accent", warn: "bg-warn-bg text-warn", success: "bg-success-bg text-success" }[tone];
  return (
    <>
      <span className="flex min-w-0 flex-[1_1_260px] items-center gap-3">
        <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones}`}>
          <Icon name={icon} size={21} />
        </span>
        <span className="min-w-0 text-[15px] leading-relaxed text-(--sp-ink)">{children}</span>
      </span>
      {action ? <span className="flex shrink-0 flex-wrap items-center gap-2">{action}</span> : null}
    </>
  );
}

type DataAttributes = { [key: `data-${string}`]: string | number | undefined };

/**
 * A card with its heading. `flush` leaves the body without padding (a list
 * to the card's edges); `help` folds long help behind "?" beside its line.
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
    <section {...data} id={id} aria-labelledby={titleId} className={`${kit.card} flex min-w-0 scroll-mt-6 flex-col ${className}`}>
      <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 pt-5 sm:px-8 sm:pt-7 ${flush ? "pb-3 sm:pb-4" : ""}`}>
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
          <HeaderLine
            small
            heading={
              <Heading id={titleId} className="m-0 text-[17px] leading-snug font-bold text-(--sp-ink)">
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
      {children ? <div className={flush ? "flex min-w-0 flex-col pb-2" : "flex min-w-0 flex-col gap-5 px-5 pt-5 pb-6 sm:px-8 sm:pb-8"}>{children}</div> : null}
    </section>
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

/** A toolbar's search field; `label` names it (and is its placeholder). */
export function KitSearch({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-11 min-w-0 flex-[1_1_220px] items-center gap-2 rounded-2xl bg-(--sp-soft) px-3.5 text-sm text-(--sp-muted) ring-1 ring-transparent transition-shadow focus-within:bg-(--sp-surface) focus-within:ring-(--sp-ink) hover:ring-(--sp-line)">
      <Icon name="search" size={19} />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} aria-label={label} className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-(--sp-ink) outline-0" />
    </label>
  );
}

/** The list of a flush section. */
export function KitList({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className="m-0 flex list-none flex-col px-2 sm:px-4">
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
      {aside ? <span className="flex shrink-0 flex-wrap items-center gap-2">{aside}</span> : null}
    </>
  );
  return (
    <li {...data} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-(--sp-line-soft) px-3 py-3 first:border-t-0 sm:px-4">
      {href ? (
        <Link href={href} className="group -mx-2 flex min-w-0 flex-[1_1_280px] items-center gap-x-4 gap-y-2 rounded-2xl px-2 py-1.5 text-(--sp-ink) no-underline transition-colors hover:bg-(--sp-soft) hover:text-(--sp-ink)">
          {body}
          <Icon name="chevron_right" size={20} className="shrink-0 text-(--sp-muted) max-sm:hidden" />
        </Link>
      ) : (
        <div className="flex min-w-0 flex-[1_1_280px] items-center gap-x-4 gap-y-2">{body}</div>
      )}
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </li>
  );
}

/** A row's picture: its image, or its icon on a soft tile. */
export function KitThumb({ src, icon, dim = false, size = 48 }: { src?: string | null; icon: IconName; dim?: boolean; size?: 40 | 48 | 52 }) {
  const box = { 40: "h-10 w-10", 48: "h-12 w-12", 52: "h-[52px] w-[52px]" }[size];
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- An uploaded picture, already sized by the platform.
    <img src={src} alt="" loading="lazy" className={`${box} shrink-0 rounded-2xl object-cover ${dim ? "opacity-60" : ""}`} />
  ) : (
    <span aria-hidden="true" className={`${box} flex shrink-0 items-center justify-center rounded-2xl bg-(--sp-tile) text-(--sp-muted) ${dim ? "opacity-60" : ""}`}>
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

/** A status as a small pill with a dot: Shown, Paid, Connected, In use. */
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
    <div data-kit-empty="" className="flex flex-col items-center gap-3 px-6 py-14 text-center sm:py-20">
      <span aria-hidden="true" className="mb-1 flex h-16 w-16 items-center justify-center rounded-3xl bg-(--sp-tile) text-accent">
        <Icon name={icon} size={30} />
      </span>
      <p className="m-0 text-[19px] font-bold text-(--sp-ink)">{title}</p>
      {children ? <div className="m-0 max-w-[420px] text-[15px] leading-relaxed text-(--sp-muted)">{children}</div> : null}
      {action ? <div className="pt-3">{action}</div> : null}
    </div>
  );
}

/** Facts as label and value (a plan, an app); `columns` side by side, a hero's figures. */
export function KitFacts({ children, columns = false }: { children: ReactNode; columns?: boolean }) {
  return <dl className={`m-0 ${columns ? "grid gap-x-6 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(min(170px,100%),1fr))]" : "flex flex-col"}`}>{children}</dl>;
}

/** One fact of KitFacts (`stacked`: a small label over a large value). */
export function KitFact({ label, children, stacked = false }: { label: ReactNode; children: ReactNode; stacked?: boolean }) {
  return stacked ? (
    <div className="flex min-w-0 flex-col gap-1.5">
      <dt className="text-[13px] font-semibold text-(--sp-muted)">{label}</dt>
      <dd className="m-0 min-w-0 text-[19px] leading-snug font-bold break-words text-(--sp-ink)">{children}</dd>
    </div>
  ) : (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-(--sp-line-soft) py-3.5 first:border-t-0">
      <dt className="w-[150px] flex-none text-sm text-(--sp-muted)">{label}</dt>
      <dd className="m-0 min-w-0 flex-1 text-[15px] font-semibold break-words text-(--sp-ink)">{children}</dd>
    </div>
  );
}

/** Settings in one card, one KitSettingRow under the other. */
export function KitSettings({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div role={label ? "group" : undefined} aria-label={label} className={`${kit.card} flex flex-col px-5 sm:px-8`}>
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
    <section {...data} id={id} aria-labelledby={titleId} className="flex scroll-mt-6 flex-col gap-4 border-t border-(--sp-line-soft) py-6 first:border-t-0 sm:py-7">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone === "danger" ? "bg-danger-bg text-danger" : "bg-(--sp-tile) text-(--sp-ink)"}`}>
          <Icon name={icon} size={22} />
        </span>
        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
          <HeaderLine
            small
            heading={
              <>
                <h2 id={titleId} className="m-0 text-[16px] leading-snug font-bold text-(--sp-ink)">
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
        {action ? <div className="flex flex-wrap items-center gap-2 max-sm:basis-full max-sm:ps-15">{action}</div> : null}
      </div>
      {children ? <div className="flex min-w-0 flex-col gap-4 sm:ps-15">{children}</div> : null}
    </section>
  );
}

/** Long help or a secondary part, folded behind one quiet line ("How it works"). */
export function KitFold({ summary, children, open, tone = "neutral", icon, ...data }: { summary: ReactNode; children: ReactNode; open?: boolean; tone?: "neutral" | "danger"; icon?: IconName } & DataAttributes) {
  return (
    <details {...data} className="group rounded-2xl bg-(--sp-soft)" open={open}>
      <summary className={`flex min-h-12 cursor-pointer list-none items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors hover:bg-(--sp-tile) [&::-webkit-details-marker]:hidden ${tone === "danger" ? "text-danger" : "text-(--sp-ink)"}`}>
        {icon ? <Icon name={icon} size={19} className={tone === "danger" ? "" : "text-(--sp-muted)"} /> : null}
        <span className="min-w-0 flex-1">{summary}</span>
        <Icon name="expand_more" size={20} className="shrink-0 text-(--sp-muted) transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="kit-fold-body flex flex-col gap-4 px-4 pt-1 pb-5 text-sm leading-relaxed text-(--sp-ink)">{children}</div>
    </details>
  );
}

/** A "⋯" menu of a row's or a page's other actions (`label` names it). */
export function KitMore({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group relative">
      <summary aria-label={label} title={label} className={`${kit.icon} list-none [&::-webkit-details-marker]:hidden`}>
        <span aria-hidden="true" className="text-lg leading-none font-bold tracking-[1px]">
          ⋯
        </span>
      </summary>
      <div className="kit-fold-body absolute end-0 top-[calc(100%+6px)] z-30 flex min-w-[220px] flex-col gap-0.5 rounded-2xl border border-(--sp-edge) bg-(--sp-surface) p-1.5 shadow-[0_16px_40px_-12px_rgba(14,13,36,0.3)] [&>*]:justify-start">
        {children}
      </div>
    </details>
  );
}

const CALLOUT_TONES = {
  info: { box: "bg-(--sp-surface) border-(--sp-edge)", icon: "text-accent" },
  success: { box: "bg-success-bg border-transparent", icon: "text-success" },
  warn: { box: "bg-warn-bg border-transparent", icon: "text-warn" },
  danger: { box: "bg-danger-bg border-transparent", icon: "text-danger" },
} as const;

/** A quiet note on one line: its icon, a bold line, a muted line, an action at the end. */
export function KitCallout({ icon, tone = "info", title, children, action, role }: { icon: IconName; tone?: keyof typeof CALLOUT_TONES; title?: ReactNode; children?: ReactNode; action?: ReactNode; role?: "status" | "alert" }) {
  return (
    <div role={role} className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border px-4 py-3 sm:px-5 ${CALLOUT_TONES[tone].box}`}>
      <span className="flex min-w-0 flex-[1_1_280px] items-start gap-3">
        <Icon name={icon} size={21} className={`mt-0.5 ${CALLOUT_TONES[tone].icon}`} />
        <span className="flex min-w-0 flex-col gap-0.5 text-[15px] leading-relaxed text-(--sp-ink)">
          {title ? <span className="font-semibold">{title}</span> : null}
          {children ? <span className={title ? "text-sm text-(--sp-muted)" : ""}>{children}</span> : null}
        </span>
      </span>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export { HeaderLine, KitDisclosure, KitDrawer } from "./client";
