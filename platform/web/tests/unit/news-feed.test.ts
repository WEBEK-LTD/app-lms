import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { platformDefinition } from "@/lib/hosted/connectors/registry";
import { clearFeedCache, FeedConnector, FEED_CACHE_MS } from "@/lib/hosted/connectors/rss";
import { ConnectorError } from "@/lib/hosted/connectors/types";
import { FEED_MAX_BYTES, FeedError, numericId, parseFeed, readFeed } from "@/lib/news/feed";
import { articleBody, excerptOf, plainText } from "@/lib/news/html";
import { parseXml, textOf, XmlError } from "@/lib/news/xml";
import { expectContract } from "./contract";

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<!-- a comment -->
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>The Harbour Post</title>
  <link>https://harbour.test/</link>
  <item>
    <title>Old market &amp; hall reopens</title>
    <link>https://harbour.test/market</link>
    <guid isPermaLink="false">https://harbour.test/?p=12</guid>
    <pubDate>Mon, 12 Oct 2026 08:00:00 +0000</pubDate>
    <dc:creator><![CDATA[Kerem Aydın]]></dc:creator>
    <category><![CDATA[Food]]></category>
    <category>City</category>
    <description><![CDATA[<p>Forty stalls are back.</p>]]></description>
    <content:encoded><![CDATA[<p>Forty stalls are back.</p><p><img src="https://harbour.test/market.jpg" alt=""></p><iframe src="https://player.vimeo.com/video/1" width="640" height="360"></iframe>]]></content:encoded>
  </item>
  <item>
    <title>Night ferries return</title>
    <link>https://harbour.test/ferries</link>
    <guid>https://harbour.test/?p=14</guid>
    <pubDate>Tue, 13 Oct 2026 08:00:00 +0000</pubDate>
    <author>news@harbour.test (Ayla Demir)</author>
    <category>city</category>
    <media:content url="https://cdn.harbour.test/ferry.jpg" medium="image" />
    <description>Boats every 40 minutes &lt;b&gt;until 1:00&lt;/b&gt;.</description>
  </item>
  <item>
    <title></title>
    <description>No title: left out.</description>
  </item>
</channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title type="text">Ghost blog</title>
  <link rel="alternate" href="https://blog.test/"/>
  <link rel="self" href="https://blog.test/rss/"/>
  <entry>
    <title type="html">Five &lt;em&gt;books&lt;/em&gt;</title>
    <id>tag:blog.test,2026:books</id>
    <link rel="alternate" href="https://blog.test/books/"/>
    <published>2026-10-10T09:00:00Z</published>
    <author><name>Deniz Arslan</name></author>
    <category term="culture" label="Culture"/>
    <summary type="text">Short novels and essays.</summary>
    <content type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml"><p>Read <strong>these</strong>.</p><img src="https://blog.test/b.png"/></div></content>
  </entry>
</feed>`;

describe("23 the feed reader's XML parser", () => {
  it("reads elements, entities and CDATA, and never expands a document type's entities", () => {
    const root = parseXml('<!DOCTYPE r [<!ENTITY boom "BOOM">]><r a="1 &amp; 2"><x>&lt;&#65;&#x42;&boom;</x><![CDATA[<raw>]]></r>');
    expect(root.name).toBe("r");
    expect(root.attributes).toEqual({ a: "1 & 2" });
    expect(textOf(root)).toBe("<AB&boom;<raw>");
  });

  it("refuses documents nested too deeply or with too many elements, and non-documents", () => {
    expect(() => parseXml("<a>".repeat(100))).toThrow(XmlError);
    expect(() => parseXml("<a>" + "<b/>".repeat(50_001) + "</a>")).toThrow(XmlError);
    expect(() => parseXml("just text")).toThrow(XmlError);
  });

  it("reads a large broken document quickly", () => {
    const started = Date.now();
    parseXml(`<a>${"<b x='".repeat(20_000)}${" ".repeat(200_000)}</a>`);
    expect(Date.now() - started).toBeLessThan(2000);
  });
});

describe("23 RSS and Atom feeds", () => {
  it("reads RSS 2.0: newest first, authors, sections, pictures and bodies", () => {
    const feed = parseFeed(RSS);
    expect(feed.title).toBe("The Harbour Post");
    expect(feed.articles.map((a) => a.title)).toEqual(["Night ferries return", "Old market & hall reopens"]);
    const [ferry, market] = feed.articles;
    expect(ferry).toMatchObject({
      id: numericId("entry:https://harbour.test/?p=14"),
      author: "Ayla Demir",
      url: "https://harbour.test/ferries",
      imageUrl: "https://cdn.harbour.test/ferry.jpg",
      publishedAt: new Date("2026-10-13T08:00:00Z"),
      excerpt: "Boats every 40 minutes until 1:00.",
      featured: false,
    });
    expect(market).toMatchObject({ author: "Kerem Aydın", imageUrl: "https://harbour.test/market.jpg", excerpt: "Forty stalls are back." });
    expect(market!.body).toContain("<iframe");
    // Sections by name, whatever their case; only those with articles.
    expect(feed.categories.map((c) => c.name)).toEqual(["Food", "City"]);
    expect(ferry!.categories.map((c) => c.name)).toEqual(["City"]);
    expect(/^\d{1,15}$/.test(ferry!.id)).toBe(true);
  });

  it("reads Atom, with XHTML content", () => {
    const feed = parseFeed(ATOM);
    expect(feed).toMatchObject({ title: "Ghost blog", link: "https://blog.test/" });
    expect(feed.articles).toHaveLength(1);
    const [books] = feed.articles;
    expect(books).toMatchObject({ title: "Five books", author: "Deniz Arslan", url: "https://blog.test/books/", imageUrl: "https://blog.test/b.png", excerpt: "Short novels and essays." });
    expect(books!.categories.map((c) => c.name)).toEqual(["Culture"]);
    expect(articleBody(books!.body).html).toBe('<p>Read <strong>these</strong>.</p><img src="https://blog.test/b.png" alt="">');
  });

  it("reads RSS 1.0 and refuses other documents", () => {
    const rdf = parseFeed(
      '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/"><channel><title>Old</title></channel><item><title>One</title><link>https://old.test/1</link></item></rdf:RDF>',
    );
    expect(rdf.articles.map((a) => a.title)).toEqual(["One"]);
    expect(() => parseFeed("<html><body>Not a feed</body></html>")).toThrow(FeedError);
    expect(() => parseFeed("")).toThrow(FeedError);
  });
});

describe("23 reading a feed safely", () => {
  const publicHost = async () => ["93.184.216.34"];
  const answer = (body: string, init: ResponseInit = {}) => async () => new Response(body, { status: 200, ...init });

  it("reads https feeds on public addresses, without following redirects", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const feed = await readFeed("https://harbour.test/feed", {
      resolve: publicHost,
      fetcher: async (url, init) => {
        calls.push({ url, init });
        return new Response(RSS);
      },
    });
    expect(feed.articles).toHaveLength(2);
    expect(calls[0]!.url).toBe("https://harbour.test/feed");
    expect(calls[0]!.init?.redirect).toBe("error");
    expect(calls[0]!.init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("refuses http, credentials, other ports and private addresses", async () => {
    const fetcher = answer(RSS);
    await expect(readFeed("http://harbour.test/feed", { resolve: publicHost, fetcher })).rejects.toThrow(/https/);
    await expect(readFeed("https://me:pw@harbour.test/feed", { resolve: publicHost, fetcher })).rejects.toThrow(/user name/);
    await expect(readFeed("https://harbour.test:8443/feed", { resolve: publicHost, fetcher })).rejects.toThrow(/port/);
    for (const address of ["127.0.0.1", "10.0.0.8", "192.168.1.2", "169.254.169.254", "::1", "fd00::1"]) {
      await expect(readFeed("https://harbour.test/feed", { resolve: async () => [address], fetcher })).rejects.toThrow(/private network/);
    }
    await expect(readFeed("https://harbour.test/feed", { resolve: async () => ["93.184.216.34", "10.0.0.1"], fetcher })).rejects.toThrow(/private network/);
  });

  it("refuses redirects, errors and feeds over 2 MB", async () => {
    await expect(
      readFeed("https://harbour.test/feed", {
        resolve: publicHost,
        fetcher: async () => {
          throw new TypeError("fetch failed: redirect mode is set to error");
        },
      }),
    ).rejects.toThrow(/redirected/);
    await expect(readFeed("https://harbour.test/feed", { resolve: publicHost, fetcher: answer("Not found", { status: 404 }) })).rejects.toThrow(/\(404\)/);
    await expect(
      readFeed("https://harbour.test/feed", { resolve: publicHost, fetcher: answer("x", { headers: { "content-length": String(FEED_MAX_BYTES + 1) } }) }),
    ).rejects.toThrow(/2 MB/);
    const big = `<rss><channel>${" ".repeat(FEED_MAX_BYTES)}</channel></rss>`;
    await expect(readFeed("https://harbour.test/feed", { resolve: publicHost, fetcher: answer(big) })).rejects.toThrow(/2 MB/);
  });
});

describe("23 the RSS feed connector", () => {
  let store: MemoryStore;
  let fetched: number;
  let now: number;
  let body: string;

  beforeEach(() => {
    clearFeedCache();
    store = new MemoryStore();
    fetched = 0;
    now = Date.parse("2026-10-14T10:00:00Z");
    body = RSS;
  });

  const connector = () =>
    new FeedConnector("https://harbour.test/feed", {
      appId: "app-1",
      store,
      resolve: async () => ["93.184.216.34"],
      now: () => now,
      fetcher: async () => {
        fetched += 1;
        return new Response(body);
      },
    });

  const get = (path: string, query: Record<string, string> = {}) =>
    connector().handle({ method: "GET", path: path.split("/").filter(Boolean), query: new URLSearchParams(query), body: null, user: null, now: new Date(now) });

  it("serves the News endpoints from the feed, read at most every 5 minutes", async () => {
    const home = (await get("news/home"))!;
    expectContract("GET", "/news/home", home);
    // A feed has no top stories: the newest are featured.
    expect((home.body as { featured: { title: string }[]; latest: unknown[] }).featured.map((a) => a.title)).toEqual(["Night ferries return", "Old market & hall reopens"]);
    const categories = (await get("news/categories"))!;
    expectContract("GET", "/news/categories", categories);
    expect((categories.body as { items: { name: string; count: number }[] }).items.map((c) => [c.name, c.count])).toEqual([
      ["Food", 1],
      ["City", 2],
    ]);
    const list = (await get("news/articles", { search: "market" }))!;
    expectContract("GET", "/news/articles", list);
    const id = (list.body as { items: { id: string }[] }).items[0]!.id;
    const detail = (await get(`news/articles/${id}`))!;
    expectContract("GET", "/news/articles/{article_id}", detail);
    expect(detail.body).toMatchObject({ url: "https://harbour.test/market", embeds: [{ provider: "vimeo", aspect_ratio: 1.7778 }] });
    expect(fetched).toBe(1);
    now += FEED_CACHE_MS + 1;
    await get("news/home");
    expect(fetched).toBe(2);
    expect(await connector().config()).toEqual({ news: { show_author: true, show_dates: true, breaking_news_push: false } });
  });

  it("checks the feed before it's saved, and says what's wrong", async () => {
    expect(await connector().check()).toBe("The Harbour Post");
    body = "<rss><channel><title>Empty</title></channel></rss>";
    await expect(connector().check()).rejects.toThrow(/no articles/);
    body = "<html></html>";
    const error = await connector()
      .check()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConnectorError);
    const definition = platformDefinition("rss")!;
    expect(definition).toMatchObject({ appType: "news", name: "RSS feed" });
    expect(definition.explain?.(error)).toBe("We couldn't read your feed: This address doesn't serve an RSS or Atom feed.");
    expect(definition.normalize({ feedUrl: " https://harbour.test/feed " })).toEqual({ values: { feedUrl: "https://harbour.test/feed" } });
    expect(definition.normalize({ feedUrl: "http://harbour.test/feed" })).toMatchObject({ errors: { feedUrl: expect.stringMatching(/https/) } });
  });
});

describe("23 article text", () => {
  it("makes plain text and excerpts safely", () => {
    expect(plainText("<p>A &amp; B</p><script>x()</script><p>C&nbsp;D</p>")).toBe("A & B C D");
    expect(excerptOf("word ".repeat(100), 30)).toBe("word word word word word word…");
    expect(excerptOf("  ")).toBeNull();
    const started = Date.now();
    plainText("<script>".repeat(50_000));
    articleBody("<a ".repeat(50_000) + " ".repeat(100_000));
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it("keeps only web pages as embeds and safe links", () => {
    const body = articleBody('<iframe src="javascript:alert(1)"></iframe><iframe data-src="//www.youtube.com/embed/x"></iframe><a href="javascript:x">bad</a><a href="https://ok.test">ok</a>');
    expect(body.embeds.map((e) => [e.placeholder, e.src, e.provider])).toEqual([["yallapp-embed-1", "https://www.youtube.com/embed/x", "youtube"]]);
    expect(body.html).toBe('<div data-yallapp-embed="yallapp-embed-1"></div><a>bad</a><a href="https://ok.test">ok</a>');
  });
});
