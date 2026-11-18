"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDashT } from "@/components/dashboard-i18n";
import { CommandPalette, type PaletteItem } from "./command-palette";

export interface ProjectNavItem {
  href: string;
  label: string;
  icon: string;
  external?: boolean;
}

export interface ProjectNavGroup {
  id: string;
  label?: string;
  /** 132.150 Its icon on the rail. */
  icon?: string;
  items: ProjectNavItem[];
}

const MENU_ID = "studio-project-menu";
/** The width from which the panel shows beside the rail (Tailwind's lg). */
const WIDE = "(min-width: 64rem)";

/** Whether a link is the page open: the overview only itself, a setup step by its step, the rest with their pages below. */
function isCurrent(href: string, path: string, step: string | null): boolean {
  const [target, query] = href.split("?");
  if (target === "/studio/project") return path === target;
  if (query) return path === target && new URLSearchParams(query).get("step") === step;
  if (target === "/studio/project/setup") return path === target && !step;
  return path === target || path.startsWith(`${target}/`);
}

/** 132.150 The page open and its group: the closest link (Courses and Bundles both match the bundles' page). */
export function currentOf(groups: ProjectNavGroup[], path: string, step: string | null): { item: ProjectNavItem; group: ProjectNavGroup } | null {
  let best: { item: ProjectNavItem; group: ProjectNavGroup } | null = null;
  for (const group of groups) {
    for (const item of group.items) {
      if (item.external || !isCurrent(item.href, path, step)) continue;
      if (!best || item.href.length > best.item.href.length) best = { item, group };
    }
  }
  return best;
}

/** A Material Symbols (Rounded) glyph. */
function Symbol({ name, size, filled = false }: { name: string; size?: number; filled?: boolean }) {
  return (
    <span aria-hidden="true" className={`material-symbols-rounded flex-none ${filled ? "filled" : ""}`} style={size ? { fontSize: size, lineHeight: 1 } : { lineHeight: 1 }}>
      {name}
    </span>
  );
}

/** The quick search's button, with its keys. */
function SearchButton({ onOpen, mac }: { onOpen: () => void; mac: boolean }) {
  const t = useDashT();
  return (
    <button type="button" onClick={onOpen} aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K" data-studio-search="" className="sc-search">
      <Symbol name="search" size={18} />
      <span className="min-w-0 flex-1 truncate">{t("studio.navSearch")}</span>
      <kbd dir="ltr" className="sc-kbd">
        {mac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}

/** One group's pages in the panel (the page open marked). */
function GroupPages({ group, current, onPick, idPrefix, hidden = false }: { group: ProjectNavGroup; current: string | null; onPick?: () => void; idPrefix: string; hidden?: boolean }) {
  const t = useDashT();
  const titleId = `${idPrefix}-${group.id}-title`;
  return (
    <div id={`${idPrefix}-${group.id}`} hidden={hidden} className="sc-pgroup" data-nav-group={group.id}>
      {group.label ? (
        <p id={titleId} className="sc-ptitle">
          {group.label}
        </p>
      ) : null}
      <ul className="sc-plist" aria-labelledby={group.label ? titleId : undefined}>
        {group.items.map((item) => {
          const on = item.href === current;
          const content = (
            <>
              <Symbol name={item.icon} />
              <span className="sc-pi-label">{item.label}</span>
              {item.external ? <Symbol name="open_in_new" size={16} /> : null}
            </>
          );
          return (
            <li key={item.href}>
              {item.external ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer" className="sc-pi">
                  {content}
                  <span className="sr-only">{t("common.opensInNewTab")}</span>
                </a>
              ) : (
                <Link href={item.href} onClick={onPick} aria-current={on ? "page" : undefined} className="sc-pi">
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Whether the window is wide enough for the panel beside the rail; false on the server. */
function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(WIDE);
    const on = () => setWide(media.matches);
    on();
    media.addEventListener("change", on);
    return () => media.removeEventListener("change", on);
  }, []);
  return wide;
}

/**
 * 132.150 The Studio console's menu: a rail of icons with their labels (the
 * overview, the editor and the preview as links, then one item per group)
 * and beside it a panel with the project, the quick search (⌘K, Ctrl+K),
 * the pages of the group open and, at its foot, the person, the language and
 * dark mode. A group of the rail shows its pages in the panel; the page open
 * shows its own group. Tablets: the rail alone, a group opening the panel as
 * a sheet. Phones: a tab bar at the foot (the overview, the editor, the
 * group open, the preview and Menu, which opens the sheet with every group).
 */
export function ProjectNav({
  label,
  menuLabel,
  closeLabel,
  groups,
  more,
  appName,
  home,
  switcher,
  footer,
  help,
}: {
  label: string;
  menuLabel: string;
  closeLabel: string;
  groups: ProjectNavGroup[];
  more: PaletteItem[];
  appName: string;
  /** The mark on top of the rail: Studio's projects. */
  home: { href: string; label: string };
  /** The project and its switcher, on top of the panel. */
  switcher?: ReactNode;
  /** The person, the language and dark mode, at the panel's foot. */
  footer?: ReactNode;
  /** Under a group of one or two pages: Studio's help and the support chat. */
  help?: ReactNode;
}) {
  const t = useDashT();
  const path = usePathname();
  const step = useSearchParams().get("step");
  const wide = useWide();
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [mac, setMac] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const start = groups.find((g) => g.id === "start");
  const rest = groups.filter((g) => g.id !== "start");
  const here = currentOf(groups, path, step);
  const current = here?.item.href ?? null;
  // The group the panel shows: the page's own, else (the overview, the preview) the kind's, else the first.
  const homeGroup = here && here.group.id !== "start" ? here.group.id : (rest.find((g) => g.id === "kind") ?? rest[0])?.id;
  const [shown, setShown] = useState(homeGroup);
  const items = groups.flatMap((group) => group.items).filter((item) => !item.external);

  // Another page opened (a link, back or forward): its group shows and the sheet closes.
  const key = `${path}?${step}`;
  const [shownFor, setShownFor] = useState(key);
  if (shownFor !== key) {
    setShownFor(key);
    setShown(homeGroup);
    setOpen(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser's own platform, read after hydration
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  // ⌘K or Ctrl+K anywhere in the project: the quick search.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(false);
        setSearching(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // The sheet as a modal dialog: the page behind it is inert (focus stays in it) and Esc closes it.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
    if (!open) return;
    document.body.classList.add("overflow-hidden");
    // The group asked for, in sight.
    el.querySelector<HTMLElement>(`[data-nav-group="${shown}"]`)?.scrollIntoView({ block: "nearest" });
    // Wide enough for the panel again: the sheet goes.
    const media = window.matchMedia(WIDE);
    const onWide = () => media.matches && setOpen(false);
    media.addEventListener("change", onWide);
    return () => {
      document.body.classList.remove("overflow-hidden");
      media.removeEventListener("change", onWide);
    };
  }, [open, shown]);

  const palette: PaletteItem[] = [
    ...groups.flatMap((group) => group.items.filter((i) => !i.external).map((i) => ({ ...i, group: group.label ?? appName }))),
    ...more.filter((m) => !items.some((i) => i.href === m.href)).map((m) => ({ ...m, group: m.group ?? t("studio.navSearchMore") })),
  ];
  const openSearch = () => {
    setOpen(false);
    setSearching(true);
  };
  // A group of the rail: its pages in the panel, or (no room for the panel) in the sheet.
  const pick = (id: string) => {
    setShown(id);
    if (!wide) setOpen(true);
  };
  const shownGroup = rest.find((g) => g.id === shown);
  const startLink = (item: ProjectNavItem, onPick?: () => void) => {
    const on = item.href === current;
    return (
      <li key={item.href}>
        <Link href={item.href} onClick={onPick} aria-current={on ? "page" : undefined} data-on={on ? "" : undefined} className="sc-ri">
          <span className="sc-ico">
            <Symbol name={item.icon} />
          </span>
          {item.label}
        </Link>
      </li>
    );
  };
  const groupButton = (group: ProjectNavGroup, extra: { tab?: boolean } = {}) => {
    const on = here?.group.id === group.id;
    return (
      <li key={group.id}>
        <button
          type="button"
          onClick={() => (extra.tab ? (setShown(group.id), setOpen(true)) : pick(group.id))}
          aria-expanded={extra.tab ? undefined : wide ? shown === group.id : false}
          aria-controls={extra.tab ? undefined : `sc-side-${group.id}`}
          aria-haspopup={extra.tab ? "dialog" : undefined}
          data-on={on ? "" : undefined}
          className="sc-ri"
        >
          <span className="sc-ico">
            <Symbol name={group.icon ?? "folder"} />
          </span>
          {group.label}
        </button>
      </li>
    );
  };
  // The phone's tab bar: the first two start links, the group open, the rest of the start, Menu.
  const tabGroup = rest.find((g) => g.id === (here && here.group.id !== "start" ? here.group.id : homeGroup));
  const startItems = start?.items ?? [];

  return (
    <>
      <nav aria-label={label} className="sc-side">
        <div className="sc-rail">
          <Link href={home.href} className="sc-mark" aria-label={home.label} title={home.label}>
            {/* eslint-disable-next-line @next/next/no-img-element -- The brand's own small SVG. */}
            <img src="/brand/yallapp-icon-dark-rounded.svg" alt="" width={40} height={40} />
          </Link>
          {startItems.length ? <ul>{startItems.map((item) => startLink(item))}</ul> : null}
          {startItems.length && rest.length ? <span aria-hidden="true" className="sc-rdiv" /> : null}
          {rest.length ? <ul>{rest.map((group) => groupButton(group))}</ul> : null}
        </div>
        <div className="sc-panel">
          {switcher}
          <SearchButton onOpen={openSearch} mac={mac} />
          <div className="sc-pscroll">
            {rest.map((group) => (
              <GroupPages key={group.id} group={group} current={current} idPrefix="sc-side" hidden={group.id !== shown} />
            ))}
            {help && shownGroup && shownGroup.items.length <= 2 ? <div className="sc-help">{help}</div> : null}
          </div>
          {footer ? <div className="sc-pfoot">{footer}</div> : null}
        </div>
      </nav>

      {/* Phones: the rail as a tab bar at the foot. */}
      <nav aria-label={menuLabel} className="sc-tabbar">
        <ul>
          {startItems.slice(0, 2).map((item) => startLink(item))}
          {tabGroup ? groupButton(tabGroup, { tab: true }) : null}
          {startItems.slice(2).map((item) => startLink(item))}
          <li>
            <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={MENU_ID} onClick={() => setOpen(true)} className="sc-ri">
              <span className="sc-ico">
                <Symbol name="menu" />
              </span>
              {menuLabel}
            </button>
          </li>
        </ul>
      </nav>

      <dialog
        ref={dialog}
        id={MENU_ID}
        aria-label={label}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // A tap on the dimmed page beside the sheet.
          if (e.target === dialog.current) setOpen(false);
        }}
        className="sc-sheet"
      >
        <div className="sc-panel">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">{switcher}</div>
            <button type="button" onClick={() => setOpen(false)} aria-label={closeLabel} title={closeLabel} className="sc-theme">
              <Symbol name="close" size={22} />
            </button>
          </div>
          <SearchButton onOpen={openSearch} mac={mac} />
          <nav aria-label={label} className="sc-pscroll">
            {startItems.length ? <GroupPages group={{ ...start!, label: undefined }} current={current} onPick={() => setOpen(false)} idPrefix="sc-sheet" /> : null}
            {rest.map((group) => (
              <GroupPages key={group.id} group={group} current={current} onPick={() => setOpen(false)} idPrefix="sc-sheet" />
            ))}
          </nav>
          {footer ? <div className="sc-pfoot">{footer}</div> : null}
        </div>
      </dialog>

      <CommandPalette open={searching} onClose={() => setSearching(false)} items={palette} appName={appName} />
    </>
  );
}

/**
 * 132.150 The console bar's way back: the project, the group of the page
 * open and the page (the project's link is the way back to its overview).
 */
/**
 * 175 The page under a menu entry (Products › Settings): the sub-page whose
 * address is the deepest one the page is at, below the entry's own; null at
 * the entry itself.
 */
export function subpageOf(subpages: { href: string; label: string }[], entryHref: string, path: string): { href: string; label: string } | null {
  const below = subpages.filter((s) => s.href.length > entryHref.length && s.href.startsWith(`${entryHref}/`) && (path === s.href || path.startsWith(`${s.href}/`)));
  return below.sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}

export function ConsoleCrumbs({ label, groups, more, root, subpages = [] }: { label: string; groups: ProjectNavGroup[]; more: PaletteItem[]; root: { href: string; label: string }; subpages?: { href: string; label: string }[] }) {
  const path = usePathname();
  const step = useSearchParams().get("step");
  const here = currentOf(groups, path, step) ?? currentOf([{ id: "more", items: more }], path, step);
  const atRoot = here?.item.href === root.href;
  const sub = here && !atRoot ? subpageOf(subpages, here.item.href.split("?")[0]!, path) : null;
  const chevron = <span aria-hidden="true" className="material-symbols-rounded icon-flip">chevron_right</span>;
  return (
    <nav aria-label={label} className="sc-crumbs min-w-0 flex-1">
      <ol className="sc-crumb">
        <li>
          {atRoot ? (
            <span aria-current="page" dir="auto">
              {root.label}
            </span>
          ) : (
            <Link href={root.href} data-studio-back="" dir="auto">
              {root.label}
            </Link>
          )}
        </li>
        {here && here.group.label && !atRoot ? (
          <li>
            {chevron}
            <span className="truncate">{here.group.label}</span>
          </li>
        ) : null}
        {here && !atRoot ? (
          <li>
            {chevron}
            {sub ? (
              <Link href={here.item.href} dir="auto">
                {here.item.label}
              </Link>
            ) : (
              <span aria-current="page">{here.item.label}</span>
            )}
          </li>
        ) : null}
        {sub ? (
          <li>
            {chevron}
            <span aria-current="page">{sub.label}</span>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}
