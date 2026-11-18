"use client";

import { useEffect, useRef } from "react";
import { AppCheckList, type AppCheckView } from "@/components/app-check-list";
import { useDashT } from "@/components/dashboard-i18n";
import { fixHref } from "@/lib/studio/app-check-links";
import type { AppProblem } from "@/lib/studio/app-check-rules";
import { Glyph, STUDIO_COLORS as C } from "./shared";

/**
 * 182 What the app check found on Publish: errors stop the publish (Fix opens
 * each element here, on its page and in its language); with warnings only,
 * "Publish anyway" publishes. Escape or a click outside close it.
 */
export function AppCheckDialog({ report, onFix, onAnyway, onClose, busy }: { report: AppCheckView; onFix: (p: AppProblem) => void; onAnyway: () => void; onClose: () => void; busy: boolean }) {
  const t = useDashT();
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  const errors = report.errors > 0;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(14,13,36,0.45)" }} onClick={onClose} data-studio-app-check="">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-app-check-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(640px,90vh)] w-[min(560px,100%)] flex-col gap-3 overflow-hidden rounded-[18px] p-5 text-[13px]"
        style={{ background: C.surface, color: C.ink, border: `1px solid ${C.line}`, boxShadow: "0 30px 70px rgba(14,13,36,0.35)" }}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full" style={{ background: errors ? "var(--color-danger-bg)" : "var(--sf-select-fill, #E8EEFF)", color: errors ? "var(--color-danger)" : "var(--sf-select-ink, #1F3FB8)" }}>
            <Glyph name="fact_check" size={22} />
          </span>
          <h2 id="studio-app-check-title" className="m-0 text-[17px] font-extrabold leading-snug">
            {t("appCheck.title")}
          </h2>
        </div>
        <div className="min-h-0 overflow-y-auto">
          <AppCheckList report={report} fixHref={fixHref} onFix={onFix} limit={report.problems.length} />
        </div>
        <div className="mt-1 flex flex-wrap justify-end gap-2">
          <button ref={first} type="button" onClick={onClose} className="h-10 rounded-[10px] px-4 text-sm font-semibold" style={{ border: `1px solid ${C.line}`, background: "transparent", color: C.ink }}>
            {t("appCheck.cancel")}
          </button>
          {errors ? null : (
            <button type="button" onClick={onAnyway} disabled={busy} data-publish-anyway="" className="flex h-10 items-center gap-1.5 rounded-[10px] border-0 px-4 text-sm font-bold disabled:opacity-60" style={{ background: C.accent, color: C.onAccent }}>
              <Glyph name="rocket_launch" size={18} />
              {t("appCheck.publishAnyway")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
