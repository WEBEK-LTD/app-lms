import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { emptyContent } from "@/lib/mailing/blocks";
import type { DataStore } from "@/lib/data/store";
import type { MailCampaign, MailRecipient } from "@/lib/mailing/types";
import { NOW } from "./helpers";

/** 114 Email campaigns' storage, the same on every store (MemoryStore, and MySQL or MariaDB with migration 0111). */
export function mailingStoreSuite(store: () => DataStore) {
  const campaign = (patch: Partial<MailCampaign> = {}): MailCampaign => ({
    id: randomUUID(),
    name: "Suite campaign",
    status: "draft",
    archived: false,
    audience: { states: ["active"], langs: ["ar"] },
    segmentId: null,
    fromName: "Yallapp",
    replyTo: null,
    contents: { ar: { ...emptyContent("ar"), subject: "مرحبًا" } },
    defaultLang: "ar",
    track: true,
    perMinute: 60,
    scheduledAt: null,
    timeZone: "Africa/Cairo",
    recipients: 0,
    createdBy: "admin@yallapp.test",
    createdAt: NOW,
    updatedAt: NOW,
    startedAt: null,
    finishedAt: null,
    ...patch,
  });
  const row = (campaignId: string, email: string): Omit<MailRecipient, "id"> => ({
    campaignId,
    email,
    userId: null,
    clientId: null,
    name: "Person",
    lang: "ar",
    status: "queued",
    attempts: 0,
    error: null,
    nextAttemptAt: null,
    claim: null,
    leaseUntil: null,
    sentAt: null,
    team: false,
  });

  it("saves, lists and moves a campaign only from the statuses given", async () => {
    const s = store();
    const c = campaign();
    await s.saveMailCampaign(c);
    expect(await s.getMailCampaign(c.id)).toEqual(c);
    await s.saveMailCampaign({ ...c, name: "Renamed", updatedAt: new Date(NOW.getTime() + 1000) });
    expect((await s.getMailCampaign(c.id))!.name).toBe("Renamed");
    expect((await s.listMailCampaigns()).some((x) => x.id === c.id)).toBe(true);
    expect((await s.listMailCampaigns({ archived: true })).some((x) => x.id === c.id)).toBe(false);
    expect(await s.setMailCampaignStatus(c.id, ["scheduled"], { status: "sending" })).toBe(false);
    expect(await s.setMailCampaignStatus(c.id, ["draft"], { status: "sending", startedAt: NOW, recipients: 3 })).toBe(true);
    expect(await s.setMailCampaignStatus(c.id, ["draft"], { status: "sending" })).toBe(false);
    const after = (await s.getMailCampaign(c.id))!;
    expect(after.status).toBe("sending");
    expect(after.recipients).toBe(3);
    await s.deleteMailCampaign(c.id);
    expect(await s.getMailCampaign(c.id)).toBeNull();
  });

  it("lists an address once, takes rows for one run, finishes them only with the run's claim", async () => {
    const s = store();
    const c = campaign();
    await s.saveMailCampaign(c);
    const tag = randomUUID().slice(0, 8);
    const emails = [0, 1, 2, 3].map((i) => `p${i}-${tag}@suite.test`);
    expect(await s.addMailRecipients(emails.map((e) => row(c.id, e)))).toBe(4);
    expect(await s.addMailRecipients([row(c.id, emails[0]!)])).toBe(0);
    const a = await s.claimMailRecipients(c.id, "run-a", 3, NOW, new Date(NOW.getTime() + 60_000));
    const b = await s.claimMailRecipients(c.id, "run-b", 3, NOW, new Date(NOW.getTime() + 60_000));
    expect(a).toHaveLength(3);
    expect(b).toHaveLength(1);
    expect(new Set([...a, ...b].map((r) => r.email)).size).toBe(4);
    expect(await s.finishMailRecipient(a[0]!.id, "run-b", { status: "sent", error: null, nextAttemptAt: null, sentAt: NOW, attempts: 1 })).toBe(false);
    expect(await s.finishMailRecipient(a[0]!.id, "run-a", { status: "sent", error: null, nextAttemptAt: null, sentAt: NOW, attempts: 1 })).toBe(true);
    expect(await s.finishMailRecipient(a[1]!.id, "run-a", { status: "queued", error: "timeout", nextAttemptAt: new Date(NOW.getTime() + 300_000), sentAt: null, attempts: 1 })).toBe(true);
    expect(await s.claimMailRecipients(c.id, "run-c", 5, NOW, new Date(NOW.getTime() + 60_000))).toHaveLength(0);
    expect(await s.claimMailRecipients(c.id, "run-c", 5, new Date(NOW.getTime() + 300_000), new Date(NOW.getTime() + 360_000))).toHaveLength(1);
    expect(await s.countMailSentSince(c.id, new Date(NOW.getTime() - 1000))).toBe(1);
    expect(await s.expireMailRecipientClaims(c.id, new Date(NOW.getTime() + 61_000))).toBe(2);
    const counts = await s.countMailRecipients(c.id);
    expect(counts).toEqual({ queued: 0, sending: 1, sent: 1, failed: 2, skipped: 0 });
    expect(await s.skipMailRecipients(c.id, ["sending"], "cancelled")).toBe(1);
    const listed = await s.listMailRecipients(c.id, { offset: 0, limit: 2 });
    expect(listed.total).toBe(4);
    expect(listed.items).toHaveLength(2);
    expect((await s.listMailRecipients(c.id, { status: "sent", offset: 0, limit: 10 })).items.map((r) => r.email)).toEqual([a[0]!.email]);
    expect((await s.listMailRecipients(c.id, { query: "p3-", offset: 0, limit: 10 })).total).toBe(1);
    expect((await s.getMailRecipient(a[0]!.id))!.status).toBe("sent");
    await s.deleteMailCampaign(c.id);
    expect(await s.getMailRecipient(a[0]!.id)).toBeNull();
  });

  it("counts events per person and per link", async () => {
    const s = store();
    const c = campaign();
    await s.saveMailCampaign(c);
    for (const [email, kind, url] of [
      ["a@suite.test", "open", null],
      ["a@suite.test", "open", null],
      ["b@suite.test", "open", null],
      ["a@suite.test", "click", "https://x.test"],
      ["b@suite.test", "click", "https://x.test"],
      ["b@suite.test", "unsubscribe", null],
    ] as const) {
      await s.addMailEvent({ campaignId: c.id, email, kind, url, at: NOW });
    }
    // A campaign that's gone counts nothing (and doesn't fail).
    await s.addMailEvent({ campaignId: randomUUID(), email: "a@suite.test", kind: "open", url: null, at: NOW });
    expect(await s.mailEventStats(c.id)).toEqual({ opens: 3, uniqueOpens: 2, clicks: 2, uniqueClicks: 2, unsubscribes: 1, bounces: 0, complaints: 0, links: [{ url: "https://x.test", clicks: 2, unique: 2 }] });
    await s.deleteMailCampaign(c.id);
  });

  it("keeps addresses never to be mailed, in lower case, with their first reason", async () => {
    const s = store();
    const email = `Someone-${randomUUID().slice(0, 8)}@Suite.test`;
    await s.suppressMail({ email, reason: "unsubscribed", campaignId: null, createdAt: NOW });
    await s.suppressMail({ email, reason: "bounced", campaignId: null, createdAt: NOW });
    expect((await s.getMailSuppression(email.toUpperCase()))!.reason).toBe("unsubscribed");
    expect(await s.listMailSuppressed([email, "other@suite.test"])).toEqual([email.toLowerCase()]);
    expect((await s.listMailSuppressions({ query: email.slice(0, 16).toLowerCase(), offset: 0, limit: 5 })).total).toBe(1);
    await s.unsuppressMail(email);
    expect(await s.getMailSuppression(email)).toBeNull();
  });

  it("saves segments and templates", async () => {
    const s = store();
    const id = randomUUID();
    await s.saveMailSegment({ id, name: "Arabic owners", audience: { langs: ["ar"] }, createdAt: NOW, updatedAt: NOW });
    expect((await s.listMailSegments()).find((x) => x.id === id)!.audience).toEqual({ langs: ["ar"] });
    await s.deleteMailSegment(id);
    expect((await s.listMailSegments()).some((x) => x.id === id)).toBe(false);
    const t = { id: randomUUID(), name: "Mine", category: "Saved", contents: { en: { ...emptyContent("en"), subject: "Hi" } }, createdBy: "a@yallapp.test", createdAt: NOW, updatedAt: NOW };
    await s.saveMailTemplate(t);
    expect(await s.getMailTemplate(t.id)).toEqual(t);
    await s.deleteMailTemplate(t.id);
    expect(await s.getMailTemplate(t.id)).toBeNull();
  });

  it("keeps each run's pace, and drops the history past its 12 months", async () => {
    const s = store();
    const old = campaign({ status: "sent", finishedAt: new Date(NOW.getTime() - 400 * 86_400_000) });
    const recent = campaign({ status: "sent", finishedAt: NOW });
    await s.saveMailCampaign(old);
    await s.saveMailCampaign(recent);
    for (const c of [old, recent]) {
      await s.addMailRecipients([row(c.id, `history-${c.id}@suite.test`)]);
      await s.addMailRun({ campaignId: c.id, startedAt: new Date(NOW.getTime() - 7000), finishedAt: NOW, sent: 60, failed: 0, attempted: 60 });
      await s.addMailRun({ campaignId: c.id, startedAt: NOW, finishedAt: new Date(NOW.getTime() + 5000), sent: 40, failed: 1, attempted: 41 });
    }
    await s.addMailEvent({ campaignId: old.id, email: "a@suite.test", kind: "open", url: null, at: new Date(NOW.getTime() - 400 * 86_400_000) });
    await s.addMailEvent({ campaignId: recent.id, email: "a@suite.test", kind: "open", url: null, at: NOW });
    const runs = await s.listMailRuns(recent.id, 10);
    expect(runs.map((r) => r.sent)).toEqual([40, 60]);
    const pruned = await s.pruneMailHistory(new Date(NOW.getTime() - 365 * 86_400_000));
    expect(pruned.events).toBeGreaterThanOrEqual(1);
    expect(pruned.recipients).toBeGreaterThanOrEqual(1);
    expect(pruned.runs).toBeGreaterThanOrEqual(2);
    expect(await s.listMailRuns(old.id, 10)).toEqual([]);
    expect((await s.countMailRecipients(old.id)).queued).toBe(0);
    expect(await s.listMailRuns(recent.id, 10)).toHaveLength(2);
    expect((await s.countMailRecipients(recent.id)).queued).toBe(1);
    expect((await s.mailEventStats(recent.id)).opens).toBe(1);
    expect((await s.getMailCampaign(old.id))!.status).toBe("sent");
    await s.deleteMailCampaign(old.id);
    await s.deleteMailCampaign(recent.id);
  });
}
