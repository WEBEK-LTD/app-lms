import { LANG_INFO, type Lang } from "@/i18n/config";

/**
 * "2 hours ago", "قبل ساعتين", "2 saat önce": when a card's activity
 * happened, in the visitor's language (Intl.RelativeTimeFormat, so the
 * browser and Node write it the same way). Safe in client components.
 */
export function relativeTime(lang: Lang, at: Date, now: Date, options: { day?: boolean } = {}): string {
  const format = new Intl.RelativeTimeFormat(LANG_INFO[lang].intl, { numeric: "auto" });
  if (options.day) {
    // Whole days in UTC (the team's entries are a day, at noon UTC): "today", "yesterday", "3 days ago".
    const days = Math.round((Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()) - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86_400_000);
    if (days >= 0) return format.format(0, "day");
    if (days > -7) return format.format(days, "day");
    if (days > -35) return format.format(Math.round(days / 7), "week");
    return format.format(Math.round(days / 30), "month");
  }
  const seconds = Math.round((at.getTime() - now.getTime()) / 1000);
  // Never in the future (a clock a little ahead): "now".
  if (seconds > -60) return format.format(0, "second");
  const minutes = Math.round(seconds / 60);
  if (minutes > -60) return format.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -24) return format.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (days > -7) return format.format(days, "day");
  const weeks = Math.round(days / 7);
  if (weeks > -5) return format.format(weeks, "week");
  return format.format(Math.round(days / 30), "month");
}

/** Whether the card shows on this page: every marketing page, or only the home and pricing pages in any language. Safe in client components. */
export function liveOnPath(pages: "all" | "home_pricing", pathname: string): boolean {
  if (pages === "all") return true;
  const path = pathname.replace(/^\/(ar|tr)(?=\/|$)/, "").replace(/\/+$/, "") || "/";
  return path === "/" || path === "/pricing";
}
