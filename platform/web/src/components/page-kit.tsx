import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "./icon";
import type { IconName } from "./icon-names";

/**
 * Studio page kit: the parts every project page is built from, in the look of
 * Studio's bar and menu, in the dashboard's colour tokens (so the same pages
 * work in the dashboard's light and dark themes). With ui.tsx's PageHeader,
 * Section, EmptyState, Badge and Notice, and page-kit-client.tsx's Sheet and
 * FilterList. A list page: PageHeader (one `btn.main` action), StatRow,
 * LinkCards, a flush Section holding a FilterList of ItemRows (or CardGrid of
 * ItemCards), then PageGroups of settings Sections. A form: FormSections.
 */

/** A row of key numbers under the page's header. */
export function StatRow({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div role="group" aria-label={label} className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))" }}>
      {children}
    </div>
  );
}

const STAT_TONES = {
  neutral: "bg-sand text-ink-3",
  accent: "bg-peach text-accent",
  success: "bg-success-bg text-success",
  warn: "bg-warn-bg text-warn",
} as const;

/** One number of a StatRow; with `href`, the tile opens the page behind the number. */
export function Stat({ label, value, icon, hint, tone = "neutral", href }: { label: ReactNode; value: ReactNode; icon: IconName; hint?: ReactNode; tone?: keyof typeof STAT_TONES; href?: string }) {
  const body = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${STAT_TONES[tone]}`}>
        <Icon name={icon} size={22} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[13px] font-semibold text-muted">{label}</span>
        <span className="text-[24px] leading-tight font-extrabold text-midnight tabular-nums">{value}</span>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </span>
    </>
  );
  const box = "flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-white p-4";
  return href ? (
    <Link href={href} className={`${box} text-midnight no-underline transition-colors hover:border-line-strong hover:bg-sand hover:text-midnight`}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}

/** Links to the page's own sub-pages, as small cards: an icon, a name and a line. */
export function LinkCards({ items, label }: { items: { href: string; icon: IconName; label: ReactNode; hint?: ReactNode }[]; label?: string }) {
  return (
    <nav aria-label={label}>
      <ul className="m-0 grid list-none gap-3 p-0" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {items.map((item) => (
          <li key={item.href} className="min-w-0">
            <Link href={item.href} className="flex h-full items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-midnight no-underline transition-colors hover:border-line-strong hover:bg-sand hover:text-midnight">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-ivory text-midnight">
                <Icon name={item.icon} size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-bold">{item.label}</span>
                {item.hint ? <span className="truncate text-[13px] text-muted">{item.hint}</span> : null}
              </span>
              <Icon name="chevron_right" size={20} className="text-faint" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** A labelled group of a page's Sections (settings, payments), like the menu's group names. */
export function PageGroup({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <p className="m-0 flex items-center gap-3 text-xs font-bold tracking-[0.4px] text-muted uppercase">
        {title}
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </p>
      {/* Its Sections all as wide as the page, whatever width they keep elsewhere. */}
      <div className="flex flex-col gap-5 [&>*]:max-w-none">{children}</div>
    </div>
  );
}

const TINTS = ["bg-tile-1", "bg-tile-2", "bg-tile-3", "bg-tile-4", "bg-tile-5"];

/** A list entry's picture: its image, or its icon on a soft tile (`tint` picks the tile's colour). */
export function Thumb({ src, icon, shape = "wide", tint = 0 }: { src?: string | null; icon: IconName; shape?: "wide" | "round" | "square"; tint?: number }) {
  const box = { wide: "h-12 w-[76px] rounded-[10px]", round: "h-11 w-11 rounded-full", square: "h-11 w-11 rounded-xl" }[shape];
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- An uploaded picture, already sized by the platform.
    <img src={src} alt="" className={`${box} shrink-0 border border-line-soft object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${box} flex shrink-0 items-center justify-center text-ink-3 ${TINTS[Math.abs(tint) % TINTS.length]}`}>
      <Icon name={icon} size={shape === "wide" ? 24 : 22} />
    </span>
  );
}

/** The list of a flush Section: ItemRows, or a FilterList's. */
export function ItemList({ children }: { children: ReactNode }) {
  return <ul className="m-0 flex list-none flex-col p-0">{children}</ul>;
}

type DataAttributes = { [key: `data-${string}`]: string | number | undefined };

/**
 * One entry of a list: its picture, title (with badges) and a line about it,
 * the whole of it a link to the entry's page when `href` is given; `aside`
 * (a status) at the end of the link, `actions` (buttons, Sheets) after it.
 */
export function ItemRow({
  href,
  media,
  title,
  badges,
  meta,
  extra,
  aside,
  actions,
  ...data
}: {
  href?: string;
  media?: ReactNode;
  title: ReactNode;
  badges?: ReactNode;
  meta?: ReactNode;
  /** A second, quieter line (a teacher, the subjects). */
  extra?: ReactNode;
  aside?: ReactNode;
  actions?: ReactNode;
} & DataAttributes) {
  const body = (
    <>
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
      {/* On phones the status goes under the entry, so the title keeps the width. */}
      {aside ? <span className="flex shrink-0 flex-wrap items-center gap-2 max-sm:order-last max-sm:basis-full">{aside}</span> : null}
    </>
  );
  return (
    <li {...data} className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line-soft px-5 py-3.5 first:border-t-0 sm:px-6">
      {href ? (
        <Link href={href} className="group -my-1.5 -ms-2 flex min-w-0 flex-[1_1_320px] flex-wrap items-center gap-x-3.5 gap-y-2 rounded-xl py-1.5 ps-2 pe-1 text-midnight no-underline hover:bg-sand hover:text-midnight sm:flex-nowrap">
          {body}
          <Icon name="chevron_right" size={20} className="shrink-0 text-faint group-hover:text-midnight max-sm:hidden" />
        </Link>
      ) : (
        <div className="flex min-w-0 flex-[1_1_320px] flex-wrap items-center gap-x-3.5 gap-y-2 sm:flex-nowrap">{body}</div>
      )}
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </li>
  );
}

/** Cards in a grid, for lists with pictures and few entries (bundles, plans). */
export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <ul className="m-0 grid list-none gap-4 p-0" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
      {children}
    </ul>
  );
}

/** One card of a CardGrid: a picture on top, then the title, badges and lines; all of it the entry's link. */
export function ItemCard({ href, image, icon, title, badges, children, tint = 0, ...data }: { href: string; image?: string | null; icon: IconName; title: ReactNode; badges?: ReactNode; children?: ReactNode; tint?: number } & DataAttributes) {
  return (
    <li {...data} className="min-w-0">
      <Link href={href} className="group flex h-full flex-col overflow-hidden rounded-[18px] border border-line bg-white text-midnight no-underline transition-shadow hover:border-line-strong hover:text-midnight hover:shadow-[0_6px_24px_rgba(14,13,36,0.08)]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- An uploaded picture, already sized by the platform.
          <img src={image} alt="" className="aspect-[16/9] w-full object-cover" />
        ) : (
          <span aria-hidden="true" className={`flex aspect-[16/9] w-full items-center justify-center text-ink-3 ${TINTS[Math.abs(tint) % TINTS.length]}`}>
            <Icon name={icon} size={40} />
          </span>
        )}
        <span className="flex flex-1 flex-col gap-1.5 px-4 pt-3.5 pb-4">
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0 text-[16px] font-extrabold break-words">{title}</span>
            <Icon name="chevron_right" size={20} className="mt-0.5 shrink-0 text-faint group-hover:text-midnight" />
          </span>
          {badges ? <span className="flex flex-wrap gap-1.5">{badges}</span> : null}
          {children}
        </span>
      </Link>
    </li>
  );
}

/**
 * A part of a long form with its own small heading and a line about it, so
 * the form reads as a few groups instead of one long stack. `id` names it.
 */
export function FormSection({ id, title, description, children }: { id: string; title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <div role="group" aria-labelledby={id} data-form-section="" className="flex min-w-0 flex-col gap-4 [[data-form-section]~&]:border-t [[data-form-section]~&]:border-line-soft [[data-form-section]~&]:pt-5">
      <div className="flex flex-col gap-0.5">
        <p id={id} className="m-0 text-[15px] font-extrabold text-midnight">
          {title}
        </p>
        {description ? <p className="m-0 text-[13px] leading-relaxed text-muted">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

/** A detail page's two columns: the main forms, and a narrower side (status, numbers, links) that goes below on phones. */
export function DetailLayout({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-6">{main}</div>
      <aside className="flex min-w-0 flex-col gap-4">{side}</aside>
    </div>
  );
}

/** A form's buttons, kept in sight at the bottom while the form scrolls (in a Sheet or a Section). */
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-0 z-[1] -mx-5 flex flex-wrap items-center justify-end gap-3 border-t border-line-soft bg-white px-5 py-3 sm:-mx-6 sm:px-6">{children}</div>;
}
