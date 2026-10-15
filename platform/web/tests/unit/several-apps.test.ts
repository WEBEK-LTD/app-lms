import { describe, expect, it } from "vitest";
import { activateClient, regenerateLicenseKey, resolveClientApp, revealLicenseKey } from "@/lib/admin/clients";
import { appsByState, clientsByState } from "@/lib/admin/overview";
import { inAudience } from "@/lib/announcements";
import { appLabel } from "@/lib/app/label";
import { newApp, queueBuild } from "@/lib/app/setup";
import { checkCoupon } from "@/lib/billing/coupons";
import { activateWithFreeCoupon, completePlanPayment, startPlanPayment } from "@/lib/billing/plan-payment";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { App, Coupon, Build } from "@/lib/data/types";
import { activateLicense, checkLicense, parseSiteInfo } from "@/lib/license/service";
import { appState, clientAccountState } from "@/lib/license/status";
import { defaultLayout, BUILT_IN_APP_DEFAULTS } from "@/lib/pages/defaults";
import { publishLayout } from "@/lib/pages/layout";
import { pluginLayout } from "@/lib/pages/plugin";
import type { IyzicoKeys } from "@/lib/payments/iyzico";
import { PLAN_INFO, plansWith } from "@/lib/plans";
import { days, KEY, NOW, setupClient } from "./helpers";

/** Several apps per account (roadmap 12): each app has its own plan, license, payments and builds. */

const IYZICO: IyzicoKeys = { apiKey: "yallapp-api", secretKey: "yallapp-secret", sandbox: true };
const PLANS = plansWith({ starter: { ...PLAN_INFO.starter, highlights: [...PLAN_INFO.starter.highlights], features: [...PLAN_INFO.starter.features], priceCents: 30000, currency: "TRY", billingMonths: 1 } });

function app(clientId: string, name: string, createdAt: Date, appType: App["appType"] = "lms"): App {
  return { ...newApp(clientId, null, createdAt, appType), appName: name };
}

/** A client with a first app activated on Pro and a second app, not activated yet. */
async function twoApps() {
  const setup = await setupClient({ plan: "pro", activeUntil: days(60) });
  const first = app(setup.client.id, "Ada Academy", NOW);
  await setup.store.createApp(first);
  const second = app(setup.client.id, "Ada Shop", days(1), "store");
  await setup.store.createApp(second);
  return { ...setup, first, second, firstKey: setup.licenseKey! };
}

const coupon = (overrides: Partial<Coupon> = {}): Coupon => ({
  id: "c-1",
  code: "SECOND",
  note: "",
  discount: { kind: "percent", percent: 100 },
  plans: null,
  periods: null,
  validFrom: null,
  validUntil: null,
  maxRedemptions: null,
  maxPerClient: null,
  firstPaymentOnly: false,
  active: true,
  createdAt: NOW,
  updatedAt: NOW,
  createdBy: "admin@yallapp.test",
  ...overrides,
});

describe("several apps in the memory store", () => {
  it("lists a client's apps oldest first, and only theirs", async () => {
    const { store, client, first, second } = await twoApps();
    expect((await store.listAppsByClient(client.id)).map((a) => a.id)).toEqual([first.id, second.id]);
    expect(await store.listAppsByClient("someone-else")).toEqual([]);
  });

  it("gives the license and payments made before the first app to that app, and nothing to the next ones", async () => {
    const setup = await setupClient({ activate: false });
    const free = await activateWithFreeCoupon({
      store: setup.store,
      client: setup.client,
      plan: PLANS.starter,
      coupon: { ok: true, coupon: coupon(), fullCents: 30000, discountCents: 30000, amountCents: 0 },
      encryptionKey: KEY,
      now: NOW,
    });
    expect(free.payment.appId).toBeNull();
    expect(free.activation.license.appId).toBeNull();
    expect(await setup.store.getLicenseForApp(setup.client.id, null)).toMatchObject({ id: free.activation.license.id });

    const first = app(setup.client.id, "First", NOW);
    await setup.store.createApp(first);
    expect(await setup.store.getLicenseForApp(setup.client.id, null)).toBeNull();
    expect(await setup.store.getLicenseForApp(setup.client.id, first.id)).toMatchObject({ id: free.activation.license.id, appId: first.id });
    expect(await setup.store.listPlanPayments({ appId: first.id, limit: 5 })).toMatchObject([{ id: free.payment.id }]);

    const second = app(setup.client.id, "Second", days(1));
    await setup.store.createApp(second);
    expect(await setup.store.getLicenseForApp(setup.client.id, second.id)).toBeNull();
    expect(await setup.store.listPlanPayments({ appId: second.id, limit: 5 })).toEqual([]);
  });

  it("keeps one license per app, and never answers with another client's", async () => {
    const { store, client, first, second } = await twoApps();
    const license = (await store.getLicenseForApp(client.id, first.id))!;
    await expect(store.createLicense({ ...license, id: "dup", keyHash: "x".repeat(64) })).rejects.toThrow();
    const other = await setupClient({ email: "other@academy.test" });
    expect(await other.store.getLicenseForApp(other.client.id, first.id)).toBeNull();
    expect(await store.getLicenseForApp("someone-else", first.id)).toBeNull();
    expect(await store.getLicenseForApp(client.id, second.id)).toBeNull();
  });

  it("numbers builds and version codes per app", async () => {
    const { store, client, first, second } = await twoApps();
    const build = (appId: string, id: string) =>
      store.createBuild({
        id,
        clientId: client.id,
        appId,
        versionName: "1.0.0",
        status: "ready",
        stages: {} as Build["stages"],
        config: {} as Build["config"],
        storeListing: {} as Build["storeListing"],
        autoPublish: false,
        artifacts: [],
        message: null,
        logUrl: null,
        createdAt: NOW,
        startedAt: null,
        finishedAt: null,
        updatedAt: NOW,
      });
    expect(await build(first.id, "b1")).toMatchObject({ number: 1, versionCode: 1 });
    expect(await build(first.id, "b2")).toMatchObject({ number: 2, versionCode: 2 });
    expect(await build(second.id, "b3")).toMatchObject({ number: 1, versionCode: 1 });
    expect((await store.listBuildsByApp(first.id, 10)).map((b) => b.id)).toEqual(["b2", "b1"]);
    expect((await store.listBuildsByApp(second.id, 10)).map((b) => b.id)).toEqual(["b3"]);
  });

  it("lists clients with each app and its own license; the account is active while any app is", async () => {
    const { store, client, first, second } = await twoApps();
    let [row] = await store.listClients({ filter: "all", now: NOW });
    expect(row!.apps.map((e) => [e.app?.id, e.license?.plan ?? null])).toEqual([
      [first.id, "pro"],
      [second.id, null],
    ]);
    expect(appsByState([row!], NOW)).toEqual({ active: 1, pending: 1, expired: 0, suspended: 0 });

    // The second app gets a longer plan; the first one ends: still an active account.
    await activateClient(store, { clientId: client.id, appId: second.id, plan: "starter", activeUntil: days(400), paymentNote: "" }, KEY, NOW);
    const later = days(90);
    [row] = await store.listClients({ filter: "active", now: later });
    expect(row?.license?.appId).toBe(second.id);
    expect(clientsByState([row!], later)).toMatchObject({ active: 1 });
    expect(appsByState([row!], later)).toEqual({ active: 1, pending: 0, expired: 1, suspended: 0 });
    expect(await store.countClients(later)).toMatchObject({ all: 1, active: 1, expired: 0 });
    expect(await store.listClients({ filter: "expired", now: later })).toEqual([]);
    expect(await store.countClients(days(500))).toMatchObject({ active: 0, expired: 1 });
  });
});

describe("licenses and plans per app", () => {
  it("activates an app on its own plan with its own key, without touching the other app", async () => {
    const { store, client, first, second, firstKey } = await twoApps();
    const before = (await store.getLicenseForApp(client.id, first.id))!;
    const outcome = await activateClient(store, { clientId: client.id, appId: second.id, plan: "starter", activeUntil: days(30), paymentNote: "second app" }, KEY, NOW);
    expect(outcome).toMatchObject({ created: true, app: { id: second.id } });
    expect(outcome.license).toMatchObject({ appId: second.id, plan: "starter" });
    expect(outcome.licenseKey).not.toBe(firstKey);
    expect(await store.getLicenseForApp(client.id, first.id)).toEqual(before);
    expect(revealLicenseKey((await store.getLicenseForApp(client.id, second.id))!, KEY)).toBe(outcome.licenseKey);
    expect((await store.getClientById(client.id))?.paymentNote).toContain("second app (Ada Shop)");

    // A new key for one app leaves the other app's key as it was.
    const renewed = await regenerateLicenseKey(store, client.id, KEY, NOW, second.id);
    expect(revealLicenseKey((await store.getLicenseForApp(client.id, first.id))!, KEY)).toBe(firstKey);
    expect(renewed).not.toBe(outcome.licenseKey);
  });

  it("needs to be told which app once there are several", async () => {
    const { store, client, second } = await twoApps();
    await expect(resolveClientApp(store, client, undefined)).rejects.toThrow("Choose which app");
    await expect(activateClient(store, { clientId: client.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW)).rejects.toThrow();
    expect(await resolveClientApp(store, client, second.id)).toMatchObject({ id: second.id });
    expect(await resolveClientApp(store, client, "not-theirs")).toBeUndefined();
  });

  it("has a state per app; suspension is for the whole account", async () => {
    const { store, client, first, second } = await twoApps();
    const c = (await store.getClientById(client.id))!;
    const firstLicense = await store.getLicenseForApp(client.id, first.id);
    expect(appState(c, firstLicense, NOW)).toBe("active");
    expect(appState(c, await store.getLicenseForApp(client.id, second.id), NOW)).toBe("pending");
    expect(appState({ status: "suspended" }, null, NOW)).toBe("suspended");
    expect(appState({ status: "suspended" }, firstLicense, NOW)).toBe("suspended");
    expect(clientAccountState(c, [firstLicense!], NOW)).toBe("active");
    expect(clientAccountState(c, [firstLicense!], days(100))).toBe("expired");
    expect(clientAccountState(c, [], NOW)).toBe("expired");
  });

  it("a card payment for one app activates or extends that app only", async () => {
    const { store, client, user, first, second } = await twoApps();
    const firstBefore = (await store.getLicenseForApp(client.id, first.id))!;
    const started: Record<string, unknown>[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      if (url.endsWith("/checkoutform/initialize/auth/ecom")) {
        started.push(body);
        return Response.json({ status: "success", token: "iyzi-1", paymentPageUrl: "https://iyzico.test/pay/iyzi-1" });
      }
      const last = started[started.length - 1]!;
      return Response.json({ status: "success", paymentStatus: "SUCCESS", paymentId: "9100", paidPrice: Number(last.price), basketId: last.basketId });
    }) as unknown as typeof fetch;
    let token = "";
    await startPlanPayment({
      store,
      account: { provider: "iyzico", keys: IYZICO },
      fetcher,
      now: NOW,
      client: (await store.getClientById(client.id))!,
      app: second,
      user,
      plan: PLANS.starter,
      billing: { city: "Istanbul", address: "Bağdat Caddesi 1, Kadıköy" },
      ip: "203.0.113.5",
      callbackUrls: (t) => {
        token = t;
        return { returnUrl: `https://yallapp.test/api/pay/plan/${t}`, webhookUrl: null };
      },
    });
    const payment = (await store.getPlanPaymentByToken(sha256Hex(token)))!;
    expect(payment).toMatchObject({ appId: second.id, plan: "starter" });

    const outcome = await completePlanPayment({ store, account: { provider: "iyzico", keys: IYZICO }, fetcher, now: NOW, payment, iyzicoToken: "iyzi-1", encryptionKey: KEY });
    expect(outcome.kind).toBe("paid");
    if (outcome.kind !== "paid") return;
    expect(outcome.activation).toMatchObject({ created: true, app: { id: second.id } });
    expect(await store.getLicenseForApp(client.id, second.id)).toMatchObject({ plan: "starter", expiresAt: outcome.activeUntil });
    expect(await store.getLicenseForApp(client.id, first.id)).toEqual(firstBefore);
    expect(await store.listPlanPayments({ appId: first.id, limit: 5 })).toEqual([]);
  });

  it("builds an app on its own license, never on another app's", async () => {
    const { store, client, first, second } = await twoApps();
    const c = (await store.getClientById(client.id))!;
    const firstLicense = await store.getLicenseForApp(client.id, first.id);
    expect(await queueBuild(store, { client: c, app: second, license: firstLicense, versionName: "1.0.0" }, NOW, (id) => id)).toMatchObject({
      ok: false,
      reason: "license_inactive",
    });
    expect(await queueBuild(store, { client: c, app: second, license: null, versionName: "1.0.0" }, NOW, (id) => id)).toMatchObject({ reason: "license_inactive" });
  });

  it("the plugin's license key answers for its own app: plan, site and published layout", async () => {
    const { store, client, second, firstKey } = await twoApps();
    const secondKey = (await activateClient(store, { clientId: client.id, appId: second.id, plan: "starter", activeUntil: days(30), paymentNote: "" }, KEY, NOW)).licenseKey;
    const site = (key: string, url: string) => {
      const parsed = parseSiteInfo({ license_key: key, site_url: url, plugin_version: "0.3.0" });
      if (!parsed.ok) throw new Error("bad site");
      return parsed.value;
    };
    expect(await activateLicense(store, site(firstKey, "https://academy.test"), NOW)).toMatchObject({ status: 200, body: { status: "active", plan: "pro" } });
    expect(await activateLicense(store, site(secondKey, "https://shop.test"), NOW)).toMatchObject({ status: 200, body: { status: "active", plan: "starter" } });
    // Each key is bound to its own site.
    expect(await checkLicense(store, site(secondKey, "https://academy.test"), NOW)).toMatchObject({ body: { status: "invalid" } });

    const published = await publishLayout(store, second, defaultLayout(second, BUILT_IN_APP_DEFAULTS, NOW), "ada@academy.test", NOW);
    expect(published.ok).toBe(true);
    expect(await pluginLayout(store, site(firstKey, "https://academy.test"), null, NOW)).toEqual({ status: 204 });
    const layout = await pluginLayout(store, site(secondKey, "https://shop.test"), null, NOW);
    expect(layout.status).toBe(200);
  });

  it("a first-payment coupon counts per app; uses per client stay per account", () => {
    const client = { id: "client-1", activatedAt: NOW };
    const plan = PLANS.starter;
    const first = coupon({ firstPaymentOnly: true, discount: { kind: "percent", percent: 50 } });
    // The account was activated (its first app), but this app has no license yet.
    expect(checkCoupon({ coupon: first, plan, client, license: null, redemptions: [], now: NOW }).ok).toBe(true);
    expect(checkCoupon({ coupon: first, plan, client, license: { id: "l-1" }, redemptions: [], now: NOW })).toEqual({ ok: false, error: "This coupon is for a first payment only." });
    const once = coupon({ maxPerClient: 1, discount: { kind: "percent", percent: 50 } });
    const used = { couponId: once.id, paymentId: "p-1", clientId: "client-1", code: once.code, plan: "starter" as const, fullCents: 1, discountCents: 1, currency: "TRY" as const, status: "redeemed" as const, createdAt: NOW, redeemedAt: NOW };
    expect(checkCoupon({ coupon: once, plan, client, license: null, redemptions: [used], now: NOW })).toEqual({ ok: false, error: "You've already used this coupon." });
  });

  it("announcements by plan or app type reach an account when any of its apps matches", () => {
    const subject = { state: "active" as const, license: null, app: null, licenses: [{ plan: "starter" as const }, { plan: "pro" as const }], apps: [{ appType: "lms" as const }, { appType: "store" as const }] };
    expect(inAudience({ kind: "plan", plans: ["pro"] }, subject)).toBe(true);
    expect(inAudience({ kind: "app_type", appTypes: ["store"] }, subject)).toBe(true);
    expect(inAudience({ kind: "app_type", appTypes: ["booking"] }, subject)).toBe(false);
  });

  it("calls an app by its name, or Untitled app", () => {
    expect(appLabel({ appName: "Ada Shop" })).toBe("Ada Shop");
    expect(appLabel({ appName: null })).toBe("Untitled app");
    expect(appLabel(null)).toBe("Untitled app");
  });
});
