"use client";

import { useEffect, useRef, useState } from "react";
import { useDashT } from "@/components/dashboard-i18n";
import { FontPicker } from "@/components/font-picker";
import type { DashKey } from "@/i18n/dashboard";
import { STUDIO_TEXT_STYLES, type StudioFont, type StudioTextStyle } from "@/lib/pages/types";
import { DEFAULT_TEXT_STYLES, fontKey } from "@/lib/studio/text-styles";
import { RangeField } from "./controls";
import { Glyph, STUDIO_COLORS as C } from "./shared";

/**
 * Editor audit 3.3: the project's text styles (Heading, Subheading, Body,
 * Button). A change here reaches every element following the style, on every
 * page of the draft.
 */
export function TextStylesPanel({
  styles,
  use,
  fontLabels,
  onChange,
}: {
  styles: Record<StudioTextStyle, StudioFont>;
  /** How many elements follow each style. */
  use: Record<StudioTextStyle, number>;
  fontLabels: { arabicOnly: string; none: string; sample: string; hint?: string };
  onChange: (style: StudioTextStyle, font: StudioFont) => void;
}) {
  const t = useDashT();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudioTextStyle>("heading");
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

  const font = styles[editing];
  const set = (patch: StudioFont) => onChange(editing, { ...font, ...patch });
  const isDefault = fontKey(font) === fontKey(DEFAULT_TEXT_STYLES[editing]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={t("studio.textStyles")}
        title={t("studio.textStyles")}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex size-9 items-center justify-center rounded-lg border-0 bg-transparent"
        style={{ color: C.ivory }}
      >
        <Glyph name="title" />
      </button>
      {open ? (
        <div role="dialog" aria-label={t("studio.textStyles")} className="absolute top-full z-30 mt-1.5 w-[320px] rounded-xl bg-white p-3 text-[13px] shadow-[0_14px_30px_rgba(14,13,36,0.25)]" style={{ insetInlineEnd: 0, color: C.ink, border: `1px solid ${C.line}` }}>
          <div className="pb-1 font-bold">{t("studio.textStyles")}</div>
          <p className="m-0 pb-2 text-xs" style={{ color: C.muted }}>
            {t("studio.textStylesHint")}
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {STUDIO_TEXT_STYLES.map((style) => {
              const f = styles[style];
              return (
                <li key={style}>
                  <button
                    type="button"
                    aria-pressed={editing === style}
                    onClick={() => setEditing(style)}
                    className="flex w-full items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-start"
                    style={{ border: `1px solid ${editing === style ? C.select : C.line}`, color: C.ink }}
                  >
                    <span
                      className="min-w-0 flex-1 truncate"
                      style={{ fontFamily: f.family ? `"${f.family}", inherit` : undefined, fontWeight: f.weight ?? 400, fontSize: Math.min(f.size ?? 15, 24), fontStyle: f.italic ? "italic" : undefined, textTransform: f.uppercase ? "uppercase" : undefined }}
                    >
                      {t(`studio.ts_${style}` as DashKey)}
                    </span>
                    <span className="flex-none text-xs" style={{ color: C.muted }}>
                      {t("studio.textStyleUse", { count: use[style] })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-col gap-2 border-t pt-3" style={{ borderColor: C.line }}>
            <div className="grid grid-cols-2 gap-2">
              <FontPicker key={editing} id={`text-style-${editing}`} label={t("studio.font")} value={font.family ?? ""} labels={fontLabels} compact placeholder={t("studio.appFont")} onChange={(family) => set({ family: family || null })} />
              <label className="relative flex">
                <span className="sr-only">{t("studio.weight")}</span>
                <select value={font.weight ?? 400} onChange={(e) => set({ weight: Number(e.target.value) as 400 })} className="h-[34px] w-full cursor-pointer appearance-none rounded-lg bg-white ps-2.5 pe-7 text-[13px]" style={{ border: `1px solid ${C.line}` }}>
                  {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                    <option key={w} value={w}>
                      {t(`studio.w${w}` as DashKey)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <RangeField label={t("studio.size")} value={font.size ?? 16} min={10} max={64} unit="px" fallback={DEFAULT_TEXT_STYLES[editing].size} onChange={(size) => set({ size })} />
            <RangeField label={t("studio.lineHeight")} value={font.line_height ?? 1.4} min={1} max={2.2} step={0.1} unit="×" fallback={DEFAULT_TEXT_STYLES[editing].line_height ?? 1.4} onChange={(line_height) => set({ line_height })} />
            <RangeField label={t("studio.letterSpacing")} value={font.letter_spacing ?? 0} min={-2} max={8} step={0.5} unit="px" fallback={0} onChange={(letter_spacing) => set({ letter_spacing: letter_spacing || undefined })} />
            <button
              type="button"
              disabled={isDefault}
              onClick={() => onChange(editing, DEFAULT_TEXT_STYLES[editing])}
              className="h-8 self-start rounded-lg bg-white px-2.5 text-xs font-semibold disabled:opacity-50"
              style={{ border: `1px solid ${C.line}`, color: C.ink }}
            >
              {t("studio.textStyleReset")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
