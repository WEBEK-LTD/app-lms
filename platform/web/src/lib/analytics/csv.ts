import type { AnalyticsReport, Kpis } from "./report";

/** 44 One CSV cell: quoted when needed, and a text a spreadsheet would run as a formula starts with an apostrophe. */
export function csvCell(value: string | number | null): string {
  if (value === null) return "";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const KPI_NAMES: [keyof Kpis, string][] = [
  ["installs", "Installs (first opens)"],
  ["activeAvg", "Daily active users (average)"],
  ["weekly", "Weekly active users"],
  ["monthly", "Monthly active users"],
  ["sessions", "Sessions"],
  ["sessionsPerUser", "Sessions per user a day"],
];

/**
 * The report as one table: section, name, detail, value and the previous
 * period's value where there is one. Totals only, never an install.
 */
export function reportCsv(report: AnalyticsReport, itemWord: (kind: string) => string): string {
  const rows: (string | number | null)[][] = [["section", "name", "detail", "value", "previous_period"]];
  const { range } = report;
  rows.push(["Range", `${range.from} to ${range.to}`, `previous ${range.previous.from} to ${range.previous.to}`, range.days, null]);
  for (const [key, name] of KPI_NAMES) rows.push(["Summary", name, null, report.kpis[key], report.previous[key]]);
  for (const day of report.daily) {
    rows.push(["Daily active users", day.day, null, day.active, day.previousActive]);
  }
  for (const day of report.daily) rows.push(["Installs", day.day, null, day.installs, null]);
  for (const day of report.daily) rows.push(["Sessions", day.day, null, day.sessions, null]);
  for (const point of report.retention) rows.push(["Retention", `Day ${point.days}`, `${point.returned} of ${point.cohort}`, point.rate, null]);
  const split = (section: string, list: AnalyticsReport["platforms"]) => {
    for (const s of list) rows.push([section, s.label, null, s.value, null]);
  };
  split("Platforms", report.platforms);
  split("System versions", report.systems);
  split("App versions", report.versions);
  split("Countries", report.countries);
  split("Languages", report.languages);
  split("Screens", report.screens);
  for (const item of report.items) rows.push(["Top items", item.title, `${itemWord(item.kind)} ${item.id}`, item.views, null]);
  const steps = { view: "Viewed", intent: "Took a step", checkout: "Went to checkout" } as const;
  for (const step of report.funnel) rows.push(["Funnel", steps[step.step], step.rate === null ? null : `${(step.rate * 100).toFixed(1)}% of views`, step.value, null]);
  for (const value of report.checkoutValue) rows.push(["Checkout value", value.currency, null, value.cents / 100, null]);
  for (const push of report.push) rows.push(["Notifications", push.title, `sent ${push.sentDay} to ${push.pushed}`, push.opened, null]);
  for (const push of report.pushFromSite) rows.push(["Notifications from your website", push.type, null, push.opened, null]);
  for (const search of report.searches) rows.push(["Searches", search.query, null, search.count, null]);
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
