import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUDIT_ACTIONS, AUDIT_TARGETS } from "@/lib/admin/audit-actions";
import { can, type AdminRole } from "@/lib/admin/permissions";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import { recipientToken } from "@/lib/mailing/tokens";
import { MAIL_CONTACT_AGREEMENT } from "@/lib/mailing/types";
import { NOW } from "./helpers";

/** 114 Admin › Email campaigns › Contacts: who may use it, what adding and importing need, the export and the inbox's one-click unsubscribe. */

const SECRET = "test-signing-secret-0123456789abcdef0123456789";
const state: { store: MemoryStore; role: AdminRole } = { store: new MemoryStore(), role: "admin" };
type Entry = { action: string; target: { type: string; id: unknown }; summary: string };
const audit = vi.fn<(entry: Entry) => Promise<null>>(async () => null);

class Redirected extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
}

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn(async (permission = "view") => {
    if (!can(state.role, permission)) throw new Redirected(`/admin?denied=${permission}`);
    return { id: "u-admin", email: "sara@yallapp.test", name: "Sara", adminRole: state.role };
  }),
  adminCan: vi.fn(async (permission: Parameters<typeof can>[1]) => can(state.role, permission)),
}));
vi.mock("@/lib/data", () => ({ getStore: async () => state.store }));
vi.mock("@/lib/admin/audit", () => ({ recordAudit: (entry: Entry) => audit(entry) }));
vi.mock("@/lib/env", () => ({ signingSecret: () => SECRET, appUrl: () => "https://app.yallapp.test" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

const { addMailContactAction, deleteMailContactsAction, importMailContactsAction, previewMailContactImportAction, tagMailContactsAction, updateMailContactAction } = await import("@/app/actions/admin-mail-contacts");
const { countMailAudienceAction } = await import("@/app/actions/admin-mail");
const exportRoute = await import("@/app/admin/email-campaigns/contacts/export/route");
const oneClick = await import("@/app/api/mail/unsubscribe/[token]/route");

const NEW = { email: "Mona@Example.com", name: "Mona Hassan", company: "Mona's Bakery", lang: "en", country: "EG", tags: "lead, cairo", source: "met", sourceNote: "", agreed: true };

beforeEach(() => {
  state.store = new MemoryStore();
  state.role = "admin";
  audit.mockClear();
});

describe("114 contacts: permissions", () => {
  it("is for the team members who write campaigns (marketing.edit): owners and admins, not support or viewers", async () => {
    expect((["owner", "admin", "support", "viewer"] as const).map((role) => can(role, "marketing.edit"))).toEqual([true, true, false, false]);
    for (const role of ["support", "viewer"] as const) {
      state.role = role;
      await expect(addMailContactAction(NEW)).rejects.toThrow("redirect /admin?denied=marketing.edit");
      await expect(previewMailContactImportAction({ text: "a@x.test", format: "paste" })).rejects.toThrow(Redirected);
      await expect(importMailContactsAction({ text: "a@x.test", format: "paste", source: "customer", agreed: true })).rejects.toThrow(Redirected);
      await expect(updateMailContactAction("x", { email: "a@x.test", source: "customer" })).rejects.toThrow(Redirected);
      await expect(tagMailContactsAction(["x"], "vip", true)).rejects.toThrow(Redirected);
      await expect(deleteMailContactsAction(["x"])).rejects.toThrow(Redirected);
      await expect(exportRoute.GET(new Request("https://app.yallapp.test/admin/email-campaigns/contacts/export"))).rejects.toThrow(Redirected);
    }
    expect(await state.store.allMailContacts()).toEqual([]);
    expect(audit).not.toHaveBeenCalled();
    state.role = "owner";
    expect((await addMailContactAction(NEW)).ok).toBe(true);
  });

  it("logs every change under its own audit action", () => {
    for (const action of ["mail.contact_add", "mail.contact_import", "mail.contact_update", "mail.contact_tag", "mail.contact_delete", "mail.contact_export"]) expect(AUDIT_ACTIONS).toHaveProperty([action]);
    expect(AUDIT_TARGETS).toHaveProperty(["mail_contact"]);
  });
});

describe("114 contacts: adding one", () => {
  it("needs the tick and where they're from, and keeps who added them and when", async () => {
    expect(await addMailContactAction({ ...NEW, agreed: false })).toMatchObject({ ok: false, errors: { agreed: `Tick “${MAIL_CONTACT_AGREEMENT}” to add them.` } });
    expect(await addMailContactAction({ ...NEW, source: "" })).toMatchObject({ ok: false, errors: { source: "Choose where you know them from." } });
    expect(await addMailContactAction({ ...NEW, source: "other", sourceNote: "" })).toMatchObject({ ok: false, errors: { sourceNote: "Write where you know them from." } });
    // A tick sent as text isn't a tick.
    expect((await addMailContactAction({ ...NEW, agreed: "true" as unknown as boolean })).ok).toBe(false);
    expect(await state.store.allMailContacts()).toEqual([]);
    const before = Date.now();
    const added = await addMailContactAction(NEW);
    expect(added.ok).toBe(true);
    const [saved] = await state.store.allMailContacts();
    expect(saved).toMatchObject({ email: "mona@example.com", name: "Mona Hassan", company: "Mona's Bakery", lang: "en", country: "EG", tags: ["cairo", "lead"], source: "met", sourceNote: null, addedBy: "sara@yallapp.test", unsubscribedAt: null });
    expect(saved!.addedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "mail.contact_add", target: { type: "mail_contact", id: saved!.id }, summary: expect.stringContaining(MAIL_CONTACT_AGREEMENT) }));
  });

  it("doesn't add an address twice, nor one that has a Yallapp account", async () => {
    await addMailContactAction(NEW);
    expect(await addMailContactAction({ ...NEW, email: "MONA@example.com " })).toMatchObject({ ok: false, errors: { email: "Already a contact." } });
    await registerClient(state.store, { name: "Owner", email: "owner@a.test", whatsapp: "+905446731942", siteUrl: "https://a.test", password: null }, NOW);
    expect(await addMailContactAction({ ...NEW, email: "Owner@A.test" })).toMatchObject({ ok: false, errors: { email: "Has a Yallapp account." } });
    expect(await state.store.allMailContacts()).toHaveLength(1);
  });
});

describe("114 contacts: importing", () => {
  const CSV = '﻿email,name,company,language,country,tags\r\n"layla@x.test","ليلى سعد","Saad, Trading",ar,EG,vip\r\nbad,No,,,,\r\nlayla@x.test,Again,,,,\r\nowner@a.test,Owner,,,,\r\nold@x.test,Old,,,,\r\n';

  it("previews every row with its problem, adding nothing", async () => {
    await registerClient(state.store, { name: "Owner", email: "owner@a.test", whatsapp: "+905446731942", siteUrl: "https://a.test", password: null }, NOW);
    await addMailContactAction({ ...NEW, email: "old@x.test" });
    const preview = await previewMailContactImportAction({ text: CSV, format: "csv", lang: "tr", country: "TR", tags: "expo" });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.rows.map((r) => [r.line, r.email, r.status])).toEqual([
      [2, "layla@x.test", "new"],
      [3, "bad", "error"],
      [4, "layla@x.test", "duplicate"],
      [5, "owner@a.test", "account"],
      [6, "old@x.test", "contact"],
    ]);
    expect(preview.rows[0]).toMatchObject({ name: "ليلى سعد", company: "Saad, Trading", lang: "ar", country: "EG", tags: ["expo", "vip"] });
    expect(preview.summary).toEqual({ new: 1, duplicate: 1, contact: 1, account: 1, error: 1 });
    expect(await state.store.allMailContacts()).toHaveLength(1);
    expect(await previewMailContactImportAction({ text: "a@x.test,Mona", format: "csv" })).toMatchObject({ ok: false, error: expect.stringContaining("first row must name the columns") });
  });

  it("needs the tick and the source, checks the rows again, and adds only the new ones", async () => {
    await registerClient(state.store, { name: "Owner", email: "owner@a.test", whatsapp: "+905446731942", siteUrl: "https://a.test", password: null }, NOW);
    await addMailContactAction({ ...NEW, email: "old@x.test" });
    audit.mockClear();
    expect(await importMailContactsAction({ text: CSV, format: "csv", source: "event", sourceNote: "Expo 2026", agreed: false })).toMatchObject({ ok: false, errors: { agreed: expect.any(String) } });
    expect(await importMailContactsAction({ text: CSV, format: "csv", source: "", agreed: true })).toMatchObject({ ok: false, errors: { source: expect.any(String) } });
    expect(await importMailContactsAction({ text: CSV, format: "csv", source: "other", sourceNote: " ", agreed: true })).toMatchObject({ ok: false, errors: { sourceNote: expect.any(String) } });
    expect(await state.store.allMailContacts()).toHaveLength(1);
    const done = await importMailContactsAction({ text: CSV, format: "csv", source: "event", sourceNote: "Expo 2026", agreed: true });
    expect(done).toMatchObject({ ok: true, added: 1, summary: { new: 1, duplicate: 1, contact: 1, account: 1, error: 1 } });
    const all = await state.store.allMailContacts();
    expect(all.map((c) => c.email).sort()).toEqual(["layla@x.test", "old@x.test"]);
    expect(all.find((c) => c.email === "layla@x.test")).toMatchObject({ source: "event", sourceNote: "Expo 2026", addedBy: "sara@yallapp.test" });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "mail.contact_import", summary: expect.stringMatching(/^Imported 1 contacts \(CSV file; 1 already contacts, 1 with an account, 1 listed twice, 1 with errors\)/) }));
    // The same file again adds nothing.
    expect(await importMailContactsAction({ text: CSV, format: "csv", source: "event", agreed: true })).toEqual({ ok: false, error: "No new contacts to add." });
  });

  it("imports a pasted list", async () => {
    const done = await importMailContactsAction({ text: "a@x.test, Ayşe Yılmaz, Çiçek Ltd\nb@x.test, \"Ali, Jr\"\n", format: "paste", lang: "tr", source: "customer", agreed: true });
    expect(done).toMatchObject({ ok: true, added: 2 });
    expect((await state.store.findMailContacts(["b@x.test"]))[0]).toMatchObject({ name: "Ali, Jr", lang: "tr", source: "customer" });
  });
});

describe("114 contacts: editing, tags, deleting and the export", () => {
  async function two() {
    await addMailContactAction(NEW);
    await addMailContactAction({ ...NEW, email: "nour@x.test", name: "نور", tags: "" });
    const [nour, mona] = await Promise.all([state.store.findMailContacts(["nour@x.test"]), state.store.findMailContacts(["mona@example.com"])]);
    return { nour: nour[0]!, mona: mona[0]! };
  }

  it("edits a contact, never onto another's address", async () => {
    const { nour, mona } = await two();
    expect(await updateMailContactAction(nour.id, { email: "mona@example.com", lang: "ar", source: "met" })).toMatchObject({ ok: false, errors: { email: "Another contact has it." } });
    expect(await updateMailContactAction(nour.id, { email: "nour@x.test", name: "نور علي", lang: "ar", country: "", tags: "vip", source: "other", sourceNote: "WhatsApp group" })).toEqual({ ok: true });
    expect(await state.store.getMailContact(nour.id)).toMatchObject({ name: "نور علي", lang: "ar", country: null, tags: ["vip"], source: "other", sourceNote: "WhatsApp group", addedBy: "sara@yallapp.test" });
    expect(await updateMailContactAction(mona.id, { email: "mona@example.com", lang: "en", source: "" })).toMatchObject({ ok: false, errors: { source: expect.any(String) } });
    expect(await updateMailContactAction("missing", { email: "z@x.test", source: "met" })).toEqual({ ok: false, error: "This contact no longer exists." });
  });

  it("tags and untags the chosen ones, and filters by tag", async () => {
    const { nour, mona } = await two();
    expect(await tagMailContactsAction([nour.id, mona.id], " VIP ", true)).toEqual({ ok: true, changed: 2 });
    expect(await tagMailContactsAction([nour.id, mona.id], "vip", true)).toEqual({ ok: true, changed: 0 });
    expect((await state.store.listMailContacts({ tag: "vip", offset: 0, limit: 10 })).total).toBe(2);
    expect(await tagMailContactsAction([mona.id], "vip", false)).toEqual({ ok: true, changed: 1 });
    expect((await state.store.listMailContacts({ tag: "vip", offset: 0, limit: 10 })).items.map((c) => c.email)).toEqual(["nour@x.test"]);
    expect(await state.store.listMailContactTags()).toEqual([
      { tag: "cairo", count: 1 },
      { tag: "lead", count: 1 },
      { tag: "vip", count: 1 },
    ]);
    expect(await tagMailContactsAction([mona.id], "  ", true)).toEqual({ ok: false, error: "Write a tag." });
  });

  it("deletes contacts and keeps their addresses on the list never to be mailed", async () => {
    const { nour, mona } = await two();
    await state.store.suppressMail({ email: "nour@x.test", reason: "bounced", campaignId: null, createdAt: NOW });
    expect(await deleteMailContactsAction([nour.id, mona.id, "missing"])).toEqual({ ok: true, deleted: 2 });
    expect(await state.store.allMailContacts()).toEqual([]);
    expect(await state.store.getMailSuppression("nour@x.test")).toMatchObject({ reason: "bounced" });
  });

  it("exports the contacts as CSV with whether each gets campaigns, and logs it", async () => {
    await two();
    await state.store.suppressMail({ email: "nour@x.test", reason: "unsubscribed", campaignId: null, createdAt: NOW });
    const response = await exportRoute.GET(new Request("https://app.yallapp.test/admin/email-campaigns/contacts/export"));
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="yallapp-contacts-\d{4}-\d{2}-\d{2}\.csv"$/);
    const csv = await response.text();
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(3);
    expect(csv).toMatch(/nour@x\.test,نور,Mona's Bakery,en,EG,,Met in person \/ call,,Unsubscribed,sara@yallapp\.test,/);
    expect(csv).toMatch(/mona@example\.com,Mona Hassan,Mona's Bakery,en,EG,"cairo; lead",Met in person \/ call,,Gets campaigns,/);
    const tagged = await (await exportRoute.GET(new Request("https://app.yallapp.test/admin/email-campaigns/contacts/export?tag=lead"))).text();
    expect(tagged).not.toContain("nour@x.test");
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ action: "mail.contact_export", summary: "Exported 1 contacts as CSV (tag “lead”)" }));
  });
});

describe("114 contacts: the audience count and the inbox's one-click unsubscribe", () => {
  it("counts contacts in the audience preview", async () => {
    await registerClient(state.store, { name: "Owner", email: "owner@a.test", whatsapp: "+905446731942", siteUrl: "https://a.test", password: null }, NOW);
    await addMailContactAction({ ...NEW, email: "lead@x.test" });
    await addMailContactAction({ ...NEW, email: "lead2@x.test" });
    expect(await countMailAudienceAction({})).toMatchObject({ count: 1, contacts: 0 });
    expect(await countMailAudienceAction({ people: "both" })).toMatchObject({ count: 3, contacts: 2, suppressed: 0, everyone: true });
    await state.store.suppressMail({ email: "lead2@x.test", reason: "complained", campaignId: null, createdAt: NOW });
    expect(await countMailAudienceAction({ people: "contacts" })).toMatchObject({ count: 1, contacts: 1, suppressed: 1 });
  });

  it("POST to the List-Unsubscribe address unsubscribes the contact", async () => {
    await addMailContactAction({ ...NEW, email: "lead@x.test" });
    const [lead] = await state.store.allMailContacts();
    await state.store.saveMailCampaign({
      id: "c0000000-0000-4000-8000-0000000000c2",
      name: "News",
      status: "sending",
      archived: false,
      audience: { people: "contacts" },
      segmentId: null,
      fromName: null,
      replyTo: null,
      contents: {},
      defaultLang: "en",
      track: false,
      perMinute: 60,
      scheduledAt: null,
      timeZone: null,
      recipients: 1,
      createdBy: "sara@yallapp.test",
      createdAt: NOW,
      updatedAt: NOW,
      startedAt: NOW,
      finishedAt: null,
    });
    await state.store.addMailRecipients([{ campaignId: "c0000000-0000-4000-8000-0000000000c2", email: "lead@x.test", userId: null, clientId: null, contactId: lead!.id, name: "Mona", lang: "en", status: "sent", attempts: 1, error: null, nextAttemptAt: null, claim: null, leaseUntil: null, sentAt: NOW, team: false }]);
    const [row] = (await state.store.listMailRecipients("c0000000-0000-4000-8000-0000000000c2", { offset: 0, limit: 1 })).items;
    const token = recipientToken(row!.id, SECRET);
    expect((await oneClick.POST(new Request("https://app.yallapp.test/x", { method: "POST" }), { params: Promise.resolve({ token: `${token}x` }) })).status).toBe(404);
    const response = await oneClick.POST(new Request(`https://app.yallapp.test/api/mail/unsubscribe/${token}`, { method: "POST", body: "List-Unsubscribe=One-Click" }), { params: Promise.resolve({ token }) });
    expect(response.status).toBe(200);
    expect(await state.store.getMailSuppression("lead@x.test")).toMatchObject({ reason: "unsubscribed" });
    expect((await state.store.getMailContact(lead!.id))!.unsubscribedAt).not.toBeNull();
    // The admin can't undo a person's own unsubscribe.
    const { unsuppressMailAddressAction } = await import("@/app/actions/admin-mail");
    expect(await unsuppressMailAddressAction("lead@x.test", true)).toMatchObject({ ok: false });
  });
});
