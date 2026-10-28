"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  /** Things waiting, with what they are for screen readers. */
  badge?: { count: number; label: string };
}

export interface AdminNavGroup {
  label: string | null;
  items: AdminNavItem[];
}

/** The super admin's menu: its groups with icons; on phones, opened from the top bar. */
export function AdminNav({ groups, footer }: { groups: AdminNavGroup[]; footer: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isCurrent = (item: AdminNavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));
  const waiting = groups.flatMap((g) => g.items).reduce((n, i) => n + (i.badge?.count ?? 0), 0);
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="admin-menu"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-night-line bg-transparent text-ivory md:hidden"
      >
        <Icon name={open ? "close" : "menu"} size={22} />
        <span className="sr-only">Menu</span>
        {waiting > 0 && !open ? <span aria-hidden="true" className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-ember" /> : null}
      </button>
      <div id="admin-menu" className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-full z-40 max-h-[calc(100vh-64px)] flex-col overflow-y-auto bg-midnight px-3 pb-4 shadow-xl md:static md:flex md:max-h-none md:flex-1 md:overflow-visible md:p-0 md:shadow-none`}>
        <div className="flex flex-col gap-4">
          {groups.map((group, gi) => (
            <div key={group.label ?? gi} className="flex flex-col gap-0.5">
              {group.label ? <span className="px-3 pb-1 text-[11px] font-bold tracking-[0.08em] text-night-muted uppercase">{group.label}</span> : null}
              {group.items.map((item) => {
                const current = isCurrent(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    // A page opened from the menu closes it on phones.
                    onClick={() => setOpen(false)}
                    className={`group flex h-9 items-center gap-2.5 rounded-[10px] px-3 text-[14px] no-underline ${
                      current ? "bg-night-2 font-bold text-white hover:text-white" : "text-night-text hover:bg-night-2 hover:text-white"
                    }`}
                  >
                    <Icon name={item.icon} size={19} filled={current} className={current ? "text-ember" : "text-night-muted group-hover:text-ivory"} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge && item.badge.count > 0 ? (
                      <span data-nav-badge="" className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1.5 text-[11px] font-bold text-white">
                        {item.badge.count}
                        <span className="sr-only"> {item.badge.label}</span>
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-5 border-t border-night-line pt-3 md:mt-auto">{footer}</div>
      </div>
    </>
  );
}
