import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import path from "node:path";
import { DOCS, GUIDE_REDIRECTS, docBySlug } from "@/content/docs";
import { PRIVACY } from "@/content/legal";
import { fillValues, headingId, inlineText, markdownToHtml, parseInline, parseMarkdown, safeHref } from "@/lib/content/markdown";
import { CONTENT_PAGES, contentPage, contentWith, faqMarkdown, parseFaq, parseGuide, readContentForm } from "@/lib/content/site";
import { MemoryStore } from "@/lib/data/memory";
import { APP_SCREENS, COMPARISON, DASHBOARD_SCREENS, FAQ, FEATURE_GROUPS, INTEGRATION_GROUPS, SOLUTIONS } from "@/lib/marketing";
import { NOW } from "./helpers";

describe("website content Markdown", () => {
  it("reads paragraphs, headings, lists, notes and rules", () => {
    expect(parseMarkdown("Intro line one\nline two\n\n## Title\n\n- one\n- **two**\n\n1. first\n2. second\n\n> A note\n\n---\n\nEnd")).toEqual([
      { t: "p", c: [{ t: "text", v: "Intro line one line two" }] },
      { t: "h", level: 2, c: [{ t: "text", v: "Title" }] },
      { t: "ul", items: [[{ t: "text", v: "one" }], [{ t: "strong", c: [{ t: "text", v: "two" }] }]] },
      { t: "ol", start: 1, items: [[{ t: "text", v: "first" }], [{ t: "text", v: "second" }]] },
      { t: "quote", blocks: [{ t: "p", c: [{ t: "text", v: "A note" }] }] },
      { t: "hr" },
      { t: "p", c: [{ t: "text", v: "End" }] },
    ]);
  });

  it("keeps snake_case and code as they are", () => {
    expect(inlineText(parseInline("per_page and `<access_token>` and *em*"))).toBe("per_page and <access_token> and em");
  });

  it("never outputs HTML from the text, and only opens safe links", () => {
    const html = markdownToHtml('<script>alert(1)</script> [x](javascript:alert(1)) [ok](https://yallapp.com.tr) [page](/pricing) "q"', "https://yallapp.test");
    expect(html).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt; x <a href="https://yallapp.com.tr">ok</a> <a href="https://yallapp.test/pricing">page</a> &quot;q&quot;</p>',
    );
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("//evil.test")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
    expect(safeHref("mailto:info@yallapp.com.tr")).toBe("mailto:info@yallapp.com.tr");
  });

  it("keeps code blocks as they are", () => {
    const blocks = parseMarkdown('Before\n~~~json\n{ "a": "<b>",\n  "## not": "a heading" }\n~~~\n\n```\nplain\n```\nAfter');
    expect(blocks).toEqual([
      { t: "p", c: [{ t: "text", v: "Before" }] },
      { t: "pre", lang: "json", v: '{ "a": "<b>",\n  "## not": "a heading" }' },
      { t: "pre", lang: "", v: "plain" },
      { t: "p", c: [{ t: "text", v: "After" }] },
    ]);
    expect(markdownToHtml("~~~\n<script>x</script>\n~~~")).toBe("<pre><code>&lt;script&gt;x&lt;/script&gt;</code></pre>");
    // An unclosed block runs to the end of the text.
    expect(parseMarkdown("~~~\nopen")).toEqual([{ t: "pre", lang: "", v: "open" }]);
  });

  it("makes heading anchors from their words", () => {
    expect(headingId("Before you start")).toBe("before-you-start");
    expect(headingId("The sign-in flow, simply")).toBe("the-sign-in-flow-simply");
    expect(headingId("Çağrı & Şule")).toBe("cagr-sule");
  });

  it("fills only the values it's given", () => {
    expect(fillValues("Mail {{contact_email}} or {{other}}", { contact_email: "a@b.test" })).toBe("Mail a@b.test or {{other}}");
  });
});

describe("website content pages", () => {
  it("has a default for every field, and unique keys", () => {
    expect(new Set(CONTENT_PAGES.map((p) => p.key)).size).toBe(CONTENT_PAGES.length);
    for (const page of CONTENT_PAGES) {
      for (const field of page.fields) expect(page.defaults[field.name], `${page.key}.${field.name}`).toBeTruthy();
      // The defaults pass the admin's own checks.
      expect(readContentForm(page, page.defaults).ok, page.key).toBe(true);
    }
  });

  it("falls back to the default text for pages and fields without an edit", () => {
    const home = contentPage("home")!;
    expect(contentWith(home, null)).toEqual(home.defaults);
    expect(contentWith(home, { title: "Apps for academies", intro: "  ", unknown: "x" })).toEqual({ ...home.defaults, title: "Apps for academies" });
  });

  it("turns the FAQ in code into Markdown and back into the same questions", () => {
    const groups = parseFaq(faqMarkdown(FAQ));
    expect(groups.map((g) => g.title)).toEqual(FAQ.map((g) => g.title));
    expect(groups.map((g) => g.items.map((i) => i.question))).toEqual(FAQ.map((g) => g.items.map((i) => i.q)));
    expect(groups.map((g) => g.items.map((i) => i.answer))).toEqual(FAQ.map((g) => g.items.map((i) => parseMarkdown(i.a))));
    // Ten topics, from getting started to support.
    expect(groups).toHaveLength(10);
    expect(groups.flatMap((g) => g.items).length).toBeGreaterThanOrEqual(40);
  });

  it("splits an article into introduction, checklist, sections with notes, and the end", () => {
    const doc = parseGuide(docBySlug("my-own-api")!.body);
    expect(doc.intro).toHaveLength(1);
    expect(doc.before?.title).toBe("Before you start");
    expect(doc.before?.items).toHaveLength(4);
    expect(doc.steps.map((s) => s.title)).toEqual([
      "What \"your website serves the Yallapp API\" means",
      "Build the endpoints in this order",
      "Start with GET /config",
      "The sign-in flow, simply",
      // 34
      "Let Yallapp sign people in",
      // 100.7
      "Sell in the app",
      "Content, with an example",
      "Errors",
      "Images and HTML",
      "Test it with the live check",
      "Let the app preview reach your API",
      "Checklist before you submit",
    ]);
    // Code blocks stay in their section; notes go to the section's note box.
    expect(doc.steps[2]!.body.some((b) => b.t === "pre" && b.lang === "json" && b.v.includes('"update_required": false'))).toBe(true);
    expect(doc.steps[1]!.notice).toHaveLength(1);
    expect(doc.outro).toHaveLength(1);
    // A rule inside the text before any section isn't the end.
    expect(parseGuide("Intro\n\n---\n\nMore intro\n\n## Step\n\nDo it").intro).toHaveLength(3);
  });

  it("has every documentation article in the admin, and every old guide address goes to one", () => {
    expect(new Set(DOCS.map((d) => d.slug)).size).toBe(DOCS.length);
    for (const article of DOCS) {
      const page = contentPage(article.key)!;
      expect(page.path, article.slug).toBe(`/docs/${article.slug}`);
      expect(page.group).toBe("Guides");
      expect(parseGuide(article.body).steps.length, article.slug).toBeGreaterThan(0);
    }
    for (const target of Object.values(GUIDE_REDIRECTS)) expect(docBySlug(target), target).toBeDefined();
    // Articles that were guides keep their key, so the team's edits still show.
    expect(docBySlug("google-play")!.key).toBe("guide-google-play");
    expect(docBySlug("my-own-api")!.key).toBe("guide-custom-api");
  });

  it("links only to pages and articles that exist", () => {
    const appDir = path.resolve(__dirname, "../../src/app");
    const routes = new Set<string>();
    const walk = (dir: string, route: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const segment = entry.name.startsWith("(") ? "" : `/${entry.name}`;
        const child = path.join(dir, entry.name);
        if (readdirSync(child).some((f) => f === "page.tsx" || f === "route.ts")) routes.add(`${route}${segment}` || "/");
        walk(child, `${route}${segment}`);
      }
    };
    walk(appDir, "");
    routes.add("/");
    const exists = (href: string) => {
      const [pathname] = href.split(/[?#]/);
      if (pathname === "/developers/openapi.yaml") return true;
      if (pathname!.startsWith("/docs/")) return Boolean(docBySlug(pathname!.slice(6)));
      if (pathname!.startsWith("/solutions/")) return SOLUTIONS.some((s) => `/solutions/${s.id}` === pathname);
      return routes.has(pathname!) || pathname!.startsWith("/dashboard");
    };
    const links = (source: string) => [...source.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1]!);
    const all = [
      ...DOCS.flatMap((d) => links(d.body)),
      ...FAQ.flatMap((g) => g.items.flatMap((i) => links(i.a))),
      ...SOLUTIONS.flatMap((s) => s.docs.map((d) => d.href)),
      ...INTEGRATION_GROUPS.flatMap((g) => g.items.flatMap((i) => (i.docs ? [i.docs] : []))),
    ];
    expect(all.length).toBeGreaterThan(50);
    expect(all.filter((href) => !exists(href))).toEqual([]);
  });

  it("names only screenshots that ship, and only true comparisons", () => {
    const screens = new Set(readdirSync(path.resolve(__dirname, "../../public/screens")));
    for (const name of [...APP_SCREENS, ...DASHBOARD_SCREENS]) expect(screens.has(`${name}.png`), name).toBe(true);
    for (const group of FEATURE_GROUPS) for (const s of group.screens) expect(screens.has(`${s}.png`), s).toBe(true);
    for (const row of COMPARISON) expect(row.yallapp.length).toBeGreaterThan(0);
  });

  it("never names the technology behind Yallapp on public pages", () => {
    const publicText = JSON.stringify([
      CONTENT_PAGES.filter((p) => p.group !== "Legal pages").map((p) => p.defaults),
      SOLUTIONS,
      INTEGRATION_GROUPS,
      FEATURE_GROUPS,
      COMPARISON,
      FAQ,
      contentPage("privacy")!.defaults,
    ]);
    for (const word of ["Netlify", "Next.js", "GitHub", "MySQL", "MariaDB", "cPanel", "host.webek.org", "files.yallapp", "Flutter", "Vercel", "Drizzle", "Apache"]) {
      expect(publicText.toLowerCase(), word).not.toContain(word.toLowerCase());
    }
  });

  it("checks the admin's form", () => {
    const privacy = contentPage("privacy")!;
    const ok = readContentForm(privacy, { title: " Privacy  policy ", updated: "1 May 2027", body: "## 1. Us\n\nMail [{{contact_email}}](mailto:{{contact_email}})" });
    expect(ok).toEqual({ ok: true, fields: { title: "Privacy policy", updated: "1 May 2027", body: "## 1. Us\n\nMail [{{contact_email}}](mailto:{{contact_email}})\n" } });
    expect(readContentForm(privacy, { title: "", updated: "x", body: "<b>Bold</b> {{name}}" })).toEqual({
      ok: false,
      errors: { title: "Enter the title.", body: "HTML isn't allowed. Use Markdown for bold text and links." },
    });
    expect(readContentForm(privacy, { title: "T", updated: "x", body: "Hello {{name}}" })).toMatchObject({ ok: false, errors: { body: "{{name}} isn't a value this page can show." } });
    // Contact values are for the legal pages only.
    expect(readContentForm(contentPage("home")!, { ...contentPage("home")!.defaults, title: "{{contact_email}}" })).toMatchObject({ ok: false });
    expect(readContentForm(contentPage("faq")!, { ...contentPage("faq")!.defaults, entries: "Just text" })).toMatchObject({
      ok: false,
      errors: { entries: "Add at least one ## group with a ### question." },
    });
    expect(readContentForm(contentPage("guide-videos")!, { title: "T", description: "D", body: "No steps" })).toMatchObject({ ok: false, errors: { body: "Add at least one ## section." } });
    // Tags in code blocks are shown as they are; outside them they're refused.
    const article = contentPage("doc-getting-started")!;
    expect(readContentForm(article, { title: "T", description: "D", body: "## Example\n\n~~~html\n<div>Hi</div>\n~~~\n" }).ok).toBe(true);
    expect(readContentForm(article, { title: "T", description: "D", body: "## Example\n\n~~~\nok\n~~~\n\n<div>Hi</div>\n" })).toMatchObject({ ok: false });
  });

  it("keeps the legal pages' contact details as values", () => {
    expect(PRIVACY.body).toContain("[{{contact_email}}](mailto:{{contact_email}})");
    expect(PRIVACY.body).not.toContain("info@yallapp.com.tr");
  });

  it("stores an edit per page, and removing it goes back to the defaults", async () => {
    const store = new MemoryStore();
    await store.setSiteContent("home", { title: "Apps for academies" }, "admin@yallapp.test", NOW);
    expect(await store.getSiteContent("home")).toEqual({ key: "home", fields: { title: "Apps for academies" }, updatedAt: NOW, updatedBy: "admin@yallapp.test" });
    expect(await store.listSiteContent()).toHaveLength(1);
    await store.setSiteContent("home", null, "admin@yallapp.test", NOW);
    expect(await store.getSiteContent("home")).toBeNull();
  });
});
