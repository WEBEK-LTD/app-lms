"use client";

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { compact } from "@/lib/analytics/format";

/**
 * 44 The charts of Dashboard › Analytics, drawn as SVG: thin marks, one
 * axis, recessive grid, a crosshair with one tooltip for every series on
 * lines and a tooltip per column on columns, the same readout on keyboard
 * focus (arrow keys), and the values in a table beside each chart. Light
 * only, like the dashboard. Colors checked with the data-viz palette
 * validator against the white card: the current period in Ember (text)
 * #C2410C, the period before in violet #5B56C8.
 */
export const SERIES_COLORS = { current: "#c2410c", previous: "#5b56c8" } as const;

const WIDTH = 720;
const HEIGHT = 220;
const PAD = { top: 12, right: 12, bottom: 28, left: 40 };

export interface TrendSeries {
  name: string;
  color: string;
  values: (number | null)[];
}

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * power >= value) return step * power;
  return 10 * power;
}


function shortDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function ticksFor(max: number): number[] {
  return [0, max / 4, max / 2, (3 * max) / 4, max];
}

function xLabels(days: string[]): number[] {
  if (days.length <= 1) return [0];
  const count = Math.min(6, days.length);
  return Array.from({ length: count }, (_, i) => Math.round((i * (days.length - 1)) / (count - 1)));
}

function Tooltip({ x, title, rows }: { x: number; title: string; rows: { name: string; color: string; value: string }[] }) {
  const left = `${Math.min(Math.max((x / WIDTH) * 100, 12), 88)}%`;
  return (
    <div
      role="presentation"
      data-chart-tooltip=""
      className="pointer-events-none absolute top-1 z-10 min-w-[140px] -translate-x-1/2 rounded-lg border border-line bg-white px-3 py-2 text-[13px] shadow-[0_6px_20px_rgba(14,13,36,0.12)]"
      style={{ left }}
    >
      <p className="m-0 text-xs text-muted">{title}</p>
      {rows.map((row) => (
        <p key={row.name} className="m-0 flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-[2px] w-3 rounded-full" style={{ background: row.color }} />
          <strong className="text-[14px] text-midnight tabular-nums">{row.value}</strong>
          <span className="text-muted">{row.name}</span>
        </p>
      ))}
    </div>
  );
}

/** A line chart over days: up to two series (this period and the one before), one axis. */
export function TrendChart({ label, days, series, format = compact }: { label: string; days: string[]; series: TrendSeries[]; format?: (n: number) => string }) {
  const [active, setActive] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const titleId = useId();
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null))));
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (days.length <= 1 ? innerW / 2 : (i * innerW) / (days.length - 1));
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box || days.length === 0) return;
    const px = ((event.clientX - box.left) / box.width) * WIDTH;
    const i = days.length <= 1 ? 0 : Math.round(((px - PAD.left) / innerW) * (days.length - 1));
    setActive(Math.min(days.length - 1, Math.max(0, i)));
  };
  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    setActive((i) => Math.min(days.length - 1, Math.max(0, (i ?? (step > 0 ? -1 : days.length)) + step)));
  };

  const path = (values: (number | null)[]) => {
    let d = "";
    let pen = false;
    values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  return (
    <div className="relative">
      {series.length > 1 ? (
        <ul className="m-0 mb-2 flex list-none flex-wrap gap-4 p-0 text-[13px] text-ink-4">
          {series.map((s) => (
            <li key={s.name} className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-[2px] w-4 rounded-full" style={{ background: s.color }} />
              {s.name}
            </li>
          ))}
        </ul>
      ) : null}
      <svg
        ref={svg}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-auto w-full touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-midnight"
        role="img"
        aria-labelledby={titleId}
        tabIndex={0}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((i) => i ?? days.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={onKey}
      >
        <title id={titleId}>{`${label}. Use the left and right arrow keys to read each day; the values are also in the table.`}</title>
        {ticksFor(max).map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} stroke="#ede7dc" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={11} fill="#5e5b70" className="tabular-nums">
              {compact(tick)}
            </text>
          </g>
        ))}
        {xLabels(days).map((i) => (
          <text key={i} x={x(i)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="#5e5b70">
            {shortDay(days[i]!)}
          </text>
        ))}
        {[...series].reverse().map((s) => (
          <path key={s.name} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {active !== null ? (
          <g>
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke="#8c889a" strokeWidth={1} />
            {series.map((s) =>
              s.values[active] === null || s.values[active] === undefined ? null : (
                <circle key={s.name} cx={x(active)} cy={y(s.values[active]!)} r={4} fill={s.color} stroke="#ffffff" strokeWidth={2} />
              ),
            )}
          </g>
        ) : null}
      </svg>
      {active !== null ? (
        <Tooltip
          x={x(active)}
          title={shortDay(days[active]!)}
          rows={series.map((s) => ({ name: s.name, color: s.color, value: s.values[active] === null || s.values[active] === undefined ? "–" : format(s.values[active]!) }))}
        />
      ) : null}
    </div>
  );
}

/** Columns over days, one series: each column has its own tooltip on hover and focus. */
export function ColumnChart({ label, days, values, color = SERIES_COLORS.current, unit }: { label: string; days: string[]; values: number[]; color?: string; unit: string }) {
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  const max = niceMax(Math.max(1, ...values));
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const band = innerW / Math.max(1, days.length);
  const barW = Math.max(2, Math.min(24, band - 2));
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    setActive((i) => Math.min(days.length - 1, Math.max(0, (i ?? (step > 0 ? -1 : days.length)) + step)));
  };
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-auto w-full touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-midnight"
        role="img"
        aria-labelledby={titleId}
        tabIndex={0}
        onFocus={() => setActive((i) => i ?? days.length - 1)}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKey}
      >
        <title id={titleId}>{`${label}. Use the left and right arrow keys to read each day; the values are also in the table.`}</title>
        {ticksFor(max).map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} stroke="#ede7dc" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={11} fill="#5e5b70">
              {compact(tick)}
            </text>
          </g>
        ))}
        {xLabels(days).map((i) => (
          <text key={i} x={PAD.left + band * i + band / 2} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="#5e5b70">
            {shortDay(days[i]!)}
          </text>
        ))}
        {values.map((v, i) => {
          const cx = PAD.left + band * i + band / 2;
          const h = Math.max(0, PAD.top + innerH - y(v));
          const r = Math.min(4, barW / 2, h);
          const top = PAD.top + innerH - h;
          // A 4px rounded end, square at the baseline.
          const d =
            h <= 0
              ? ""
              : `M${cx - barW / 2},${PAD.top + innerH}V${top + r}Q${cx - barW / 2},${top} ${cx - barW / 2 + r},${top}H${cx + barW / 2 - r}Q${cx + barW / 2},${top} ${cx + barW / 2},${top + r}V${PAD.top + innerH}Z`;
          return (
            <g key={days[i]} onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)}>
              <rect x={cx - band / 2} y={PAD.top} width={band} height={innerH} fill="transparent" />
              {d ? <path d={d} fill={color} opacity={active === null || active === i ? 1 : 0.55} /> : null}
            </g>
          );
        })}
      </svg>
      {active !== null ? (
        <Tooltip
          x={PAD.left + band * active + band / 2}
          title={shortDay(days[active]!)}
          rows={[{ name: unit, color, value: compact(values[active] ?? 0) }]}
        />
      ) : null}
    </div>
  );
}
