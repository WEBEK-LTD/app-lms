import type { AnalyticsReport, Kpis } from "./report";

/** 44 One CSV cell: quoted when needed, and a text a spreadsheet would run as a formula starts with an apostrophe. */
export function csvCell(value: string | number | null): string {
  if (value === null) return "";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** 62 The file's words: column names, sections and row names, in the downloader's language (English by default). */
export interface CsvWords {
  section: string;
  name: string;
  detail: string;
  value: string;
  previousPeriod: string;
  range: string;
  rangeText: (from: string, to: string) => string;
  previousText: (from: string, to: string) => string;
  summary: string;
  kpis: Record<keyof Kpis, string>;
  dau: string;
  installs: string;
  sessions: string;
  retention: string;
  day: (days: number) => string;
  cohort: (returned: number, cohort: number) => string;
  platforms: string;
  systems: string;
  versions: string;
  countries: string;
  languages: string;
  screens: string;
  topItems: string;
  funnel: string;
  steps: { view: string; intent: string; checkout: string };
  ofViews: (percent: string) => string;
  checkoutValue: string;
  notifications: string;
  sentTo: (day: string, count: number) => string;
  fromSite: string;
  searches: string;
  screenshots: string;
  /** "Elsewhere in the app": screenshots outside a lesson. */
  otherProtected: string;
  /** An item's kind ("Course"). */
  itemWord: (kind: string) => string;
  /** A website notification's type ("New lessons"). */
  pushType: (type: string) => string;
}

export const ENGLISH_CSV_WORDS: CsvWords = {
  section: "section",
  name: "name",
  detail: "detail",
  value: "value",
  previousPeriod: "previous_period",
  range: "Range",
  rangeText: (from, to) => `${from} to ${to}`,
  previousText: (from, to) => `previous ${from} to ${to}`,
  summary: "Summary",
  kpis: {
    installs: "Installs (first opens)",
    activeAvg: "Daily active users (average)",
    weekly: "Weekly active users",
    monthly: "Monthly active users",
    sessions: "Sessions",
    sessionsPerUser: "Sessions per user a day",
  },
  dau: "Daily active users",
  installs: "Installs",
  sessions: "Sessions",
  retention: "Retention",
  day: (days) => `Day ${days}`,
  cohort: (returned, cohort) => `${returned} of ${cohort}`,
  platforms: "Platforms",
  systems: "System versions",
  versions: "App versions",
  countries: "Countries",
  languages: "Languages",
  screens: "Screens",
  topItems: "Top items",
  funnel: "Funnel",
  steps: { view: "Viewed", intent: "Took a step", checkout: "Went to checkout" },
  ofViews: (percent) => `${percent} of views`,
  checkoutValue: "Checkout value",
  notifications: "Notifications",
  sentTo: (day, count) => `sent ${day} to ${count}`,
  fromSite: "Notifications from your website",
  searches: "Searches",
  screenshots: "Screenshots taken",
  otherProtected: "Elsewhere in the app",
  itemWord: (kind) => kind,
  pushType: (type) => type,
};

const KPI_KEYS: (keyof Kpis)[] = ["installs", "activeAvg", "weekly", "monthly", "sessions", "sessionsPerUser"];

/**
 * The report as one table: section, name, detail, value and the previous
 * period's value where there is one. Totals only, never an install. 62 The
 * column names and the words in it follow `words` (the dashboard's language;
 * the English file keeps its machine-friendly column names).
 */
export function reportCsv(report: AnalyticsReport, itemWord: (kind: string) => string, words: CsvWords = ENGLISH_CSV_WORDS): string {
  const w = { ...words, itemWord: words === ENGLISH_CSV_WORDS ? itemWord : words.itemWord };
  const rows: (string | number | null)[][] = [[w.section, w.name, w.detail, w.value, w.previousPeriod]];
  const { range } = report;
  rows.push([w.range, w.rangeText(range.from, range.to), w.previousText(range.previous.from, range.previous.to), range.days, null]);
  for (const key of KPI_KEYS) rows.push([w.summary, w.kpis[key], null, report.kpis[key], report.previous[key]]);
  for (const day of report.daily) {
    rows.push([w.dau, day.day, null, day.active, day.previousActive]);
  }
  for (const day of report.daily) rows.push([w.installs, day.day, null, day.installs, null]);
  for (const day of report.daily) rows.push([w.sessions, day.day, null, day.sessions, null]);
  for (const point of report.retention) rows.push([w.retention, w.day(point.days), w.cohort(point.returned, point.cohort), point.rate, null]);
  const split = (section: string, list: AnalyticsReport["platforms"]) => {
    for (const s of list) rows.push([section, s.label, null, s.value, null]);
  };
  split(w.platforms, report.platforms);
  split(w.systems, report.systems);
  split(w.versions, report.versions);
  split(w.countries, report.countries);
  split(w.languages, report.languages);
  split(w.screens, report.screens);
  for (const item of report.items) rows.push([w.topItems, item.title, `${w.itemWord(item.kind)} ${item.id}`, item.views, null]);
  for (const step of report.funnel) rows.push([w.funnel, w.steps[step.step], step.rate === null ? null : w.ofViews(`${(step.rate * 100).toFixed(1)}%`), step.value, null]);
  for (const value of report.checkoutValue) rows.push([w.checkoutValue, value.currency, null, value.cents / 100, null]);
  for (const push of report.push) rows.push([w.notifications, push.title, w.sentTo(push.sentDay, push.pushed), push.opened, null]);
  for (const push of report.pushFromSite) rows.push([w.fromSite, w.pushType(push.type), null, push.opened, null]);
  for (const search of report.searches) rows.push([w.searches, search.query, null, search.count, null]);
  // 62 Screenshots of protected lessons (iPhone only).
  for (const shot of report.screenshots ?? []) {
    rows.push([w.screenshots, shot.kind === "other" ? w.otherProtected : shot.title, shot.kind === "other" ? null : `${w.itemWord(shot.kind)} ${shot.id}`, shot.count, null]);
  }
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
