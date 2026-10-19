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

/**
 * 56 The bell's words in the dashboard's language: the chips, the dates, and
 * the account items (saved or made in English) translated when known
 * (lib/dashboard-lang.ts `bellWords`). English by default.
 */
export interface BellWords {
  lang: "en" | "ar" | "tr";
  /** An English text from the account items, in the language when known. */
  k: (english: string) => string;
  date: (at: Date) => string;
  kind: (kind: UpdateItem["kind"]) => string;
}

export const ENGLISH_BELL: BellWords = { lang: "en", k: (text) => text, date: updateDate, kind: (kind) => UPDATE_KIND_LABEL[kind] };

/** An item's texts in the dashboard's language: account items are translated, announcements already are (or fall back to English). */
export function itemWords(item: UpdateItem, words: BellWords): Pick<UpdateItem, "title" | "body" | "summary" | "lang" | "linkLabel"> {
  const account = item.kind === "account";
  const translated = (text: string) => (account ? words.k(text) : text);
  const title = translated(item.title);
  return {
    title,
    body: translated(item.body),
    summary: translated(item.summary),
    // An account item is in the dashboard's language once its title is.
    lang: account ? (title !== item.title || words.lang === "en" ? words.lang : "en") : item.lang,
    linkLabel: item.linkUrl ? (item.linkLabel ? translated(item.linkLabel) : words.k("Learn more")) : null,
  };
}

export function bellItem(item: UpdateItem, words: BellWords = ENGLISH_BELL): BellItem {
  const text = itemWords(item, words);
  return {
    key: item.key,
    kind: item.kind,
    kindLabel: words.kind(item.kind),
    topic: item.topic,
    title: text.title,
    summary: text.summary,
    lang: text.lang,
    date: words.date(item.at),
    datetime: item.at.toISOString(),
    linkUrl: item.linkUrl,
    linkLabel: text.linkLabel,
    tone: item.tone,
    app: item.app,
    unread: item.unread,
  };
}

export function bellData(updates: Updates, words: BellWords = ENGLISH_BELL): BellData {
  return { items: updates.current.slice(0, BELL_LIMIT).map((item) => bellItem(item, words)), unread: updates.unread, total: updates.current.length };
}

/** The person reading: the client, or our team member managing their dashboard (each has their own read state). */
export function readerOf(context: Pick<ClientContext, "user" | "staff" | "client" | "apps" | "account" | "licenses">, lang = "en"): UpdatesReader {
  return {
    userId: (context.staff ?? context.user).id,
    clientId: context.client.id,
    apps: context.apps,
    // The whole account: a plan or app type audience matches when any of its apps does.
    subject: { state: context.account, license: null, app: null, licenses: context.licenses, apps: context.apps },
    // 56 The dashboard's language: announcements written in it show in it, else in English.
    lang,
  };
}
