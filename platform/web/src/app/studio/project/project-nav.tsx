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
  items: ProjectNavItem[];
}

const MENU_ID = "studio-project-menu";
const COLLAPSED_KEY = "studio.nav.collapsed";

/** Whether a link is the page open: the overview only itself, a setup step by its step, the rest with their pages below. */
function isCurrent(href: string, path: string, step: string | null): boolean {
  const [target, query] = href.split("?");
  if (target === "/studio/project") return path === target;
  if (query) return path === target && new URLSearchParams(query).get("step") === step;
  if (target === "/studio/project/setup") return path === target && !step;
  return path === target || path.startsWith(`${target}/`);
}

/** A Material Symbols (Rounded) glyph, filled for the page open. */
function Symbol({ name, size = 20, filled = false }: { name: string; size?: number; filled?: boolean }) {
  return (
    <span aria-hidden="true" className="material-symbols-rounded flex-none" style={{ fontSize: size, lineHeight: 1, fontVariationSettings: filled ? "'FILL' 1" : undefined }}>
      {name}
    </span>
  );
}

function readCollapsed(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function saveCollapsed(ids: string[]): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(ids));
  } catch {
    // A browser that keeps nothing: the groups open again next time.
  }
}

/**
 * 132.1 The menu's groups and links, in the side column and in the phone's
 * sheet alike: each group with a label folds away (the browser remembers
 * which), the one with the page open stays open, the page open is marked.
 */
function MenuLinks({ groups, current, collapsed, onToggle, onPick, idPrefix }: { groups: ProjectNavGroup[]; current: string | null; collapsed: string[]; onToggle: (id: string) => void; onPick?: () => void; idPrefix: string }) {
  const t = useDashT();
  return groups.map((group) => {
    const holdsCurrent = group.items.some((i) => i.href === current);
    const open = !group.label || holdsCurrent || !collapsed.includes(group.id);
    const listId = `${idPrefix}-${group.id}`;
    return (
      <div key={group.id} className="flex flex-col gap-0.5" data-nav-group={group.id}>
        {group.label ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={t("studio.navGroupToggle", { group: group.label })}
            disabled={holdsCurrent}
            onClick={() => onToggle(group.id)}
            className="group/head mt-2 flex w-full cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent px-3 pt-2 pb-1 text-start text-[11.5px] font-bold tracking-[0.06em] uppercase disabled:cursor-default"
            style={{ color: "var(--sf-muted)", fontFamily: "inherit" }}
          >
            <span className="min-w-0 flex-1 truncate">{group.label}</span>
            <span className="transition-transform duration-150 motion-reduce:transition-none" style={{ transform: open ? undefined : "rotate(-90deg)" }}>
              <Symbol name="expand_more" size={18} />
            </span>
          </button>
        ) : null}
        <ul id={listId} hidden={!open} className="m-0 flex list-none flex-col gap-0.5 p-0">
          {group.items.map((item) => {
            const on = item.href === current;
            const className = "relative flex min-h-10 items-center gap-2.5 rounded-[10px] px-3 py-2 text-[14.5px] no-underline transition-colors duration-100 hover:bg-[var(--sf-soft)] motion-reduce:transition-none";
            const style = { background: on ? "var(--sf-soft)" : undefined, fontWeight: on ? 700 : 500, color: "var(--sf-ink)" };
            const content = (
              <>
                {on ? <span aria-hidden="true" className="absolute start-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: "var(--sf-accent)" }} /> : null}
                <span style={{ color: on ? "var(--sf-accent)" : "var(--sf-muted)" }} className="flex">
                  <Symbol name={item.icon} filled={on} />
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.external ? <Symbol name="open_in_new" size={16} /> : null}
              </>
            );
            return (
              <li key={item.href}>
                {item.external ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
                    {content}
                    <span className="sr-only">{t("common.opensInNewTab")}</span>
                  </a>
                ) : (
                  <Link href={item.href} onClick={onPick} aria-current={on ? "page" : undefined} className={className} style={style}>
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  });
}

/** The quick search's button, with its keys. */
function SearchButton({ onOpen, mac }: { onOpen: () => void; mac: boolean }) {
  const t = useDashT();
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-keyshortcuts="Meta+K Control+K"
      data-studio-search=""
      className="mx-0.5 mb-1.5 flex h-10 cursor-pointer items-center gap-2 rounded-[10px] px-3 text-start text-sm"
      style={{ border: "1px solid var(--sf-line)", background: "var(--sf-board)", color: "var(--sf-muted)", fontFamily: "inherit" }}
    >
      <Symbol name="search" size={19} />
      <span className="min-w-0 flex-1 truncate">{t("studio.navSearch")}</span>
      <kbd dir="ltr" className="rounded-md px-1.5 py-0.5 font-sans text-[11px] font-semibold" style={{ border: "1px solid var(--sf-line)", background: "var(--sf-surface)", color: "var(--sf-muted)" }}>
        {mac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}

/**
 * 103R.3 The project dashboard's side menu, in the approved design; 132.1
 * in short groups that fold away, 132.2 with a quick search (⌘K, Ctrl+K)
 * that opens any page of the project, 132.4 by day and by night, with the
 * person, the language, dark mode and signing out at its foot. Below lg
 * (phones, tablets) a bar with the page open, the search and a Menu button
 * that opens the menu as a sheet from the start side; picking a page
 * closes it.
 */
export function ProjectNav({ label, menuLabel, closeLabel, groups, more, appName, footer }: { label: string; menuLabel: string; closeLabel: string; groups: ProjectNavGroup[]; more: PaletteItem[]; appName: string; footer?: ReactNode }) {
  const t = useDashT();
  const path = usePathname();
  const step = useSearchParams().get("step");
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [mac, setMac] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  // The page and the one under it (Courses and Bundles) both match: the closer one is open.
  const items = groups.flatMap((group) => group.items).filter((item) => !item.external);
  const current = items
    .filter((item) => isCurrent(item.href, path, step))
    .reduce<string | null>((best, item) => (best === null || item.href.length > best.length ? item.href : best), null);
  const here = items.find((item) => item.href === current);

  // The browser's remembered groups, once the page is live (the server draws them all open).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser's own memory, read after hydration
    setCollapsed(readCollapsed());
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);
  const toggle = (id: string) =>
    setCollapsed((list) => {
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      saveCollapsed(next);
      return next;
    });

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

  // Another page opened (a link, back or forward): the sheet closes.
  const [shownFor, setShownFor] = useState(`${path}?${step}`);
  if (shownFor !== `${path}?${step}`) {
    setShownFor(`${path}?${step}`);
    setOpen(false);
  }

  // The sheet as a modal dialog: the page behind it is inert (focus stays in it) and Esc closes it.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
    if (!open) return;
    document.body.classList.add("overflow-hidden");
    // Wide enough for the side column again: the sheet goes.
    const wide = window.matchMedia("(min-width: 64rem)");
    const onWide = () => wide.matches && setOpen(false);
    wide.addEventListener("change", onWide);
    return () => {
      document.body.classList.remove("overflow-hidden");
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  const palette: PaletteItem[] = [
    ...groups.flatMap((group) => group.items.filter((i) => !i.external).map((i) => ({ ...i, group: group.label ?? appName }))),
    ...more.filter((m) => !items.some((i) => i.href === m.href)).map((m) => ({ ...m, group: m.group ?? t("studio.navSearchMore") })),
  ];
  const openSearch = () => {
    setOpen(false);
    setSearching(true);
  };

  return (
    <>
      <nav
        aria-label={label}
        className="sticky top-0 box-border flex max-h-dvh max-w-[272px] min-w-[232px] flex-[1_1_252px] flex-col self-start px-2.5 pt-3.5 text-sm max-lg:hidden"
        style={{ borderInlineEnd: "1px solid var(--sf-line)", background: "var(--sf-surface)", minHeight: "calc(100dvh - 58px)" }}
      >
        <SearchButton onOpen={openSearch} mac={mac} />
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pb-4">
          <MenuLinks groups={groups} current={current} collapsed={collapsed} onToggle={toggle} idPrefix="side" />
        </div>
        {footer ? (
          <div className="-mx-2.5 px-4 py-3.5" style={{ borderTop: "1px solid var(--sf-line)" }}>
            {footer}
          </div>
        ) : null}
      </nav>

      {/* Phones and tablets: the page open, the search and the menu's button. */}
      <div className="sticky top-0 z-10 box-border flex basis-full items-center gap-2.5 px-4 py-2 lg:hidden" style={{ borderBottom: "1px solid var(--sf-line)", background: "var(--sf-surface)", color: "var(--sf-ink)" }}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: "var(--sf-soft)", color: "var(--sf-accent)" }}>
          <Symbol name={here?.icon ?? "space_dashboard"} filled />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{here?.label ?? label}</span>
        <button
          type="button"
          onClick={openSearch}
          aria-label={t("studio.navSearch")}
          aria-haspopup="dialog"
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[10px]"
          style={{ border: "1px solid var(--sf-line)", background: "var(--sf-surface)", color: "var(--sf-ink)" }}
        >
          <Symbol name="search" />
        </button>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={MENU_ID}
          onClick={() => setOpen(true)}
          className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold"
          style={{ border: "1px solid var(--sf-line)", background: "var(--sf-surface)", color: "var(--sf-ink)", fontFamily: "inherit" }}
        >
          <Symbol name="menu" />
          {menuLabel}
        </button>
      </div>

      <dialog
        ref={dialog}
        id={MENU_ID}
        aria-label={label}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // A tap on the dimmed page beside the sheet.
          if (e.target === dialog.current) setOpen(false);
        }}
        className="fixed inset-y-0 start-0 end-auto m-0 h-dvh max-h-none w-[min(312px,calc(100vw-48px))] max-w-none border-0 p-0 shadow-[0_0_48px_rgba(14,13,36,0.25)] backdrop:bg-[#0e0d24]/45 lg:hidden"
        style={{ borderInlineEnd: "1px solid var(--sf-line)", background: "var(--sf-surface)", color: "var(--sf-ink)", fontFamily: "inherit" }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--sf-line)" }}>
            <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold">{label}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={closeLabel}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent hover:bg-[var(--sf-soft)]"
              style={{ color: "var(--sf-ink)" }}
            >
              <Symbol name="close" size={22} />
            </button>
          </div>
          <nav aria-label={label} className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 py-3.5 text-sm">
            <SearchButton onOpen={openSearch} mac={mac} />
            <MenuLinks groups={groups} current={current} collapsed={collapsed} onToggle={toggle} onPick={() => setOpen(false)} idPrefix="sheet" />
          </nav>
          {footer ? (
            <div className="px-4 py-3.5" style={{ borderTop: "1px solid var(--sf-line)" }}>
              {footer}
            </div>
          ) : null}
        </div>
      </dialog>

      <CommandPalette open={searching} onClose={() => setSearching(false)} items={palette} appName={appName} />
    </>
  );
}
