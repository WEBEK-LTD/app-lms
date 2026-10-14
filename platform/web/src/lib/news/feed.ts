import { isPrivateAddress, resolveHost } from "../app/api-check";
import { sha256Hex } from "../crypto/tokens";
import { excerptOf, plainText } from "./html";
import type { NewsArticle, NewsCategoryInfo } from "./service";
import { childNamed, childrenNamed, localName, parseXml, serializeXml, textOf, XmlError, type XmlElement } from "./xml";

/**
 * 23 Articles from a website's RSS or Atom feed ("Your site's RSS feed"),
 * read with the same protections as the API check (lib/app/api-check.ts):
 * https only, never a private address, no redirects, 8 seconds at most, and
 * at most 2 MB. Feeds are parsed by lib/news/xml.ts.
 */

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
type Resolve = (host: string) => Promise<string[]>;

export const FEED_TIMEOUT_MS = 8000;
export const FEED_MAX_BYTES = 2 * 1024 * 1024;
/** Entries kept from a feed, newest first. */
export const FEED_MAX_ITEMS = 100;
/** Characters kept of an entry's body. */
export const FEED_MAX_BODY = 200_000;

export class FeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedError";
  }
}

export interface Feed {
  title: string;
  /** The website the feed belongs to. */
  link: string | null;
  articles: NewsArticle[];
  categories: NewsCategoryInfo[];
}

/** A short number made from a text: feed entries and categories have no numbers of their own. */
export function numericId(text: string): string {
  return String(Number.parseInt(sha256Hex(text).slice(0, 12), 16));
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

function httpUrl(value: string | null | undefined, base: string | null = null): string | null {
  const raw = (value ?? "").trim();
  if (!raw || raw.length > 2000) return null;
  try {
    const url = base ? new URL(raw, base) : new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Pictures must be https: the app's platforms refuse plain http. */
function httpsUrl(value: string | null | undefined, base: string | null = null): string | null {
  const url = httpUrl(value, base);
  return url?.startsWith("https://") ? url : null;
}

function date(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time) : null;
}

/** The HTML of an Atom text construct (type text, html or xhtml). */
function atomHtml(element: XmlElement | null): string {
  if (!element) return "";
  const type = (element.attributes.type ?? "text").toLowerCase();
  if (type === "xhtml") return serializeXml(element.children);
  if (type === "html" || type === "text/html") return textOf(element);
  return textOf(element)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

/** The first picture of an entry: its media, enclosure or thumbnail, else the first image in its body. */
function pictureOf(item: XmlElement, body: string, base: string | null): string | null {
  for (const media of [...childrenNamed(item, "media:content"), ...childrenNamed(item, "media:group").flatMap((g) => childrenNamed(g, "media:content"))]) {
    const medium = (media.attributes.medium ?? "").toLowerCase();
    const type = (media.attributes.type ?? "").toLowerCase();
    if (medium === "image" || type.startsWith("image/") || (!medium && !type)) {
      const url = httpsUrl(media.attributes.url, base);
      if (url) return url;
    }
  }
  for (const thumb of [...childrenNamed(item, "media:thumbnail"), ...childrenNamed(item, "media:group").flatMap((g) => childrenNamed(g, "media:thumbnail"))]) {
    const url = httpsUrl(thumb.attributes.url, base);
    if (url) return url;
  }
  for (const enclosure of childrenNamed(item, "enclosure")) {
    if ((enclosure.attributes.type ?? "").toLowerCase().startsWith("image/")) {
      const url = httpsUrl(enclosure.attributes.url, base);
      if (url) return url;
    }
  }
  for (const link of childrenNamed(item, "link")) {
    if ((link.attributes.rel ?? "") === "enclosure" && (link.attributes.type ?? "").toLowerCase().startsWith("image/")) {
      const url = httpsUrl(link.attributes.href, base);
      if (url) return url;
    }
  }
  // Only the first <img> tag is read, so a long body is scanned once.
  const at = body.search(/<img\b/i);
  if (at === -1) return null;
  const end = body.indexOf(">", at);
  const tag = body.slice(at, Math.min(end === -1 ? body.length : end, at + 4000));
  const img = /\ssrc\s*=\s*("([^"]*)"|'([^']*)')/i.exec(tag);
  return img ? httpsUrl((img[2] ?? img[3] ?? "").replace(/&amp;/g, "&"), base) : null;
}

interface Entry {
  key: string;
  title: string;
  url: string | null;
  publishedAt: Date | null;
  author: string | null;
  categories: string[];
  summary: string;
  body: string;
  imageUrl: string | null;
}

function rssEntry(item: XmlElement, base: string | null): Entry {
  const link = httpUrl(textOf(childNamed(item, "link")), base);
  const guid = clean(textOf(childNamed(item, "guid")));
  const description = textOf(childNamed(item, "description"));
  const encoded = textOf(childNamed(item, "content:encoded"));
  const body = encoded.trim() ? encoded : description;
  const author = clean(textOf(childNamed(item, "dc:creator")) || textOf(childNamed(item, "author")));
  return {
    key: guid || link || clean(textOf(childNamed(item, "title"))),
    title: plainText(textOf(childNamed(item, "title"))),
    url: link,
    publishedAt: date(textOf(childNamed(item, "pubDate"))) ?? date(textOf(childNamed(item, "dc:date"))),
    // RSS authors are often an email address with the name in brackets: "news@site.com (Name)".
    author: author ? (/\(([^)]+)\)\s*$/.exec(author)?.[1] ?? (author.includes("@") ? null : author)) : null,
    categories: [...childrenNamed(item, "category"), ...childrenNamed(item, "dc:subject")].map((c) => plainText(textOf(c))),
    summary: encoded.trim() ? description : "",
    body,
    imageUrl: pictureOf(item, body, base),
  };
}

function atomEntry(entry: XmlElement, base: string | null): Entry {
  const links = childrenNamed(entry, "link");
  const alternate = links.find((l) => (l.attributes.rel ?? "alternate") === "alternate") ?? null;
  const url = httpUrl(alternate?.attributes.href, base);
  const content = atomHtml(childNamed(entry, "content"));
  const summary = atomHtml(childNamed(entry, "summary"));
  const body = content || summary;
  return {
    key: clean(textOf(childNamed(entry, "id"))) || url || clean(textOf(childNamed(entry, "title"))),
    title: plainText(atomHtml(childNamed(entry, "title"))),
    url,
    publishedAt: date(textOf(childNamed(entry, "published"))) ?? date(textOf(childNamed(entry, "updated"))),
    author: clean(textOf(childNamed(childNamed(entry, "author") ?? { name: "", attributes: {}, children: [] }, "name"))) || null,
    categories: childrenNamed(entry, "category").map((c) => clean(c.attributes.label ?? c.attributes.term ?? "")),
    summary: content ? summary : "",
    body,
    imageUrl: pictureOf(entry, body, base),
  };
}

/** A feed's articles and categories, newest first. Throws FeedError when it isn't an RSS or Atom feed. */
export function parseFeed(xml: string): Feed {
  let root: XmlElement;
  try {
    root = parseXml(xml);
  } catch (e) {
    throw new FeedError(e instanceof XmlError ? "This address doesn't serve an RSS or Atom feed." : "The feed can't be read.");
  }
  const kind = localName(root);
  let title = "";
  let link: string | null = null;
  let entries: Entry[];
  if (kind === "rss" || kind === "rdf") {
    const channel = childNamed(root, "channel");
    title = plainText(textOf(channel ? childNamed(channel, "title") : null));
    link = httpUrl(textOf(channel ? childNamed(channel, "link") : null));
    // RSS 2.0 keeps entries in the channel, RSS 1.0 next to it.
    const items = [...(channel ? childrenNamed(channel, "item") : []), ...childrenNamed(root, "item")];
    entries = items.map((item) => rssEntry(item, link));
  } else if (kind === "feed") {
    title = plainText(atomHtml(childNamed(root, "title")));
    const alternate = childrenNamed(root, "link").find((l) => (l.attributes.rel ?? "alternate") === "alternate");
    link = httpUrl(alternate?.attributes.href);
    entries = childrenNamed(root, "entry").map((entry) => atomEntry(entry, link));
  } else {
    throw new FeedError("This address doesn't serve an RSS or Atom feed.");
  }

  const seen = new Set<string>();
  const categories = new Map<string, NewsCategoryInfo>();
  const articles: NewsArticle[] = [];
  for (const entry of entries) {
    if (!entry.title || !entry.key) continue;
    const id = numericId(`entry:${entry.key}`);
    if (seen.has(id)) continue;
    seen.add(id);
    const own: NewsCategoryInfo[] = [];
    for (const name of entry.categories.map((n) => n.slice(0, 60)).filter(Boolean)) {
      const key = name.toLowerCase();
      const category = categories.get(key) ?? { id: numericId(`category:${key}`), name };
      categories.set(key, category);
      if (!own.some((c) => c.id === category.id)) own.push(category);
    }
    articles.push({
      id,
      title: entry.title.slice(0, 300),
      excerpt: excerptOf(plainText(entry.summary || entry.body)),
      author: entry.author ? entry.author.slice(0, 80) : null,
      publishedAt: entry.publishedAt,
      imageUrl: entry.imageUrl,
      categories: own,
      url: entry.url,
      featured: false,
      // Bodies are cleaned on every request: a very long one is cut (the cleaner closes what it left open).
      body: entry.body.slice(0, FEED_MAX_BODY),
    });
  }
  // Newest first; entries without a date keep the feed's order after the dated ones.
  const order = new Map(articles.map((a, i) => [a.id, i]));
  articles.sort((a, b) => (b.publishedAt?.getTime() ?? -Infinity) - (a.publishedAt?.getTime() ?? -Infinity) || order.get(a.id)! - order.get(b.id)!);
  const kept = articles.slice(0, FEED_MAX_ITEMS);
  const used = new Set(kept.flatMap((a) => a.categories.map((c) => c.id)));
  return { title: title || "Feed", link, articles: kept, categories: [...categories.values()].filter((c) => used.has(c.id)) };
}

/** Reads up to `max` bytes of a response; throws FeedError when there's more. */
async function readLimited(response: Response, max: number): Promise<string> {
  const length = Number(response.headers.get("content-length") ?? "");
  if (Number.isFinite(length) && length > max) throw new FeedError("The feed is larger than 2 MB.");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => undefined);
      throw new FeedError("The feed is larger than 2 MB.");
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

/** Whether a feed address may be read: https, no user name or password, a public host name. */
export function feedUrlProblem(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return "Enter the full address of your feed, starting with https://";
  }
  if (url.protocol !== "https:") return "The feed's address must start with https://";
  if (url.username || url.password) return "The feed's address can't contain a user name or password.";
  if (url.port && url.port !== "443") return "The feed must be on the usual https port.";
  return null;
}

/** Fetches and parses a feed. Throws FeedError with a message for the owner when it can't. */
export async function readFeed(feedUrl: string, options: { fetcher?: Fetch; resolve?: Resolve } = {}): Promise<Feed> {
  const problem = feedUrlProblem(feedUrl);
  if (problem) throw new FeedError(problem);
  const url = new URL(feedUrl.trim());
  const resolve = options.resolve ?? resolveHost;
  let addresses: string[];
  try {
    addresses = await resolve(url.hostname);
  } catch {
    throw new FeedError("This address can't be found.");
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) throw new FeedError("This address points to a private network.");
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(url.toString(), {
      redirect: "error",
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      headers: { accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.1" },
    });
  } catch {
    throw new FeedError("No answer within 8 seconds, or the feed's address redirected. Use the feed's final address.");
  }
  if (response.status !== 200) throw new FeedError(`The feed answered with an error (${response.status}).`);
  return parseFeed(await readLimited(response, FEED_MAX_BYTES));
}
