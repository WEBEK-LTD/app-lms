"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  external?: boolean;
  /** Also current for paths that start with this prefix. */
  prefix?: string;
  exact?: boolean;
  /** 19 A count next to the label (things waiting), with what it counts for screen readers. */
  badge?: { count: number; label: string };
}

/** Sidebar links; a row of pills on small screens, a column from md up. */
export function SideNavLinks({ items, dark = false }: { items: NavItem[]; dark?: boolean }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1 md:flex-col">
      {items.map((item) => {
        const current =
          !item.external &&
          (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.prefix ?? item.href}/`));
        const base = "flex h-[42px] items-center rounded-[10px] px-3 text-[15px] no-underline";
        const style = dark
          ? current
            ? "bg-night-2 font-bold text-white hover:text-white"
            : "text-night-text hover:bg-night-2 hover:text-white"
          : current
            ? "bg-peach font-bold text-midnight hover:text-midnight"
            : "text-ink-3 hover:bg-ivory hover:text-midnight";
        return item.external ? (
          <a key={item.href} href={item.href} className={`${base} ${style}`}>
            {item.label}
          </a>
        ) : (
          <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined} className={`${base} ${style} gap-2`}>
            {item.label}
            {item.badge && item.badge.count > 0 ? (
              <span
                data-nav-badge=""
                className="ml-auto inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-ember px-1.5 text-xs font-bold text-white"
              >
                {item.badge.count}
                <span className="sr-only"> {item.badge.label}</span>
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
