import { beforeEach, describe, expect, it } from "vitest";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { newApp } from "@/lib/app/setup";
import { checkoutAccount, encryptPaymentKeys } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CampaignInput, type Donation } from "@/lib/data/types";
import { placeDemoDonation } from "@/lib/demo/checkout";
import { csvCell, donationsCsv, donorsOf, parseCampaignForm, parseCampaignUpdate, parseDonationSettings, parsePresets } from "@/lib/donations/forms";
import { campaignPageItems, progressBadge } from "@/lib/donations/page-items";
import { completeDonationPayment, donationKeys, donationReceiptValues, readDonor, startDonationPayment } from "@/lib/donations/payment";
import { amountProblem, readDonationRequest, shortName } from "@/lib/donations/service";
import { emailTemplate, renderTemplate } from "@/lib/email/templates";
import { DonationsConnector, openInFor } from "@/lib/hosted/connectors/donations";
import { notifyCampaignDonors } from "@/lib/hosted/notify";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { itemSourcesFor, blockTypesFor } from "@/lib/pages/sources";
import { DONATIONS_REVIEW_NOTE, reviewNotesFor } from "@/lib/publishing/review-notes";
import type { IyzicoKeys } from "@/lib/payments/iyzico";
import type { ServiceAccount } from "@/lib/hosted/push";
import { expectContract } from "./contract";
import { KEY, NOW, days, setupClient } from "./helpers";

const IYZICO: IyzicoKeys = { apiKey: "sandbox-api", secretKey: "sandbox-secret", sandbox: true };
const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;

function campaign(appId: string, overrides: Partial<CampaignInput>): CampaignInput {
  return {
    appId,
    title: "Campaign",
    summary: null,
    story: "<p>Why we raise money.</p>",
    imageAssetIds: [],
    goalCents: 100_000_00,
    presetCents: [300_00, 150_00],
    allowCustomAmount: true,
    minCents: 50_00,
    endsAt: null,
    status: "open",
    featured: false,
    publishedAt: NOW,
    ...overrides,
  };
}

describe("29 charity campaigns and donations on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let ids: Record<"parcels" | "lunch" | "ended" | "closed" | "draft", number>;
  let cardPayments: boolean;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "donations", "charity");
    app = {
      ...base,
      backend: "hosted",
      appName: "Bereket Food Bank",
      websiteDoneAt: NOW,
      connector: { kind: "campaigns" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: encryptPaymentKeys(base.id, IYZICO.apiKey, IYZICO.secretKey, true, KEY) },
    };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
    cardPayments = true;
    ids = {} as typeof ids;
    const add = async (key: keyof typeof ids, input: Partial<CampaignInput>, at: Date) => (ids[key] = (await store.createCampaign(campaign(app.id, input), at)).id);
    await add("parcels", { title: "Winter food parcels", featured: true, imageAssetIds: ["img-parcels", "img-2"], publishedAt: days(-7), story: '<p>Parcels.</p><iframe src="https://www.youtube.com/embed/abc" width="560" height="315"></iframe><script>alert(1)</script>' }, days(-7));
    await add("lunch", { title: "School lunches", goalCents: null, publishedAt: days(-3) }, days(-3));
    await add("ended", { title: "Summer camp", endsAt: days(-1), publishedAt: days(-30) }, days(-30));
    await add("closed", { title: "Flood relief", status: "closed", publishedAt: days(-40) }, days(-40));
    await add("draft", { title: "Secret draft", status: "draft", publishedAt: null }, days(-1));
  });

  const context = (overrides: Partial<HostedContext> = {}): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: ASSETS,
    platformUrl: "https://yallapp.test",
    connector: new DonationsConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test", cardPayments }),
    ...overrides,
  });

  async function call(method: string, route: string, options: { query?: Record<string, string>; params?: string[]; token?: string; body?: unknown } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), {
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
    });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone = "5321234567") {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+90${phone}`)!, device: DEVICE } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name: "Sara Yilmaz", device: DEVICE } });
    return registered.body as { access_token: string; user: { id: number } };
  }

  const donate = (platform: "android" | "ios", body: Record<string, unknown>, token?: string) =>
    call("POST", "/donations/checkout-link", { query: { platform }, body: { campaign_id: ids.parcels, amount: "300.00", ...body }, token });

  it("sends Config.donations and the charity vertical, with updates pushed only when push is set up and in the plan", async () => {
    const config = (await call("GET", "/config", { query: { platform: "ios", app_version: "1.0.0" } })).body as Record<string, unknown>;
    expect(config.donations).toEqual({ currency: "TRY", ios_mode: "browser", monthly: false, updates_push: false });
    expect(config.vertical).toBe("charity");
    app = { ...app, firebaseServiceAccountEncrypted: "sealed" };
    const withPush = await handleHosted(context({ push: true }), { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "ios", app_version: "1" }), body: null, token: null });
    expect((withPush.body as { donations: { updates_push: boolean } }).donations.updates_push).toBe(true);
  });

  it("lists open campaigns first, featured first, then ended ones; never drafts", async () => {
    const list = await call("GET", "/donations/campaigns");
    const titles = (r: HostedResult) => (r.body as { items: { title: string }[] }).items.map((c) => c.title);
    expect(titles(list)).toEqual(["Winter food parcels", "School lunches", "Summer camp", "Flood relief"]);
    const items = (list.body as { items: Record<string, unknown>[] }).items;
    expect(items[0]).toMatchObject({ status: "open", goal: "100000.00", goal_formatted: "₺100,000.00", raised: "0.00", donor_count: 0, progress: 0, image_url: ASSETS("img-parcels"), featured: true, summary: "Parcels." });
    expect(items[1]).toMatchObject({ goal: null, goal_formatted: null, progress: null });
    expect(items[2]).toMatchObject({ title: "Summer camp", status: "closed" });
    expect(titles(await call("GET", "/donations/campaigns", { query: { status: "open" } }))).toEqual(["Winter food parcels", "School lunches"]);
    expect(titles(await call("GET", "/donations/campaigns", { query: { status: "closed" } }))).toEqual(["Summer camp", "Flood relief"]);
    expect(titles(await call("GET", "/donations/campaigns", { query: { featured: "true" } }))).toEqual(["Winter food parcels"]);
    expect(titles(await call("GET", "/donations/campaigns", { query: { ids: `${ids.lunch},${ids.draft},${ids.parcels}` } }))).toEqual(["School lunches", "Winter food parcels"]);
    expect((await call("GET", "/donations/campaigns", { query: { status: "soon" } })).status).toBe(400);
  });

  it("serves a campaign with its story cleaned like an article, its amounts and recent donations", async () => {
    const detail = await call("GET", "/donations/campaigns/{campaign_id}", { params: [String(ids.parcels)] });
    const body = detail.body as Record<string, unknown>;
    expect(body).toMatchObject({ render_mode: "native", preset_amounts: ["150.00", "300.00"], allow_custom_amount: true, min_amount: "50.00", recent_donations: [] });
    expect(body.html).not.toContain("<script");
    expect(body.html).toContain('data-yallapp-embed="yallapp-embed-1"');
    expect((body.embeds as { provider: string }[])[0]).toMatchObject({ provider: "youtube" });
    expect((body.images as { url: string }[]).map((i) => i.url)).toEqual([ASSETS("img-parcels"), ASSETS("img-2")]);
    expect((await call("GET", "/donations/campaigns/{campaign_id}", { params: [String(ids.draft)] })).status).toBe(404);
    expect((await call("GET", "/donations/campaigns/{campaign_id}", { params: ["abc"] })).status).toBe(404);
  });

  it("never gives iOS an in-app donation page: the link always opens in the browser", async () => {
    expect(openInFor("ios")).toBe("browser");
    expect(openInFor("android")).toBe("in_app");
    const ios = await donate("ios", {});
    expect(ios.status).toBe(200);
    expect((ios.body as { open_in: string }).open_in).toBe("browser");
    // Whatever the app sends, and signed in or not.
    const { access_token } = await signUp();
    for (const body of [{ amount: "150" }, { anonymous: true, message: "For the winter" }, { recurring: "none" }]) {
      expect(((await donate("ios", body, access_token)).body as { open_in: string }).open_in).toBe("browser");
    }
    const android = await donate("android", {});
    expect((android.body as { open_in: string; url: string }).open_in).toBe("in_app");
    expect((android.body as { url: string }).url).toMatch(/^https:\/\/yallapp\.test\/give\/[A-Za-z0-9_-]{32}$/);
  });

  it("refuses donations the campaign or the charity can't take", async () => {
    const code = (r: HostedResult) => [r.status, (r.body as { code: string }).code];
    // The charity's own keys, the same account orders, tickets and memberships use, and no commission.
    expect(donationKeys(app, KEY)).toEqual(IYZICO);
    expect(await checkoutAccount(store, app, KEY)).toEqual({ keys: IYZICO, marketplace: null });
    expect(code(await donate("android", { amount: "20" }))).toEqual([400, "invalid_request"]);
    expect(code(await donate("android", { amount: "abc" }))).toEqual([400, "invalid_request"]);
    // Monthly donations aren't offered yet: refused, never charged once instead.
    expect(code(await donate("android", { recurring: "monthly" }))).toEqual([400, "invalid_request"]);
    expect(code(await donate("android", { message: "x".repeat(281) }))).toEqual([400, "invalid_request"]);
    expect(code(await donate("android", { campaign_id: ids.ended }))).toEqual([409, "campaign_closed"]);
    expect(code(await donate("android", { campaign_id: ids.closed }))).toEqual([409, "campaign_closed"]);
    expect(code(await donate("android", { campaign_id: ids.draft }))).toEqual([404, "not_found"]);
    await store.updateCampaign(app.id, ids.parcels, { allowCustomAmount: false }, NOW);
    expect(code(await donate("android", { amount: "200" }))).toEqual([400, "invalid_request"]);
    expect((await donate("android", { amount: "150" })).status).toBe(200);
    // iPhone apps can be set to take no donations at all.
    await store.saveDonationSettings(app.id, { currency: "TRY", iosMode: "off" }, NOW);
    expect(code(await donate("ios", { amount: "150" }))).toEqual([403, "purchase_not_allowed"]);
    expect((await donate("android", { amount: "150" })).status).toBe(200);
    // Without card payments in the plan.
    cardPayments = false;
    expect(code(await donate("android", { amount: "150" }))).toEqual([403, "feature_disabled"]);
    cardPayments = true;
    // Only the charity's own iyzico keys: never Yallapp's marketplace account.
    app = { ...app, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: { provider: "yallapp", subMerchantKey: "sub", subMerchantType: "PERSONAL", payeeName: "X", ibanLast4: "1234", sandbox: true, joinedAt: NOW.toISOString() } } };
    expect(code(await donate("android", { amount: "150" }))).toEqual([503, "donations_unavailable"]);
    expect(donationKeys(app, KEY)).toBeNull();
    app = { ...app, catalogSettings: DEFAULT_CATALOG_SETTINGS };
    expect(code(await donate("android", { amount: "150" }))).toEqual([503, "donations_unavailable"]);
  });

  describe("payment", () => {
    let iyzicoCalls: { path: string; body: Record<string, unknown> }[];
    const iyzico = (detail: (donation: Donation) => Record<string, unknown>, donation: () => Donation) =>
      (async (url: string, init: RequestInit) => {
        const path = new URL(url).pathname;
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        iyzicoCalls.push({ path, body });
        if (path.endsWith("/initialize/auth/ecom")) return Response.json({ status: "success", token: "iyzi-token", paymentPageUrl: "https://sandbox-cpp.iyzipay.com?token=iyzi-token" });
        return Response.json(detail(donation()));
      }) as unknown as typeof fetch;
    const paid = (d: Donation) => ({ status: "success", paymentStatus: "SUCCESS", paymentId: `pay-${d.id}`, paidPrice: d.amountCents / 100, basketId: `donation-${d.id}` });

    async function started(body: Record<string, unknown>, email: string, token?: string): Promise<Donation> {
      const link = await donate("android", body, token);
      const t = (link.body as { url: string }).url.split("/").pop()!;
      let donation = (await store.getDonationByToken(sha256Hex(t)))!;
      const donor = readDonor(app, { name: "Elif Yılmaz", email, phone: "", city: "Izmir" });
      if (!donor.ok) throw new Error("donor");
      await startDonationPayment({ store, app, keys: IYZICO, donation, donor: donor.donor, ip: "203.0.113.9", callbackUrl: `https://yallapp.test/api/pay/donation/${t}`, now, fetcher: iyzico(paid, () => donation) });
      donation = (await store.getDonation(app.id, donation.id))!;
      return donation;
    }

    beforeEach(() => {
      iyzicoCalls = [];
    });

    it("checks the donor's details: a name and an email for the receipt, the phone is optional", () => {
      expect(readDonor(app, { name: "Elif", email: "x", phone: "12", city: "" })).toMatchObject({ ok: false, errors: { name: expect.any(String), email: expect.any(String), phone: expect.any(String), city: expect.any(String) } });
      expect(readDonor(app, { name: "Elif Yılmaz", email: "Elif@Example.com", phone: "", city: "Izmir" })).toEqual({ ok: true, donor: { name: "Elif Yılmaz", email: "elif@example.com", phone: null, city: "Izmir" } });
    });

    it("adds a donation to its campaign only after iyzico confirms it, counting each donor once", async () => {
      const first = await started({ amount: "300", anonymous: true, message: "Stay warm" }, "elif@example.com");
      expect(iyzicoCalls[0]).toMatchObject({ path: "/payment/iyzipos/checkoutform/initialize/auth/ecom", body: { price: "300.00", paidPrice: "300.00", basketId: `donation-${first.id}`, currency: "TRY" } });
      expect(iyzicoCalls[0]!.body.basketItems).toEqual([{ id: `campaign-${ids.parcels}`, name: "Donation: Winter food parcels", category1: "Donations", itemType: "VIRTUAL", price: "300.00" }]);
      // Not yet confirmed: the campaign hasn't changed.
      expect(await store.getCampaign(app.id, ids.parcels)).toMatchObject({ raisedCents: 0, donorCount: 0 });
      // A callback iyzico doesn't confirm, or for less, counts nothing.
      const failed = (d: Donation) => ({ status: "success", paymentStatus: "FAILURE", basketId: `donation-${d.id}`, paidPrice: 300 });
      expect(await completeDonationPayment({ store, keys: IYZICO, donation: first, iyzicoToken: "t", now, fetcher: iyzico(failed, () => first) })).toBe("failed");
      const less = (d: Donation) => ({ ...paid(d), paidPrice: 1 });
      expect(await completeDonationPayment({ store, keys: IYZICO, donation: first, iyzicoToken: "t", now, fetcher: iyzico(less, () => first) })).toBe("failed");
      const other = (d: Donation) => ({ ...paid(d), basketId: "donation-999" });
      expect(await completeDonationPayment({ store, keys: IYZICO, donation: first, iyzicoToken: "t", now, fetcher: iyzico(other, () => first) })).toBe("failed");
      expect(await store.getCampaign(app.id, ids.parcels)).toMatchObject({ raisedCents: 0, donorCount: 0 });

      expect(await completeDonationPayment({ store, keys: IYZICO, donation: first, iyzicoToken: "t", now, fetcher: iyzico(paid, () => first) })).toBe("paid");
      expect(await store.getCampaign(app.id, ids.parcels)).toMatchObject({ raisedCents: 300_00, donorCount: 1 });
      // The same callback twice adds nothing.
      const again = (await store.getDonation(app.id, first.id))!;
      expect(await completeDonationPayment({ store, keys: IYZICO, donation: again, iyzicoToken: "t", now, fetcher: iyzico(paid, () => again) })).toBe("already_paid");
      expect(await store.getCampaign(app.id, ids.parcels)).toMatchObject({ raisedCents: 300_00, donorCount: 1 });

      // The same donor again: more raised, still one donor. Another donor: two.
      const second = await started({ amount: "150" }, "elif@example.com");
      await completeDonationPayment({ store, keys: IYZICO, donation: second, iyzicoToken: "t", now, fetcher: iyzico(paid, () => second) });
      const third = await started({ amount: "75.50" }, "mert@example.com");
      await completeDonationPayment({ store, keys: IYZICO, donation: third, iyzicoToken: "t", now, fetcher: iyzico(paid, () => third) });
      expect(await store.getCampaign(app.id, ids.parcels)).toMatchObject({ raisedCents: 525_50, donorCount: 2 });

      // The campaign shows them, without the anonymous donor's name.
      const detail = (await call("GET", "/donations/campaigns/{campaign_id}", { params: [String(ids.parcels)] })).body as { raised: string; donor_count: number; recent_donations: { name: string | null; message: string | null; amount_formatted: string }[] };
      expect(detail).toMatchObject({ raised: "525.50", donor_count: 2 });
      expect(detail.recent_donations.map((d) => [d.name, d.amount_formatted, d.message])).toEqual([
        ["Elif Y.", "₺75.50", null],
        ["Elif Y.", "₺150.00", null],
        [null, "₺300.00", "Stay warm"],
      ]);
    });

    it("lists the signed-in donor's confirmed donations with their receipts", async () => {
      const { access_token } = await signUp();
      const mine = await started({ amount: "300" }, "sara@example.com", access_token);
      await started({ amount: "150" }, "sara@example.com", access_token); // never paid
      await completeDonationPayment({ store, keys: IYZICO, donation: mine, iyzicoToken: "t", now, fetcher: iyzico(paid, () => mine) });
      const list = await call("GET", "/me/donations", { token: access_token });
      const items = (list.body as { items: Record<string, unknown>[] }).items;
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ reference: `D-${1000 + mine.id}`, campaign_id: ids.parcels, campaign_title: "Winter food parcels", amount: "300.00", amount_formatted: "₺300.00", recurring: "none", anonymous: false });
      expect(items[0]!.receipt_url).toBe(`https://yallapp.test/receipts/${mine.receiptCode}`);
      expect((await call("GET", "/me/donations")).status).toBe(401);
      // A deleted campaign keeps its donations' titles.
      await store.deleteCampaign(app.id, ids.parcels);
      expect(((await call("GET", "/me/donations", { token: access_token })).body as { items: Record<string, unknown>[] }).items[0]).toMatchObject({ campaign_id: null, campaign_title: "Winter food parcels" });
    });

    it("sends a receipt with the charity, amount, date and reference, and no tax claims", async () => {
      const donation = await started({ amount: "300" }, "elif@example.com");
      await completeDonationPayment({ store, keys: IYZICO, donation, iyzicoToken: "t", now, fetcher: iyzico(paid, () => donation) });
      const paidDonation = (await store.getDonation(app.id, donation.id))!;
      const values = donationReceiptValues(paidDonation, "Bereket Food Bank", "https://yallapp.test/receipts/abc");
      expect(values).toMatchObject({ org_name: "Bereket Food Bank", amount: "₺300.00", campaign: "Winter food parcels", reference: `D-${1000 + donation.id}`, date: "12 October 2026" });
      const mail = renderTemplate(emailTemplate("donation_receipt")!, values);
      expect(mail.subject).toBe(`Your donation to Bereket Food Bank · D-${1000 + donation.id}`);
      expect(mail.text).toContain("Amount: ₺300.00");
      expect(mail.text).toContain("https://yallapp.test/receipts/abc");
      expect(mail.text.toLowerCase()).not.toMatch(/tax|deductib/);
    });
  });

  it("sends campaign updates to the campaign's donors only, pushed only where they turned updates on", async () => {
    const giver = await signUp("5321234567");
    const other = await signUp("5329876543");
    const third = await signUp("5325550000");
    await call("PUT", "/me/push-token", { token: giver.access_token, body: { token: "push-giver", preferences: { donations: true } } });
    await call("PUT", "/me/push-token", { token: third.access_token, body: { token: "push-third", preferences: {} } });
    const give = async (userId: number, campaignId: number, email: string) => {
      const d = await store.createDonation({
        appId: app.id, campaignId, campaignTitle: "x", tokenHash: sha256Hex(`${userId}-${campaignId}`), receiptCode: `receipt-${userId}-${campaignId}-xxxxxxxx`,
        userId, amountCents: 100_00, currency: "TRY", recurring: "none", anonymous: false, message: null, donorName: "A B", donorEmail: email, donorPhone: null,
        status: "pending", paymentId: null, createdAt: now, paidAt: null, updatedAt: now,
      });
      await store.payDonation(app.id, d.id, "p", now);
    };
    await give(giver.user.id, ids.parcels, "giver@example.com");
    await give(third.user.id, ids.parcels, "third@example.com");
    await give(other.user.id, ids.lunch, "other@example.com");
    const pushes: { tokens: string[]; data: Record<string, string> }[] = [];
    const result = await notifyCampaignDonors({
      store, app, campaignId: ids.parcels, title: "We reached 1,000 parcels", body: "Thank you!", account: {} as ServiceAccount, now,
      send: async (_account, tokens, message) => {
        pushes.push({ tokens, data: message.data ?? {} });
        return { sent: tokens.length, invalidTokens: [] };
      },
    });
    expect(result).toEqual({ donors: 2, pushed: 1, pushError: null });
    expect(pushes).toEqual([{ tokens: ["push-giver"], data: { type: "campaign_update", campaign_id: String(ids.parcels) } }]);
    const inbox = (token: string) => call("GET", "/me/notifications", { token });
    const giverInbox = (await inbox(giver.access_token)).body as { items: Record<string, unknown>[] };
    expect(giverInbox.items[0]).toMatchObject({ type: "campaign_update", campaign_id: ids.parcels, title: "We reached 1,000 parcels" });
    expect(((await inbox(other.access_token)).body as { items: unknown[] }).items).toEqual([]);
  });

  it("gives demo donations without changing the campaign, and the daily clean-up removes them", async () => {
    app = { ...app, demo: true, catalogSettings: DEFAULT_CATALOG_SETTINGS };
    await store.updateApp(app.id, { demo: true, catalogSettings: DEFAULT_CATALOG_SETTINGS }, NOW);
    const link = await donate("ios", {});
    expect(link.status).toBe(200);
    const donation = (await store.getDonationByToken(sha256Hex((link.body as { url: string }).url.split("/").pop()!)))!;
    expect(await placeDemoDonation(store, app, donation, now)).toBe(true);
    expect(await store.getDonation(app.id, donation.id)).toMatchObject({ status: "paid", paymentId: "demo" });
    expect(await store.getCampaign(app.id, ids.parcels)).toMatchObject({ raisedCents: 0, donorCount: 0 });
    expect(await placeDemoDonation(store, app, donation, now)).toBe(false);
    expect(donationKeys(app, KEY)).toBeNull();
    const counts = await store.purgeDemoActivity(app.id, days(2));
    expect(counts.donations).toBe(1);
  });

  it("fills page list blocks with open campaigns and their progress", async () => {
    expect(itemSourcesFor(app)).toEqual(["campaigns"]);
    expect(blockTypesFor(app)).not.toContain("search");
    expect(blockTypesFor(app)).not.toContain("categories");
    await store.setCampaignTotals(app.id, ids.parcels, { raisedCents: 62_500_00, donorCount: 10 });
    const items = await campaignPageItems(app.id, { category_id: null, featured: false, sort: "newest", limit: 10, ids: [] }, { store, assetUrl: ASSETS, now });
    expect(items.map((i) => [i.title, i.subtitle, i.badge])).toEqual([
      ["Winter food parcels", "₺62,500.00 of ₺100,000.00", "62%"],
      ["School lunches", "₺0.00 raised", null],
    ]);
    expect(items[0]).toMatchObject({ source: "campaigns", action: { type: "item", item: { source: "campaigns", id: String(ids.parcels) } }, image_url: ASSETS("img-parcels") });
    const picked = await campaignPageItems(app.id, { category_id: null, featured: false, sort: "newest", limit: 10, ids: [String(ids.ended), String(ids.draft)] }, { store, now });
    expect(picked.map((i) => [i.title, i.badge])).toEqual([["Summer camp", "Ended"]]);
    const reached = (await store.getCampaign(app.id, ids.parcels))!;
    expect(progressBadge({ ...reached, raisedCents: 100_000_00 }, now)).toBe("Goal reached");
    // The default pages: featured campaigns and the open ones; tabs Campaigns and My donations.
    const layout = defaultLayout({ ...app, appName: "Bereket", template: "bold", font: "Manrope", brandingDoneAt: null }, BUILT_IN_APP_DEFAULTS, NOW);
    expect(layout.tabs.map((t) => t.target)).toContainEqual({ type: "screen", screen: "campaigns" });
    expect(layout.tabs.map((t) => t.target)).toContainEqual({ type: "screen", screen: "my_donations" });
  });
});

describe("29 donation rules and forms", () => {
  it("reads a donation request", () => {
    expect(readDonationRequest({ campaign_id: 3, amount: "250.5" })).toEqual({ ok: true, value: { campaignId: 3, amountCents: 250_50, recurring: "none", anonymous: false, message: null } });
    expect(readDonationRequest({ campaign_id: 3, amount: "250", anonymous: true, message: "  For   the kids " })).toMatchObject({ ok: true, value: { anonymous: true, message: "For the kids" } });
    expect(readDonationRequest({ campaign_id: 3, amount: "-1" }).ok).toBe(false);
    expect(readDonationRequest({ campaign_id: 3, amount: "1.234" }).ok).toBe(false);
    expect(readDonationRequest({ campaign_id: 0, amount: "1" }).ok).toBe(false);
    expect(readDonationRequest({ campaign_id: 3, amount: "10", recurring: "weekly" }).ok).toBe(false);
    expect(readDonationRequest({ campaign_id: 3, amount: "10", recurring: "monthly" }).ok).toBe(false);
    expect(amountProblem({ minCents: 50_00, presetCents: [], allowCustomAmount: true }, 49_99, "TRY")).toBe("The smallest donation is ₺50.00.");
    expect(amountProblem({ minCents: 50_00, presetCents: [], allowCustomAmount: true }, 2_000_000_00, "TRY")).toMatch(/largest/);
    expect(shortName("Elif Nur Yılmaz")).toBe("Elif Y.");
    expect(shortName("Cher")).toBe("Cher");
    expect(shortName(null)).toBeNull();
  });

  it("checks the campaign form", () => {
    const ok = parseCampaignForm({ title: " Winter  parcels ", story: "Why.\n\nHow.", goal: "50.000", presets: "150, 300, 150, 1.200", min: "20", allowCustom: "on", endsAt: "2026-12-31" }, NOW, { newCampaign: true });
    expect(ok).toEqual({
      ok: true,
      value: { title: "Winter parcels", summary: "Why. How.", story: "Why.\n\nHow.", goalCents: 50_000_00, presetCents: [150_00, 300_00, 1200_00], allowCustomAmount: true, minCents: 20_00, endsAt: new Date("2026-12-31T20:59:59.999Z") },
    });
    const bad = parseCampaignForm({ title: "", story: "", goal: "abc", presets: "10, x", min: "0", endsAt: "2020-01-01" }, NOW, { newCampaign: true });
    expect(bad.ok ? [] : Object.keys(bad.errors).sort()).toEqual(["endsAt", "goal", "min", "presets", "story", "title"]);
    const noAmounts = parseCampaignForm({ title: "T", story: "S", presets: "", min: "20" }, NOW, { newCampaign: false });
    expect(noAmounts).toMatchObject({ ok: false, errors: { presets: expect.any(String) } });
    expect(parseCampaignForm({ title: "T", story: "S", presets: "10", min: "20", allowCustom: "on" }, NOW, { newCampaign: false })).toMatchObject({ ok: false, errors: { presets: expect.stringContaining("smallest") } });
    expect(parsePresets("150\n300; 600")).toEqual([150_00, 300_00, 600_00]);
    expect(parsePresets("1, 2, 3, 4, 5, 6, 7")).toHaveLength(7);
    expect(parseCampaignForm({ title: "T", story: "S", presets: "1, 2, 3, 4, 5, 6, 7", min: "1", allowCustom: "on" }, NOW, { newCampaign: false }).ok).toBe(false);
  });

  it("keeps the currency once someone has given", () => {
    const current = { currency: "TRY" as const, iosMode: "browser" as const };
    expect(parseDonationSettings({ currency: "EUR", iosMode: "off" }, false, current)).toEqual({ ok: true, value: { currency: "EUR", iosMode: "off" } });
    expect(parseDonationSettings({ currency: "EUR", iosMode: "browser" }, true, current)).toMatchObject({ ok: false, errors: { currency: expect.any(String) } });
    expect(parseDonationSettings({ currency: "GBP", iosMode: "maybe" }, false, current)).toMatchObject({ ok: false, errors: { currency: expect.any(String), iosMode: expect.any(String) } });
    expect(parseCampaignUpdate({ title: "", body: "" })).toMatchObject({ ok: false });
    expect(parseCampaignUpdate({ title: " Done ", body: " Thank   you " })).toEqual({ ok: true, value: { title: "Done", body: "Thank you" } });
  });

  it("exports donations as CSV a spreadsheet can't run, and groups donors by email", () => {
    const base: Donation = {
      id: 7, appId: "a", campaignId: 1, campaignTitle: "Winter, food", tokenHash: "h", receiptCode: "r", userId: null, amountCents: 300_00, currency: "TRY",
      recurring: "none", anonymous: true, message: '=HYPERLINK("x")', donorName: "Elif Yılmaz", donorEmail: "elif@example.com", donorPhone: null,
      status: "paid", paymentId: "p", createdAt: NOW, paidAt: NOW, updatedAt: NOW,
    };
    const csv = donationsCsv([base, { ...base, id: 8, amountCents: 50_00, campaignTitle: "Lunch", message: null, paidAt: days(1) }]);
    const lines = csv.replace(/^﻿/, "").trim().split("\r\n");
    expect(lines[0]).toBe("Reference,Date (UTC),Status,Campaign,Amount,Currency,Recurring,Donor,Email,Phone,Anonymous,Message");
    expect(lines[1]).toBe(`D-1007,2026-10-12 10:00:00,paid,"Winter, food",300.00,TRY,One-off,Elif Yılmaz,elif@example.com,,Yes,"'=HYPERLINK(""x"")"`);
    expect(csvCell("-1+2")).toBe("'-1+2");
    const donors = donorsOf([base, { ...base, id: 8, amountCents: 50_00, campaignTitle: "Lunch", paidAt: days(1) }, { ...base, id: 9, donorEmail: "mert@example.com", donorName: "Mert", amountCents: 10_00 }, { ...base, id: 10, status: "pending" }]);
    expect(donors.map((d) => [d.email, d.donations, d.totalCents, d.campaigns])).toEqual([
      ["elif@example.com", 2, 350_00, ["Winter, food", "Lunch"]],
      ["mert@example.com", 1, 10_00, ["Winter, food"]],
    ]);
  });

  it("tells store reviewers that donations happen in the browser", () => {
    expect(reviewNotesFor({ appType: "donations" }, null)).toBe(DONATIONS_REVIEW_NOTE);
    expect(DONATIONS_REVIEW_NOTE).toContain("Safari");
    expect(reviewNotesFor({ appType: "donations" }, "Sign in with +1 202 555 0123")).toBe("Sign in with +1 202 555 0123");
    expect(reviewNotesFor({ appType: "store" }, null)).toBe("");
  });
});
