"use client";

import { useEffect, useRef, useState } from "react";
import { useDashLang, useDashT } from "@/components/dashboard-i18n";
import type { LayoutHistoryEntry } from "@/lib/pages/layout";
import { Glyph, STUDIO_COLORS as C } from "./shared";

/**
 * Editor audit 3.3: the project's kept publishes (as the page editor's
 * History), each one a click away from being the draft again.
 */
export function PublishHistory({ entries, busy, onRestore }: { entries: LayoutHistoryEntry[]; busy: boolean; onRestore: (entry: LayoutHistoryEntry) => void }) {
  const t = useDashT();
  const lang = useDashLang();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={t("studio.history")}
        title={t("studio.history")}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex size-9 items-center justify-center rounded-lg border-0 bg-transparent"
        style={{ color: C.ivory }}
      >
        <Glyph name="schedule" />
      </button>
      {open ? (
        <div role="dialog" aria-label={t("studio.history")} className="absolute top-full z-30 mt-1.5 w-[300px] rounded-xl bg-white p-3 text-[13px] shadow-[0_14px_30px_rgba(14,13,36,0.25)]" style={{ insetInlineEnd: 0, color: C.ink, border: `1px solid ${C.line}` }}>
          <div className="pb-1 font-bold">{t("studio.history")}</div>
          <p className="m-0 pb-2 text-xs" style={{ color: C.muted }}>
            {t("studio.historyHint")}
          </p>
          {entries.length ? (
            <ul className="m-0 flex max-h-[320px] list-none flex-col gap-1 overflow-y-auto p-0">
              {entries.map((entry, i) => {
                const when = new Date(entry.at).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" });
                return (
                  <li key={entry.number} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ border: `1px solid ${C.line}` }}>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold" suppressHydrationWarning>
                        {when}
                      </span>
                      <span className="truncate text-xs" style={{ color: C.muted }}>
                        {i === 0 ? t("studio.historyLive") : entry.by ? t("studio.historyBy", { name: entry.by }) : t("studio.historyPublished")}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setOpen(false);
                        onRestore(entry);
                      }}
                      className="h-8 flex-none rounded-lg bg-white px-2.5 text-xs font-semibold disabled:opacity-50"
                      style={{ border: `1px solid ${C.line}`, color: C.ink }}
                    >
                      {t("studio.historyRestore")}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="m-0" style={{ color: C.muted }}>
              {t("studio.historyNone")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
