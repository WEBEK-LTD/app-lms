import { describe, expect, it, vi } from "vitest";
import { newApp } from "@/lib/app/setup";
import { canReturn, decideReturn, parseReturnInput } from "@/lib/catalog/returns";
import { MemoryStore } from "@/lib/data/memory";
import type { App, CatalogOrder } from "@/lib/data/types";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { KEY, NOW } from "./helpers";

/** 91.3 Returns asked for in the app, in a shop without a website. */

const DAY = 86_400_000;
const line = (digital = false) => ({ productId: 1, name: digital ? "Gift card" : "Tulip vase", quantity: 1, unitCents: 40000, imageAssetId: null, digital });

function order(over: Partial<CatalogOrder> = {}): Omit<CatalogOrder, "id"> {
  return {
    appId: "app-1",
    tokenHash: `h-${Math.random()}`,
    userId: 7,
    status: "completed",
    lines: [line()],
    subtotalCents: 40000,
    shippingCents: 5000,
    totalCents: 45000,
    currency: "TRY",
    customer: { name: "Mona", phone: "+905321112233", email: "mona@example.com", city: "Istanbul", address: "Moda Cd. 12" },
    paymentId: "PAY-1",
    createdAt: NOW,
    paidAt: NOW,
    updatedAt: NOW,
    commissionCents: null,
    itemTransactionIds: null,
    payoutApprovedAt: null,
    ...over,
  };
}

describe("91.3 returns", () => {
  it("are for completed orders with something to send back, within the shop's days, once", () => {
    const settings = { returnDays: 14 };
    const o = { ...order(), id: 1 };
    expect(canReturn(o, settings, new Date(NOW.getTime() + 3 * DAY))).toBe(true);
    expect(canReturn(o, settings, new Date(NOW.getTime() + 15 * DAY))).toBe(false);
    expect(canReturn(o, { returnDays: null }, NOW)).toBe(false);
    expect(canReturn({ ...o, status: "processing" }, settings, NOW)).toBe(false);
    expect(canReturn({ ...o, lines: [line(true)] }, settings, NOW)).toBe(false);
    expect(canReturn({ ...o, returnRequest: { status: "requested", reason: "damaged", note: null, requestedAt: NOW.toISOString(), decidedAt: null, reply: null } }, settings, NOW)).toBe(false);
  });

  it("need a reason, and a note with another reason", () => {
    expect(parseReturnInput({ reason: "damaged" })).toEqual({ ok: true, reason: "damaged", note: null });
    expect(parseReturnInput({ reason: "damaged", note: "  The glass  is cracked " })).toEqual({ ok: true, reason: "damaged", note: "The glass is cracked" });
    expect(parseReturnInput({ reason: "bored" })).toMatchObject({ ok: false });
    expect(parseReturnInput({ reason: "other" })).toEqual({ ok: false, message: "Tell the shop why you want to return it." });
    expect(parseReturnInput({ reason: "other", note: "x".repeat(501) })).toMatchObject({ ok: false });
  });

  it("are asked from the app, told to the owner, and answered from the dashboard", async () => {
    const store = new MemoryStore();
    const app: App = { ...newApp("c1", null, NOW, "store"), backend: "hosted", connector: { kind: "catalog" }, catalogSettings: { currency: "TRY", shippingCents: 0, freeShippingOverCents: null, payment: null, returnDays: 14 } };
    await store.createApp(app);
    const user = (await store.createHostedUser({ appId: app.id, phone: "+905321112233", name: "Mona", email: null, city: null, now: NOW }))!;
    const created = await store.createCatalogOrder({ ...order({ appId: app.id, userId: user.id }) } as never);
    const told = vi.fn(async () => undefined);
    const connector = new CatalogConnector({ store, app, assetUrl: (id) => `https://yallapp.test/a/${id}`, platformUrl: "https://yallapp.test", onReturnRequested: told });
    const now = new Date(NOW.getTime() + 2 * DAY);
    const call = (method: string, path: string, body?: unknown) => connector.handle({ method, path: path.split("/").filter(Boolean), query: new URLSearchParams(), body, user, now });

    expect((await connector.config()).store).toMatchObject({ returns: { enabled: true, days: 14 } });
    expect(await call("GET", `/me/orders/${created.id}`)).toMatchObject({ status: 200, body: { can_return: true, return_request: null } });
    expect(await call("POST", `/me/orders/${created.id}/return`, { reason: "other" })).toMatchObject({ status: 400 });
    const asked = await call("POST", `/me/orders/${created.id}/return`, { reason: "damaged", note: "The vase is cracked." });
    expect(asked).toMatchObject({ status: 200, body: { can_return: false, return_request: { status: "requested", reason: "damaged", note: "The vase is cracked.", requested_at: now.toISOString(), decided_at: null, reply: null } } });
    expect(told).toHaveBeenCalledTimes(1);
    expect(await call("POST", `/me/orders/${created.id}/return`, { reason: "damaged" })).toMatchObject({ status: 409, body: { code: "conflict" } });
    // Someone else's order isn't found.
    expect(await connector.handle({ method: "POST", path: ["me", "orders", String(created.id), "return"], query: new URLSearchParams(), body: { reason: "damaged" }, user: { ...user, id: user.id + 1 }, now })).toMatchObject({ status: 404 });

    const saved = (await store.getCatalogOrder(app.id, created.id))!;
    expect(await decideReturn({ store, key: KEY, now }, app, saved, "approved", "  Send it with Aras Kargo, code 551. ")).toBe(true);
    expect((await store.getCatalogOrder(app.id, created.id))!.returnRequest).toMatchObject({ status: "approved", reply: "Send it with Aras Kargo, code 551.", decidedAt: now.toISOString() });
    // Answered once.
    expect(await decideReturn({ store, key: KEY, now }, app, (await store.getCatalogOrder(app.id, created.id))!, "declined", null)).toBe(false);

    // A shop that takes no returns says so.
    const closed = new CatalogConnector({ store, app: { ...app, catalogSettings: { ...app.catalogSettings!, returnDays: null } }, assetUrl: (id) => id, platformUrl: "https://yallapp.test" });
    expect((await closed.config()).store).toMatchObject({ returns: null });
    const other = await store.createCatalogOrder({ ...order({ appId: app.id, userId: user.id }) } as never);
    expect(await closed.handle({ method: "POST", path: ["me", "orders", String(other.id), "return"], query: new URLSearchParams(), body: { reason: "damaged" }, user, now })).toMatchObject({ status: 403, body: { code: "feature_disabled" } });
  });
});
