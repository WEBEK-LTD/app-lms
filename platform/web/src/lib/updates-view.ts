import type { ClientContext } from "./auth/session";
import { BELL_LIMIT, UPDATE_KIND_LABEL, type UpdateItem, type Updates, type UpdatesReader } from "./updates";

/**
 * 57 The dashboard's bell as the browser gets it: plain values only (dates
 * already written out), the newest BELL_LIMIT items and the unread count.
 */
export interface BellItem {
  key: string;
  kind: UpdateItem["kind"];
  /** "Update", "Maintenance", "Your account", … */
  kindLabel: string;
  topic: UpdateItem["topic"];
  title: string;
  summary: string;
  lang: UpdateItem["lang"];
  /** "19 Oct 2026", and the time for the `<time>` element. */
  date: string;
  datetime: string;
  linkUrl: string | null;
  linkLabel: string | null;
  tone: UpdateItem["tone"];
  app: string | null;
  unread: boolean;
}

export interface BellData {
  items: BellItem[];
  unread: number;
  /** Everything in the bell now (the panel shows the newest BELL_LIMIT). */
  total: number;
}

/** "19 Oct 2026", as the rest of the dashboard writes dates (components/ui formatDate). */
export function updateDate(at: Date): string {
  return at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function bellItem(item: UpdateItem): BellItem {
  return {
    key: item.key,
    kind: item.kind,
    kindLabel: UPDATE_KIND_LABEL[item.kind],
    topic: item.topic,
    title: item.title,
    summary: item.summary,
    lang: item.lang,
    date: updateDate(item.at),
    datetime: item.at.toISOString(),
    linkUrl: item.linkUrl,
    linkLabel: item.linkUrl ? (item.linkLabel ?? "Learn more") : null,
    tone: item.tone,
    app: item.app,
    unread: item.unread,
  };
}

export function bellData(updates: Updates): BellData {
  return { items: updates.current.slice(0, BELL_LIMIT).map(bellItem), unread: updates.unread, total: updates.current.length };
}

/** The person reading: the client, or our team member managing their dashboard (each has their own read state). */
export function readerOf(context: Pick<ClientContext, "user" | "staff" | "client" | "apps" | "account" | "licenses">): UpdatesReader {
  return {
    userId: (context.staff ?? context.user).id,
    clientId: context.client.id,
    apps: context.apps,
    // The whole account: a plan or app type audience matches when any of its apps does.
    subject: { state: context.account, license: null, app: null, licenses: context.licenses, apps: context.apps },
    // English until the dashboard follows the user's language (Phase 56).
    lang: "en",
  };
}
