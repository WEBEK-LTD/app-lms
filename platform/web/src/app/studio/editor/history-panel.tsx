"use client";

import { useState } from "react";
import { useDashT } from "@/components/dashboard-i18n";
import { Glyph, STUDIO_COLORS as C } from "./shared";

/** How many of the last steps the list shows. */
const SHOWN = 20;

/**
 * 132.73 The editor's undo history, named: the last changes newest first
 * ("Added Flash sale", "Changed Text"), the one on screen marked Now, those
 * undone greyed after it; a click goes back (or forward) to that step, as
 * so many presses of Undo or Redo would.
 */
export function HistoryPanel({ count, current, labelOf, onJump }: { count: number; current: number; labelOf: (index: number) => string; onJump: (index: number) => void }) {
  const t = useDashT();
  const [open, setOpen] = useState(false);
  // Named only while the list is open: each name compares two drafts.
  const first = Math.max(0, count - SHOWN);
  const rows = open ? Array.from({ length: count - first }, (_, i) => first + i).reverse().map((index) => ({ index, label: labelOf(index) })) : [];
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("studioKit.histTitle")}
        title={t("studioKit.histTitle")}
        onClick={() => setOpen((v) => !v)}
        disabled={count <= 1}
        className="flex size-9 items-center justify-center rounded-lg border-0 bg-transparent"
        style={{ color: count > 1 ? C.barText : C.barMuted }}
        data-studio-history=""
      >
        <Glyph name="history" />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={t("studioKit.histTitle")}
          className="absolute top-full z-30 mt-1.5 flex w-[290px] flex-col gap-1 rounded-xl p-2 text-[13px] shadow-[0_14px_30px_rgba(14,13,36,0.25)]"
          style={{ insetInlineStart: 0, background: C.surface, color: C.ink, border: `1px solid ${C.line}` }}
        >
          <div className="flex items-center justify-between px-2 pt-1 pb-1.5">
            <b>{t("studioKit.histTitle")}</b>
            <button type="button" aria-label={t("studio.close")} onClick={() => setOpen(false)} className="flex size-7 items-center justify-center rounded-lg border-0 bg-transparent" style={{ color: C.ink }}>
              <Glyph name="close" size={18} />
            </button>
          </div>
          <ol className="m-0 flex max-h-[min(60vh,420px)] list-none flex-col gap-0.5 overflow-y-auto p-0">
            {rows.map(({ label, index }) => {
              const now = index === current;
              const undone = index > current;
              return (
                <li key={index}>
                  <button
                    type="button"
                    disabled={now}
                    onClick={() => {
                      onJump(index);
                      setOpen(false);
                    }}
                    aria-current={now ? "step" : undefined}
                    className="flex w-full items-center gap-2 rounded-lg border-0 px-2.5 py-2 text-start"
                    style={{ background: now ? C.hover : "transparent", color: undone ? C.muted : C.ink, fontWeight: now ? 700 : 400, textDecoration: undone ? "line-through" : undefined }}
                    data-history-step={index}
                  >
                    <Glyph name={undone ? "redo" : now ? "radio_button_checked" : "undo"} size={16} />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {now ? (
                      <span className="rounded-full px-2 py-px text-[11px] font-bold" style={{ background: C.ink, color: C.surface }}>
                        {t("studioKit.histNow")}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="m-0 px-2.5 pt-1 pb-1 text-xs" style={{ color: C.muted }}>
            {t("studioKit.histHint")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
