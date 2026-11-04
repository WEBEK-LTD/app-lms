import { describe, expect, it } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import { resolveAudience } from "@/lib/mailing/audience";
import { buildRecipientMail, runMailCampaigns, startMailCampaign } from "@/lib/mailing/campaigns";
import { emptyContent } from "@/lib/mailing/blocks";
import { marketingAllowed, recipientOfToken, setMarketingAllowed, unsubscribeRecipient } from "@/lib/mailing/consent";
import { recipientToken, validClick } from "@/lib/mailing/tokens";
import type { MailCampaign } from "@/lib/mailing/types";
import type { Mail } from "@/lib/mail";
import { NOW } from "./helpers";

/**
 * 114 Isolation for email campaigns: one person's links act only on their
 * own row and address, a forged or re-signed token does nothing, a click
 * goes only where the email linked, an account's switch changes only its
 * own address, the merge tags of one account never reach another's email,
 * and one campaign's list and counts never touch another's.
 */

const SECRET = "test-signing-secret-0123456789abcdef0123456789";
const BASE = "https://app.yallapp.test";

function campaign(id: string): MailCampaign {
  return {
    id,
    name: id,
    status: "draft",
    archived: false,
    audience: {},
    segmentId: null,
    fromName: null,
    replyTo: null,
    contents: { en: { ...emptyContent("en"), subject: "For {{business_name}} ({{email}})" } },
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
  };
}

async function twoAccounts() {
  const store = new MemoryStore();
  for (const [email, app] of [
    ["ours@a.test", "OURS"],
    ["theirs@b.test", "THEIRS"],
  ] as const) {
    const { client } = await registerClient(store, { name: email, email, whatsapp: "+905446731942", siteUrl: "https://x.test", password: null }, NOW);
    await store.createApp({ id: `app-${app}`, clientId: client.id, appType: "store", appName: app, storeTitle: app } as never);
  }
  return store;
}

async function send(store: MemoryStore, id: string) {
  const sent: Mail[] = [];
  const c = campaign(id);
  await store.saveMailCampaign(c);
  await startMailCampaign(store, c, NOW);
  await runMailCampaigns({ store, now: () => NOW, baseUrl: BASE, secret: SECRET, budgetMs: 10_000, mailer: async () => ({ send: async (m) => void sent.push(m), close() {} }) });
  return sent;
}

describe("114 email campaigns: isolation", () => {
  it("each person's email carries only their own account's values and their own link", async () => {
    const store = await twoAccounts();
    const sent = await send(store, "c-1");
    const ours = sent.find((m) => m.to === "ours@a.test")!;
    const theirs = sent.find((m) => m.to === "theirs@b.test")!;
    expect(ours.subject).toBe("For OURS (ours@a.test)");
    expect(theirs.subject).toBe("For THEIRS (theirs@b.test)");
    expect(ours.html).not.toContain("THEIRS");
    expect(ours.html).not.toContain("theirs@b.test");
    const ourToken = /\/unsubscribe\/([^"]+)"/.exec(ours.html!)![1]!;
    const theirToken = /\/unsubscribe\/([^"]+)"/.exec(theirs.html!)![1]!;
    expect(ourToken).not.toBe(theirToken);
    expect((await recipientOfToken(store, ourToken, SECRET))!.recipient.email).toBe("ours@a.test");
  });

  it("an unsubscribe link changes only its own address", async () => {
    const store = await twoAccounts();
    const sent = await send(store, "c-1");
    const token = /\/unsubscribe\/([^"]+)"/.exec(sent.find((m) => m.to === "ours@a.test")!.html!)![1]!;
    const found = await recipientOfToken(store, token, SECRET);
    await unsubscribeRecipient(store, found!.recipient, NOW);
    expect(await marketingAllowed(store, "ours@a.test")).toBe(false);
    expect(await marketingAllowed(store, "theirs@b.test")).toBe(true);
  });

  it("a token for a row that isn't signed here, or of another secret, does nothing", async () => {
    const store = await twoAccounts();
    await send(store, "c-1");
    const rows = (await store.listMailRecipients("c-1", { offset: 0, limit: 10 })).items;
    const theirs = rows.find((r) => r.email === "theirs@b.test")!;
    // Their number with our row's signature, and their number signed with another key.
    const ours = recipientToken(rows.find((r) => r.email === "ours@a.test")!.id, SECRET);
    const forged = `${theirs.id.toString(36)}.${ours.split(".")[1]}`;
    expect(await recipientOfToken(store, forged, SECRET)).toBeNull();
    expect(await recipientOfToken(store, recipientToken(theirs.id, "another-secret-0123456789abcdef01234567"), SECRET)).toBeNull();
    expect(await recipientOfToken(store, recipientToken(999_999, SECRET), SECRET)).toBeNull();
  });

  it("a click's signature is for one person and one address", async () => {
    const store = await twoAccounts();
    const c = campaign("c-1");
    const ours = buildRecipientMail({ ...c, contents: { en: { ...c.contents.en!, mode: "html", html: '<a href="https://ours.test/page">go</a>', doc: null } } }, { id: 1, email: "ours@a.test", lang: "en" }, {}, { baseUrl: BASE, secret: SECRET })!;
    const link = new URL(/href="([^"]*\/api\/mail\/click\/[^"]+)"/.exec(ours.mail.html!)![1]!.replace(/&amp;/g, "&"));
    const token = link.pathname.split("/").pop()!;
    const signature = link.searchParams.get("s")!;
    expect(validClick(token, "https://ours.test/page", signature, SECRET)).toBe(true);
    expect(validClick(token, "https://evil.test/", signature, SECRET)).toBe(false);
    expect(validClick(recipientToken(2, SECRET), "https://ours.test/page", signature, SECRET)).toBe(false);
    void store;
  });

  it("an account's switch changes only that address", async () => {
    const store = await twoAccounts();
    await setMarketingAllowed(store, "ours@a.test", false, NOW);
    const people = (await resolveAudience(store, {}, { now: NOW, baseUrl: BASE })).people.map((p) => p.email);
    expect(people).toEqual(["theirs@b.test"]);
  });

  it("one campaign's list, counts and events never touch another's", async () => {
    const store = await twoAccounts();
    await send(store, "c-1");
    await store.saveMailCampaign(campaign("c-2"));
    expect((await store.countMailRecipients("c-2")).sent).toBe(0);
    await store.addMailEvent({ campaignId: "c-1", email: "ours@a.test", kind: "open", url: null, at: NOW });
    expect((await store.mailEventStats("c-2")).opens).toBe(0);
    await store.deleteMailCampaign("c-2");
    expect((await store.countMailRecipients("c-1")).sent).toBe(2);
    expect((await store.mailEventStats("c-1")).opens).toBe(1);
  });
});
