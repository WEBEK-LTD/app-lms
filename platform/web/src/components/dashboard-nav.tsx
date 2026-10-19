"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icon";
import type { IconName } from "./icon-names";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: IconName;
  external?: boolean;
  /** Also current for paths that start with this prefix. */
  prefix?: string;
  exact?: boolean;
}

export interface DashboardNavGroup {
  /** Shown above the group's links; none for the first group. */
  label?: string;
  items: DashboardNavItem[];
}

const PANEL_ID = "dashboard-menu";

function isCurrent(item: DashboardNavItem, pathname: string): boolean {
  if (item.external) return false;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`) || (item.prefix !== undefined && (pathname === item.prefix || pathname.startsWith(`${item.prefix}/`)));
}

/**
 * The dashboard's sidebar: the logo, the app switcher and the links in
 * groups. From md up it is a fixed column; on phones a top bar with a Menu
 * button that opens the links as a sheet (the app switcher stays in view).
 */
export function DashboardSidebar({
  logo,
  actions,
  switcher,
  groups,
  footer,
}: {
  logo: ReactNode;
  /** 57 Next to the logo, in the phone's top bar too: the bell. */
  actions?: ReactNode;
  switcher: ReactNode;
  groups: DashboardNavGroup[];
  footer: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = PANEL_ID;

  // A link was followed: close the sheet.
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("max-md:overflow-hidden");
    panel.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("max-md:overflow-hidden");
    };
  }, [open]);

  return (
    <aside className="z-30 flex w-full flex-col border-b border-line bg-white md:sticky md:top-0 md:h-screen md:w-[264px] md:flex-none md:border-r md:border-b-0">
      <div className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line-soft bg-white px-4 md:static md:h-auto md:border-b-0 md:px-5 md:pt-6 md:pb-5">
        {logo}
        <div className="flex items-center gap-2">
          {actions}
          <button
            ref={button}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-line-strong bg-white px-3 text-[15px] font-semibold text-midnight md:hidden"
          >
            <Icon name={open ? "close" : "menu"} size={22} />
            Menu
          </button>
        </div>
      </div>
      {switcher ? <div className="px-4 py-3 md:px-3.5 md:pt-0 md:pb-3">{switcher}</div> : null}
      <div
        ref={panel}
        id={panelId}
        className={`${open ? "max-md:flex" : "max-md:hidden"} fixed inset-x-0 top-16 bottom-0 z-20 flex-col overflow-y-auto bg-white md:static md:flex md:min-h-0 md:flex-1`}
        data-open={open ? "" : undefined}
      >
        <nav aria-label="Dashboard" className="flex flex-col gap-5 px-4 pt-4 pb-6 md:px-3.5 md:pt-2">
          {groups.map((group, index) => (
            <div key={group.label ?? index} className="flex flex-col gap-1">
              {group.label ? (
                <p id={`${panelId}-g${index}`} className="m-0 px-3 pb-1 text-xs font-bold tracking-[0.06em] text-muted uppercase">
                  {group.label}
                </p>
              ) : null}
              <ul aria-labelledby={group.label ? `${panelId}-g${index}` : undefined} className="m-0 flex list-none flex-col gap-0.5 p-0">
                {group.items.map((item) => {
                  const current = isCurrent(item, pathname);
                  const className = `group relative flex min-h-10 items-center gap-3 rounded-[10px] px-3 py-2 text-[15px] no-underline ${
                    current ? "bg-peach font-bold text-midnight hover:text-midnight" : "text-ink-3 hover:bg-ivory hover:text-midnight"
                  }`;
                  const content = (
                    <>
                      {current ? <span aria-hidden="true" className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-ember" /> : null}
                      <Icon name={item.icon} size={22} filled={current} className={current ? "text-accent" : "text-muted group-hover:text-midnight"} />
                      <span className="min-w-0 flex-1">{item.label}</span>
                      {item.external ? (
                        <>
                          <Icon name="open_in_new" size={16} className="text-muted" />
                          <span className="sr-only"> (opens in a new tab)</span>
                        </>
                      ) : null}
                    </>
                  );
                  return (
                    <li key={item.href}>
                      {item.external ? (
                        <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
                          {content}
                        </a>
                      ) : (
                        <Link href={item.href} aria-current={current ? "page" : undefined} className={className}>
                          {content}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="mt-auto border-t border-line-soft px-4 py-4 md:px-5">{footer}</div>
      </div>
      {/* Without JavaScript the Menu button can't open the sheet: show the links in the page instead. */}
      <noscript>
        <style>{`#${PANEL_ID} { display: flex !important; position: static !important; }`}</style>
      </noscript>
    </aside>
  );
}
