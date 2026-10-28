"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { AccountLink } from "./account-link";
import { activeEntry, SITE_NAV, type SiteGroup, type SiteLink, type SiteNavEntry, type SitePage } from "@/lib/site-nav";
import { DEFAULT_LANG, type Lang } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { LogoLink } from "./brand";
import { Icon } from "./icon";
import { LanguageList, LanguageMenu, type LanguageLabels } from "./language-switcher";
import { ThemeSwitch } from "./theme-switch";

/** 55 The header's words in the page's language (from the catalog's `nav`); English by default. */
export interface SiteNavLabels {
  main: string;
  signIn: string;
  getStarted: string;
  dashboard: string;
  goToDashboard: string;
  menu: string;
  closeMenu: string;
  logoHome: string;
  /** 73 The light/dark switch. */
  darkMode: string;
}

const ENGLISH_LABELS: SiteNavLabels = {
  main: "Main",
  signIn: "Sign in",
  getStarted: "Get started",
  dashboard: "Dashboard",
  goToDashboard: "Go to your dashboard",
  menu: "Menu",
  closeMenu: "Close menu",
  logoHome: "Yallapp home",
  darkMode: "Dark mode",
};

interface NavProps {
  current?: SitePage;
  lang: Lang;
  nav: SiteNavEntry[];
  labels: SiteNavLabels;
  languages?: LanguageLabels;
}

/**
 * 32 The public website's header: the menu with its Product and Resources
 * lists from lg up, a menu button with a full-screen panel below it.
 */

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement | null): HTMLElement[] {
  return root ? [...root.querySelectorAll<HTMLElement>(FOCUSABLE)] : [];
}

/** Arrow keys move between the links of a list; Home and End go to its ends. */
function moveFocus(event: ReactKeyboardEvent, root: HTMLElement | null) {
  const links = root ? [...root.querySelectorAll<HTMLElement>("a[href]")] : [];
  if (!links.length) return;
  const index = links.indexOf(document.activeElement as HTMLElement);
  const next =
    event.key === "ArrowDown" ? (index + 1) % links.length
    : event.key === "ArrowUp" ? (index <= 0 ? links.length - 1 : index - 1)
    : event.key === "Home" ? 0
    : event.key === "End" ? links.length - 1
    : null;
  if (next === null) return;
  event.preventDefault();
  links[next]!.focus();
}

const topLink = "flex h-10 items-center gap-1 rounded-lg px-2 text-[15px] font-semibold whitespace-nowrap no-underline xl:px-3";

/** The ember line under the page or section the visitor is on. */
function Marked({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <span className={`border-b-2 py-1 ${on ? "border-ember" : "border-transparent"}`}>{children}</span>;
}

function MenuItem({ item, current, onPick }: { item: SiteLink; current?: SitePage; onPick: () => void }) {
  const here = item.id === current;
  return (
    <li>
      <Link
        href={item.href}
        onClick={onPick}
        aria-current={here ? "page" : undefined}
        className={`flex items-start gap-3 rounded-xl p-3 no-underline hover:bg-ivory focus-visible:bg-ivory ${here ? "bg-ivory" : ""}`}
      >
        {item.icon ? (
          <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-[10px] ${here ? "bg-midnight text-white" : "bg-sand text-midnight"}`}>
            <Icon name={item.icon} size={22} />
          </span>
        ) : null}
        <span className="flex min-w-0 flex-col">
          <span className={`text-[15px] text-midnight ${here ? "font-extrabold" : "font-bold"}`}>{item.label}</span>
          {item.description ? <span className="text-sm leading-snug text-muted">{item.description}</span> : null}
        </span>
      </Link>
    </li>
  );
}

function Dropdown({
  group,
  current,
  marked,
  open,
  setOpen,
}: {
  group: SiteGroup;
  current?: SitePage;
  marked: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const id = useId();
  const wrapper = useRef<HTMLLIElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // A click or tap anywhere else closes the list.
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, setOpen]);

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      button.current?.focus();
      return;
    }
    if (event.target === button.current && event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      // The list renders on the next frame.
      requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>("a[href]")?.focus());
      return;
    }
    if (open && panel.current?.contains(event.target as Node)) moveFocus(event, panel.current);
  };

  return (
    <li
      ref={wrapper}
      className="relative"
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        // Tabbing out of the button and its list closes it.
        if (open && !wrapper.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-current={marked ? "true" : undefined}
        data-section={group.id}
        onClick={() => setOpen(!open)}
        className={`${topLink} cursor-pointer border-0 bg-transparent ${marked || open ? "text-midnight" : "text-ink-3 hover:text-midnight"}`}
      >
        <Marked on={marked}>{group.label}</Marked>
        <Icon name="expand_more" size={20} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        ref={panel}
        id={id}
        hidden={!open}
        className="absolute start-0 top-full z-40 mt-2 w-[380px] rounded-2xl border border-line bg-white p-2 shadow-[0_16px_40px_rgba(14,13,36,0.14)]"
      >
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {group.items.map((item) => (
            <MenuItem key={item.id} item={item} current={current} onPick={() => setOpen(false)} />
          ))}
        </ul>
      </div>
    </li>
  );
}

function DesktopNav({ current, nav, labels }: NavProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const marked = activeEntry(current);
  return (
    <nav aria-label={labels.main} className="hidden lg:block">
      <ul className="m-0 flex list-none items-center gap-0.5 p-0 xl:gap-1">
        {nav.map((entry) =>
          entry.kind === "group" ? (
            <Dropdown
              key={entry.id}
              group={entry}
              current={current}
              marked={marked === entry.id}
              open={openId === entry.id}
              setOpen={(open) => setOpenId(open ? entry.id : null)}
            />
          ) : (
            <li key={entry.id} className={entry.wideOnly ? "hidden xl:block" : undefined}>
              <Link
                href={entry.href}
                aria-current={entry.id === current ? "page" : undefined}
                className={`${topLink} ${entry.id === current ? "text-midnight hover:text-midnight" : "text-ink-3 hover:text-midnight"}`}
              >
                <Marked on={entry.id === current}>{entry.label}</Marked>
                {entry.badge ? " " : null}
                {entry.badge ? <span className="rounded-full bg-ember px-1.5 py-px text-[11px] leading-4 font-bold text-white">{entry.badge}</span> : null}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

function MobileMenu({ current, lang, nav, labels, languages }: NavProps) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    toggle.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    // The page behind doesn't scroll while the menu is open.
    const html = document.documentElement;
    const before = { html: html.style.overflow, body: document.body.style.overflow };
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    // Wider than a tablet, the menu is in the header again.
    const wide = window.matchMedia("(min-width: 1024px)");
    const onWide = () => wide.matches && setOpen(false);
    wide.addEventListener("change", onWide);
    return () => {
      html.style.overflow = before.html;
      document.body.style.overflow = before.body;
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    // Focus stays inside the menu.
    const items = focusables(panel.current);
    if (!items.length) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const marked = activeEntry(current);
  return (
    <>
      <button
        ref={toggle}
        type="button"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={labels.menu}
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px] border border-line-button bg-white text-midnight hover:border-midnight lg:hidden"
      >
        <Icon name="menu" size={26} />
      </button>
      {open ? (
        <div
          ref={panel}
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label={labels.menu}
          onKeyDown={onKeyDown}
          className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden"
        >
          <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3.5 sm:px-6">
            <LogoLink href={localePath(lang, "/")} adaptive alt={labels.logoHome} />
            <button
              ref={closeButton}
              type="button"
              aria-label={labels.closeMenu}
              onClick={close}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px] border border-line-button bg-white text-midnight hover:border-midnight"
            >
              <Icon name="close" size={26} />
            </button>
          </div>
          <nav aria-label={labels.main} className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {nav.filter((entry) => !(entry.kind === "link" && entry.desktopOnly)).map((entry) =>
                entry.kind === "group" ? (
                  <li key={entry.id} className="flex flex-col gap-1 pt-2 pb-3">
                    <span
                      id={`site-menu-${entry.id}`}
                      className={`px-3 text-xs font-bold tracking-[1px] uppercase ${marked === entry.id ? "text-accent" : "text-muted"}`}
                    >
                      {entry.label}
                    </span>
                    <ul aria-labelledby={`site-menu-${entry.id}`} className="m-0 grid list-none gap-0.5 p-0 sm:grid-cols-2">
                      {entry.items.map((item) => (
                        <MenuItem key={item.id} item={item} current={current} onPick={() => setOpen(false)} />
                      ))}
                    </ul>
                  </li>
                ) : (
                  <li key={entry.id}>
                    <Link
                      href={entry.href}
                      onClick={() => setOpen(false)}
                      aria-current={entry.id === current ? "page" : undefined}
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-[17px] text-midnight no-underline hover:bg-ivory ${
                        entry.id === current ? "bg-ivory font-extrabold" : "font-bold"
                      }`}
                    >
                      {entry.label}
                      <Icon name="chevron_right" size={22} className="text-muted" />
                    </Link>
                  </li>
                ),
              )}
            </ul>
            {/* 55 The other languages, before the account buttons (the menu's last stops). */}
            {languages ? <LanguageList lang={lang} labels={languages} className="mt-4 border-t border-line-soft px-3 pt-4 text-[15px]" /> : null}
          </nav>
          <div className="grid auto-cols-fr grid-flow-col gap-3 border-t border-line bg-sand px-4 py-4 sm:px-6">
            <AccountLink
              href={localePath(lang, "/sign-in")}
              signedIn={null}
              onClick={() => setOpen(false)}
              className="flex h-12 items-center justify-center rounded-xl border border-midnight bg-white text-base font-bold text-midnight no-underline hover:text-midnight"
            >
              {labels.signIn}
            </AccountLink>
            <AccountLink
              href={localePath(lang, "/sign-up")}
              signedIn={
                <>
                  <Icon name="dashboard" size={20} />
                  {labels.goToDashboard}
                </>
              }
              onClick={() => setOpen(false)}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-midnight text-base font-bold text-white no-underline hover:bg-ink-3 hover:text-white"
            >
              {labels.getStarted}
            </AccountLink>
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * Everything inside the header bar. 55 `lang` gives the links to that
 * language's pages; `nav` and `labels` come from the server in that language
 * (lib/site-nav.ts `siteNavFor`, the catalog's `nav`); `languages` adds the
 * language switcher.
 */
export function SiteNav({
  current,
  lang = DEFAULT_LANG,
  nav = SITE_NAV,
  labels = ENGLISH_LABELS,
  languages,
}: {
  current?: SitePage;
  lang?: Lang;
  nav?: SiteNavEntry[];
  labels?: SiteNavLabels;
  languages?: LanguageLabels;
}) {
  const props: NavProps = { current, lang, nav, labels, languages };
  return (
    <>
      <DesktopNav {...props} />
      <div className="ms-auto flex items-center gap-2">
        <ThemeSwitch label={labels.darkMode} className="h-[42px] w-[42px]" />
        {languages ? (
          <div className="hidden lg:block">
            <LanguageMenu lang={lang} labels={languages} />
          </div>
        ) : null}
        {/* Signed in on this browser: one "Dashboard" button instead of Sign in and Get started. */}
        <AccountLink
          href={localePath(lang, "/sign-in")}
          signedIn={null}
          className="hidden h-[42px] items-center rounded-[10px] px-2 text-[15px] font-semibold whitespace-nowrap text-midnight no-underline hover:text-midnight hover:underline lg:flex xl:px-3"
        >
          {labels.signIn}
        </AccountLink>
        <AccountLink
          href={localePath(lang, "/sign-up")}
          signedIn={
            <>
              <Icon name="dashboard" size={18} />
              {labels.dashboard}
            </>
          }
          className="hidden h-[42px] items-center gap-2 rounded-[10px] bg-midnight px-4 text-[15px] font-semibold whitespace-nowrap text-white no-underline hover:bg-ink-3 hover:text-white sm:flex xl:px-[18px]"
        >
          {labels.getStarted}
        </AccountLink>
        <MobileMenu {...props} />
      </div>
    </>
  );
}
