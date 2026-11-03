import { describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import type { Mail, Mailer } from "@/lib/mail";
import { accountMatches, cleanAudience, resolveAudience } from "@/lib/mailing/audience";
import { BRAND_THEME, emptyContent, newBlock, validDoc, MAIL_BLOCK_TYPES } from "@/lib/mailing/blocks";
import {
  buildRecipientMail,
  buildTestMail,
  campaignProblems,
  cancelMailCampaign,
  cleanContents,
  contentFor,
  duplicateCampaign,
  MAIL_LEASE_MS,
  runMailCampaigns,
  startMailCampaign,
} from "@/lib/mailing/campaigns";
import { marketingAllowed, recipientOfToken, resubscribe, setMarketingAllowed, unsubscribeRecipient } from "@/lib/mailing/consent";
import { applyMergeTags, firstNameOf, unknownMergeTags } from "@/lib/mailing/merge";
import { mirrorArrows, renderContent, renderDoc, renderHtmlMode, side } from "@/lib/mailing/render";
import { htmlToText, safeUrl, sanitizeCss, sanitizeHtml } from "@/lib/mailing/sanitize";
import { MAIL_TEMPLATES, templateContent } from "@/lib/mailing/templates";
import { addOpenPixel, clickSignature, linksOf, mailLinks, readRecipientToken, recipientToken, trackLinks, validClick } from "@/lib/mailing/tokens";
import type { MailCampaign, MailContent } from "@/lib/mailing/types";
import { days, KEY, NOW } from "./helpers";

const SECRET = "test-signing-secret-0123456789abcdef0123456789";
const BASE = "https://app.yallapp.test";

function content(patch: Partial<MailContent> = {}): MailContent {
  return { ...emptyContent("en"), subject: "Hello {{first_name|there}}", preview: "A preview", ...patch };
}

function campaign(patch: Partial<MailCampaign> = {}): MailCampaign {
  return {
    id: "c0000000-0000-4000-8000-000000000001",
    name: "October news",
    status: "draft",
    archived: false,
    audience: {},
    segmentId: null,
    fromName: "Yallapp",
    replyTo: null,
    contents: { en: content() },
    defaultLang: "en",
    track: true,
    perMinute: 60,
    scheduledAt: null,
    timeZone: null,
    recipients: 0,
    createdBy: "admin@yallapp.test",
    createdAt: NOW,
    updatedAt: NOW,
    startedAt: null,
    finishedAt: null,
    ...patch,
  };
}

/** A mailer that keeps what it sends; `fail` decides per address. */
function fakeMailer(fail: (to: string) => Error | null = () => null) {
  const sent: Mail[] = [];
  const mailer: Mailer = {
    async send(mail) {
      const error = fail(mail.to);
      if (error) throw error;
      sent.push(mail);
    },
    close() {},
  };
  return { sent, mailer };
}

async function people(store: MemoryStore, list: { email: string; plan?: "starter" | "pro" | null; lang?: string; country?: string; appType?: App["appType"]; section?: "regular" | "studio"; lastSignIn?: Date | null }[]) {
  const out = [];
  for (const p of list) {
    const { user, client } = await registerClient(store, { name: `${p.email.split("@")[0]} Person`, email: p.email, whatsapp: "+905446731942", siteUrl: "https://a.test", password: null, country: p.country ?? null }, NOW);
    if (p.lang) await store.updateUser(user.id, { language: p.lang }, NOW);
    if (p.lastSignIn !== undefined) await store.updateUser(user.id, { lastSignInAt: p.lastSignIn }, NOW);
    if (p.plan) await activateClient(store, { clientId: client.id, plan: p.plan, activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    if (p.appType) await store.createApp({ id: `app-${p.email}`, clientId: client.id, appType: p.appType, section: p.section ?? "regular", appName: `${p.email.split("@")[0]} App` } as App);
    out.push({ user, client });
  }
  return out;
}

describe("114 sanitizer", () => {
  it("drops scripts, handlers, forms, frames and dangerous links", () => {
    const html = sanitizeHtml(
      `<p onclick="x()">Hi<script>alert(1)</script></p><img src="javascript:alert(1)" onerror="x"><a href="jav&#x61;script:alert(1)">a</a><a href=" https://ok.test/x" target="_blank">b</a><form action="/x"><input name="q"><button>Go</button>text</form><iframe src="https://e.test"></iframe><svg><script>1</script></svg><style>@import url(x.css); body{background:url(javascript:x)}</style><base href="https://evil.test"><meta http-equiv="refresh" content="0;url=https://evil.test">`,
    );
    expect(html).not.toMatch(/script|onclick|onerror|<form|<input|<button|<iframe|<svg|@import|javascript|<base|refresh/i);
    expect(html).toContain('<a href="https://ok.test/x" target="_blank" rel="noopener noreferrer">b</a>');
    expect(html).toContain("text");
    expect(html).toContain("<p>Hi</p>");
  });

  it("keeps email HTML: tables, inline styles, Outlook's conditional comments, merge-tag links", () => {
    const html = sanitizeHtml(`<!DOCTYPE html><html><body><!--[if mso]><table><tr><td><![endif]--><table width="600" cellpadding="0" style="color:#000"><tr><td bgcolor="#fff" align="center"><a href="{{sign_in_link}}">Go</a></td></tr></table><!--[if mso]></td></tr></table><![endif]--><!-- a note --></body></html>`);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<table width="600" cellpadding="0" style="color:#000">');
    expect(html).toContain("<!--[if mso]>");
    expect(html).toContain("<![endif]-->");
    expect(html).toContain('href="{{sign_in_link}}"');
    expect(html).not.toContain("a note");
  });

  it("the inline profile keeps only text formatting", () => {
    expect(sanitizeHtml('<p style="color:red">A <b>bold</b> <a href="https://x.test">link</a></p><table><tr><td>cell</td></tr></table><img src="https://x.test/a.png">', "inline")).toBe(
      '<p style="color:red">A <b>bold</b> <a href="https://x.test">link</a></p>cell',
    );
  });

  it("checks addresses and CSS", () => {
    expect(safeUrl("https://a.test")).toBe("https://a.test");
    expect(safeUrl("mailto:a@b.test")).toBe("mailto:a@b.test");
    expect(safeUrl("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(safeUrl("data:image/png;base64,iVBORw0KGgo=", "image")).toBe("data:image/png;base64,iVBORw0KGgo=");
    expect(safeUrl("/relative")).toBeNull();
    expect(safeUrl("java\tscript:alert(1)")).toBeNull();
    expect(sanitizeCss("color:red;width:expression(alert(1));background:url('https://a.test/x.png')")).toBe("color:red;width:x(alert(1));background:url('https://a.test/x.png')");
    expect(sanitizeCss("background:url(javascript:alert(1))")).toBe("background:none");
    expect(sanitizeCss("\\65xpression(1)")).toBe("x(1)");
  });

  it("turns HTML into the plain-text part", () => {
    expect(htmlToText('<h1>Hi</h1><p>One &amp; two</p><ul><li>A</li><li>B</li></ul><a href="https://x.test">Open</a><style>p{}</style>')).toBe("Hi\nOne & two\n• A\n• B\nOpen (https://x.test)");
  });
});

describe("114 merge tags", () => {
  it("fills known tags with their fallback and escapes for HTML", () => {
    expect(applyMergeTags("Hi {{first_name|there}}, {{ business_name }}!", { first_name: "", business_name: "<Mona & Co>" }, { html: true })).toBe("Hi there, &lt;Mona &amp; Co&gt;!");
    expect(applyMergeTags("Hi {{first_name}}", { first_name: "Mona" }, { html: false })).toBe("Hi Mona");
  });

  it("leaves unknown placeholders for the admin to replace, and finds them", () => {
    expect(applyMergeTags("{{discount}} off", {}, { html: false })).toBe("{{discount}} off");
    expect(unknownMergeTags("{{discount}} {{first_name}} {{coupon_code|x}}")).toEqual(["discount", "coupon_code"]);
  });

  it("takes a first name from a full name, never from an email", () => {
    expect(firstNameOf("Mona Hassan")).toBe("Mona");
    expect(firstNameOf("mona@a.test")).toBe("");
  });
});

describe("114 renderer", () => {
  it("draws every block type as email-safe tables with inline styles", () => {
    const doc = { version: 1 as const, theme: BRAND_THEME, blocks: MAIL_BLOCK_TYPES.map((type) => newBlock(type)) };
    expect(validDoc(doc)).toBe(true);
    const html = renderDoc(doc, { subject: "S", preview: "Inbox preview", dir: "ltr" }, { lang: "en", assetBase: BASE });
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain('role="presentation"');
    expect(html).toContain(`max-width:600px`);
    expect(html).toContain(`${BASE}/email/yallapp-logo.png`);
    expect(html).toContain("Inbox preview");
    expect(html).toContain("@media only screen and (max-width:620px)");
    expect(html).toContain("prefers-color-scheme:dark");
    expect(html).toContain("<!--[if mso]>");
    // The unsubscribe line and Yallapp's place, always.
    expect(html).toContain("{{unsubscribe_link}}");
    expect(html).toContain("Yallapp · Cairo, Egypt");
    // No external stylesheet or script.
    expect(html).not.toMatch(/<script|<link /i);
    // An empty picture isn't sent (only the builder shows a placeholder).
    expect(html).not.toContain("Add a picture");
    expect(renderDoc(doc, { subject: "S", preview: "", dir: "ltr" }, { lang: "en", assetBase: BASE, editing: true })).toContain("Add a picture");
  });

  it("mirrors right-to-left emails: direction, alignment, columns and arrows", () => {
    const blocks = [
      { ...newBlock("heading"), text: "مرحبًا" },
      { ...newBlock("button"), button: { label: "ابدأ الآن →", url: "https://a.test" }, style: { align: "left" as const } },
      newBlock("columns"),
    ];
    const html = renderDoc({ version: 1, theme: BRAND_THEME, blocks }, { subject: "S", preview: "", dir: "rtl" }, { lang: "ar", assetBase: BASE });
    expect(html).toContain('<html lang="ar" dir="rtl"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("text-align:right");
    expect(html).toContain('align="right"');
    expect(html).toContain("ابدأ الآن ←");
    expect(html).toContain("إلغاء الاشتراك في الرسائل التسويقية");
    expect(html).toContain("Tahoma");
    expect(side("left", "rtl")).toBe("right");
    expect(side("right", "rtl")).toBe("left");
    expect(side("center", "rtl")).toBe("center");
    expect(mirrorArrows("Next →", "ltr")).toBe("Next →");
  });

  it("Arabic content starts right to left", () => {
    expect(emptyContent("ar").dir).toBe("rtl");
    expect(emptyContent("tr").dir).toBe("ltr");
  });

  it("HTML mode is sanitized and still gets the preview line, the direction and the unsubscribe line", () => {
    const html = renderHtmlMode('<html><body><p onclick="x">Hi</p><script>1</script></body></html>', { subject: "S", preview: "Peek", dir: "rtl" }, { lang: "ar", assetBase: BASE });
    expect(html).not.toMatch(/onclick|<script/);
    expect(html).toContain('<html dir="rtl">');
    expect(html).toContain('<body dir="rtl">');
    expect(html).toContain("Peek");
    expect(html).toContain("{{unsubscribe_link}}");
    expect(renderHtmlMode("<p>Just a fragment</p>", { subject: "S", preview: "", dir: "ltr" }, { lang: "en", assetBase: BASE })).toContain("<body");
  });

  it("the HTML block inside the builder is sanitized too", () => {
    const html = renderDoc({ version: 1, theme: BRAND_THEME, blocks: [{ ...newBlock("html"), html: '<div onmouseover="x">Own</div><script>bad()</script>' }] }, { subject: "S", preview: "", dir: "ltr" }, { lang: "en", assetBase: BASE });
    expect(html).toContain("Own");
    expect(html).not.toMatch(/onmouseover|bad\(\)/);
  });

  it("refuses a design with a bad color or an unknown block", () => {
    expect(validDoc({ version: 1, theme: { ...BRAND_THEME, text: "red;}" }, blocks: [] })).toBe(false);
    expect(validDoc({ version: 1, theme: BRAND_THEME, blocks: [{ id: "x", type: "marquee" }] })).toBe(false);
    expect(validDoc({ version: 1, theme: BRAND_THEME, blocks: [{ id: "x", type: "text", style: { color: "url(x)" } }] })).toBe(false);
  });
});

describe("114 templates", () => {
  it("has at least 12 English templates, each one renders in Yallapp's look", () => {
    expect(MAIL_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(MAIL_TEMPLATES.map((t) => t.id)).size).toBe(MAIL_TEMPLATES.length);
    for (const def of MAIL_TEMPLATES) {
      const c = templateContent(def, BASE);
      expect(c.dir).toBe("ltr");
      expect(validDoc(c.doc)).toBe(true);
      const { html } = renderContent(c, { lang: "en", assetBase: BASE });
      expect(html).toContain(`${BASE}/email/templates/${def.picture}`);
      expect(html.length).toBeLessThan(100_000);
      // No price is written in a template.
      expect(html).not.toMatch(/(\$|€|£|EGP|USD|TL)\s?\d|\d+\s?(EGP|USD|TL)/);
    }
    expect(MAIL_TEMPLATES.map((t) => t.id)).toEqual(expect.arrayContaining(["welcome", "launch", "offer", "renewal", "winback", "newsletter", "studio", "case_study", "webinar", "first_app", "seasonal", "survey", "courier"]));
  });

  it("the offer's placeholders stop sending until the admin replaces them", () => {
    const offer = MAIL_TEMPLATES.find((t) => t.id === "offer")!;
    const problems = campaignProblems(campaign({ contents: { en: templateContent(offer, BASE) } }), BASE);
    expect(problems.map((p) => p.message).join(" ")).toContain("{{discount}}");
  });

  it("a template's ids are new each time it's used", () => {
    const def = MAIL_TEMPLATES[0]!;
    expect(templateContent(def, BASE).doc!.blocks[0]!.id).not.toBe(templateContent(def, BASE).doc!.blocks[0]!.id);
  });
});

describe("114 tokens and tracking", () => {
  it("signs a recipient's number and refuses anything else", () => {
    const token = recipientToken(42, SECRET);
    expect(readRecipientToken(token, SECRET)).toBe(42);
    expect(readRecipientToken(token, "another-secret-0123456789abcdef0123456789")).toBeNull();
    expect(readRecipientToken(token.replace(/^[^.]+/, "2a"), SECRET)).toBeNull();
    expect(readRecipientToken("garbage", SECRET)).toBeNull();
    expect(token).not.toContain("@");
  });

  it("signs each click's address", () => {
    const token = recipientToken(7, SECRET);
    const sig = clickSignature(token, "https://a.test/x", SECRET);
    expect(validClick(token, "https://a.test/x", sig, SECRET)).toBe(true);
    expect(validClick(token, "https://evil.test", sig, SECRET)).toBe(false);
    expect(validClick(recipientToken(8, SECRET), "https://a.test/x", sig, SECRET)).toBe(false);
  });

  it("tracks web links but not the unsubscribe link, and adds the open pixel", () => {
    const token = recipientToken(7, SECRET);
    const links = mailLinks(BASE, token, SECRET);
    const html = trackLinks(`<body><a href="https://a.test/?a=1&amp;b=2">x</a><a href="${links.unsubscribePage}">u</a><a href="mailto:a@b.test">m</a></body>`, links);
    expect(html).toContain(`${BASE}/api/mail/click/${token}?u=${encodeURIComponent("https://a.test/?a=1&b=2")}&amp;s=`);
    expect(html).toContain(`href="${links.unsubscribePage}"`);
    expect(html).toContain('href="mailto:a@b.test"');
    expect(addOpenPixel(html, links)).toContain(`${BASE}/api/mail/open/${token}`);
    expect(linksOf('<a href="https://a.test">1</a><a href="https://a.test">2</a><a href="#x">3</a>')).toEqual(["https://a.test"]);
  });
});

describe("114 audiences", () => {
  it("filters by state, plan, section, type, language, country, sign-up date and activity", async () => {
    const store = new MemoryStore();
    await people(store, [
      { email: "pro@a.test", plan: "pro", lang: "ar", country: "EG", appType: "store", lastSignIn: days(-2) },
      { email: "starter@a.test", plan: "starter", lang: "tr", country: "TR", appType: "lms", section: "studio", lastSignIn: days(-90) },
      { email: "pending@a.test", plan: null, lastSignIn: null },
    ]);
    const emails = async (audience: Parameters<typeof cleanAudience>[0]) =>
      (await resolveAudience(store, cleanAudience(audience), { now: NOW, baseUrl: BASE })).people.map((p) => p.email).sort();
    expect(await emails({})).toEqual(["pending@a.test", "pro@a.test", "starter@a.test"]);
    expect(await emails({ states: ["pending"] })).toEqual(["pending@a.test"]);
    expect(await emails({ plans: ["pro"] })).toEqual(["pro@a.test"]);
    expect(await emails({ sections: ["studio"] })).toEqual(["starter@a.test"]);
    expect(await emails({ appTypes: ["store"] })).toEqual(["pro@a.test"]);
    expect(await emails({ langs: ["en"] })).toEqual(["pending@a.test"]);
    expect(await emails({ countries: ["tr"] })).toEqual(["starter@a.test"]);
    expect(await emails({ activeWithinDays: 7 })).toEqual(["pro@a.test"]);
    expect(await emails({ inactiveForDays: 30 })).toEqual(["pending@a.test", "starter@a.test"]);
    expect(await emails({ signedUpFrom: "2026-10-13" })).toEqual([]);
    expect(await emails({ signedUpTo: "2026-10-12" })).toHaveLength(3);
    expect(await emails({ published: "yes" })).toEqual([]);
    expect(await emails({ emails: ["PRO@a.test", "not-an-email"] })).toEqual(["pro@a.test"]);
  });

  it("gives each person their language and the merge tags' values", async () => {
    const store = new MemoryStore();
    await people(store, [{ email: "pro@a.test", plan: "pro", lang: "ar", appType: "store" }]);
    const [p] = (await resolveAudience(store, {}, { now: NOW, baseUrl: BASE })).people;
    expect(p!.lang).toBe("ar");
    expect(p!.values.first_name).toBe("pro");
    expect(p!.values.app_name).toBe("pro App");
    expect(p!.values.plan).toBe("Pro");
    expect(p!.values.sign_in_link).toBe(`${BASE}/sign-in`);
    expect(p!.values.expiry_date).toBeTruthy();
  });

  it("leaves out addresses that said no, across every account they belong to", async () => {
    const store = new MemoryStore();
    await people(store, [{ email: "a@a.test" }, { email: "b@a.test" }]);
    await store.suppressMail({ email: "A@a.test", reason: "unsubscribed", campaignId: null, createdAt: NOW });
    const resolved = await resolveAudience(store, {}, { now: NOW, baseUrl: BASE });
    expect(resolved.people.map((p) => p.email)).toEqual(["b@a.test"]);
    expect(resolved.suppressed).toBe(1);
  });

  it("team members only when the campaign asks for them", async () => {
    const store = new MemoryStore();
    const [first] = await people(store, [{ email: "owner@a.test" }]);
    const member = await store.createUser({ email: "staff@a.test", name: "Staff One", passwordHash: null, now: NOW });
    await store.saveTeamMember({ clientId: first!.client.id, userId: member.id, role: "staff", areas: [], appIds: null, addedBy: "owner@a.test", createdAt: NOW, updatedAt: NOW });
    expect((await resolveAudience(store, {}, { now: NOW, baseUrl: BASE })).people.map((p) => p.email)).toEqual(["owner@a.test"]);
    const withTeam = (await resolveAudience(store, { includeTeam: true }, { now: NOW, baseUrl: BASE })).people;
    expect(withTeam.map((p) => [p.email, p.team])).toEqual([
      ["owner@a.test", false],
      ["staff@a.test", true],
    ]);
  });

  it("an account without apps never matches an app filter", async () => {
    const store = new MemoryStore();
    await people(store, [{ email: "a@a.test" }]);
    const [row] = await store.listClients({ filter: "all", now: NOW });
    expect(accountMatches(row!, { appTypes: ["store"] }, NOW)).toBe(false);
    expect(accountMatches(row!, {}, NOW)).toBe(true);
  });
});

describe("114 campaigns", () => {
  it("cleans what the builder sends", () => {
    const contents = cleanContents({ en: content(), ar: { ...content(), dir: undefined }, xx: content(), tr: { mode: "blocks", doc: { version: 2 } } });
    expect(Object.keys(contents)).toEqual(["en", "ar"]);
    expect(contents.ar!.dir).toBe("rtl");
  });

  it("each person gets their language, else the main one", () => {
    const c = campaign({ contents: { en: content({ subject: "Hello" }), ar: content({ subject: "مرحبًا", dir: "rtl" }), tr: content({ subject: "" }) } });
    expect(contentFor(c, "ar")!.content.subject).toBe("مرحبًا");
    expect(contentFor(c, "tr")!.lang).toBe("en");
  });

  it("lists the problems that stop sending", () => {
    expect(campaignProblems(campaign({ contents: {} }), BASE).length).toBeGreaterThan(0);
    expect(campaignProblems(campaign({ contents: { en: content({ subject: "" }) } }), BASE)[0]!.message).toBe("Write a subject.");
    expect(campaignProblems(campaign(), BASE)).toEqual([]);
    expect(campaignProblems(campaign({ replyTo: "nope" }), BASE).map((p) => p.message)).toContain("The reply-to address isn't an email address.");
  });

  it("a recipient's email has their values, the one-click headers and tracked links", () => {
    const c = campaign({ contents: { en: content({ doc: { version: 1, theme: BRAND_THEME, blocks: [{ ...newBlock("text"), text: '<p>Hi {{first_name}}, <a href="https://a.test/x">read</a></p>' }] } }) } });
    const built = buildRecipientMail(c, { id: 5, email: "mona@a.test", lang: "en" }, { first_name: "Mona" }, { baseUrl: BASE, secret: SECRET })!;
    const token = recipientToken(5, SECRET);
    expect(built.mail.subject).toBe("Hello Mona");
    expect(built.mail.headers!["List-Unsubscribe"]).toBe(`<${BASE}/api/mail/unsubscribe/${token}>`);
    expect(built.mail.headers!["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(built.mail.html).toContain(`/api/mail/click/${token}?u=`);
    expect(built.mail.html).toContain(`/api/mail/open/${token}`);
    expect(built.mail.html).toContain(`href="${BASE}/unsubscribe/${token}"`);
    expect(built.mail.text).toContain("read (https://a.test/x)");
    expect(built.mail.text).toContain(`${BASE}/unsubscribe/${token}`);
    expect(built.mail.text).toContain("Yallapp · Cairo, Egypt");
    const quiet = buildRecipientMail({ ...c, track: false }, { id: 5, email: "mona@a.test", lang: "en" }, {}, { baseUrl: BASE, secret: SECRET })!;
    expect(quiet.mail.html).not.toContain("/api/mail/click/");
    expect(quiet.mail.html).not.toContain("/api/mail/open/");
  });

  it("a test email is marked and never tracked", () => {
    const built = buildTestMail(campaign(), "en", "me@yallapp.test", { baseUrl: BASE })!;
    expect(built.mail.subject).toBe("[Test] Hello Mona");
    expect(built.mail.html).not.toContain("/api/mail/");
    expect(built.mail.html).toContain(`${BASE}/unsubscribe/test`);
  });

  it("duplicates as a new draft", () => {
    const copy = duplicateCampaign(campaign({ status: "sent", recipients: 9 }), "b@yallapp.test", NOW);
    expect(copy.id).not.toBe(campaign().id);
    expect(copy.status).toBe("draft");
    expect(copy.recipients).toBe(0);
    expect(copy.name).toBe("October news (copy)");
  });
});

describe("114 sending", () => {
  async function setup(count: number, patch: Partial<MailCampaign> = {}) {
    const store = new MemoryStore();
    await people(store, Array.from({ length: count }, (_, i) => ({ email: `p${i}@a.test` })));
    const c = campaign({ status: "draft", ...patch });
    await store.saveMailCampaign(c);
    return { store, c };
  }

  function deps(store: MemoryStore, mailer: Mailer, clock: { now: Date }, budgetMs = 10_000) {
    return { store, now: () => clock.now, baseUrl: BASE, secret: SECRET, mailer: async () => mailer, budgetMs };
  }

  it("sends to everyone once, at most its rate a minute, then finishes", async () => {
    const { store, c } = await setup(5, { perMinute: 2 });
    const { sent, mailer } = fakeMailer();
    const clock = { now: NOW };
    expect(await startMailCampaign(store, c, NOW)).toBe(true);
    expect(await startMailCampaign(store, c, NOW)).toBe(false);
    let report = await runMailCampaigns(deps(store, mailer, clock));
    expect(report.sent).toBe(2);
    expect((await store.getMailCampaign(c.id))!.recipients).toBe(5);
    report = await runMailCampaigns(deps(store, mailer, clock));
    expect(report.sent).toBe(0);
    for (let minute = 1; minute <= 3; minute += 1) {
      clock.now = new Date(NOW.getTime() + minute * 61_000);
      await runMailCampaigns(deps(store, mailer, clock));
    }
    expect(sent.map((m) => m.to).sort()).toEqual(["p0@a.test", "p1@a.test", "p2@a.test", "p3@a.test", "p4@a.test"]);
    const done = await store.getMailCampaign(c.id);
    expect(done!.status).toBe("sent");
    expect(done!.finishedAt).not.toBeNull();
    expect((await store.countMailRecipients(c.id)).sent).toBe(5);
  });

  it("two runs at the same time never send one email twice", async () => {
    const { store, c } = await setup(12, { perMinute: 600 });
    const { sent, mailer } = fakeMailer();
    const clock = { now: NOW };
    await startMailCampaign(store, c, NOW);
    await Promise.all([runMailCampaigns(deps(store, mailer, clock)), runMailCampaigns(deps(store, mailer, clock)), runMailCampaigns(deps(store, mailer, clock))]);
    expect(sent).toHaveLength(12);
    expect(new Set(sent.map((m) => m.to)).size).toBe(12);
  });

  it("listing again after a lost run never adds anyone twice", async () => {
    const { store, c } = await setup(3);
    await startMailCampaign(store, c, NOW);
    const rows = (await resolveAudience(store, {}, { now: NOW, baseUrl: BASE })).people.map((p) => ({
      campaignId: c.id, email: p.email, userId: p.userId, clientId: p.clientId, name: p.name, lang: p.lang, status: "queued" as const, attempts: 0, error: null, nextAttemptAt: null, claim: null, leaseUntil: null, sentAt: null, team: false,
    }));
    expect(await store.addMailRecipients(rows)).toBe(3);
    expect(await store.addMailRecipients(rows)).toBe(0);
  });

  it("rows a lost run took are never sent again (they may have gone)", async () => {
    const { store, c } = await setup(3, { perMinute: 600 });
    await startMailCampaign(store, c, NOW);
    const { sent, mailer } = fakeMailer();
    // The first run lists everyone, then stops for time before sending.
    await runMailCampaigns({ ...deps(store, mailer, { now: NOW }), budgetMs: 10_000, mailer: async () => mailer }).then(() => undefined);
    expect(sent).toHaveLength(3);
    // A second campaign: a run takes two rows and is lost.
    const second = campaign({ id: "c0000000-0000-4000-8000-000000000002", status: "draft", perMinute: 600 });
    await store.saveMailCampaign(second);
    await startMailCampaign(store, second, NOW);
    await runMailCampaigns({ ...deps(store, mailer, { now: NOW }), budgetMs: 0 });
    const rows = (await resolveAudience(store, {}, { now: NOW, baseUrl: BASE })).people.map((p) => ({
      campaignId: second.id, email: p.email, userId: p.userId, clientId: p.clientId, name: p.name, lang: p.lang, status: "queued" as const, attempts: 0, error: null, nextAttemptAt: null, claim: null, leaseUntil: null, sentAt: null, team: false,
    }));
    await store.addMailRecipients(rows);
    await store.setMailCampaignStatus(second.id, ["sending"], { status: "sending", recipients: 3 });
    const claimed = await store.claimMailRecipients(second.id, "lost-run", 2, NOW, new Date(NOW.getTime() + MAIL_LEASE_MS));
    expect(claimed).toHaveLength(2);
    // Before the lease ends, nobody else takes them; after it, they're failed as interrupted.
    await runMailCampaigns(deps(store, mailer, { now: new Date(NOW.getTime() + 60_000) }));
    expect((await store.countMailRecipients(second.id)).sending).toBe(2);
    await runMailCampaigns(deps(store, mailer, { now: new Date(NOW.getTime() + MAIL_LEASE_MS + 1000) }));
    for (const row of claimed) {
      const after = await store.getMailRecipient(row.id);
      expect(after!.status).toBe("failed");
      expect(after!.error).toBe("interrupted");
    }
    // The lost run can't write over them either.
    expect(await store.finishMailRecipient(claimed[0]!.id, "lost-run", { status: "sent", error: null, nextAttemptAt: null, sentAt: NOW, attempts: 1 })).toBe(false);
    expect(sent.filter((m) => m.subject && claimed.some((r) => r.email === m.to))).toHaveLength(1 * claimed.length);
    expect((await store.getMailCampaign(second.id))!.status).toBe("sent");
  });

  it("tries a failure again twice, then gives up; a refused address bounces and is kept from later campaigns", async () => {
    const { store, c } = await setup(2, { perMinute: 600 });
    await startMailCampaign(store, c, NOW);
    const refuse = Object.assign(new Error("550 5.1.1 Recipient address rejected: user unknown"), { responseCode: 550 });
    const { mailer } = fakeMailer((to) => (to === "p0@a.test" ? new Error("Connection timeout") : refuse));
    const clock = { now: NOW };
    let report = await runMailCampaigns(deps(store, mailer, clock));
    expect(report.retried).toBe(1);
    expect(report.failed).toBe(1);
    expect((await store.getMailSuppression("p1@a.test"))!.reason).toBe("bounced");
    expect((await store.mailEventStats(c.id)).bounces).toBe(1);
    clock.now = new Date(NOW.getTime() + 6 * 60_000);
    report = await runMailCampaigns(deps(store, mailer, clock));
    expect(report.retried).toBe(1);
    clock.now = new Date(NOW.getTime() + 20 * 60_000);
    report = await runMailCampaigns(deps(store, mailer, clock));
    expect(report.failed).toBe(1);
    const p0 = (await store.listMailRecipients(c.id, { offset: 0, limit: 10, query: "p0" })).items[0]!;
    expect(p0.status).toBe("failed");
    expect(p0.attempts).toBe(3);
    expect(p0.error).toContain("timeout");
    expect((await store.getMailCampaign(c.id))!.status).toBe("sent");
  });

  it("someone who unsubscribes mid-campaign is skipped", async () => {
    const { store, c } = await setup(2, { perMinute: 1 });
    await startMailCampaign(store, c, NOW);
    const { sent, mailer } = fakeMailer();
    const clock = { now: NOW };
    await runMailCampaigns(deps(store, mailer, clock));
    const other = sent[0]!.to === "p0@a.test" ? "p1@a.test" : "p0@a.test";
    await setMarketingAllowed(store, other, false, NOW);
    clock.now = new Date(NOW.getTime() + 61_000);
    await runMailCampaigns(deps(store, mailer, clock));
    expect(sent).toHaveLength(1);
    expect((await store.countMailRecipients(c.id)).skipped).toBe(1);
  });

  it("a scheduled campaign starts when its time comes; paused waits; cancelled skips the rest", async () => {
    const { store, c } = await setup(3, { status: "scheduled", scheduledAt: new Date(NOW.getTime() + 3600_000), perMinute: 1 });
    const { sent, mailer } = fakeMailer();
    const clock = { now: NOW };
    expect((await runMailCampaigns(deps(store, mailer, clock))).started).toBe(0);
    clock.now = new Date(NOW.getTime() + 3600_000);
    expect((await runMailCampaigns(deps(store, mailer, clock))).started).toBe(1);
    expect(sent).toHaveLength(1);
    await store.setMailCampaignStatus(c.id, ["sending"], { status: "paused" });
    clock.now = new Date(clock.now.getTime() + 61_000);
    await runMailCampaigns(deps(store, mailer, clock));
    expect(sent).toHaveLength(1);
    expect(await cancelMailCampaign(store, c.id, clock.now)).toBe(true);
    clock.now = new Date(clock.now.getTime() + 61_000);
    await runMailCampaigns(deps(store, mailer, clock));
    expect(sent).toHaveLength(1);
    const counts = await store.countMailRecipients(c.id);
    expect(counts.skipped).toBe(2);
    expect((await store.getMailCampaign(c.id))!.status).toBe("cancelled");
  });

  it("an audience nobody matches finishes at once", async () => {
    const { store, c } = await setup(1, { audience: { states: ["suspended"] } });
    await startMailCampaign(store, c, NOW);
    const report = await runMailCampaigns(deps(store, fakeMailer().mailer, { now: NOW }));
    expect(report.finished).toBe(1);
  });
});

describe("114 consent", () => {
  it("unsubscribes by the signed link, once, and lets the person come back", async () => {
    const store = new MemoryStore();
    await people(store, [{ email: "a@a.test" }]);
    const c = campaign();
    await store.saveMailCampaign(c);
    await store.addMailRecipients([{ campaignId: c.id, email: "a@a.test", userId: null, clientId: null, name: "A", lang: "tr", status: "sent", attempts: 1, error: null, nextAttemptAt: null, claim: null, leaseUntil: null, sentAt: NOW, team: false }]);
    const row = (await store.listMailRecipients(c.id, { offset: 0, limit: 1 })).items[0]!;
    const found = await recipientOfToken(store, recipientToken(row.id, SECRET), SECRET);
    expect(found!.lang).toBe("tr");
    await unsubscribeRecipient(store, found!.recipient, NOW);
    await unsubscribeRecipient(store, found!.recipient, NOW);
    expect(await marketingAllowed(store, "a@a.test")).toBe(false);
    expect((await store.mailEventStats(c.id)).unsubscribes).toBe(1);
    expect(await resubscribe(store, "a@a.test")).toBe(true);
    expect(await marketingAllowed(store, "a@a.test")).toBe(true);
  });

  it("the account's switch never undoes a bounce", async () => {
    const store = new MemoryStore();
    await store.suppressMail({ email: "b@a.test", reason: "bounced", campaignId: null, createdAt: NOW });
    expect(await setMarketingAllowed(store, "b@a.test", true, NOW)).toBe(false);
    expect(await setMarketingAllowed(store, "c@a.test", false, NOW)).toBe(false);
    expect(await setMarketingAllowed(store, "c@a.test", true, NOW)).toBe(true);
  });

  it("counts opens and clicks per person and per link", async () => {
    const store = new MemoryStore();
    const c = campaign();
    await store.saveMailCampaign(c);
    for (const [email, kind, url] of [
      ["a", "open", null],
      ["a", "open", null],
      ["b", "open", null],
      ["a", "click", "https://x.test"],
      ["a", "click", "https://x.test"],
      ["b", "click", "https://y.test"],
    ] as const) {
      await store.addMailEvent({ campaignId: c.id, email, kind, url, at: NOW });
    }
    const stats = await store.mailEventStats(c.id);
    expect(stats).toMatchObject({ opens: 3, uniqueOpens: 2, clicks: 3, uniqueClicks: 2 });
    expect(stats.links).toEqual([
      { url: "https://x.test", clicks: 2, unique: 1 },
      { url: "https://y.test", clicks: 1, unique: 1 },
    ]);
    await store.deleteMailCampaign(c.id);
    expect((await store.mailEventStats(c.id)).opens).toBe(0);
  });
});
