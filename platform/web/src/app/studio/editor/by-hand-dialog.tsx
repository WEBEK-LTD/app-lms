"use client";

import { useEffect, useRef } from "react";
import { useDashT } from "@/components/dashboard-i18n";
import { Glyph, STUDIO_COLORS as C } from "./shared";

/**
 * 159 Before an element's size changes by hand (its size fields in the
 * inspector, or a corner of it on the canvas): "Change this element's size by
 * hand?". Change by hand makes it the owner's (lib/studio/auto-size.ts
 * `byHand`); Cancel, Escape or a click outside leave it automatic. While it
 * is open the editor's shortcuts wait.
 */
export function ByHandDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const t = useDashT();
  const confirm = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirm.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(14,13,36,0.45)" }} onClick={onCancel} data-studio-by-hand="">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="studio-by-hand-title"
        aria-describedby="studio-by-hand-text"
        onClick={(e) => e.stopPropagation()}
        className="flex w-[min(400px,100%)] flex-col gap-3 rounded-[18px] p-5 text-[13px]"
        style={{ background: C.surface, color: C.ink, border: `1px solid ${C.line}`, boxShadow: "0 30px 70px rgba(14,13,36,0.35)" }}
      >
        <span className="flex size-10 items-center justify-center rounded-full" style={{ background: "var(--sf-select-fill, #E8EEFF)", color: "var(--sf-select-ink, #1F3FB8)" }}>
          <Glyph name="pan_tool" size={22} />
        </span>
        <h2 id="studio-by-hand-title" className="m-0 text-[17px] font-extrabold leading-snug">
          {t("studio.byHandTitle")}
        </h2>
        <p id="studio-by-hand-text" className="m-0 leading-relaxed" style={{ color: C.muted }}>
          {t("studio.byHandText")}
        </p>
        <div className="mt-1 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-10 rounded-[10px] px-4 text-sm font-semibold" style={{ border: `1px solid ${C.line}`, background: "transparent", color: C.ink }}>
            {t("common.cancel")}
          </button>
          <button ref={confirm} type="button" onClick={onConfirm} className="flex h-10 items-center gap-1.5 rounded-[10px] border-0 px-4 text-sm font-bold" style={{ background: C.ink, color: C.surface }}>
            <Glyph name="pan_tool" size={18} />
            {t("studio.byHandConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
