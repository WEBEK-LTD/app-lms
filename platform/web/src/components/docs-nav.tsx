"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Icon } from "./icon";

export interface DocsNavGroup {
  title: string;
  links: { href: string; label: string; description?: string }[];
}

/**
 * The documentation's menu, with a search box that narrows the list. On
 * phones it folds behind a button so the article comes first.
 */
export function DocsNav({ groups, current }: { groups: DocsNavGroup[]; current: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const listId = useId();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (text: string) => words.every((w) => text.toLowerCase().includes(w));
  const shown = groups
    .map((g) => ({ ...g, links: g.links.filter((l) => matches(`${g.title} ${l.label} ${l.description ?? ""}`)) }))
    .filter((g) => g.links.length > 0);

  return (
    <nav aria-label="Documentation" className="flex flex-col gap-3 text-[15px]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
        className="flex h-11 items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 font-semibold text-midnight lg:hidden"
      >
        <span className="flex items-center gap-2">
          <Icon name="menu_book" size={20} />
          Browse the documentation
        </span>
        <Icon name="expand_more" size={22} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div id={listId} className={`${open ? "flex" : "hidden"} flex-col gap-5 lg:flex`}>
        <label className="flex flex-col gap-1.5">
          <span className="sr-only">Search the documentation</span>
          <span className="relative flex items-center">
            <Icon name="search" size={20} className="pointer-events-none absolute left-3 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the documentation"
              className="input input-sm pl-10"
            />
          </span>
        </label>
        {shown.length === 0 ? <p className="m-0 px-3 text-sm text-muted">No articles match “{query}”.</p> : null}
        {shown.map((group) => (
          <div key={group.title} role="group" aria-label={group.title} className="flex flex-col gap-0.5">
            <span className="px-3 pb-1.5 text-xs font-bold tracking-[1px] text-muted uppercase">{group.title}</span>
            {group.links.map((link) =>
              link.href === current ? (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current="page"
                  className="rounded-lg border-l-[3px] border-ember bg-white px-3 py-1.5 font-bold text-midnight no-underline hover:text-midnight"
                >
                  {link.label}
                </Link>
              ) : (
                <Link key={link.href} href={link.href} className="rounded-lg px-3 py-1.5 text-ink-3 no-underline hover:bg-white/70 hover:text-midnight">
                  {link.label}
                </Link>
              ),
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
