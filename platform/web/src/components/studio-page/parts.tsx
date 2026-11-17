import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "../icon";
import type { IconName } from "../icon-names";

/**
 * 132.160 The console's pieces for an entry's inspector and a page's own
 * views, shared by the pages built as the design after Products (Delivery &
 * offers, Card messages, Media, Notifications, Chat…): the inspector's top
 * (a picture or an icon, badges, the name, one line), its facts in a box
 * with hairlines, a part with a small heading, a small badge, and a
 * segmented control of links (a list's views kept in the address).
 */

type DataAttributes = { [key: `data-${string}`]: string | number | undefined };

/** A small badge: a sample, a sale's percent ("peach"), a kind. */
export function KitBadge({ tone = "soft", children }: { tone?: "soft" | "peach" | "success" | "warn"; children: ReactNode }) {
  const look = { soft: "bg-(--sp-soft) text-(--sp-ink-2)", peach: "bg-(--sp-peach) text-(--sp-peach-ink)", success: "bg-success-bg text-success", warn: "bg-warn-bg text-warn" }[tone];
  return <span className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-[7px] px-2.5 text-xs font-bold whitespace-nowrap ${look}`}>{children}</span>;
}

/**
 * The top of an inspector: a picture as wide as it (`media`), or the
 * entry's icon on a soft tile beside its name; badges; the name as the
 * inspector's heading; one muted line.
 */
export function KitInspectorHead({ media, icon, badges, title, line, ...data }: { media?: ReactNode; icon?: IconName; badges?: ReactNode; title: ReactNode; line?: ReactNode } & DataAttributes) {
  const name = (
    <h2 className="m-0 text-[21px] leading-[1.25] font-bold break-words text-(--sp-ink)">
      <bdi>{title}</bdi>
    </h2>
  );
  return (
    <div {...data} className="flex min-w-0 flex-col">
      {media ? <div className="mb-3.5">{media}</div> : null}
      {icon && !media ? (
        <div className="flex min-w-0 items-start gap-3.5">
          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-(--sp-tile) text-(--sp-ink-2)">
            <Icon name={icon} size={24} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
            {badges ? <div className="flex flex-wrap gap-1.5">{badges}</div> : null}
            {name}
            {line ? <p className="m-0 text-[13.5px] leading-relaxed text-(--sp-muted)">{line}</p> : null}
          </div>
        </div>
      ) : (
        <>
          {badges ? <div className="mb-2.5 flex flex-wrap gap-1.5">{badges}</div> : null}
          {name}
          {line ? <p className="m-0 mt-0.5 text-[13.5px] leading-relaxed text-(--sp-muted)">{line}</p> : null}
        </>
      )}
    </div>
  );
}

/** An inspector's facts: label and value on one line each, in a box with hairlines. */
export function KitInspectorFacts({ facts }: { facts: [ReactNode, ReactNode][] }) {
  if (!facts.length) return null;
  return (
    <dl className="m-0 rounded-xl border border-(--sp-line)">
      {facts.map(([label, value], i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 border-b border-(--sp-line) px-3.5 py-2.5 text-[13.5px] last:border-b-0">
          <dt className="shrink-0 text-(--sp-muted)">{label}</dt>
          <dd className="m-0 min-w-0 text-end font-bold break-words text-(--sp-ink)">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A part of an inspector under a small heading (its messages, its text, what to do). */
export function KitInspectorPart({ title, children, aside }: { title?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-2.5">
      {title || aside ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title ? <h3 className="m-0 text-[12.5px] font-bold tracking-[0.2px] text-(--sp-muted) uppercase">{title}</h3> : <span />}
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** The inspector's body: its parts one under the other. */
export function KitInspectorBody({ children, ...data }: { children: ReactNode } & DataAttributes) {
  return (
    <div {...data} className="flex min-w-0 flex-col gap-5">
      {children}
    </div>
  );
}

/**
 * A segmented control of links (a list's views, the language being
 * translated): the current one raised, each with its count; it scrolls
 * sideways on a phone. `label` names it.
 */
export function KitSegments({ label, items }: { label: string; items: { key: string; href: string; label: ReactNode; count?: ReactNode; current: boolean }[] }) {
  return (
    <nav aria-label={label} className="max-w-full min-w-0">
      <ul className="m-0 flex w-fit max-w-full list-none gap-0.5 overflow-x-auto rounded-[13px] bg-(--sp-seg-track) p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <li key={item.key} className="shrink-0">
            <Link
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={`flex h-[34px] items-center gap-[7px] rounded-[10px] px-3.5 text-[13.5px] font-semibold whitespace-nowrap no-underline transition-colors ${
                item.current ? "bg-(--sp-seg-on) text-(--sp-ink) shadow-(--sp-shadow) hover:text-(--sp-ink)" : "text-(--sp-muted) hover:text-(--sp-ink)"
              }`}
            >
              {item.label}
              {item.count !== undefined ? <span className="font-sans text-[11px] font-semibold text-(--sp-faint) tabular-nums">{item.count}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
