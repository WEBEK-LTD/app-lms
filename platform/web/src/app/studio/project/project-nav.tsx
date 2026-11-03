"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Glyph, STUDIO_COLORS as C } from "../editor/shared";

export interface ProjectNavGroup {
  label?: string;
  items: { href: string; label: string; icon: string }[];
}

const MENU_ID = "studio-project-menu";

/** Whether a link is the page open: the overview only itself, a setup step by its step, the rest with their pages below. */
function isCurrent(href: string, path: string, step: string | null): boolean {
  const [target, query] = href.split("?");
  if (target === "/studio/project") return path === target;
  if (query) return path === target && new URLSearchParams(query).get("step") === step;
  if (target === "/studio/project/setup") return path === target && !step;
  return path === target || path.startsWith(`${target}/`);
}

/** The menu's groups and links, in the side column and in the phone's sheet alike. */
function MenuLinks({ groups, current, onPick }: { groups: ProjectNavGroup[]; current: string | null; onPick?: () => void }) {
  return groups.map((group, g) => (
    <div key={group.label ?? g} className="flex flex-col gap-0.5">
      {group.label ? (
        <div className="px-3 pt-3 pb-1 text-xs font-bold" style={{ color: C.muted }}>
          {group.label}
        </div>
      ) : null}
      {group.items.map((item) => {
        const on = item.href === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onPick}
            aria-current={on ? "page" : undefined}
            className="flex items-center gap-2.5 rounded-[10px] px-3 py-[9px] no-underline hover:bg-[#F4EFE6]"
            style={{ background: on ? C.ivory : undefined, fontWeight: on ? 700 : 400, color: C.ink }}
          >
            <Glyph name={item.icon} size={20} />
            {item.label}
          </Link>
        );
      })}
    </div>
  ));
}

/**
 * 103R.3 The project dashboard's side menu, in the approved design. Below lg
 * (phones, tablets) a bar with the page open and a Menu button that opens
 * the menu as a sheet from the start side; picking a page closes it.
 */
export function ProjectNav({ label, menuLabel, closeLabel, groups }: { label: string; menuLabel: string; closeLabel: string; groups: ProjectNavGroup[] }) {
  const path = usePathname();
  const step = useSearchParams().get("step");
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  // The page and the one under it (Courses and Bundles) both match: the closer one is open.
  const items = groups.flatMap((group) => group.items);
  const current = items
    .filter((item) => isCurrent(item.href, path, step))
    .reduce<string | null>((best, item) => (best === null || item.href.length > best.length ? item.href : best), null);
  const here = items.find((item) => item.href === current);

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

  return (
    <>
      <nav aria-label={label} className="box-border flex max-w-[260px] min-w-[220px] flex-[1_1_240px] flex-col gap-0.5 bg-white px-2.5 py-3.5 text-sm max-lg:hidden" style={{ borderInlineEnd: `1px solid ${C.line}` }}>
        <MenuLinks groups={groups} current={current} />
      </nav>

      {/* Phones and tablets: the page open and the menu's button. */}
      <div className="sticky top-0 z-10 box-border flex basis-full items-center gap-3 bg-white px-4 py-2 lg:hidden" style={{ borderBottom: `1px solid ${C.line}`, color: C.ink }}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: C.ivory }}>
          <Glyph name={here?.icon ?? "space_dashboard"} size={20} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{here?.label ?? label}</span>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={MENU_ID}
          onClick={() => setOpen(true)}
          className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] bg-white px-3 text-sm font-semibold"
          style={{ border: `1px solid ${C.line}`, color: C.ink, fontFamily: "inherit" }}
        >
          <Glyph name="menu" size={20} />
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
        className="fixed inset-y-0 start-0 end-auto m-0 h-dvh max-h-none w-[min(300px,calc(100vw-48px))] max-w-none border-0 bg-white p-0 shadow-[0_0_48px_rgba(14,13,36,0.25)] backdrop:bg-[#0e0d24]/45 lg:hidden"
        style={{ borderInlineEnd: `1px solid ${C.line}`, color: C.ink, fontFamily: "inherit" }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>
            <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold">{label}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={closeLabel}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent hover:bg-[#F4EFE6]"
              style={{ color: C.ink }}
            >
              <Glyph name="close" size={22} />
            </button>
          </div>
          <nav aria-label={label} className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 py-3.5 text-sm">
            <MenuLinks groups={groups} current={current} onPick={() => setOpen(false)} />
          </nav>
        </div>
      </dialog>
    </>
  );
}
