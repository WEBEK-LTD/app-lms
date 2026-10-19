import { readFileSync } from "node:fs";
import path from "node:path";
import { createLocalJWKSet, decodeProtectedHeader, jwtVerify } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { newApp } from "@/lib/app/setup";
import { deliverPaidOrder, startPayment } from "@/lib/catalog/payment";
import type { MemoryStore } from "@/lib/data/memory";
import type { ApiWebhook, App, CatalogOrder, EventRecord, HostedUser, TicketType } from "@/lib/data/types";
import { DEFAULT_HOSTED_SETTINGS } from "@/lib/data/types";
import { HOLD_MINUTES } from "@/lib/events/service";
import { holdEnded, HoldEndedError, paidWithoutPlaces, PROVIDER_PAGE_MINUTES, SETTLE_GRACE_MINUTES } from "@/lib/events/holds";
import {
  attemptWebhook,
  errorText,
  eventAudience,
  MAX_ATTEMPTS,
  outcomeOf,
  queueAccountDeleted,
  RETRY_MINUTES,
  runApiWebhooks,
  sendAccountDeleted,
  webhookStateText,
  type WebhookDeps,
} from "@/lib/hosted/api-webhooks";
import { appSignIn, jwksOf, verifyWithKeys } from "@/lib/hosted/app-auth";
import { EventsConnector } from "@/lib/hosted/connectors/events";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { startCheckout } from "@/lib/payments/provider";
import { KEY, NOW, days, setupClient } from "./helpers";

const PLATFORM = "https://yallapp.test";
const MINUTE = 60_000;

/** 49 Account deletion reaches the client's API, and ticket holds end with the payment page. */

async function ownApiApp(store: MemoryStore, patch: Partial<App> = {}): Promise<App> {
  const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
  const app: App = {
    ...newApp(client.id, null, NOW, "lms"),
    backend: "custom_api",
    apiBaseUrl: "https://api.academy.test/v1/",
    appName: "Ada Academy",
    websiteDoneAt: NOW,
    hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, signInBy: "yallapp", reviewPhone: "+90 532 000 00 01", reviewCode: "246810" },
    ...patch,
  };
  await store.createApp(app);
  return app;
}

/** A fake client API: records each request, answers with the next status (or throws). */
function fakeApi(answers: (number | "down" | "slow")[]) {
  const seen: { url: string; headers: Record<string, string>; body: string; redirect: string | undefined }[] = [];
  const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(url), headers: Object.fromEntries(new Headers(init?.headers).entries()), body: String(init?.body), redirect: init?.redirect });
    const next = answers.length > 1 ? answers.shift()! : answers[0]!;
    if (next === "down") throw new TypeError("fetch failed");
    if (next === "slow") throw Object.assign(new Error("timed out"), { name: "TimeoutError" });
    return new Response(null, { status: next });
  }) as unknown as typeof fetch;
  return { seen, fetcher };
}

describe("49 account.deleted notices to the client's API", () => {
  let store: MemoryStore;
  let app: App;
  let clock: Date;
  const deps = (fetcher: typeof fetch, extra: Partial<WebhookDeps> = {}): WebhookDeps => ({
    store,
    encryptionKey: KEY,
    platformUrl: PLATFORM,
    now: () => clock,
    fetcher,
    resolve: async () => ["203.0.113.10"],
    ...extra,
  });

  beforeEach(async () => {
    ({ store } = await setupClient());
    app = await ownApiApp(store);
    clock = NOW;
  });

  it("sends a signed Security Event Token the client checks with the app's key set, never usable as an access token", async () => {
    const api = fakeApi([204]);
    const saved = await sendAccountDeleted(deps(api.fetcher), app, "42");
    expect(saved).toMatchObject({ status: "delivered", attempts: 1, lastStatus: 204, deliveredAt: NOW, nextAttemptAt: null });
    const [request] = api.seen;
    expect(request!.url).toBe("https://api.academy.test/v1/webhooks/yallapp");
    expect(request!.redirect).toBe("manual");
    expect(request!.headers).toMatchObject({ "content-type": "application/secevent+jwt", "yallapp-event": "account.deleted", "yallapp-delivery": saved!.id });
    const keys = await store.listAppAuthKeys(app.id);
    expect(decodeProtectedHeader(request!.body)).toMatchObject({ alg: "ES256", typ: "secevent+jwt", kid: keys[0]!.kid });
    // As the developer guide checks it (jose, Node).
    const { payload } = await jwtVerify(request!.body, createLocalJWKSet(jwksOf(keys, NOW)), {
      issuer: PLATFORM,
      audience: `${app.id}:events`,
      algorithms: ["ES256"],
      typ: "secevent+jwt",
      currentDate: NOW,
    });
    expect(payload).toMatchObject({ iss: PLATFORM, aud: eventAudience(app.id), sub: "42", jti: saved!.id, events: { "account.deleted": {} } });
    expect(payload.exp! - payload.iat!).toBe(300);
    // An access token check (audience: the app's ID) refuses it.
    expect(await verifyWithKeys(request!.body, keys, { issuer: PLATFORM, audience: app.id, now: NOW })).toBeNull();
  });

  it("tries again with backoff on 5xx, 429, timeouts and no answer, then gives up after 8 tries", async () => {
    const api = fakeApi([500, 429, "slow", "down", 503, 502, 500, 500]);
    let webhook = (await sendAccountDeleted(deps(api.fetcher), app, "42"))!;
    expect(webhook).toMatchObject({ status: "pending", attempts: 1, lastStatus: 500, lastError: "Your API answered HTTP 500." });
    expect(webhook.nextAttemptAt).toEqual(new Date(NOW.getTime() + MINUTE));
    const waits: number[] = [];
    for (let attempt = 2; attempt <= MAX_ATTEMPTS; attempt++) {
      // Not due yet: nothing is sent.
      expect((await runApiWebhooks(deps(api.fetcher))).tried).toBe(0);
      waits.push((webhook.nextAttemptAt!.getTime() - clock.getTime()) / MINUTE);
      clock = webhook.nextAttemptAt!;
      expect((await runApiWebhooks(deps(api.fetcher))).tried).toBe(1);
      webhook = (await store.getApiWebhook(webhook.id))!;
      expect(webhook.attempts).toBe(attempt);
    }
    expect(waits).toEqual([...RETRY_MINUTES]);
    expect(webhook).toMatchObject({ status: "failed", nextAttemptAt: null, lastError: "Your API answered HTTP 500." });
    expect(api.seen).toHaveLength(MAX_ATTEMPTS);
    // The same notice on every try, signed again each time.
    expect(new Set(api.seen.map((s) => s.headers["yallapp-delivery"])).size).toBe(1);
    expect(new Set(api.seen.map((s) => s.body)).size).toBe(MAX_ATTEMPTS);
  });

  it("stops at once on 4xx answers, redirects and private addresses", async () => {
    for (const [status, text] of [
      [404, "Your API doesn't take these notices yet (HTTP 404)."],
      [401, "Your API answered HTTP 401."],
      [302, "Your API answered with a redirect (HTTP 302); notices aren't sent on."],
    ] as const) {
      const saved = await sendAccountDeleted(deps(fakeApi([status]).fetcher), app, "7");
      expect(saved, String(status)).toMatchObject({ status: "failed", attempts: 1, lastStatus: status, lastError: text });
    }
    const api = fakeApi([204]);
    const local = await sendAccountDeleted(deps(api.fetcher, { resolve: async () => ["10.0.0.5"] }), app, "7");
    expect(local).toMatchObject({ status: "failed", lastError: "Your API's address points to a private network." });
    expect(api.seen).toHaveLength(0);
    expect(outcomeOf(null)).toBe("retry");
    expect(outcomeOf(408)).toBe("retry");
    expect(outcomeOf(202)).toBe("delivered");
    expect(errorText(null, "timeout")).toBe("Your API didn't answer in time.");
  });

  it("sends each try once, however many runs start together", async () => {
    const api = fakeApi([204]);
    const webhook = (await queueAccountDeleted(deps(api.fetcher), app, "9"))!;
    const results = await Promise.all([attemptWebhook(deps(api.fetcher), webhook, 1000), attemptWebhook(deps(api.fetcher), webhook, 1000)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(api.seen).toHaveLength(1);
    expect((await runApiWebhooks(deps(api.fetcher))).tried).toBe(0);
  });

  it("only for own API apps Yallapp signs people in to; notices older than 30 days are deleted", async () => {
    const api = fakeApi([204]);
    expect(await queueAccountDeleted(deps(api.fetcher), { ...app, hostedSettings: { ...app.hostedSettings!, signInBy: "api" } }, "1")).toBeNull();
    expect(await queueAccountDeleted(deps(api.fetcher), { ...app, backend: "hosted" }, "1")).toBeNull();
    expect(await queueAccountDeleted(deps(api.fetcher), { ...app, demo: true }, "1")).toBeNull();
    await sendAccountDeleted(deps(api.fetcher), app, "1");
    // The owner switched back to their API's own sign-in before a retry: it stops.
    const pending = (await queueAccountDeleted(deps(api.fetcher), app, "2"))!;
    await store.updateApp(app.id, { hostedSettings: { ...app.hostedSettings!, signInBy: "api" } }, NOW);
    expect(await attemptWebhook(deps(api.fetcher), pending, 1000)).toMatchObject({ status: "failed" });
    expect(await store.listApiWebhooks(app.id, 10)).toHaveLength(2);
    clock = new Date(NOW.getTime() + 31 * 24 * 60 * MINUTE);
    expect((await runApiWebhooks(deps(api.fetcher))).purged).toBe(2);
    expect(await store.listApiWebhooks(app.id, 10)).toEqual([]);
  });

  it("reads plainly on App sign-in", () => {
    const base: ApiWebhook = { id: "x", appId: "a", event: "account.deleted", subject: "1", status: "pending", attempts: 0, nextAttemptAt: NOW, lastAttemptAt: null, lastStatus: null, lastError: null, createdAt: NOW, deliveredAt: null };
    expect(webhookStateText(base)).toBe("Waiting to be sent");
    expect(webhookStateText({ ...base, attempts: 2, lastError: "Your API answered HTTP 500." })).toBe("Your API answered HTTP 500. Trying again (2 of 8 tries made).");
    expect(webhookStateText({ ...base, status: "delivered" })).toBe("Delivered");
  });

  it("the hosted DELETE /me deletes the account at once and tells the client's API", async () => {
    const sender = new LogSender();
    const told: string[] = [];
    const ctx: HostedContext = {
      store,
      app,
      active: true,
      now: NOW,
      ip: "203.0.113.34",
      secret: "test-hosted-secret",
      sender,
      push: false,
      assetUrl: (id) => `${PLATFORM}/api/v1/assets/${id}`,
      platformUrl: PLATFORM,
      yallappSignIn: appSignIn(store, app.id, { encryptionKey: KEY, platformUrl: PLATFORM, now: () => NOW }),
      onAccountDeleted: async (sub) => {
        told.push(sub);
        throw new Error("the API is down");
      },
    };
    const call = (method: string, route: string, body?: unknown, token?: string) =>
      // A new signer per request, as the route makes one (it reads the keys once).
      handleHosted({ ...ctx, yallappSignIn: appSignIn(store, app.id, { encryptionKey: KEY, platformUrl: PLATFORM, now: () => NOW }) }, { method, path: route.split("/").filter(Boolean), query: new URLSearchParams(), body, token: token ?? null });
    const requested = await call("POST", "/auth/otp/request", { country_code: "+90", phone: "5321234567" });
    const code = sender.sent.get("+905321234567")!;
    const verified = await call("POST", "/auth/otp/verify", { request_id: (requested.body as { request_id: string }).request_id, code, device: { id: "i-1", platform: "android", name: "Pixel", app_version: "1.0.0" } });
    const registered = await call("POST", "/auth/register", { signup_token: (verified.body as { signup_token: string }).signup_token, name: "Sara", device: { id: "i-1", platform: "android", name: "Pixel", app_version: "1.0.0" } });
    expect([requested.status, verified.status, registered.status], JSON.stringify([requested.body, verified.body, registered.body])).toEqual([200, 200, 201]);
    const { access_token: token, user } = registered.body as { access_token: string; user: { id: number } };
    // The notice failing never keeps the account.
    expect((await call("DELETE", "/me", undefined, token)).status).toBe(204);
    expect(told).toEqual([String(user.id)]);
    expect(await store.getHostedUser(app.id, user.id)).toBeNull();
  });

  it("is in the contract as the accountDeleted webhook", () => {
    const contract = parse(readFileSync(path.join(__dirname, "../../../../docs/api/openapi.yaml"), "utf8")) as { webhooks: Record<string, { post: Record<string, unknown> }> };
    const hook = contract.webhooks.accountDeleted!.post;
    expect(hook["x-path"]).toBe("/webhooks/yallapp");
    expect(Object.keys((hook.requestBody as { content: object }).content)).toEqual(["application/secevent+jwt"]);
    expect(String(hook.description).replace(/\s+/g, " ")).toContain("1, 5 and 30 minutes, 2, 6, 12 and 24 hours (8 tries)");
  });
});

describe("49 ticket holds end with the payment page", () => {
  let store: MemoryStore;
  let app: App;
  let buyer: HostedUser;
  let late: HostedUser;
  let gig: EventRecord;
  let seat: TicketType;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = {
      ...newApp(client.id, null, NOW, "events"),
      backend: "hosted",
      appName: "Kuzey Culture Centre",
      websiteDoneAt: NOW,
      connector: { kind: "events" },
      catalogSettings: { currency: "EGP", shippingCents: 0, freeShippingOverCents: null, payment: { provider: "kashier", merchantId: "MID-1-1", apiKeyEncrypted: "x", secretKeyEncrypted: "y", sandbox: true } } as App["catalogSettings"],
    };
    await store.createApp(app);
    await store.saveEventSettings(app.id, { currency: "EGP", timeZone: "Africa/Cairo", showMap: true, allowCancelHours: 24 }, NOW);
    buyer = (await store.createHostedUser({ appId: app.id, phone: "+201001234567", name: "Mona", email: null, city: null, now: NOW }))!;
    late = (await store.createHostedUser({ appId: app.id, phone: "+201001234568", name: "Ali", email: null, city: null, now: NOW }))!;
    gig = await store.createEvent(
      {
        appId: app.id,
        title: "Oud night",
        description: "<p>Music.</p>",
        category: "Concerts",
        imageAssetIds: [],
        startAt: days(5),
        endAt: days(5),
        venueName: "Hall",
        venueAddress: "Zamalek",
        latitude: null,
        longitude: null,
        onlineUrl: null,
        organiser: "Kuzey",
        capacity: 1,
        status: "published",
        publishedAt: NOW,
      },
      NOW,
    );
    seat = await store.createTicketType({ appId: app.id, eventId: gig.id, name: "Seat", priceCents: 30000, capacity: null, saleEndsAt: null, maxPerOrder: 1, position: 0 }, NOW);
  });

  const connector = () => new EventsConnector({ store, app, assetUrl: (id) => id, platformUrl: PLATFORM, signingSecret: "test-signing-secret-0123456789abcdef0123456789" });
  async function order(user: HostedUser, now: Date): Promise<CatalogOrder | null> {
    const result = await connector().handle({
      method: "POST",
      path: ["events", "checkout-link"],
      query: new URLSearchParams({ platform: "android" }),
      body: { event_id: gig.id, ticket_type_id: seat.id, quantity: 1 },
      user,
      now,
    });
    if (result?.status !== 200) return null;
    const { items } = await store.listCatalogOrders({ appId: app.id, offset: 0, limit: 10 });
    return items.find((o) => o.userId === user.id && o.status === "pending") ?? null;
  }

  /** Kashier as a fake server: answers the session and records what was asked. */
  function kashier() {
    const bodies: Record<string, unknown>[] = [];
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return Response.json({ response: { _id: "sess-1", sessionUrl: "https://checkout.kashier.test/sess-1" } });
    }) as unknown as typeof fetch;
    return { bodies, fetcher };
  }

  const pay = (o: CatalogOrder, now: Date, fetcher: typeof fetch) =>
    startPayment({
      store,
      app,
      account: { account: { provider: "kashier", keys: { merchantId: "MID-1-1", apiKey: "k", secretKey: "s", sandbox: true } }, marketplace: null } as never,
      fetcher,
      urls: {},
      now,
      order: o,
      customer: { name: "Mona Aziz", phone: "+201001234567", email: "mona@example.com", city: "Cairo", address: "" },
      ip: "203.0.113.5",
      callbackUrls: { returnUrl: `${PLATFORM}/api/pay/kashier/order/t`, webhookUrl: `${PLATFORM}/api/pay/kashier/order/t` },
    });

  it("holds the places for the pay link, then exactly as long as Kashier's session (plus the grace)", async () => {
    expect(HOLD_MINUTES).toBe(60);
    const first = (await order(buyer, NOW))!;
    const [held] = await store.listTickets({ appId: app.id, orderId: first.id });
    expect(held!.holdUntil).toEqual(new Date(NOW.getTime() + 60 * MINUTE));
    const startAt = new Date(NOW.getTime() + 50 * MINUTE);
    const k = kashier();
    await pay(first, startAt, k.fetcher);
    const expireAt = new Date(startAt.getTime() + PROVIDER_PAGE_MINUTES * MINUTE);
    expect(k.bodies[0]).toMatchObject({ expireAt: expireAt.toISOString() });
    const [extended] = await store.listTickets({ appId: app.id, orderId: first.id });
    expect(extended!.holdUntil).toEqual(new Date(expireAt.getTime() + SETTLE_GRACE_MINUTES * MINUTE));
    // Nobody else gets the place while the page can still take the payment.
    expect(await order(late, new Date(startAt.getTime() + 34 * MINUTE))).toBeNull();
    // The page has ended: the place goes back on sale, and the first buyer can't start paying again.
    expect(holdEnded([extended!], new Date(extended!.holdUntil!.getTime()))).toBe(true);
    const after = new Date(extended!.holdUntil!.getTime() + 1);
    await expect(pay(first, after, kashier().fetcher)).rejects.toBeInstanceOf(HoldEndedError);
    expect(await order(late, after)).not.toBeNull();
  });

  it("a payment confirmed after the hold ended gets its ticket only while the place is free", async () => {
    const first = (await order(buyer, NOW))!;
    await pay(first, NOW, kashier().fetcher);
    const ended = new Date(NOW.getTime() + (PROVIDER_PAGE_MINUTES + SETTLE_GRACE_MINUTES + 1) * MINUTE);
    // Nobody took the place: the late payment still gets its ticket.
    await store.payCatalogOrder(app.id, first.id, "pay-1", ended);
    await deliverPaidOrder(store, app, (await store.getCatalogOrder(app.id, first.id))!, ended, PLATFORM);
    expect((await store.listTickets({ appId: app.id, orderId: first.id })).map((t) => t.status)).toEqual(["valid"]);
    expect(await store.getCatalogOrder(app.id, first.id)).toMatchObject({ status: "completed" });
  });

  it("a late payment for a place someone else took: no ticket, the order stays paid, the owner refunds it", async () => {
    const first = (await order(buyer, NOW))!;
    await pay(first, NOW, kashier().fetcher);
    const ended = new Date(NOW.getTime() + (PROVIDER_PAGE_MINUTES + SETTLE_GRACE_MINUTES + 1) * MINUTE);
    const second = (await order(late, ended))!;
    await store.payCatalogOrder(app.id, second.id, "pay-2", ended);
    await deliverPaidOrder(store, app, (await store.getCatalogOrder(app.id, second.id))!, ended, PLATFORM);
    // Then the first buyer's payment is confirmed: the event is full.
    await store.payCatalogOrder(app.id, first.id, "pay-1", ended);
    const paid = (await store.getCatalogOrder(app.id, first.id))!;
    await deliverPaidOrder(store, app, paid, ended, PLATFORM);
    const tickets = await store.listTickets({ appId: app.id, orderId: first.id });
    expect(tickets.map((t) => t.status)).toEqual(["cancelled"]);
    expect((await store.listTickets({ appId: app.id, eventId: gig.id })).filter((t) => t.status === "valid")).toHaveLength(1);
    const after = (await store.getCatalogOrder(app.id, first.id))!;
    expect(after.status).toBe("processing");
    expect(paidWithoutPlaces(after, tickets)).toBe(true);
    const notices = await store.listOwnerNotices({ clientId: app.clientId, appId: app.id, limit: 10 });
    expect(notices.map((n) => [n.kind, n.title, n.linkUrl])).toEqual([["ticket_refund_due", `Kuzey Culture Centre: refund order ${1000 + first.id}`, `${PLATFORM}/dashboard/orders`]]);
    // Settled twice (redirect and webhook): one notice.
    await deliverPaidOrder(store, app, after, ended, PLATFORM);
    expect(await store.listOwnerNotices({ clientId: app.clientId, appId: app.id, limit: 10 })).toHaveLength(1);
  });

  it("each provider says how long its page takes the payment", async () => {
    const k = kashier();
    const at = new Date(Date.now() + 30 * MINUTE);
    const base = {
      reference: "order-1",
      amountCents: 30000,
      currency: "EGP" as const,
      description: "Order",
      lines: [{ id: "1", name: "Seat", cents: 30000, category: "Tickets", digital: true }],
      customer: { id: "c-1", name: "Mona Aziz", email: "m@example.com", phone: null, city: "Cairo", address: null, ip: "203.0.113.5" },
      returnUrl: `${PLATFORM}/r`,
      webhookUrl: `${PLATFORM}/w`,
      iyzico: { conversationId: "order-1001", basketId: "1", shipping: false },
    };
    const kashierStarted = await startCheckout({ provider: "kashier", keys: { merchantId: "MID-1-1", apiKey: "k", secretKey: "s", sandbox: true } }, { ...base, pageExpiresAt: at }, { fetcher: k.fetcher });
    expect(kashierStarted.expiresAt).toEqual(at);
    // Without one asked for (plans, donations), Kashier's own default: nothing sent.
    await startCheckout({ provider: "kashier", keys: { merchantId: "MID-1-1", apiKey: "k", secretKey: "s", sandbox: true } }, base, { fetcher: k.fetcher });
    expect(k.bodies[1]).not.toHaveProperty("expireAt");
    const fawaterk = vi.fn(async () => Response.json({ status: "success", data: { invoiceId: 77, invoiceKey: "k", url: "https://fawaterk.test/invoice/77" } })) as unknown as typeof fetch;
    const fawaterkStarted = await startCheckout({ provider: "fawaterk", keys: { apiKey: "f", sandbox: true } }, { ...base, pageExpiresAt: at }, { fetcher: fawaterk });
    expect(fawaterkStarted.expiresAt).toBeNull();
    const before = Date.now();
    const iyzico = vi.fn(async () => Response.json({ status: "success", token: "tok", paymentPageUrl: "https://iyzico.test/p", tokenExpireTime: 1800 })) as unknown as typeof fetch;
    const iyzicoStarted = await startCheckout({ provider: "iyzico", keys: { apiKey: "a", secretKey: "b", sandbox: true } }, { ...base, currency: "TRY" }, { fetcher: iyzico });
    expect(iyzicoStarted.expiresAt!.getTime()).toBeGreaterThanOrEqual(before + 1800_000);
  });
});
