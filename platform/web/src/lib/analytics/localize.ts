import type { DashboardText } from "../dashboard-words";
import { appLanguageName } from "../i18n/language-names";
import { ENGLISH_CSV_WORDS, type CsvWords } from "./csv";
import type { AnalyticsReport, Share } from "./report";
import { itemWord, pushTypeWord } from "./words";

/**
 * 62 Analytics in the dashboard's language, for the page and its CSV file:
 * country and language names in that language, "Other" and "Unknown" and
 * the other labels shared code writes in English translated.
 */
export function relabel(items: Share[], text: Pick<DashboardText, "lang" | "t" | "k">, kind: "country" | "language" | "other"): Share[] {
  if (text.lang === "en") return items;
  const regions = new Intl.DisplayNames([text.lang], { type: "region" });
  return items.map((item) => {
    if (item.key === "other") return { ...item, label: text.t("analytics.other") };
    if (item.key === "unknown") return { ...item, label: text.t("analytics.unknown") };
    try {
      if (kind === "country") return { ...item, label: regions.of(item.key.toUpperCase()) ?? item.label };
      if (kind === "language") return { ...item, label: appLanguageName(item.key, text.lang) };
    } catch {
      return item;
    }
    return { ...item, label: text.k(item.label) };
  });
}

/** The report's splits relabelled in the dashboard's language. */
export function localizedReport(report: AnalyticsReport, text: Pick<DashboardText, "lang" | "t" | "k">): AnalyticsReport {
  if (text.lang === "en") return report;
  return {
    ...report,
    platforms: relabel(report.platforms, text, "other"),
    systems: relabel(report.systems, text, "other"),
    versions: relabel(report.versions, text, "other"),
    countries: relabel(report.countries, text, "country"),
    languages: relabel(report.languages, text, "language"),
    screens: relabel(report.screens, text, "other"),
  };
}

/** The CSV file's words in the dashboard's language; English keeps its machine-friendly column names. */
export function csvWords(text: Pick<DashboardText, "lang" | "t" | "k">): CsvWords {
  if (text.lang === "en") return ENGLISH_CSV_WORDS;
  const { t, k } = text;
  return {
    section: t("analytics.csv.section"),
    name: t("analytics.csv.name"),
    detail: t("analytics.csv.detail"),
    value: t("analytics.csv.value"),
    previousPeriod: t("analytics.csv.previousPeriod"),
    range: t("analytics.csv.range"),
    rangeText: (from, to) => t("analytics.csv.rangeText", { from, to }),
    previousText: (from, to) => t("analytics.csv.previousText", { from, to }),
    summary: t("analytics.csv.summary"),
    kpis: {
      installs: t("analytics.csv.installsFirst"),
      activeAvg: t("analytics.csv.activeAverage"),
      weekly: t("analytics.csv.weekly"),
      monthly: t("analytics.csv.monthly"),
      sessions: t("analytics.csv.sessions"),
      sessionsPerUser: t("analytics.csv.perUser"),
    },
    dau: t("analytics.csv.dau"),
    installs: t("analytics.csv.installs"),
    sessions: t("analytics.csv.sessions"),
    retention: t("analytics.csv.retention"),
    day: (days) => t("analytics.dayN", { days }),
    cohort: (returned, cohort) => t("analytics.csv.cohort", { returned, cohort }),
    platforms: t("analytics.csv.platforms"),
    systems: t("analytics.csv.systems"),
    versions: t("analytics.csv.versions"),
    countries: t("analytics.csv.countries"),
    languages: t("analytics.csv.languages"),
    screens: t("analytics.csv.screens"),
    topItems: t("analytics.csv.topItems"),
    funnel: t("analytics.csv.funnel"),
    steps: { view: t("analytics.csv.viewed"), intent: t("analytics.csv.tookStep"), checkout: t("analytics.csv.wentToCheckout") },
    ofViews: (percent) => t("analytics.csv.ofViews", { percent }),
    checkoutValue: t("analytics.csv.checkoutValue"),
    notifications: t("analytics.csv.notifications"),
    sentTo: (day, count) => t("analytics.csv.sentTo", { day, count }),
    fromSite: t("analytics.csv.fromSite"),
    searches: t("analytics.csv.searches"),
    screenshots: t("analytics.csv.screenshots"),
    otherProtected: t("analytics.otherProtected"),
    itemWord: (kind) => k(itemWord(kind)),
    pushType: (type) => k(pushTypeWord(type)),
  };
}
