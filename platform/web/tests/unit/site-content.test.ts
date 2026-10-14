import { describe, expect, it } from "vitest";
import { GUIDES } from "@/content/guides";
import { PRIVACY } from "@/content/legal";
import { fillValues, inlineText, markdownToHtml, parseInline, parseMarkdown, safeHref } from "@/lib/content/markdown";
import { CONTENT_PAGES, contentPage, contentWith, faqMarkdown, parseFaq, parseGuide, readContentForm } from "@/lib/content/site";
import { MemoryStore } from "@/lib/data/memory";
import { FAQ } from "@/lib/marketing";
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
    expect(groups.map((g) => g.items.map((i) => i.answer.map((b) => (b.t === "p" ? inlineText(b.c) : "")).join("")))).toEqual(
      FAQ.map((g) => g.items.map((i) => i.a)),
    );
  });

  it("splits a guide into introduction, checklist, steps with notes, and the end", () => {
    const doc = parseGuide(GUIDES.find((g) => g.slug === "custom-api")!.body);
    expect(doc.intro).toHaveLength(1);
    expect(doc.before?.title).toBe("Before you start");
    expect(doc.before?.items).toHaveLength(3);
    expect(doc.steps.map((s) => s.title)).toEqual(["Read the contract", "Start with what every app needs", "Add your app type's endpoints", "Check it from your dashboard"]);
    expect(doc.steps[3]!.notice).toHaveLength(1);
    expect(doc.outro.map((b) => (b.t === "p" ? inlineText(b.c) : ""))).toEqual([
      "Your next build talks to your API. If you change the address later, the next build uses the new one.",
    ]);
    // A rule inside the text before any step isn't the end.
    expect(parseGuide("Intro\n\n---\n\nMore intro\n\n## Step\n\nDo it").intro).toHaveLength(3);
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
    expect(readContentForm(contentPage("guide-videos")!, { title: "T", description: "D", body: "No steps" })).toMatchObject({ ok: false, errors: { body: "Add at least one ## step." } });
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
