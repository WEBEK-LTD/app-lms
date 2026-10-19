import type { ReactNode } from "react";
import { Icon } from "./icon";
import { compact } from "@/lib/analytics/format";
import type { AnalyticsReport, Kpis, Share } from "@/lib/analytics/report";

/** 44 The pieces of Dashboard › Analytics that the admin's client page shows too. */

export function percent(rate: number | null, digits = 0): string {
  if (rate === null) return "–";
  return `${(rate * 100).toFixed(digits)}%`;
}

function formatKpi(key: keyof Kpis, value: number): string {
  if (key === "sessionsPerUser") return value.toFixed(1);
  if (key === "activeAvg") return value >= 100 ? compact(Math.round(value)) : value.toFixed(value >= 10 ? 0 : 1);
  return value >= 10_000 ? compact(value) : value.toLocaleString("en-GB");
}

const KPI_TILES: { key: keyof Kpis; label: string; hint: string }[] = [
  { key: "installs", label: "Installs", hint: "First opens" },
  { key: "activeAvg", label: "Daily active users", hint: "Average a day" },
  { key: "weekly", label: "Weekly active users", hint: "7 days to the last day" },
  { key: "monthly", label: "Monthly active users", hint: "30 days to the last day" },
  { key: "sessions", label: "Sessions", hint: "App opens" },
  { key: "sessionsPerUser", label: "Sessions per user", hint: "A day" },
];

/** The change against the period before, with an arrow and words, never color alone. */
function Delta({ now, before, period }: { now: number; before: number; period: string }) {
  if (before === 0) {
    return <span className="text-[13px] text-muted">{now === 0 ? `No change vs ${period}` : `New vs ${period}`}</span>;
  }
  const change = (now - before) / before;
  if (Math.abs(change) < 0.005) return <span className="text-[13px] text-muted">No change vs {period}</span>;
  const up = change > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-[13px] font-semibold ${up ? "text-success" : "text-danger"}`}>
      <Icon name={up ? "arrow_upward" : "arrow_downward"} size={16} />
      <span>
        {up ? "Up" : "Down"} {percent(Math.abs(change))}
        <span className="font-normal text-muted"> vs {period}</span>
      </span>
    </span>
  );
}

export function KpiTiles({ report, compare = true }: { report: AnalyticsReport; compare?: boolean }) {
  const period = `previous ${report.range.days} days`;
  return (
    <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fill,minmax(min(170px,100%),1fr))]" aria-label="Summary">
      {KPI_TILES.map((tile) => (
        <li key={tile.key} className="flex min-w-0 flex-col gap-1 rounded-2xl border border-line bg-white px-4 py-3.5" data-kpi={tile.key}>
          <span className="text-sm font-semibold text-ink-4">{tile.label}</span>
          <span className="text-[28px] leading-tight font-bold text-midnight" data-value>
            {formatKpi(tile.key, report.kpis[tile.key])}
          </span>
          <span className="text-xs text-muted">{tile.hint}</span>
          {compare ? <Delta now={report.kpis[tile.key]} before={report.previous[tile.key]} period={period} /> : null}
        </li>
      ))}
    </ul>
  );
}

/** Horizontal bars, one hue, each with its name and value written beside it. */
export function BarList({ items, label, valueText }: { items: Share[]; label: string; valueText?: (s: Share) => string }) {
  if (items.length === 0) return <p className="m-0 text-sm text-muted">Nothing yet in this range.</p>;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0" aria-label={label}>
      {items.map((item) => (
        <li key={item.key} className="flex flex-col gap-1">
          <span className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink-2" title={item.label}>
              {item.label}
            </span>
            <span className="flex-none font-semibold text-midnight tabular-nums">{valueText ? valueText(item) : `${compact(item.value)} · ${percent(item.share)}`}</span>
          </span>
          <span aria-hidden="true" className="block h-2 rounded-r-[4px] bg-[#c2410c]" style={{ width: `${Math.max(1, (item.value / max) * 100)}%` }} />
        </li>
      ))}
    </ul>
  );
}

/** Returns after 1, 7 and 30 days of the people who first opened the app in the range. */
export function RetentionTiles({ report }: { report: AnalyticsReport }) {
  return (
    <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr))]" aria-label="Retention">
      {report.retention.map((point) => (
        <li key={point.days} className="flex flex-col gap-1.5 rounded-xl border border-line-soft bg-sand px-4 py-3" data-retention={point.days}>
          <span className="text-sm font-semibold text-ink-4">Day {point.days}</span>
          <span className="text-[24px] leading-tight font-bold text-midnight" data-value>
            {percent(point.rate)}
          </span>
          <div
            className="h-2 overflow-hidden rounded-full bg-peach"
            role="progressbar"
            aria-label={`Day ${point.days} return rate`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={point.rate === null ? 0 : Math.round(point.rate * 100)}
          >
            <div className="h-full rounded-full bg-[#c2410c]" style={{ width: `${(point.rate ?? 0) * 100}%` }} />
          </div>
          <span className="text-xs text-muted">
            {point.cohort === 0 ? `No first opens whose day ${point.days} is over yet` : `${point.returned} of ${point.cohort} came back on day ${point.days}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A small table that names its columns: used for every list the charts don't show. */
export function DataTable({ caption, head, rows, hideCaption = true }: { caption: string; head: string[]; rows: ReactNode[][]; hideCaption?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className={hideCaption ? "sr-only" : "pb-2 text-left text-sm font-semibold"}>{caption}</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            {head.map((h, i) => (
              <th key={h} scope="col" className={`px-2 py-2 font-semibold ${i > 0 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-b border-line-soft last:border-b-0">
              {row.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="px-2 py-2 text-left font-normal text-ink-2">
                    {cell}
                  </th>
                ) : (
                  <td key={i} className="px-2 py-2 text-right tabular-nums">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
