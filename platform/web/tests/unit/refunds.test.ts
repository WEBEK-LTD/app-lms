import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { deliverPaidOrder } from "@/lib/catalog/payment";
import { encryptOwnPayment } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder, type CatalogOrderLine, type Donation, type PaymentProviderId } from "@/lib/data/types";
import { donationJson } from "@/lib/donations/service";
import { emailTemplate, renderTemplate } from "@/lib/email/templates";
import { ticketJson } from "@/lib/events/service";
import { refundIyzicoItem } from "@/lib/payments/iyzico";
import { kashierFepUrl, refundKashierPayment } from "@/lib/payments/kashier";
import { refundsByApi, refundThroughProvider } from "@/lib/payments/refund";
import { donationRefundOptions, orderRefundOptions, parseRefundAmount, readRefundForm, refundDonation, refundOrder, type RefundDeps, type RefundInput } from "@/lib/refunds/service";
import { encryptSetting } from "@/lib/settings/platform";
import { fakeKashier, type Recorded } from "./fake-providers";
import { KEY, NOW, days, setupClient } from "./helpers";

// 47 Refunds from the dashboard: each provider's exact signed requests, and what follows a refund.

const IYZICO = { apiKey: "iyzico-api-key", secretKey: "iyzico-secret-key", sandbox: true };
const KASHIER = { merchantId: "MID-1234-567", apiKey: "kashier-payment-api-key", secretKey: "kashier-secret-key", sandbox: true };

interface IyzicoCall extends Recorded {
  path: string;
  /** Whether the IYZWSv2 header signs this path and body with the secret key. */
  signed: boolean;
}

/** iyzico: /payment/cancel, /payment/detail and /payment/refund, each checking the IYZWSv2 signature. */
function fakeIyzico(options: { items: { id: string; paid: string; subMerchantKey?: string }[]; cancel?: "success" | "failure" | "unreachable" }) {
  const calls: IyzicoCall[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname;
    const headers = Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]));
    const body = String(init?.body ?? "");
    const decoded = Buffer.from((headers.authorization ?? "").replace(/^IYZWSv2 /, ""), "base64").toString();
    const parts = Object.fromEntries(decoded.split("&").map((p) => p.split(":") as [string, string]));
    const expected = createHmac("sha256", IYZICO.secretKey).update(`${headers["x-iyzi-rnd"]}${path}${body}`).digest("hex");
    const signed = parts.apiKey === IYZICO.apiKey && parts.randomKey === headers["x-iyzi-rnd"] && parts.signature === expected;
    calls.push({ method: init?.method ?? "GET", url, headers, body: JSON.parse(body) as Record<string, unknown>, path, signed });
    if (!signed) return Response.json({ status: "failure", errorMessage: "Invalid signature" });
    if (path === "/payment/cancel") {
      if (options.cancel === "unreachable") throw new TypeError("fetch failed");
      return options.cancel === "failure"
        ? Response.json({ status: "failure", errorCode: "5093", errorMessage: "Cancel isn't possible after the end of day." })
        : Response.json({ status: "success", paymentId: "PAY-1", price: 450, currency: "TRY", hostReference: "CANCEL-REF" });
    }
    if (path === "/payment/detail") {
      return Response.json({
        status: "success",
        paymentId: "PAY-1",
        paidPrice: "450.00",
        currency: "TRY",
        itemTransactions: options.items.map((i) => ({ itemId: i.id, paymentTransactionId: i.id, price: i.paid, paidPrice: i.paid, subMerchantKey: i.subMerchantKey })),
      });
    }
    if (path === "/payment/refund") {
      const input = JSON.parse(body) as { paymentTransactionId: string; price: string };
      return Response.json({ status: "success", paymentId: "PAY-1", paymentTransactionId: input.paymentTransactionId, price: input.price, hostReference: `REF-${input.paymentTransactionId}` });
    }
    return Response.json({ status: "failure", errorMessage: "Not found" }, { status: 404 });
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

const LINES: CatalogOrderLine[] = [
  { productId: 1, name: "Atlas", quantity: 1, unitCents: 30000, imageAssetId: null, digital: false },
  { productId: 2, name: "Map", quantity: 1, unitCents: 10000, imageAssetId: null, digital: false },
];

async function shop(provider: PaymentProviderId | "marketplace", kind: "catalog" | "events" | "courses" = "catalog") {
  const { store, client } = await setupClient();
  const base = newApp(client.id, null, NOW, kind === "events" ? "events" : kind === "courses" ? "lms" : "store");
  const payment =
    provider === "marketplace"
      ? ({ provider: "yallapp", subMerchantKey: "SUB-KEY", subMerchantType: "PERSONAL", payeeName: "Ada", ibanLast4: "1234", sandbox: true, joinedAt: NOW.toISOString() } as const)
      : provider === "iyzico"
        ? encryptOwnPayment(base.id, { provider: "iyzico", apiKey: IYZICO.apiKey, secretKey: IYZICO.secretKey, sandbox: true }, KEY)
        : provider === "kashier"
          ? encryptOwnPayment(base.id, { provider: "kashier", ...KASHIER }, KEY)
          : encryptOwnPayment(base.id, { provider: "fawaterk", apiKey: "fawaterk-key", sandbox: true }, KEY);
  const app: App = {
    ...base,
    backend: "hosted",
    appName: "Harbour Books",
    connector: { kind },
    catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: provider === "iyzico" || provider === "marketplace" ? "TRY" : "EGP", payment },
  };
  await store.createApp(app);
  return { store, app };
}

async function paidOrder(store: MemoryStore, app: App, options: { provider: PaymentProviderId; paidAt: Date; commissionCents?: number | null; userId?: number | null; lines?: CatalogOrderLine[]; shipping?: number }): Promise<CatalogOrder> {
  const lines = options.lines ?? LINES;
  const subtotal = lines.reduce((s, l) => s + l.unitCents * l.quantity, 0);
  const shipping = options.shipping ?? 5000;
  const order = await store.createCatalogOrder({
    appId: app.id,
    tokenHash: sha256Hex(`order-${Math.random()}`),
    userId: options.userId ?? null,
    status: "pending",
    lines,
    subtotalCents: subtotal,
    shippingCents: shipping,
    totalCents: subtotal + shipping,
    currency: app.catalogSettings!.currency,
    customer: { name: "Mona Hassan", phone: "+201001234567", email: "mona@example.com", city: "Cairo", address: "12 Tahrir St" },
    paymentId: null,
    createdAt: options.paidAt,
    paidAt: null,
    updatedAt: options.paidAt,
    commissionCents: options.commissionCents ?? null,
    itemTransactionIds: null,
    payoutApprovedAt: null,
    paymentProvider: options.provider,
    providerRef: options.provider === "kashier" ? "sess1abcdef" : options.provider === "fawaterk" ? "5001" : "iyzico-token",
  });
  await store.payCatalogOrder(app.id, order.id, options.provider === "kashier" ? "TX-sess1abcdef" : "PAY-1", options.paidAt);
  return (await store.getCatalogOrder(app.id, order.id))!;
}

function deps(store: MemoryStore, fetcher: typeof fetch | undefined, now = NOW) {
  const mails: { key: string; to: string; values: Record<string, unknown> }[] = [];
  const d: RefundDeps = {
    store,
    key: KEY,
    fetcher,
    now,
    ip: "203.0.113.9",
    actor: { id: "user-1", email: "owner@harbour.test" },
    mail: async (key, to, values) => {
      mails.push({ key, to, values });
    },
  };
  return { deps: d, mails };
}

const input = (cents: number, extra: Partial<RefundInput> = {}): RefundInput => ({ cents, reason: "buyer_request", note: null, method: "api", ...extra });

describe("refund amounts and the form", () => {
  it("reads amounts in the currency's major units", () => {
    expect(parseRefundAmount("150")).toBe(15000);
    expect(parseRefundAmount("150,5")).toBe(15050);
    expect(parseRefundAmount("0")).toBeNull();
    expect(parseRefundAmount("1.234")).toBeNull();
    expect(parseRefundAmount("abc")).toBeNull();
  });

  it("refuses more than is left, an unknown reason, and a way the payment can't take", () => {
    const options = { refundable: true, why: null, provider: "fawaterk" as const, leftCents: 10000, byApi: false, manual: true, outside: null, marketplace: false, revocable: { tickets: [], courses: [], memberships: [] } };
    const form = { amount: "120", reason: "nope", note: "", method: "api", reference: "", tickets: [], courses: [], memberships: [] };
    const read = readRefundForm(form, options);
    expect(read).toEqual({ ok: false, errors: { amount: "That's more than what's left to refund.", reason: "Choose a reason.", method: "Refund it in your provider's panel, then record it here." } });
    const ok = readRefundForm({ ...form, amount: "40", reason: "other", method: "manual", reference: " FW-77 ", tickets: ["3", "x"] }, options);
    expect(ok).toEqual({ ok: true, input: { cents: 4000, reason: "other", note: null, method: "manual", providerRef: "FW-77", revoke: { tickets: [3], courses: [], memberships: [] } } });
  });

  it("refunds through the API with iyzico and Kashier, and in the panel with Fawaterk", () => {
    expect(refundsByApi("iyzico")).toBe(true);
    expect(refundsByApi("kashier")).toBe(true);
    expect(refundsByApi("fawaterk")).toBe(false);
  });
});

describe("iyzico refunds", () => {
  it("cancels a whole payment on the day it was taken, signed like every iyzico request", async () => {
    const { store, app } = await shop("iyzico");
    const order = await paidOrder(store, app, { provider: "iyzico", paidAt: NOW });
    const iyzico = fakeIyzico({ items: [{ id: "T1", paid: "300.00" }], cancel: "success" });
    const { deps: d, mails } = deps(store, iyzico.fetcher, new Date(NOW.getTime() + 3_600_000));
    const result = await refundOrder(d, app, order, input(45000, { reason: "double_payment", note: "Paid twice" }));
    expect(result.ok).toBe(true);
    expect(iyzico.calls.map((c) => c.path)).toEqual(["/payment/cancel"]);
    expect(iyzico.calls[0]!.signed).toBe(true);
    expect(iyzico.calls[0]!.url).toBe("https://sandbox-api.iyzipay.com/payment/cancel");
    expect(iyzico.calls[0]!.body).toEqual({ locale: "en", conversationId: "order-1001", paymentId: "PAY-1", ip: "203.0.113.9", reason: "double_payment", description: "Paid twice" });
    const after = (await store.getCatalogOrder(app.id, order.id))!;
    expect(after).toMatchObject({ status: "refunded", refundedCents: 45000 });
    const [refund] = await store.listRefunds(app.id, "order", [order.id]);
    expect(refund).toMatchObject({ amountCents: 45000, method: "api", provider: "iyzico", providerRef: "CANCEL-REF", byEmail: "owner@harbour.test", parts: [{ kind: "cancel", cents: 45000 }] });
    expect(mails).toEqual([
      {
        key: "payment_refunded",
        to: "mona@example.com",
        values: { org_name: "Harbour Books", customer_name: "Mona Hassan", amount: "₺450.00", what: "order 1001", total_refunded: "₺450.00 of ₺450.00", date: "12 October 2026" },
      },
    ]);
    // Nothing is left: no more refunds.
    expect((await orderRefundOptions(d, app, after)).refundable).toBe(false);
    // The audit log has it, with who and how.
    const audit = await store.listAuditEntries({ action: "payment.refund", offset: 0, limit: 5 });
    expect(audit.items[0]).toMatchObject({ actorEmail: "owner@harbour.test", clientId: app.clientId, summary: "Refunded ₺450.00 of order 1001 through iyzico: Paid twice (Harbour Books)" });
  });

  it("refunds item by item after the day, never more than each item's price, minus earlier refunds", async () => {
    const { store, app } = await shop("iyzico");
    const order = await paidOrder(store, app, { provider: "iyzico", paidAt: days(-3) });
    const iyzico = fakeIyzico({ items: [{ id: "T1", paid: "300.00" }, { id: "T2", paid: "100.00" }, { id: "T3", paid: "50.00" }] });
    const { deps: d } = deps(store, iyzico.fetcher);
    expect((await refundOrder(d, app, order, input(25000))).ok).toBe(true);
    expect(iyzico.calls.map((c) => [c.path, c.body?.paymentTransactionId ?? null, c.body?.price ?? null])).toEqual([
      ["/payment/detail", null, null],
      ["/payment/refund", "T1", "250.00"],
    ]);
    expect(iyzico.calls.every((c) => c.signed)).toBe(true);
    expect(iyzico.calls[1]!.body).toEqual({ locale: "en", conversationId: "order-1001", paymentTransactionId: "T1", price: "250.00", currency: "TRY", ip: "203.0.113.9", reason: "buyer_request", description: "The customer asked" });
    expect(await store.getCatalogOrder(app.id, order.id)).toMatchObject({ status: "processing", refundedCents: 25000 });

    // The rest: T1's last 50, then T2 and T3; no cancel, as something was refunded already.
    iyzico.calls.length = 0;
    const second = await refundOrder(d, app, (await store.getCatalogOrder(app.id, order.id))!, input(20000));
    expect(second).toMatchObject({ ok: true, message: "Refunded ₺200.00: all of it." });
    expect(iyzico.calls.filter((c) => c.path === "/payment/refund").map((c) => [c.body!.paymentTransactionId, c.body!.price])).toEqual([
      ["T1", "50.00"],
      ["T2", "100.00"],
      ["T3", "50.00"],
    ]);
    expect(await store.getCatalogOrder(app.id, order.id)).toMatchObject({ status: "refunded", refundedCents: 45000 });
  });

  it("refunds the items when iyzico won't cancel, and stops without retrying when iyzico doesn't answer", async () => {
    const { store, app } = await shop("iyzico");
    const order = await paidOrder(store, app, { provider: "iyzico", paidAt: NOW });
    const refused = fakeIyzico({ items: [{ id: "T1", paid: "450.00" }], cancel: "failure" });
    expect((await refundOrder(deps(store, refused.fetcher).deps, app, order, input(45000))).ok).toBe(true);
    expect(refused.calls.map((c) => c.path)).toEqual(["/payment/cancel", "/payment/detail", "/payment/refund"]);

    const other = await paidOrder(store, app, { provider: "iyzico", paidAt: NOW });
    const silent = fakeIyzico({ items: [{ id: "T1", paid: "450.00" }], cancel: "unreachable" });
    const result = await refundOrder(deps(store, silent.fetcher).deps, app, other, input(45000));
    expect(result).toEqual({ ok: false, message: "Nothing was refunded. iyzico didn't answer. Check its panel before trying again: the refund may have been made." });
    expect(silent.calls.map((c) => c.path)).toEqual(["/payment/cancel"]);
    expect(await store.listRefunds(app.id, "order", [other.id])).toEqual([]);
  });

  it("refunds a marketplace basket's own item transactions and gives Yallapp's commission back in proportion", async () => {
    const { store, app } = await shop("marketplace");
    await store.setPlatformSetting("iyzico", { apiKeyEncrypted: encryptSetting("iyzico", IYZICO.apiKey, KEY), secretKeyEncrypted: encryptSetting("iyzico", IYZICO.secretKey, KEY), sandbox: true }, "admin@yallapp.test", NOW);
    const order = await paidOrder(store, app, { provider: "iyzico", paidAt: days(-2), commissionCents: 4000 });
    const iyzico = fakeIyzico({ items: [{ id: "T1", paid: "300.00", subMerchantKey: "SUB-KEY" }, { id: "T2", paid: "100.00", subMerchantKey: "SUB-KEY" }, { id: "T3", paid: "50.00", subMerchantKey: "SUB-KEY" }] });
    const { deps: d } = deps(store, iyzico.fetcher);
    const options = await orderRefundOptions(d, app, order);
    expect(options).toMatchObject({ refundable: true, byApi: true, manual: false, marketplace: true });
    expect((await refundOrder(d, app, order, input(9000))).ok).toBe(true);
    // Yallapp's account signs it (the shop's share comes back from the item, as iyzico split it).
    expect(iyzico.calls.every((c) => c.signed)).toBe(true);
    const [refund] = await store.listRefunds(app.id, "order", [order.id]);
    expect(refund!.commissionCents).toBe(800);
    expect(await store.getCatalogOrder(app.id, order.id)).toMatchObject({ commissionCents: 3200, refundedCents: 9000 });
    // A marketplace payment can't be "recorded": the owner has no panel for Yallapp's account.
    expect(await refundOrder(d, app, (await store.getCatalogOrder(app.id, order.id))!, input(1000, { method: "manual" }))).toMatchObject({ ok: false });
    // The rest gives back the rest of the commission.
    expect((await refundOrder(d, app, (await store.getCatalogOrder(app.id, order.id))!, input(36000))).ok).toBe(true);
    expect(await store.getCatalogOrder(app.id, order.id)).toMatchObject({ status: "refunded", commissionCents: 0 });
  });

  it("sends refund requests as iyzico's SDKs do", async () => {
    const iyzico = fakeIyzico({ items: [] });
    await refundIyzicoItem(IYZICO, { paymentTransactionId: "T9", cents: 1999, currency: "USD", conversationId: "c", ip: "1.2.3.4", reason: "fraud", description: "x".repeat(300) }, { fetcher: iyzico.fetcher });
    expect(iyzico.calls[0]!.body).toMatchObject({ price: "19.99", currency: "USD", reason: "fraud" });
    expect(String(iyzico.calls[0]!.body!.description)).toHaveLength(200);
  });
});

describe("Kashier refunds", () => {
  it("refunds with PUT /v3/orders/{orderId}/ on the fep host, the secret key, the amount and the transaction", async () => {
    const kashier = fakeKashier({ secretKey: KASHIER.secretKey });
    const refunds: Recorded[] = [];
    const fetcher = (async (url: string, init?: RequestInit) => {
      if (new URL(url).pathname.startsWith("/v3/orders/")) {
        refunds.push({ method: init?.method ?? "GET", url, headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body)) as Record<string, unknown> });
        return Response.json({ status: "SUCCESS", response: { status: "SUCCESS", transaction: { transactionId: `RF-${refunds.length}`, status: "SUCCESS" } } });
      }
      return kashier.fetcher(url, init);
    }) as unknown as typeof fetch;
    // The session the order was paid with.
    const { store, app } = await shop("kashier");
    await kashier.fetcher("https://test-api.kashier.io/v3/payment/sessions", {
      method: "POST",
      headers: { authorization: KASHIER.secretKey, "api-key": KASHIER.apiKey },
      body: JSON.stringify({ amount: "450.00", currency: "EGP", order: "order-1-x" }),
    });
    kashier.pay("sess1abcdef", { kashierOrderId: "KO-555" });
    const order = await paidOrder(store, app, { provider: "kashier", paidAt: days(-1) });
    const { deps: d } = deps(store, fetcher);
    expect(await refundOrder(d, app, order, input(15050, { note: "Damaged cover" }))).toMatchObject({ ok: true, message: "Refunded E£150.50." });
    expect(refunds).toEqual([
      {
        method: "PUT",
        url: "https://test-fep.kashier.io/v3/orders/KO-555/",
        headers: { authorization: KASHIER.secretKey, "content-type": "application/json", accept: "application/json" },
        body: { apiOperation: "REFUND", reason: "Damaged cover", transaction: { amount: 150.5, targetTransactionId: "TX-sess1abcdef" } },
      },
    ]);
    const [refund] = await store.listRefunds(app.id, "order", [order.id]);
    expect(refund).toMatchObject({ provider: "kashier", providerRef: "RF-1", amountCents: 15050 });
    expect(kashierFepUrl({ sandbox: false })).toBe("https://fep.kashier.io");
  });

  it("reports Kashier's refusal and refunds nothing", async () => {
    const fetcher = (async () => Response.json({ status: "FAILURE", messages: { en: "Refund amount exceeds the captured amount" } }, { status: 400 })) as unknown as typeof fetch;
    await expect(refundKashierPayment(KASHIER, { kashierOrderId: "KO-1", transactionId: null, cents: 100, reason: "x" }, { fetcher })).rejects.toThrow("Refund amount exceeds the captured amount");
    const result = await refundThroughProvider(
      { provider: "kashier", keys: KASHIER },
      { conversationId: "c", paymentId: "TX", providerRef: null, currency: "EGP", paidCents: 100, paidAt: NOW, cents: 100, earlier: [], refundedBeforeCents: 0, reason: "other", note: "", ip: "1.1.1.1", now: NOW },
      { fetcher },
    );
    expect(result).toEqual({ parts: [], error: "Kashier's payment session isn't known. Refund it in Kashier's panel and record it here." });
  });
});

describe("Fawaterk refunds, recorded", () => {
  it("offers only recording a refund made in Fawaterk's panel, then follows it", async () => {
    const { store, app } = await shop("fawaterk");
    const order = await paidOrder(store, app, { provider: "fawaterk", paidAt: days(-1) });
    const { deps: d, mails } = deps(store, undefined);
    expect(await orderRefundOptions(d, app, order)).toMatchObject({ refundable: true, byApi: false, manual: true, provider: "fawaterk", leftCents: 45000 });
    expect(await refundOrder(d, app, order, input(5000))).toEqual({ ok: false, message: "Nothing was refunded. Fawaterk refunds are made in Fawaterk's panel." });
    expect(await refundOrder(d, app, order, input(5000, { method: "manual", providerRef: "FW-REF-9" }))).toMatchObject({ ok: true });
    expect((await store.listRefunds(app.id, "order", [order.id]))[0]).toMatchObject({ method: "manual", providerRef: "FW-REF-9", parts: [] });
    expect(mails).toHaveLength(1);
    // More than is left is refused.
    expect(await refundOrder(d, app, (await store.getCatalogOrder(app.id, order.id))!, input(40001, { method: "manual" }))).toMatchObject({ ok: false });
  });

  it("can't be refunded by the shop when it was sold through Yallapp's Fawaterk account", async () => {
    const { store, app } = await shop("marketplace");
    await store.setPlatformSetting("fawaterk", { apiKeyEncrypted: encryptSetting("fawaterk", "yallapp-fawaterk", KEY), sandbox: true }, "admin@yallapp.test", NOW);
    const order = await paidOrder(store, app, { provider: "fawaterk", paidAt: days(-1), commissionCents: 4000 });
    expect(await orderRefundOptions({ store, key: KEY }, app, order)).toMatchObject({
      refundable: false,
      why: "This payment is in Yallapp's Fawaterk account: message us on WhatsApp and our team refunds it.",
    });
  });

  it("refuses demo orders", async () => {
    const { store, app } = await shop("fawaterk");
    const order = await paidOrder(store, app, { provider: "fawaterk", paidAt: NOW });
    expect(await orderRefundOptions({ store, key: KEY }, { ...app, demo: true }, order)).toMatchObject({ refundable: false, why: "Demo orders charge nothing." });
  });
});

describe("what a refund takes back", () => {
  it("cancels a refunded order's tickets, which free their places and say they were refunded", async () => {
    const { store, app } = await shop("fawaterk", "events");
    const user = (await store.createHostedUser({ appId: app.id, phone: "+905321234567", name: "Mona Aziz", email: null, city: null, now: NOW }))!;
    const event = await store.createEvent(
      {
        appId: app.id,
        title: "Jazz",
        description: "<p>Jazz.</p>",
        category: null,
        imageAssetIds: [],
        startAt: days(5),
        endAt: days(6),
        venueName: "Hall",
        venueAddress: null,
        latitude: null,
        longitude: null,
        onlineUrl: null,
        organiser: null,
        capacity: 2,
        status: "published",
        publishedAt: NOW,
      },
      NOW,
    );
    const type = await store.createTicketType({ appId: app.id, eventId: event.id, name: "Standard", priceCents: 20000, capacity: null, saleEndsAt: null, maxPerOrder: 4, position: 0 }, NOW);
    const order = await paidOrder(store, app, { provider: "fawaterk", paidAt: NOW, userId: user.id, lines: [{ productId: type.id, name: "Jazz · Standard", quantity: 2, unitCents: 20000, imageAssetId: null, digital: true }], shipping: 0 });
    const claim = await store.claimTickets({
      appId: app.id,
      eventId: event.id,
      ticketTypeId: type.id,
      userId: user.id,
      orderId: order.id,
      tickets: [
        { code: "AAAABBBBCCCC", holderName: "Mona" },
        { code: "DDDDEEEEFFFF", holderName: "Ali" },
      ],
      priceCents: 20000,
      status: "pending",
      holdUntil: days(1),
      now: NOW,
    });
    expect(claim.ok).toBe(true);
    await deliverPaidOrder(store, app, order, NOW);
    const paid = (await store.getCatalogOrder(app.id, order.id))!;
    const { deps: d } = deps(store, undefined);
    const options = await orderRefundOptions(d, app, paid);
    expect(options.revocable.tickets.map((t) => t.label)).toEqual(["Ticket AAAA-BBBB-CCCC · Mona", "Ticket DDDD-EEEE-FFFF · Ali"]);
    // In part: only the ticket ticked.
    const [first, second] = options.revocable.tickets;
    expect((await refundOrder(d, app, paid, input(20000, { method: "manual", revoke: { tickets: [second!.id] } }))).ok).toBe(true);
    let tickets = await store.listTickets({ appId: app.id, orderId: order.id });
    expect(tickets.map((t) => [t.status, Boolean(t.refundedAt)])).toEqual([
      ["valid", false],
      ["cancelled", true],
    ]);
    expect((await store.countTicketPlaces(app.id, NOW)).find((c) => c.ticketTypeId === type.id)?.count).toBe(1);
    // The rest: everything left goes.
    expect((await refundOrder(d, app, (await store.getCatalogOrder(app.id, order.id))!, input(20000, { method: "manual" }))).ok).toBe(true);
    tickets = await store.listTickets({ appId: app.id, orderId: order.id });
    expect(tickets.every((t) => t.status === "cancelled" && t.refundedAt)).toBe(true);
    const refunds = await store.listRefunds(app.id, "order", [order.id]);
    expect(refunds.map((r) => r.revoked.tickets)).toEqual([[second!.id], [first!.id]]);
    // The app sees a cancelled ticket that says it was refunded (never a new status).
    const json = ticketJson(
      { app, events: [event], types: [type], settings: { currency: "TRY", timeZone: "Europe/Istanbul", showMap: true, allowCancelHours: null }, taken: new Map(), now: NOW } as never,
      tickets[0]!,
      { assetUrl: (id: string) => id, key: "k" },
    );
    expect(json).toMatchObject({ status: "cancelled", refunded: true, can_cancel: false });
  });

  it("removes access to a refunded course, keeping the courses not ticked in a partial refund", async () => {
    const { store, app } = await shop("fawaterk", "courses");
    const user = (await store.createHostedUser({ appId: app.id, phone: "+905321234567", name: "Mona", email: null, city: null, now: NOW }))!;
    const lines: CatalogOrderLine[] = [
      { productId: 7, name: "Arabic 101", quantity: 1, unitCents: 30000, imageAssetId: null, digital: true },
      { productId: 8, name: "Arabic 102", quantity: 1, unitCents: 15000, imageAssetId: null, digital: true },
    ];
    const order = await paidOrder(store, app, { provider: "fawaterk", paidAt: NOW, userId: user.id, lines, shipping: 0 });
    await deliverPaidOrder(store, app, order, NOW);
    const { deps: d } = deps(store, undefined);
    const paid = (await store.getCatalogOrder(app.id, order.id))!;
    expect((await orderRefundOptions(d, app, paid)).revocable.courses.map((c) => c.label)).toEqual(["Access to Arabic 101", "Access to Arabic 102"]);
    await refundOrder(d, app, paid, input(15000, { method: "manual", revoke: { courses: [8] } }));
    expect((await store.listCourseEnrollments({ appId: app.id, userId: user.id })).map((e) => e.courseId)).toEqual([7]);
    await refundOrder(d, app, (await store.getCatalogOrder(app.id, order.id))!, input(30000, { method: "manual" }));
    expect(await store.listCourseEnrollments({ appId: app.id, userId: user.id })).toEqual([]);
  });
});

describe("donation refunds", () => {
  it("take the refund off the campaign, the donor too once all of it is refunded, and the app shows it", async () => {
    const { store, client } = await setupClient();
    const base = newApp(client.id, null, NOW, "donations");
    const app: App = {
      ...base,
      backend: "hosted",
      appName: "Harbour Food Bank",
      connector: { kind: "campaigns" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "TRY", payment: encryptOwnPayment(base.id, { provider: "iyzico", apiKey: IYZICO.apiKey, secretKey: IYZICO.secretKey, sandbox: true }, KEY) },
    };
    await store.createApp(app);
    const campaign = await store.createCampaign(
      { appId: app.id, title: "Winter parcels", summary: null, story: "<p>Help.</p>", imageAssetIds: [], goalCents: null, presetCents: [10000], allowCustomAmount: true, minCents: 1000, endsAt: null, status: "open", featured: false, publishedAt: NOW },
      NOW,
    );
    const give = async (token: string, email: string, cents: number): Promise<Donation> => {
      const d = await store.createDonation({
        appId: app.id,
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        tokenHash: sha256Hex(token),
        receiptCode: `receipt-${token}`,
        userId: null,
        amountCents: cents,
        currency: "TRY",
        recurring: "none",
        anonymous: false,
        message: null,
        donorName: "Elif Yılmaz",
        donorEmail: email,
        donorPhone: null,
        status: "pending",
        paymentId: null,
        createdAt: days(-2),
        paidAt: null,
        updatedAt: days(-2),
        paymentProvider: "iyzico",
      });
      await store.payDonation(app.id, d.id, "PAY-1", days(-2));
      return (await store.getDonation(app.id, d.id))!;
    };
    const donation = await give("a", "elif@example.com", 25000);
    await give("b", "deniz@example.com", 10000);
    expect(await store.getCampaign(app.id, campaign.id)).toMatchObject({ raisedCents: 35000, donorCount: 2 });

    const iyzico = fakeIyzico({ items: [{ id: "D1", paid: "250.00" }] });
    const { deps: d, mails } = deps(store, iyzico.fetcher);
    expect(await donationRefundOptions(d, app, donation)).toMatchObject({ refundable: true, byApi: true, manual: true, leftCents: 25000 });
    expect((await refundDonation(d, app, donation, input(5000))).ok).toBe(true);
    expect(iyzico.calls.find((c) => c.path === "/payment/refund")!.body).toMatchObject({ conversationId: "donation-D-1001", paymentTransactionId: "D1", price: "50.00" });
    expect(await store.getCampaign(app.id, campaign.id)).toMatchObject({ raisedCents: 30000, donorCount: 2 });
    let now = (await store.getDonation(app.id, donation.id))!;
    expect(donationJson(now, "https://yallapp.test")).toMatchObject({ amount_formatted: "₺250.00", refunded_total: "₺50.00" });

    expect((await refundDonation(d, app, now, input(20000))).ok).toBe(true);
    now = (await store.getDonation(app.id, donation.id))!;
    expect(now).toMatchObject({ status: "refunded", refundedCents: 25000 });
    expect(await store.getCampaign(app.id, campaign.id)).toMatchObject({ raisedCents: 10000, donorCount: 1 });
    expect(donationJson(now, "https://yallapp.test").refunded_total).toBe("₺250.00");
    expect(mails.map((m) => [m.to, m.values.what, m.values.total_refunded])).toEqual([
      ["elif@example.com", "donation D-1001", "₺50.00 of ₺250.00"],
      ["elif@example.com", "donation D-1001", "₺250.00 of ₺250.00"],
    ]);
    // The app's list keeps refunded donations.
    expect((await store.listDonations({ appId: app.id, statuses: ["paid", "refunded"], offset: 0, limit: 10 })).total).toBe(2);
  });

  it("renders the customer's email with its sample values", () => {
    const template = emailTemplate("payment_refunded")!;
    const mail = renderTemplate(template, { org_name: "Harbour Books", customer_name: "Elif", amount: "₺150.00", what: "order 1042", total_refunded: "₺150.00 of ₺450.00", date: "14 October 2026" });
    expect(mail.subject).toBe("Harbour Books refunded ₺150.00 of order 1042");
    expect(mail.text).toContain("Refunded so far: ₺150.00 of ₺450.00");
    expect(mail.text).not.toMatch(/\{\{/);
  });
});
