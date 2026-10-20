import type { Lang } from "@/i18n/config";
import { formatNumber } from "@/i18n/format";

/** 44 A number as the charts write it: 1,284 → 1.3K, 12,900 → 13K. */
export function compact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** 56 `compact` in the dashboard's language: Arabic and Turkish use their own short forms ("1.3 ألف", "1,3 B"), Latin digits. */
export function compactIn(lang: Lang, value: number): string {
  if (lang === "en") return compact(value);
  return formatNumber(lang, value, { notation: "compact", maximumFractionDigits: Math.abs(value) >= 10_000 ? 0 : 1 });
}
