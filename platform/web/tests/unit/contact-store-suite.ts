import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, ContactMessageInput } from "@/lib/data/types";
import { NOW } from "./helpers";

/** 184.3 A courier job's chat and the owner's switches, the same on every store (MemoryStore, and MySQL or MariaDB with migration 0145). */
export function contactStoreSuite(store: () => DataStore) {
  async function setup(s: DataStore) {
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(s, { name: "Nile Express", email: `contact-${suffix}@nile.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "delivery"), backend: "hosted" };
    await s.createApp(app);
    const place = { address: "Tahrir Square", details: null, lat: 30.04, lng: 31.23 };
    const job = await s.createShipment({
      appId: app.id, userId: null, senderName: "Mona", senderPhone: null, serviceId: null, serviceName: null, pickup: place, dropoff: place, zoneId: null, zoneName: null,
      distanceKm: 1, packageSize: "small", packageDescription: null, recipientName: "Mona Adel", recipientPhone: "+201015550000", notes: null, priceCents: 0, currency: "EGP",
      paymentMethod: "cash", paymentStatus: "unpaid", orderId: null, status: "assigned", courierId: null, courierName: "Karim", timeline: [], lang: null, foodOrderId: null, createdAt: NOW, updatedAt: NOW,
    });
    const message = (patch: Partial<ContactMessageInput> = {}): ContactMessageInput => ({
      appId: app.id, shipmentId: job.id, courierId: 7, sender: "customer", kind: "text", body: "Hello", quick: null, lat: null, lng: null, clientId: null, createdAt: NOW, ...patch,
    });
    return { app, job, message };
  }

  it("keeps the owner's switches, none saved by default", async () => {
    const s = store();
    const { app } = await setup(s);
    expect(await s.getContactSettings(app.id)).toBeNull();
    await s.saveContactSettings({ appId: app.id, chat: false, appCall: true, phoneCall: false, updatedAt: NOW });
    expect(await s.getContactSettings(app.id)).toMatchObject({ appId: app.id, chat: false, appCall: true, phoneCall: false, updatedAt: NOW });
    await s.saveContactSettings({ appId: app.id, chat: true, appCall: false, phoneCall: true, updatedAt: new Date(NOW.getTime() + 1000) });
    expect(await s.getContactSettings(app.id)).toMatchObject({ chat: true, appCall: false, phoneCall: true });
  });

  it("adds messages once per client_id, lists them oldest first, by conversation and after an id", async () => {
    const s = store();
    const { app, job, message } = await setup(s);
    const first = await s.createContactMessage(message({ clientId: "m-1" }));
    expect(first.created).toBe(true);
    const again = await s.createContactMessage(message({ clientId: "m-1", body: "Changed" }));
    expect([again.created, again.message.id, again.message.body]).toEqual([false, first.message.id, "Hello"]);
    // The same client_id from the other side is its own message.
    const theirs = await s.createContactMessage(message({ clientId: "m-1", sender: "courier", kind: "quick", body: null, quick: "at_door" }));
    expect(theirs.created).toBe(true);
    const place = await s.createContactMessage(message({ kind: "location", body: null, lat: 30.0459, lng: 31.2243 }));
    // Another courier's conversation on the same job.
    await s.createContactMessage(message({ courierId: 8, body: "New courier" }));
    const karim = await s.listContactMessages(app.id, job.id, { courierId: 7, limit: 50 });
    expect(karim.map((m) => [m.sender, m.kind, m.body, m.quick])).toEqual([
      ["customer", "text", "Hello", null],
      ["courier", "quick", null, "at_door"],
      ["customer", "location", null, null],
    ]);
    expect(karim[2]).toMatchObject({ lat: 30.0459, lng: 31.2243, createdAt: NOW });
    expect((await s.listContactMessages(app.id, job.id, { courierId: 7, afterId: first.message.id, limit: 50 })).map((m) => m.id)).toEqual([theirs.message.id, place.message.id]);
    // The newest `limit`, still oldest first.
    expect((await s.listContactMessages(app.id, job.id, { courierId: 7, limit: 2 })).map((m) => m.id)).toEqual([theirs.message.id, place.message.id]);
    expect(await s.listContactMessages(app.id, job.id, { limit: 50 })).toHaveLength(4);
    expect(await s.listContactMessages(app.id, job.id + 1000, { limit: 50 })).toEqual([]);
  });

  it("moves each side's read mark forward only", async () => {
    const s = store();
    const { app, job } = await setup(s);
    expect(await s.listContactReads(app.id, job.id)).toEqual([]);
    await s.markContactRead(app.id, job.id, "customer", 5, NOW);
    const later = new Date(NOW.getTime() + 60_000);
    await s.markContactRead(app.id, job.id, "customer", 3, later);
    await s.markContactRead(app.id, job.id, "courier", 4, later);
    const reads = (await s.listContactReads(app.id, job.id)).sort((a, b) => a.side.localeCompare(b.side));
    expect(reads).toEqual([
      { appId: app.id, shipmentId: job.id, side: "courier", lastReadId: 4, readAt: later },
      { appId: app.id, shipmentId: job.id, side: "customer", lastReadId: 5, readAt: NOW },
    ]);
    await s.markContactRead(app.id, job.id, "customer", 9, later);
    expect((await s.listContactReads(app.id, job.id)).find((r) => r.side === "customer")).toMatchObject({ lastReadId: 9, readAt: later });
  });

  it("keeps the owner's Twilio account, its last test and a pause (184.5)", async () => {
    const s = store();
    const { app } = await setup(s);
    const later = new Date(NOW.getTime() + 60_000);
    const settings = {
      appId: app.id, chat: true, appCall: true, phoneCall: true, turn: "twilio" as const,
      twilio: { accountSid: `AC${"a1".repeat(16)}`, keySid: null, secretEncrypted: "v2:sealed", number: "+14155550142" },
      twilioCheck: { at: NOW, ok: false, problem: "low_balance" as const, checks: [{ name: "balance" as const, ok: false, problem: "low_balance" as const }], balance: { amount: "0.12", currency: "USD" } },
      phonePausedAt: later, updatedAt: later,
    };
    await s.saveContactSettings(settings);
    expect(await s.getContactSettings(app.id)).toEqual(settings);
    await s.saveContactSettings({ ...settings, twilio: null, twilioCheck: null, phonePausedAt: null, turn: "direct" });
    expect(await s.getContactSettings(app.id)).toMatchObject({ twilio: null, twilioCheck: null, phonePausedAt: null, turn: "direct" });
  });

  it("logs calls without numbers, newest first, per job (184.5)", async () => {
    const s = store();
    const { app, job } = await setup(s);
    const base = { appId: app.id, shipmentId: job.id, courierId: 7, kind: "phone" as const, caller: "customer" as const, status: "calling" as const, providerSid: null, problem: null, durationSeconds: null, createdAt: NOW, answeredAt: null, endedAt: null };
    const first = await s.createContactCall(base);
    const second = await s.createContactCall({ ...base, caller: "courier" });
    expect(await s.updateContactCall(app.id, first.id, { status: "completed", providerSid: "CA1", durationSeconds: 73, answeredAt: NOW, endedAt: NOW })).toBe(true);
    expect(await s.updateContactCall("another-app", first.id, { status: "failed" })).toBe(false);
    expect(await s.getContactCall(app.id, first.id)).toMatchObject({ status: "completed", providerSid: "CA1", durationSeconds: 73, answeredAt: NOW });
    expect(await s.getContactCall("another-app", first.id)).toBeNull();
    expect((await s.listContactCalls(app.id, job.id, 10)).map((c) => c.id)).toEqual([second.id, first.id]);
  });
}
