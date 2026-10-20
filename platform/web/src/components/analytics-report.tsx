import type { ReactNode } from "react";
import { Icon } from "./icon";
import { compactIn } from "@/lib/analytics/format";
import type { AnalyticsReport, Kpis, Share } from "@/lib/analytics/report";
import { getDashT, type DashKey } from "@/i18n/dashboard";
import { formatNumber, type Lang } from "@/i18n";
import { richText } from "@/i18n/rich";

/**
 * 44 The pieces of Dashboard › Analytics that the admin's client page shows
 * too. 56 They take the dashboard's language; the admin leaves it English.
 */

export function percent(rate: number | null, digits = 0, lang: Lang = "en"): string {
  if (rate === null) return "–";
  if (lang === "en") return `${(rate * 100).toFixed(digits)}%`;
  return formatNumber(lang, rate, { style: "percent", minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatKpi(key: keyof Kpis, value: number, lang: Lang): string {
  const fixed = (digits: number) => (lang === "en" ? value.toFixed(digits) : formatNumber(lang, value, { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  if (key === "sessionsPerUser") return fixed(1);
  if (key === "activeAvg") return value >= 100 ? compactIn(lang, Math.round(value)) : fixed(value >= 10 ? 0 : 1);
  return value >= 10_000 ? compactIn(lang, value) : formatNumber(lang, value);
}

const KPI_TILES: { key: keyof Kpis; label: DashKey; hint: DashKey }[] = [
  { key: "installs", label: "analytics.kpiInstalls", hint: "analytics.kpiInstallsHint" },
  { key: "activeAvg", label: "analytics.kpiActive", hint: "analytics.kpiActiveHint" },
  { key: "weekly", label: "analytics.kpiWeekly", hint: "analytics.kpiWeeklyHint" },
  { key: "monthly", label: "analytics.kpiMonthly", hint: "analytics.kpiMonthlyHint" },
  { key: "sessions", label: "analytics.kpiSessions", hint: "analytics.kpiSessionsHint" },
  { key: "sessionsPerUser", label: "analytics.kpiPerUser", hint: "analytics.kpiPerUserHint" },
];

/** The change against the period before, with an arrow and words, never color alone. */
function Delta({ now, before, days, lang }: { now: number; before: number; days: number; lang: Lang }) {
  const t = getDashT(lang);
  if (before === 0) {
    return <span className="text-[13px] text-muted">{now === 0 ? t("analytics.noChange", { count: days }) : t("analytics.newVs", { count: days })}</span>;
  }
  const change = (now - before) / before;
  if (Math.abs(change) < 0.005) return <span className="text-[13px] text-muted">{t("analytics.noChange", { count: days })}</span>;
  const up = change > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-[13px] font-semibold ${up ? "text-success" : "text-danger"}`}>
      <Icon name={up ? "arrow_upward" : "arrow_downward"} size={16} />
      <span>
        {richText(t(up ? "analytics.up" : "analytics.down", { count: days, change: percent(Math.abs(change), 0, lang) }), {
          muted: (chunk) => <span className="font-normal text-muted">{chunk}</span>,
        })}
      </span>
    </span>
  );
}

export function KpiTiles({ report, compare = true, lang = "en" }: { report: AnalyticsReport; compare?: boolean; lang?: Lang }) {
  const t = getDashT(lang);
  return (
    <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fill,minmax(min(170px,100%),1fr))]" aria-label={t("analytics.summary")}>
      {KPI_TILES.map((tile) => (
        <li key={tile.key} className="flex min-w-0 flex-col gap-1 rounded-2xl border border-line bg-white px-4 py-3.5" data-kpi={tile.key}>
          <span className="text-sm font-semibold text-ink-4">{t(tile.label)}</span>
          <span className="text-[28px] leading-tight font-bold text-midnight" data-value>
            {formatKpi(tile.key, report.kpis[tile.key], lang)}
          </span>
          <span className="text-xs text-muted">{t(tile.hint)}</span>
          {compare ? <Delta now={report.kpis[tile.key]} before={report.previous[tile.key]} days={report.range.days} lang={lang} /> : null}
        </li>
      ))}
    </ul>
  );
}

/** Horizontal bars, one hue, each with its name and value written beside it. */
export function BarList({ items, label, valueText, lang = "en" }: { items: Share[]; label: string; valueText?: (s: Share) => string; lang?: Lang }) {
  if (items.length === 0) return <p className="m-0 text-sm text-muted">{getDashT(lang)("analytics.nothingYet")}</p>;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0" aria-label={label}>
      {items.map((item) => (
        <li key={item.key} className="flex flex-col gap-1">
          <span className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink-2" title={item.label}>
              {item.label}
            </span>
            <span className="flex-none font-semibold text-midnight tabular-nums">
              {valueText ? valueText(item) : `${compactIn(lang, item.value)} · ${percent(item.share, 0, lang)}`}
            </span>
          </span>
          <span aria-hidden="true" className="block h-2 rounded-e-[4px] bg-[#c2410c]" style={{ width: `${Math.max(1, (item.value / max) * 100)}%` }} />
        </li>
      ))}
    </ul>
  );
}

/** Returns after 1, 7 and 30 days of the people who first opened the app in the range. */
export function RetentionTiles({ report, lang = "en" }: { report: AnalyticsReport; lang?: Lang }) {
  const t = getDashT(lang);
  return (
    <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr))]" aria-label={t("analytics.retention")}>
      {report.retention.map((point) => (
        <li key={point.days} className="flex flex-col gap-1.5 rounded-xl border border-line-soft bg-sand px-4 py-3" data-retention={point.days}>
          <span className="text-sm font-semibold text-ink-4">{t("analytics.dayN", { days: point.days })}</span>
          <span className="text-[24px] leading-tight font-bold text-midnight" data-value>
            {percent(point.rate, 0, lang)}
          </span>
          <div
            className="h-2 overflow-hidden rounded-full bg-peach"
            role="progressbar"
            aria-label={t("analytics.returnRate", { days: point.days })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={point.rate === null ? 0 : Math.round(point.rate * 100)}
          >
            <div className="h-full rounded-full bg-[#c2410c]" style={{ width: `${(point.rate ?? 0) * 100}%` }} />
          </div>
          <span className="text-xs text-muted">
            {point.cohort === 0
              ? t("analytics.noCohort", { days: point.days })
              : t("analytics.cameBack", { returned: formatNumber(lang, point.returned), cohort: formatNumber(lang, point.cohort), days: point.days })}
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
        <caption className={hideCaption ? "sr-only" : "pb-2 text-start text-sm font-semibold"}>{caption}</caption>
        <thead>
          <tr className="border-b border-line text-start text-xs text-muted">
            {head.map((h, i) => (
              <th key={h} scope="col" className={`px-2 py-2 font-semibold ${i > 0 ? "text-end" : "text-start"}`}>
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
                  <th key={i} scope="row" className="px-2 py-2 text-start font-normal text-ink-2">
                    {cell}
                  </th>
                ) : (
                  <td key={i} className="px-2 py-2 text-end tabular-nums">
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
