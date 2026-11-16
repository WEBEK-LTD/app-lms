"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useDashT } from "@/components/dashboard-i18n";

export interface PaletteItem {
  href: string;
  label: string;
  icon: string;
  /** The menu's group it is in (or "More pages"), shown beside it and searched too. */
  group?: string;
}

/** Lower case, without Arabic marks and the long dash (ـ), Turkish dotted and dotless i alike, without accents. */
export function searchable(text: string): string {
  return text
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/ı/g, "i")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}

/** 132.2 The pages whose name or group has every word typed, the names starting with them first. */
export function matchPages<T extends PaletteItem>(items: readonly T[], query: string): T[] {
  const words = searchable(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [...items];
  const scored: { item: T; score: number; at: number }[] = [];
  items.forEach((item, at) => {
    const name = searchable(item.label);
    const hay = `${name} ${searchable(item.group ?? "")} ${item.href.replace(/[/?=_-]+/g, " ")}`;
    if (!words.every((w) => hay.includes(w))) return;
    const score = name.startsWith(words[0]!) ? 0 : name.split(/\s+/).some((part) => part.startsWith(words[0]!)) ? 1 : 2;
    scored.push({ item, score, at });
  });
  return scored.sort((a, b) => a.score - b.score || a.at - b.at).map((s) => s.item);
}

/**
 * 132.2 The project's quick search (⌘K, Ctrl+K, or the menu's Search): type
 * a page's name in any of the dashboard's languages, move with the arrows,
 * open it with Enter; Esc or a click beside it closes it.
 */
export function CommandPalette({ open, onClose, items, appName }: { open: boolean; onClose: () => void; items: PaletteItem[]; appName: string }) {
  const t = useDashT();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const found = useMemo(() => matchPages(items, query), [items, query]);
  const shown = Math.min(active, Math.max(found.length - 1, 0));

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      input.current?.focus();
    }
    if (!open && el.open) el.close();
  }, [open]);

  const go = (href: string) => {
    onClose();
    setQuery("");
    setActive(0);
    router.push(href);
  };

  return (
    <dialog
      ref={dialog}
      aria-label={t("studio.navSearch")}
      onClose={() => {
        onClose();
        setQuery("");
        setActive(0);
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
      data-studio-palette=""
      className="fixed inset-x-0 top-[12vh] m-auto h-auto max-h-[70vh] w-[min(560px,calc(100vw-32px))] max-w-none overflow-hidden rounded-2xl border-0 p-0 shadow-[0_24px_64px_rgba(14,13,36,0.32)] backdrop:bg-[#0e0d24]/45 max-sm:top-4"
      style={{ background: "var(--sf-surface)", color: "var(--sf-ink)", fontFamily: "inherit" }}
    >
      <div className="flex items-center gap-2.5 px-4" style={{ borderBottom: "1px solid var(--sf-line)" }}>
        <span aria-hidden="true" className="material-symbols-rounded" style={{ fontSize: 22, color: "var(--sf-muted)" }}>
          search
        </span>
        <input
          ref={input}
          type="text"
          role="combobox"
          enterKeyHint="go"
          autoComplete="off"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={found.length ? `${listId}-${shown}` : undefined}
          aria-autocomplete="list"
          aria-label={t("studio.navSearch")}
          placeholder={t("studio.navSearchPlaceholder", { app: appName })}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (found.length ? (Math.min(i, found.length - 1) + 1) % found.length : 0));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (found.length ? (Math.min(i, found.length - 1) - 1 + found.length) % found.length : 0));
            } else if (e.key === "Escape") {
              // Closes at once (a search field would only empty itself first).
              e.preventDefault();
              onClose();
            } else if (e.key === "Enter") {
              e.preventDefault();
              const hit = found[shown];
              if (hit) go(hit.href);
            }
          }}
          className="h-14 min-w-0 flex-1 border-0 bg-transparent text-[16px] outline-none"
          style={{ color: "var(--sf-ink)", fontFamily: "inherit" }}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={t("studio.navSearchClose")}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent hover:bg-[var(--sf-soft)]"
          style={{ color: "var(--sf-muted)" }}
        >
          <span aria-hidden="true" className="material-symbols-rounded" style={{ fontSize: 20 }}>
            close
          </span>
        </button>
      </div>
      <ul id={listId} role="listbox" aria-label={t("studio.navSearch")} className="m-0 flex max-h-[calc(70vh-104px)] list-none flex-col gap-0.5 overflow-y-auto p-2">
        {found.map((item, i) => (
          <li
            key={item.href}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === shown}
            onMouseMove={() => setActive(i)}
            onClick={() => go(item.href)}
            data-palette-href={item.href}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-[14.5px]"
            style={{ background: i === shown ? "var(--sf-soft)" : undefined }}
          >
            <span aria-hidden="true" className="material-symbols-rounded flex-none" style={{ fontSize: 20, color: i === shown ? "var(--sf-accent)" : "var(--sf-muted)" }}>
              {item.icon}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold">{item.label}</span>
            {item.group ? (
              <span className="max-w-[40%] truncate text-xs" style={{ color: "var(--sf-muted)" }}>
                {item.group}
              </span>
            ) : null}
          </li>
        ))}
        {!found.length ? (
          <li role="presentation" className="px-3 py-6 text-center text-sm" style={{ color: "var(--sf-muted)" }}>
            {t("studio.navSearchEmpty", { query: query.trim() })}
          </li>
        ) : null}
      </ul>
      <p className="m-0 px-4 py-2.5 text-xs max-sm:hidden" style={{ borderTop: "1px solid var(--sf-line)", color: "var(--sf-muted)" }}>
        {t("studio.navSearchKeys")}
      </p>
    </dialog>
  );
}
