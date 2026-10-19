"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { LANG_INFO, LANGS, langCookie, type Lang } from "@/i18n/config";
import { switchLangPath } from "@/i18n/paths";
import { Icon } from "./icon";

/**
 * 55 "English · العربية · Türkçe": the same page in another language, each
 * named in its own language (`lang` and `hreflang` on each link). Choosing one
 * remembers it in the `yallapp_lang` cookie (Phase 56's dashboard reads it).
 * Plain links: the other language's page loads with its own direction.
 */

export interface LanguageLabels {
  /** "Language". */
  label: string;
  /** "Language: English", the button's name. */
  menu: string;
  /** "Languages", the list's name. */
  list: string;
}

function remember(lang: Lang) {
  try {
    document.cookie = langCookie(lang);
  } catch {
    // A browser without cookies still follows the link.
  }
}

function LanguageLink({ lang, to, path, className, onPick }: { lang: Lang; to: Lang; path: string; className: string; onPick?: () => void }) {
  return (
    <a
      href={switchLangPath(path, to)}
      hrefLang={to}
      lang={to}
      aria-current={to === lang ? "true" : undefined}
      onClick={() => {
        remember(to);
        onPick?.();
      }}
      className={className}
      data-lang-link={to}
    >
      {LANG_INFO[to].nativeName}
    </a>
  );
}

/** The links in a row, for the footer and the phone menu. */
export function LanguageList({ lang, labels, tone = "light", className = "" }: { lang: Lang; labels: LanguageLabels; tone?: "light" | "dark"; className?: string }) {
  const path = usePathname() ?? "/";
  const link = tone === "dark" ? "text-ivory no-underline hover:text-white hover:underline" : "text-midnight no-underline hover:underline";
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Icon name="language" size={20} className={tone === "dark" ? "text-night-text" : "text-muted"} />
      <ul aria-label={labels.list} className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0">
        {LANGS.map((to, i) => (
          <li key={to} className="flex items-center gap-2">
            {i > 0 ? (
              <span aria-hidden="true" className={tone === "dark" ? "text-night-text" : "text-faint"}>
                ·
              </span>
            ) : null}
            <LanguageLink lang={lang} to={to} path={path} className={`${link} ${to === lang ? "font-bold" : ""}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A button that opens the list, for the header on wide screens. */
export function LanguageMenu({ lang, labels }: { lang: Lang; labels: LanguageLabels }) {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      button.current?.focus();
      return;
    }
    const links = [...(panel.current?.querySelectorAll<HTMLElement>("a[href]") ?? [])];
    if (event.target === button.current && event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>("a[href]")?.focus());
      return;
    }
    if (!open || !links.length || !panel.current?.contains(event.target as Node)) return;
    const index = links.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "ArrowDown" ? (index + 1) % links.length : event.key === "ArrowUp" ? (index <= 0 ? links.length - 1 : index - 1) : null;
    if (next === null) return;
    event.preventDefault();
    links[next]!.focus();
  };

  return (
    <div
      ref={wrapper}
      className="relative"
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        if (open && !wrapper.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={labels.menu}
        title={labels.label}
        onClick={() => setOpen(!open)}
        data-language-menu=""
        className="flex h-[42px] cursor-pointer items-center gap-1 rounded-[10px] border-0 bg-transparent px-2 text-[15px] font-semibold text-ink-3 hover:text-midnight"
      >
        <Icon name="language" size={20} />
        <span lang={lang} className="hidden xl:inline">
          {LANG_INFO[lang].nativeName}
        </span>
        <Icon name="expand_more" size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <ul
        ref={panel}
        id={id}
        hidden={!open}
        aria-label={labels.list}
        className="absolute end-0 top-full z-40 m-0 mt-2 flex w-44 list-none flex-col gap-0.5 rounded-2xl border border-line bg-white p-2 shadow-[0_16px_40px_rgba(14,13,36,0.14)]"
      >
        {LANGS.map((to) => (
          <li key={to}>
            <LanguageLink
              lang={lang}
              to={to}
              path={path}
              onPick={() => setOpen(false)}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-[15px] text-midnight no-underline hover:bg-ivory focus-visible:bg-ivory ${to === lang ? "bg-ivory font-extrabold" : "font-semibold"}`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
