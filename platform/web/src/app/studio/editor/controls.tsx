"use client";

import { useId, useState } from "react";
import { useDashT } from "@/components/dashboard-i18n";
import type { StudioSides } from "@/lib/pages/types";
import { Glyph } from "./shared";

/**
 * Editor audit 2.1: one control for every number the Studio inspector
 * slides. The label sits on its own line so long Arabic and Turkish
 * labels are never cut; the value is a number you can type, with its
 * unit beside it; a reset puts back the element's default; presets are
 * one tap. The track itself is always left to right, so a rotation, an
 * angle or a place across follows the canvas in Arabic as well.
 *
 * `scale` shows the stored value in friendlier units (milliseconds as
 * seconds, a fraction as a percent): the field shows `value / scale` and
 * gives back `shown * scale`.
 */
export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  fallback,
  presets,
  scale = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** The value reset puts back; no reset button without it. */
  fallback?: number;
  presets?: { value: number; label?: string }[];
  scale?: number;
  onChange: (n: number) => void;
}) {
  const t = useDashT();
  const id = useId();
  const shown = round(value / scale, step);
  const [typed, setTyped] = useState<string | null>(null);
  const set = (n: number) => onChange(round(clamp(n, min, max), step) * scale);
  const commit = () => {
    if (typed === null) return;
    const n = Number(typed.replace(",", "."));
    if (typed.trim() !== "" && !Number.isNaN(n)) set(n);
    setTyped(null);
  };
  const atFallback = fallback === undefined || round(fallback / scale, step) === shown;
  return (
    <div className="flex flex-col gap-1" data-range-field="">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="min-w-0 leading-snug">
          {label}
        </label>
        <span className="flex flex-none items-center gap-1" dir="ltr">
          <input
            id={id}
            type="number"
            value={typed ?? String(shown)}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              setTyped(e.target.value);
              const n = Number(e.target.value.replace(",", "."));
              if (e.target.value.trim() !== "" && !Number.isNaN(n) && n >= min && n <= max) onChange(round(n, step) * scale);
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setTyped(null);
            }}
            className="w-[56px] rounded-md bg-white px-1.5 py-0.5 text-end text-[13px] outline-none [appearance:textfield] focus:ring-2 focus:ring-[#3D63FF] [&::-webkit-inner-spin-button]:appearance-none"
            style={{ border: "1px solid var(--studio-line)" }}
          />
          {unit ? (
            <span className="min-w-[14px] text-[12px]" style={{ color: "var(--studio-muted)" }}>
              {unit}
            </span>
          ) : null}
          {fallback !== undefined ? (
            <button
              type="button"
              title={t("studio.resetValue")}
              aria-label={t("studio.resetValue")}
              disabled={atFallback}
              onClick={() => onChange(fallback)}
              className="flex h-6 w-6 items-center justify-center rounded-md border-0 bg-transparent disabled:opacity-30"
            >
              <Glyph name="refresh" size={16} />
            </button>
          ) : null}
        </span>
      </div>
      {/* The number above is the field; the track is a pointer and touch shortcut to it. */}
      <input
        type="range"
        aria-hidden="true"
        tabIndex={-1}
        dir="ltr"
        min={min}
        max={max}
        step={step}
        value={clamp(shown, min, max)}
        onChange={(e) => set(Number(e.target.value))}
        className="h-6 w-full cursor-pointer touch-pan-y"
        style={{ accentColor: "#0E0D24" }}
      />
      {presets?.length ? (
        <div role="group" aria-label={t("studio.presets")} className="flex flex-wrap gap-1" dir="ltr">
          {presets.map((p) => {
            const on = round(p.value, step) === shown;
            return (
              <button
                key={p.value}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(round(p.value, step) * scale)}
                className="min-h-[28px] rounded-md bg-white px-2 text-[12px]"
                style={on ? { border: "2px solid #3D63FF", color: "#1F3FB8", fontWeight: 700 } : { border: "1px solid var(--studio-line)" }}
              >
                {p.label ?? `${p.value}${unit && unit !== "%" && unit !== "°" ? "" : (unit ?? "")}`}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const SPACING_PRESETS = [0, 4, 8, 12, 16, 24, 32];

/**
 * Editor audit 2.3: space inside or outside an element. Linked, one value
 * for top and bottom and one for the sides, as before; unlinked, each side
 * on its own. Fields wide enough for three digits, and the usual spacings
 * one tap away.
 */
export function SidesField({ label, value, onChange }: { label: string; value: StudioSides | undefined; onChange: (v: StudioSides | undefined) => void }) {
  const t = useDashT();
  const sides = { top: value?.top ?? 0, end: value?.end ?? 0, bottom: value?.bottom ?? 0, start: value?.start ?? 0 };
  const uneven = sides.top !== sides.bottom || sides.start !== sides.end;
  const [linked, setLinked] = useState(!uneven);
  const emit = (s: typeof sides) => onChange(s.top || s.end || s.bottom || s.start ? s : undefined);
  const field = (name: string, n: number, put: (n: number) => void) => (
    <label className="flex min-w-0 items-center justify-between gap-1 rounded-lg px-2 py-1" style={{ border: "1px solid var(--studio-line)" }}>
      <span className="min-w-0 truncate text-[12px]" style={{ color: "var(--studio-muted)" }}>
        {name}
      </span>
      <span className="flex items-center gap-0.5" dir="ltr">
        <input
          type="number"
          aria-label={`${label}: ${name}`}
          value={n}
          min={0}
          max={400}
          onChange={(e) => put(clamp(Number(e.target.value) || 0, 0, 400))}
          className="w-[44px] border-0 bg-transparent p-0 text-end text-[13px] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-[11px]" style={{ color: "var(--studio-muted)" }}>
          px
        </span>
      </span>
    </label>
  );
  return (
    <div className="col-span-2 flex flex-col gap-1.5" data-sides-field="">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <button
          type="button"
          aria-pressed={linked}
          title={linked ? t("studio.unlinkSides") : t("studio.linkSides")}
          aria-label={linked ? t("studio.unlinkSides") : t("studio.linkSides")}
          onClick={() => setLinked(!linked)}
          className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent"
        >
          <Glyph name={linked ? "link" : "link_off"} size={18} />
        </button>
      </div>
      {linked ? (
        <div className="grid grid-cols-2 gap-1.5">
          {field(t("studio.vertical"), sides.top, (n) => emit({ ...sides, top: n, bottom: n }))}
          {field(t("studio.horizontal"), sides.start, (n) => emit({ ...sides, start: n, end: n }))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {field(t("studio.sideTop"), sides.top, (n) => emit({ ...sides, top: n }))}
          {field(t("studio.sideBottom"), sides.bottom, (n) => emit({ ...sides, bottom: n }))}
          {field(t("studio.sideStart"), sides.start, (n) => emit({ ...sides, start: n }))}
          {field(t("studio.sideEnd"), sides.end, (n) => emit({ ...sides, end: n }))}
        </div>
      )}
      <div role="group" aria-label={t("studio.presets")} className="flex flex-wrap gap-1" dir="ltr">
        {SPACING_PRESETS.map((n) => {
          const on = !uneven && sides.top === n && sides.start === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={on}
              onClick={() => emit({ top: n, end: n, bottom: n, start: n })}
              className="min-h-[28px] min-w-[32px] rounded-md bg-white px-1.5 text-[12px]"
              style={on ? { border: "2px solid #3D63FF", color: "#1F3FB8", fontWeight: 700 } : { border: "1px solid var(--studio-line)" }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Rounds to the step's decimals, so 0.1 steps never show 0.30000000000000004. */
function round(n: number, step: number): number {
  const decimals = step >= 1 ? 0 : Math.min(4, String(step).split(".")[1]?.length ?? 0);
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
