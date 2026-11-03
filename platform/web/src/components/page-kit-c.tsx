import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "./icon";
import { btn } from "./ui";

/**
 * Studio page kit, for lists the server filters and pages (long lists such as
 * a school's people or fees): the same chips, search field and bar as
 * page-kit-client.tsx's FilterList, as links and a search form.
 */

/** The bar at the top of a flush Section's list: chips, a search, a picker. */
export function ListBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-5 py-3 sm:px-6">{children}</div>;
}

/** Filter chips as links, the current one marked; `count` shows beside the name. */
export function ChipLinks({ label, items }: { label: string; items: { href: string; label: ReactNode; count?: number; current: boolean }[] }) {
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

/** A search field sent to the server (`?q=`), keeping the page's other choices in `keep`. */
export function SearchForm({ label, placeholder, defaultValue, keep = {}, button, id = "f-q" }: { label: string; placeholder: string; defaultValue: string; keep?: Record<string, string>; button: string; id?: string }) {
  return (
    <form method="get" role="search" className="flex min-w-0 flex-[0_1_380px] items-center gap-2">
      {Object.entries(keep).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-line bg-white px-3 text-sm text-muted focus-within:border-midnight">
        <Icon name="search" size={18} />
        <span className="sr-only">{label}</span>
        <input id={id} name="q" type="search" defaultValue={defaultValue} placeholder={placeholder} className="min-w-0 flex-1 border-0 bg-transparent text-sm text-midnight outline-0" />
      </label>
      <button type="submit" className={`${btn.secondary} h-10 px-3.5 text-sm`}>
        {button}
      </button>
    </form>
  );
}

/** A long list's pages: the one before, where it is, the one after. */
export function Pager({ label, prev, next, text }: { label: string; prev: { href: string; label: ReactNode } | null; next: { href: string; label: ReactNode } | null; text: ReactNode }) {
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-3 border-t border-line-soft px-5 py-3 text-[15px] sm:px-6">
      {prev ? (
        <Link href={prev.href} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
          {prev.label}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted tabular-nums">{text}</span>
      {next ? (
        <Link href={next.href} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
          {next.label}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
