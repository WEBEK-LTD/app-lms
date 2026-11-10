import { describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { Mail, Mailer } from "@/lib/mail";
import { audienceIsEveryone, cleanAudience, contactValues, resolveAudience } from "@/lib/mailing/audience";
import { BRAND_THEME, emptyContent, newBlock } from "@/lib/mailing/blocks";
import { buildRecipientMail, runMailCampaigns, startMailCampaign } from "@/lib/mailing/campaigns";
import { recipientOfToken, resubscribe, setMarketingAllowed, unsubscribeRecipient } from "@/lib/mailing/consent";
import {
  checkContactImport,
  checkSource,
  cleanContactInput,
  cleanTags,
  contactOf,
  contactsCsv,
  csvCell,
  importSummary,
  parseCsv,
  parseLang,
  readContactImport,
} from "@/lib/mailing/contacts";
import { accountOnlyTagsWithoutDefault, applyMergeTags, MERGE_TAGS } from "@/lib/mailing/merge";
import { readRecipientToken } from "@/lib/mailing/tokens";
import type { MailCampaign, MailContact } from "@/lib/mailing/types";
import { days, KEY, NOW } from "./helpers";

/** 114 The admin's contacts: imports, the audience with contacts, consent and merge tags. */

const SECRET = "test-signing-secret-0123456789abcdef0123456789";
const BASE = "https://app.yallapp.test";
const DEFAULTS = { lang: "en" as const, country: null, tags: [] };

function contact(email: string, patch: Partial<MailContact> = {}): MailContact {
  return { ...contactOf({ email, name: "", company: null, lang: "en", country: null, tags: [] }, { source: "customer", sourceNote: null, addedBy: "admin@yallapp.test", now: NOW }), ...patch };
}

function campaign(patch: Partial<MailCampaign> = {}): MailCampaign {
  return {
    id: "c0000000-0000-4000-8000-0000000000c1",
    name: "Contacts news",
    status: "draft",
    archived: false,
    audience: { people: "both" },
    segmentId: null,
    fromName: "Yallapp",
    replyTo: null,
    contents: {
      en: { ...emptyContent("en"), subject: "Hello {{first_name|there}}", preview: "", doc: { version: 1, theme: BRAND_THEME, blocks: [{ ...newBlock("text"), text: "<p>Hi {{first_name|there}} at {{business_name|your business}}, plan {{plan|none}}.</p>" }] } },
    },
    defaultLang: "en",
    track: true,
    perMinute: 600,
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

function fakeMailer() {
  const sent: Mail[] = [];
  const mailer: Mailer = {
    async send(mail) {
      sent.push(mail);
    },
    close() {},
  };
  return { sent, mailer };
}

async function account(store: MemoryStore, email: string, name = "Account Person") {
  const { user, client } = await registerClient(store, { name, email, whatsapp: "+905446731942", siteUrl: "https://a.test", password: null }, NOW);
  await activateClient(store, { clientId: client.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
  return { user, client };
}

describe("114 contacts: reading a paste or a CSV file", () => {
  it("reads CSV quoting: separators, doubled quotes and line breaks inside quotes, CRLF, and Excel's byte-order mark", () => {
    const rows = parseCsv('﻿email,name,company\r\n"a@x.test","Mona ""M"" Hassan","Bakery, Cairo"\r\nb@x.test,  Ahmed ,"Line one\r\nline two"\r\n\r\nc@x.test,,\r\n');
    expect(rows).toEqual([
      { line: 1, cells: ["email", "name", "company"] },
      { line: 2, cells: ["a@x.test", 'Mona "M" Hassan', "Bakery, Cairo"] },
      { line: 3, cells: ["b@x.test", "Ahmed", "Line one\r\nline two"] },
      { line: 6, cells: ["c@x.test", "", ""] },
    ]);
  });

  it("finds the separator: semicolons (Excel in Turkish), tabs (pasted from a sheet) and the Arabic comma", () => {
    expect(parseCsv("email;name\na@x.test;Ayşe Yılmaz").map((r) => r.cells)).toEqual([["email", "name"], ["a@x.test", "Ayşe Yılmaz"]]);
    expect(parseCsv("a@x.test\tMona\tBakery").map((r) => r.cells)).toEqual([["a@x.test", "Mona", "Bakery"]]);
    expect(parseCsv("a@x.test، منى حسن، مخبز منى").map((r) => r.cells)).toEqual([["a@x.test", "منى حسن", "مخبز منى"]]);
  });

  it("reads a CSV file by its header row, whatever the columns' order and names", () => {
    const read = readContactImport('﻿Company;E-mail;First name;Last name;Language;Country;Tags\n"Nour Co";NOUR@X.TEST ;Nour;Ali;Arabic;eg;"lead; expo 2026"', "csv");
    expect(read.error).toBeNull();
    expect(read.rows).toEqual([{ line: 2, email: "NOUR@X.TEST", name: "Nour Ali", company: "Nour Co", lang: "Arabic", country: "eg", tags: "lead; expo 2026" }]);
    const [row] = checkContactImport(read.rows, DEFAULTS, { contacts: [], accounts: [] });
    expect(row).toMatchObject({ email: "nour@x.test", name: "Nour Ali", company: "Nour Co", lang: "ar", country: "EG", tags: ["expo 2026", "lead"], status: "new", message: null });
  });

  it("needs the header row in a file, and says so when the first row looks like a contact", () => {
    expect(readContactImport("a@x.test,Mona\nb@x.test,Ali", "csv").error).toMatch(/It looks like a contact/);
    expect(readContactImport("name,company\nMona,Bakery", "csv").error).toMatch(/No email column/);
    expect(readContactImport("", "csv").error).toBe("The file is empty.");
    expect(readContactImport("   \n", "paste").error).toBe("Paste at least one contact.");
  });

  it("reads a paste as email, name, company; a first line of column names is skipped", () => {
    expect(readContactImport("a@x.test, Mona Hassan, Mona's Bakery\nb@x.test", "paste").rows.map((r) => [r.line, r.email, r.name, r.company])).toEqual([
      [1, "a@x.test", "Mona Hassan", "Mona's Bakery"],
      [2, "b@x.test", "", ""],
    ]);
    expect(readContactImport("Email, Name\na@x.test, Mona", "paste").rows).toHaveLength(1);
  });

  it("stops past 5,000 rows", () => {
    const text = Array.from({ length: 5001 }, (_, i) => `p${i}@x.test`).join("\n");
    expect(readContactImport(text, "paste").error).toMatch(/up to 5,000/);
  });

  it("keeps Arabic and Turkish names as written, without hidden direction marks", () => {
    const [ar, tr] = checkContactImport(readContactImport("ahmed@x.test, ‮أحمد   عبد الله‬, شركة النور للتجارة\nayse@x.test, Ayşe Gül Yılmaz, Çağrı Ltd. Şti.", "paste").rows, DEFAULTS, { contacts: [], accounts: [] });
    expect(ar).toMatchObject({ name: "أحمد عبد الله", company: "شركة النور للتجارة", status: "new" });
    expect(tr).toMatchObject({ name: "Ayşe Gül Yılmaz", company: "Çağrı Ltd. Şti.", status: "new" });
  });

  it("marks bad rows with their problem, and every address once", () => {
    const text = [
      "not-an-email, Bad",
      "a@x, No dot",
      "two@@x.test",
      ", Nobody",
      "Ok@X.test, First",
      "ok@x.test, Again",
      "mailto:Mona <MONA@x.test>, Mona",
      `long@x.test, ${"n".repeat(121)}`,
      "lang@x.test, L, Co, xx",
    ].join("\n");
    const read = readContactImport(text, "paste");
    // The paste reads email, name, company; the fourth column needs a header.
    const rows = checkContactImport(read.rows, DEFAULTS, { contacts: [], accounts: [] });
    expect(rows.map((r) => [r.line, r.status])).toEqual([
      [1, "error"],
      [2, "error"],
      [3, "error"],
      [4, "error"],
      [5, "new"],
      [6, "duplicate"],
      [7, "new"],
      [8, "error"],
      [9, "new"],
    ]);
    expect(rows[0]!.message).toBe("“not-an-email” isn't an email address");
    expect(rows[3]!.message).toBe("No email address");
    expect(rows[5]!.message).toBe("Listed again (first on line 5)");
    expect(rows[6]!.email).toBe("mona@x.test");
    expect(rows[7]!.message).toBe("The name is over 120 characters");
    const withLang = checkContactImport(readContactImport("email,language,country\nl@x.test,klingon,ZZ", "csv").rows, DEFAULTS, { contacts: [], accounts: [] });
    expect(withLang[0]).toMatchObject({ status: "error", message: "Unknown language “klingon”: use en, ar or tr. Unknown country “ZZ”: use a two-letter code like EG or TR" });
  });

  it("reports addresses that are contacts already or have a Yallapp account, without adding them", () => {
    const rows = checkContactImport(readContactImport("old@x.test\nOwner@X.test\nnew@x.test\nnew@x.test", "paste").rows, { lang: "tr", country: "TR", tags: ["expo"] }, { contacts: ["old@x.test"], accounts: ["owner@x.test"] });
    expect(rows.map((r) => r.status)).toEqual(["contact", "account", "new", "duplicate"]);
    expect(rows[1]!.message).toMatch(/Has a Yallapp account/);
    expect(rows[2]).toMatchObject({ lang: "tr", country: "TR", tags: ["expo"] });
    expect(importSummary(rows)).toEqual({ new: 1, duplicate: 1, contact: 1, account: 1, error: 0 });
  });

  it("cleans tags and languages", () => {
    expect(cleanTags(" Lead, VIP;vip | Expo 2026 ,, عملاء ")).toEqual(["expo 2026", "lead", "vip", "عملاء"]);
    expect(cleanTags(['say "hi"', "a,b"])).toEqual(["a b", "say hi"]);
    expect(cleanTags(Array.from({ length: 30 }, (_, i) => `t${String(i).padStart(2, "0")}`))).toHaveLength(20);
    expect([parseLang("AR"), parseLang("Türkçe"), parseLang("العربية"), parseLang("en-GB"), parseLang("fr")]).toEqual(["ar", "tr", "ar", "en", null]);
  });
});

describe("114 contacts: the required source, and the form", () => {
  it("needs where they're from; Other needs its own words", () => {
    expect(checkSource("", null)).toEqual({ ok: false, error: "Choose where you know them from." });
    expect(checkSource("friend", null).ok).toBe(false);
    expect(checkSource("other", "  ")).toEqual({ ok: false, error: "Write where you know them from." });
    expect(checkSource("other", "LinkedIn")).toEqual({ ok: true, source: "other", sourceNote: "LinkedIn" });
    expect(checkSource("event", "")).toEqual({ ok: true, source: "event", sourceNote: null });
    expect(checkSource("met", "x".repeat(201)).ok).toBe(false);
  });

  it("checks a contact typed by hand", () => {
    expect(cleanContactInput({ email: " Mona@Example.COM ", name: "منى", company: "", lang: "ar", country: "eg", tags: "lead" })).toEqual({
      ok: true,
      fields: { email: "mona@example.com", name: "منى", company: null, lang: "ar", country: "EG", tags: ["lead"] },
    });
    expect(cleanContactInput({ email: "nope", lang: "de", country: "XX" })).toEqual({ ok: false, errors: { email: "That isn't an email address.", lang: "Choose English, Arabic or Turkish.", country: "Choose a country from the list." } });
  });
});

describe("114 contacts: the export", () => {
  it("writes UTF-8 with its byte-order mark, quotes what needs it, and keeps formulas as text", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("Bakery, Cairo")).toBe('"Bakery, Cairo"');
    expect(csvCell('Say "hi"')).toBe('"Say ""hi"""');
    const csv = contactsCsv([contact("a@x.test", { name: "منى حسن", company: "Nour, Co", tags: ["lead", "vip"], source: "other", sourceNote: "LinkedIn" })], () => "unsubscribed");
    expect(csv.startsWith("﻿email,name,company,language,country,tags,source,source_note,status,added_by,added_at\r\n")).toBe(true);
    expect(csv).toContain('a@x.test,منى حسن,"Nour, Co",en,,"lead; vip",Other,LinkedIn,Unsubscribed,admin@yallapp.test,2026-10-12T10:00:00.000Z\r\n');
    // What it writes reads back.
    expect(parseCsv(csv)[1]!.cells.slice(0, 6)).toEqual(["a@x.test", "منى حسن", "Nour, Co", "en", "", "lead; vip"]);
  });
});

describe("114 contacts in a campaign's audience", () => {
  async function setup() {
    const store = new MemoryStore();
    await account(store, "owner@a.test", "Owner Person");
    await account(store, "both@a.test", "Both Account");
    await store.addMailContacts([
      contact("lead@x.test", { name: "Layla Saad", company: "Saad Trading", lang: "ar", country: "EG", tags: ["lead"] }),
      contact("both@a.test", { name: "Both Contact", tags: ["lead"] }),
      contact("vip@x.test", { name: "Kemal Öz", lang: "tr", country: "TR", tags: ["vip"] }),
    ]);
    return store;
  }
  const emails = async (store: MemoryStore, audience: Parameters<typeof cleanAudience>[0]) => (await resolveAudience(store, cleanAudience(audience), { now: NOW, baseUrl: BASE })).people.map((p) => p.email).sort();

  it("goes to accounts (as before), contacts, or both, an address in both once", async () => {
    const store = await setup();
    expect(await emails(store, {})).toEqual(["both@a.test", "owner@a.test"]);
    expect(await emails(store, { people: "contacts" })).toEqual(["both@a.test", "lead@x.test", "vip@x.test"]);
    const both = (await resolveAudience(store, cleanAudience({ people: "both" }), { now: NOW, baseUrl: BASE })).people;
    expect(both.map((p) => p.email).sort()).toEqual(["both@a.test", "lead@x.test", "owner@a.test", "vip@x.test"]);
    // The address in both is the account (its plan and app), listed once.
    expect(both.filter((p) => p.email === "both@a.test")).toMatchObject([{ userId: expect.any(String), contactId: null, name: "Both Account" }]);
    expect(both.find((p) => p.email === "lead@x.test")).toMatchObject({ userId: null, clientId: null, contactId: expect.any(String), lang: "ar", team: false });
  });

  it("filters contacts by tag, language and country; the account filters don't apply to them", async () => {
    const store = await setup();
    expect(await emails(store, { people: "contacts", contactTags: ["lead"] })).toEqual(["both@a.test", "lead@x.test"]);
    expect(await emails(store, { people: "contacts", contactTags: ["LEAD", "vip"] })).toEqual(["both@a.test", "lead@x.test", "vip@x.test"]);
    expect(await emails(store, { people: "contacts", contactLangs: ["tr"] })).toEqual(["vip@x.test"]);
    expect(await emails(store, { people: "contacts", contactCountries: ["eg"] })).toEqual(["lead@x.test"]);
    expect(await emails(store, { people: "contacts", states: ["expired"], plans: ["starter"] })).toEqual(["both@a.test", "lead@x.test", "vip@x.test"]);
    expect(await emails(store, { people: "both", states: ["expired"], contactTags: ["vip"] })).toEqual(["vip@x.test"]);
    expect(await emails(store, { people: "both", emails: ["lead@x.test", "owner@a.test"] })).toEqual(["lead@x.test", "owner@a.test"]);
  });

  it("keeps an old audience as it was, and says when it's everyone", () => {
    expect(cleanAudience({ contactTags: ["lead"] })).not.toHaveProperty("people");
    expect(cleanAudience({ contactTags: ["lead"] })).not.toHaveProperty("contactTags");
    expect(cleanAudience({ people: "nobody" })).not.toHaveProperty("people");
    expect(audienceIsEveryone(cleanAudience({ people: "contacts" }))).toBe(true);
    expect(audienceIsEveryone(cleanAudience({ people: "contacts", contactTags: ["lead"] }))).toBe(false);
    expect(audienceIsEveryone(cleanAudience({ people: "contacts", states: ["active"] }))).toBe(true);
    expect(audienceIsEveryone(cleanAudience({ people: "both", states: ["active"] }))).toBe(false);
    expect(audienceIsEveryone(cleanAudience({}))).toBe(true);
  });

  it("leaves out a contact's address that unsubscribed, bounced or complained, and counts it", async () => {
    const store = await setup();
    await store.suppressMail({ email: "lead@x.test", reason: "unsubscribed", campaignId: null, createdAt: NOW });
    await store.suppressMail({ email: "vip@x.test", reason: "bounced", campaignId: null, createdAt: NOW });
    await store.suppressMail({ email: "both@a.test", reason: "complained", campaignId: null, createdAt: NOW });
    const resolved = await resolveAudience(store, cleanAudience({ people: "both" }), { now: NOW, baseUrl: BASE });
    expect(resolved.people.map((p) => p.email)).toEqual(["owner@a.test"]);
    expect(resolved.suppressed).toBe(3);
  });

  it("never sends a campaign to a suppressed contact, also when it was suppressed after the list was made", async () => {
    const store = await setup();
    const c = campaign({ status: "sending", startedAt: NOW, audience: cleanAudience({ people: "contacts" }) });
    await store.saveMailCampaign(c);
    await store.suppressMail({ email: "vip@x.test", reason: "complained", campaignId: null, createdAt: NOW });
    // Listing the recipients, then the address unsubscribes before its turn.
    const { mailer, sent } = fakeMailer();
    const deps = { store, now: () => NOW, baseUrl: BASE, secret: SECRET, mailer: async () => mailer, budgetMs: 10_000 };
    await store.saveMailCampaign({ ...c, perMinute: 1 });
    await runMailCampaigns(deps);
    expect(sent).toHaveLength(1);
    const first = sent[0]!.to;
    const other = ["both@a.test", "lead@x.test"].find((e) => e !== first)!;
    await store.suppressMail({ email: other, reason: "unsubscribed", campaignId: null, createdAt: NOW });
    await store.saveMailCampaign({ ...(await store.getMailCampaign(c.id))!, perMinute: 600 });
    await runMailCampaigns({ ...deps, now: () => new Date(NOW.getTime() + 61_000) });
    expect(sent.map((m) => m.to)).toEqual([first]);
    const rows = (await store.listMailRecipients(c.id, { offset: 0, limit: 10 })).items;
    expect(rows.map((r) => r.email).sort()).toEqual(["both@a.test", "lead@x.test"]);
    expect(rows.find((r) => r.email === other)).toMatchObject({ status: "skipped", error: "unsubscribed" });
  });
});

describe("114 a campaign email to a contact", () => {
  it("has their values, the unsubscribe link and the one-click headers; unsubscribing marks the contact", async () => {
    const store = new MemoryStore();
    await store.addMailContacts([contact("layla@x.test", { name: "Layla Saad", company: "Saad Trading", lang: "ar" })]);
    const c = campaign({ audience: cleanAudience({ people: "contacts" }), contents: { ...campaign().contents, ar: { ...campaign().contents.en!, dir: "rtl", subject: "مرحبًا {{first_name|صديقنا}}" } } });
    await store.saveMailCampaign(c);
    expect(await startMailCampaign(store, c, NOW)).toBe(true);
    const { mailer, sent } = fakeMailer();
    await runMailCampaigns({ store, now: () => NOW, baseUrl: BASE, secret: SECRET, mailer: async () => mailer, budgetMs: 10_000 });
    expect(sent).toHaveLength(1);
    const mail = sent[0]!;
    expect(mail.to).toBe("layla@x.test");
    expect(mail.subject).toBe("مرحبًا Layla");
    expect(mail.html).toContain("Hi Layla at Saad Trading, plan none.");
    const oneClick = /^<(.+)>$/.exec(mail.headers!["List-Unsubscribe"]!)![1]!;
    expect(oneClick).toMatch(new RegExp(`^${BASE}/api/mail/unsubscribe/`));
    expect(mail.headers!["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    const token = oneClick.split("/").pop()!;
    expect(mail.html).toContain(`href="${BASE}/unsubscribe/${token}"`);
    // The row says it's a contact; the token leads back to it.
    const found = (await recipientOfToken(store, token, SECRET))!;
    expect(readRecipientToken(token, SECRET)).toBe(found.recipient.id);
    expect(found.recipient).toMatchObject({ email: "layla@x.test", userId: null, clientId: null, contactId: (await store.allMailContacts())[0]!.id, lang: "ar" });
    const later = new Date(NOW.getTime() + 3_600_000);
    await unsubscribeRecipient(store, found.recipient, later);
    expect(await store.getMailSuppression("layla@x.test")).toMatchObject({ reason: "unsubscribed", campaignId: c.id });
    expect((await store.findMailContacts(["layla@x.test"]))[0]!.unsubscribedAt).toEqual(later);
    // Pressing again changes nothing.
    await unsubscribeRecipient(store, found.recipient, new Date(later.getTime() + 1000));
    expect((await store.findMailContacts(["layla@x.test"]))[0]!.unsubscribedAt).toEqual(later);
    expect((await store.mailEventStats(c.id)).unsubscribes).toBe(1);
    // Subscribing again from the page clears both.
    expect(await resubscribe(store, "layla@x.test")).toBe(true);
    expect(await store.getMailSuppression("layla@x.test")).toBeNull();
    expect((await store.findMailContacts(["layla@x.test"]))[0]!.unsubscribedAt).toBeNull();
  });

  it("an account's own switch for an address that's a contact too marks the contact", async () => {
    const store = new MemoryStore();
    await store.addMailContacts([contact("same@x.test")]);
    await setMarketingAllowed(store, "Same@X.test", false, NOW);
    expect((await store.findMailContacts(["same@x.test"]))[0]!.unsubscribedAt).toEqual(NOW);
  });

  it("deleting a contact keeps its address off every campaign", async () => {
    const store = new MemoryStore();
    const gone = contact("gone@x.test");
    await store.addMailContacts([gone]);
    await store.suppressMail({ email: "gone@x.test", reason: "unsubscribed", campaignId: null, createdAt: NOW });
    expect(await store.deleteMailContact(gone.id)).toBe(true);
    expect(await store.getMailSuppression("gone@x.test")).toMatchObject({ reason: "unsubscribed" });
    // Added again later (an import), it still gets nothing.
    await store.addMailContacts([contact("gone@x.test")]);
    expect((await resolveAudience(store, cleanAudience({ people: "contacts" }), { now: NOW, baseUrl: BASE })).people).toEqual([]);
  });
});

describe("114 merge tags for contacts", () => {
  it("fills the name, first name, address and company; the account-only tags are empty, or their default", () => {
    const values = contactValues({ name: "منى حسن", email: "mona@x.test", company: "مخبز منى" }, `${BASE}/sign-up`);
    expect(values).toEqual({ first_name: "منى", name: "منى حسن", email: "mona@x.test", business_name: "مخبز منى", app_name: "", plan: "", expiry_date: "", sign_in_link: `${BASE}/sign-up` });
    const text = "{{first_name|there}} · {{business_name|your business}} · {{plan}} · {{plan|your plan}} · {{expiry_date|soon}} · {{app_name}} · {{sign_in_link}}";
    expect(applyMergeTags(text, values, { html: false })).toBe(`منى · مخبز منى ·  · your plan · soon ·  · ${BASE}/sign-up`);
    // No name: the default; an address typed as the name isn't shown as one.
    const nameless = contactValues({ name: "", email: "x@x.test", company: null }, `${BASE}/sign-up`);
    expect(applyMergeTags("Hi {{first_name|there}} from {{business_name|your team}}", nameless, { html: false })).toBe("Hi there from your team");
    expect(contactValues({ name: "x@x.test", email: "x@x.test", company: null }, "").first_name).toBe("");
  });

  it("documents each tag for contacts, and finds the account-only ones used without a default", () => {
    expect(MERGE_TAGS.filter((t) => t.contact === null).map((t) => t.tag)).toEqual(["app_name", "plan", "expiry_date"]);
    expect(MERGE_TAGS.every((t) => t.contact === null || t.contact.length > 0)).toBe(true);
    expect(accountOnlyTagsWithoutDefault("{{plan}} {{ plan | x }} {{expiry_date}} {{first_name}} {{app_name|}}")).toEqual(["plan", "expiry_date", "app_name"]);
  });

  it("a contact's email built directly uses the contact's values", () => {
    const values = contactValues({ name: "Kemal Öz", email: "kemal@x.test", company: null }, `${BASE}/sign-up`);
    const built = buildRecipientMail(campaign(), { id: 9, email: "kemal@x.test", lang: "tr" }, values, { baseUrl: BASE, secret: SECRET })!;
    expect(built.mail.subject).toBe("Hello Kemal");
    expect(built.mail.html).toContain("Hi Kemal at your business, plan none.");
  });
});
