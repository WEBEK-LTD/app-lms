"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useSiteDark } from "@/components/theme-switch";
import { THEME_KEY } from "@/components/theme-script";
import { setDocumentLang } from "@/components/html-shell";
import { CM_LANG_COOKIE, CM_LANG_INFO, CM_LANGS, type CmLang } from "./words";

/** The page's <html lang/dir> follows the Community's language while it is open. */
export function CmDocumentLang({ lang }: { lang: CmLang }) {
  useEffect(() => {
    setDocumentLang(lang);
    return () => setDocumentLang(null);
  }, [lang]);
  return null;
}

/** The header's language picker: kept in a cookie for a year, then the page is drawn again. */
export function LangSelect({ lang, label }: { lang: CmLang; label: string }) {
  const router = useRouter();
  return (
    <label className="cm-lang">
      <span className="ms" style={{ fontSize: 19 }} aria-hidden="true">language</span>
      <span className="cm-sr">{label}</span>
      <select
        value={lang}
        onChange={(e) => {
          document.cookie = `${CM_LANG_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }}
      >
        {CM_LANGS.map((l) => (
          <option key={l} value={l}>{CM_LANG_INFO[l].native}</option>
        ))}
      </select>
    </label>
  );
}

/** Light and dark, as the drawer's two buttons. */
export function ThemeButtons({ light, dark: darkLabel }: { light: string; dark: string }) {
  const dark = useSiteDark();
  const set = (next: "light" | "dark") => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Kept for this page only.
    }
    window.dispatchEvent(new Event("yallapp-theme-change"));
  };
  return (
    <div className="tg" role="group">
      <button type="button" className={dark ? "" : "on"} aria-pressed={!dark} aria-label={light} onClick={() => set("light")}>
        <span className={`ms${dark ? "" : " f"}`} aria-hidden="true">light_mode</span>
      </button>
      <button type="button" className={dark ? "on" : ""} aria-pressed={dark} aria-label={darkLabel} onClick={() => set("dark")}>
        <span className={`ms${dark ? " f" : ""}`} aria-hidden="true">dark_mode</span>
      </button>
    </div>
  );
}

/** The phone header's menu button and the side menu it opens. */
export function Drawer({ label, closeLabel, children }: { label: string; closeLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);
  return (
    <>
      <button type="button" className="cm-icb cm-menu" aria-label={label} aria-expanded={open} onClick={() => setOpen(true)}>
        <span className="ms" aria-hidden="true">menu</span>
      </button>
      {open ? (
        <div className="cm-dim" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <nav className="cm-drawer" aria-label={label} onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
            <button type="button" className="x" aria-label={closeLabel} onClick={() => setOpen(false)}>
              <span className="ms" aria-hidden="true">close</span>
            </button>
            {children}
          </nav>
        </div>
      ) : null}
    </>
  );
}

/** A select that opens its choice's address (the feed's "All sections" filter). */
export function GoSelect({ label, value, options }: { label: string; value: string; options: { value: string; label: string; href: string }[] }) {
  const router = useRouter();
  return (
    <label className="flt">
      <span className="ms" style={{ fontSize: 19 }} aria-hidden="true">tune</span>
      <span className="cm-sr">{label}</span>
      <select value={value} onChange={(e) => router.push(options.find((o) => o.value === e.target.value)?.href ?? options[0]?.href ?? "")}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

/** The search box's "⌘ K" (Ctrl K elsewhere): the keys that put the cursor in it. */
export function SearchKey() {
  const mac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => true,
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        const input = document.querySelector<HTMLInputElement>(".cm-search input");
        if (input) {
          e.preventDefault();
          input.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return <span className="k" aria-hidden="true">{mac ? "⌘ K" : "Ctrl K"}</span>;
}

/**
 * 231 The header's avatar: a menu of the member's own places (a dropdown on
 * wide screens, a sheet from the bottom on phones). Arrow keys move between
 * its items, Esc or a click outside closes it and gives focus back.
 */
export function AvatarMenu({ label, avatar, head, children }: { label: string; avatar: ReactNode; head: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const items = () => Array.from(panel.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), select") ?? []);
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const list = items();
      const at = list.indexOf(document.activeElement as HTMLElement);
      if (at < 0 || list[at]?.tagName === "SELECT") return;
      e.preventDefault();
      list[(at + (e.key === "ArrowDown" ? 1 : list.length - 1)) % list.length]?.focus();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !button.current?.contains(t)) close(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);
  return (
    <div className="cm-am">
      <button ref={button} type="button" className="cm-am-btn" aria-label={label} aria-haspopup="menu" aria-expanded={open} data-testid="cm-avatar-trigger" onClick={() => setOpen((o) => !o)}>
        {avatar}
      </button>
      {open ? (
        <>
          <div className="cm-am-dim" aria-hidden="true" />
          <div ref={panel} className="cm-am-panel" role="menu" aria-label={label} data-testid="cm-avatar-menu" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
            <div className="cm-am-head">{head}</div>
            {children}
          </div>
        </>
      ) : null}
    </div>
  );
}
