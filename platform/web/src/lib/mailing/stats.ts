import type { MailEvent, MailEventStats } from "./types";

/** 114 A campaign's opens, clicks and unsubscribes from its events (the memory store; MySQL counts in SQL). */
export function mailEventStatsOf(events: Pick<MailEvent, "email" | "kind" | "url">[]): MailEventStats {
  const unique = (kind: MailEvent["kind"]) => new Set(events.filter((e) => e.kind === kind).map((e) => e.email)).size;
  const count = (kind: MailEvent["kind"]) => events.filter((e) => e.kind === kind).length;
  const links = new Map<string, { clicks: number; people: Set<string> }>();
  for (const e of events) {
    if (e.kind !== "click" || !e.url) continue;
    const row = links.get(e.url) ?? { clicks: 0, people: new Set<string>() };
    row.clicks += 1;
    row.people.add(e.email);
    links.set(e.url, row);
  }
  return {
    opens: count("open"),
    uniqueOpens: unique("open"),
    clicks: count("click"),
    uniqueClicks: unique("click"),
    unsubscribes: unique("unsubscribe"),
    bounces: unique("bounce"),
    complaints: unique("complaint"),
    links: [...links].map(([url, r]) => ({ url, clicks: r.clicks, unique: r.people.size })).sort((a, b) => b.clicks - a.clicks || a.url.localeCompare(b.url)),
  };
}
