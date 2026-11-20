import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path, { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import type { BlobStore } from "@/lib/blobs";
import { MemoryStore } from "@/lib/data/memory";
import type { App, MarketTemplate, TemplateLicence } from "@/lib/data/types";
import { effectivePlans } from "@/lib/entitlements";
import { addOwnFont } from "@/lib/fonts/own";
import { loadLayout, saveDraft } from "@/lib/pages/layout";
import type { StudioNode } from "@/lib/pages/types";
import type { PaymentAccount } from "@/lib/payments/provider";
import { en as appEn } from "@/lib/studio/app-words";
import { makeStudioProject } from "@/lib/studio/new-project";
import { TEMPLATES, type SectionWord } from "@/lib/studio/sections";
import { getsUpdates } from "@/lib/studio-market/apply";
import { copyPictures, fontsKey, platformPicture, readTemplateFonts, seededUuid } from "@/lib/studio-market/assets";
import { buyerLicences, filterCards, marketCatalog, readMarketQuery } from "@/lib/studio-market/catalog";
import { appProblem, chargeFor, completeTemplateOrder, startTemplateCheckout, type CheckoutDeps, type DeliverDeps } from "@/lib/studio-market/checkout";
import { runStudioMarketDaily, type MarketDailyDeps } from "@/lib/studio-market/daily";
import { joinAsDesigner } from "@/lib/studio-market/designers";
import { marketMailLines } from "@/lib/studio-market/mail";
import { formatUsd, offeredPlans, perMonthCents, periodEnd, priceTag, readPlans, readUsd, splitSale } from "@/lib/studio-market/plans";
import { decideReview } from "@/lib/studio-market/review";
import { versionDesign } from "@/lib/studio-market/snapshot";
import { sendForReview, startTemplate } from "@/lib/studio-market/templates";

/**
 * 106.2 Studio Market, stage 2: paid plans and their prices, the "from"
 * price, checkout with Yallapp's own Kashier account (one payment, delivered
 * once however many times Kashier calls), renewing from the end date, the
 * daily job's reminders and the end of a plan (the design stays, or the app
 * goes back), and the template's pictures and fonts copied for the template
 * and then for each buyer.
 */

const BLOBS = mkdtempSync(join(tmpdir(), "studio-market-paid-"));
process.env.YALLAPP_BLOBS_DIR = BLOBS;
afterAll(() => rmSync(BLOBS, { recursive: true, force: true }));

class MemoryBlobs implements BlobStore {
  files = new Map<string, { data: Buffer; contentType: string }>();
  async put(key: string, data: Buffer, contentType: string) {
    this.files.set(key, { data, contentType });
  }
  async get(key: string) {
    return this.files.get(key) ?? null;
  }
  async delete(key: string) {
    this.files.delete(key);
  }
}

const NOW = new Date("2026-11-15T10:00:00Z");
const DAY = 86_400_000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY);
const BASE = "https://yallapp.com.tr";
const BLANK = TEMPLATES.find((t) => t.id === "blank")!;
const words = (name: string) => (word: SectionWord) => String(appEn[word]).replaceAll("{app}", name);
const FONT = readFileSync(path.resolve(__dirname, "../..", "src/app/fonts/og/BricolageGrotesque-Medium.ttf"));
/** A picture as Yallapp keeps one (PNG by its first bytes). */
const png = (seed: string) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(`picture ${seed} `.repeat(4))]);

let store: MemoryStore;
let blobs: MemoryBlobs;
let n = 0;

beforeEach(() => {
  store = new MemoryStore();
  blobs = new MemoryBlobs();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

async function account(name: string): Promise<string> {
  n += 1;
  const { client } = await registerClient(store, { name, email: `${name.toLowerCase().replace(/\W+/g, "-")}-${n}@market.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  return client.id;
}

async function project(clientId: string, name: string, kind = "store"): Promise<App> {
  return makeStudioProject(store, { clientId, name, kind: kindById(kind)!, source: "catalog", template: BLANK, words: words(name), lang: "en" }, NOW);
}

async function write(app: App, nodes: StudioNode[]): Promise<void> {
  const record = await loadLayout(store, app, NOW);
  const first = record.draft.pages.findIndex((x) => x.studio);
  const pages = record.draft.pages.map((p, i) => (i === first && p.studio ? { ...p, studio: { ...p.studio, body: { ...p.studio.body, children: nodes } } } : p));
  const saved = await saveDraft(store, app, { ...record.draft, pages }, NOW);
  expect(saved.ok, saved.ok ? "" : saved.errors.join(" ")).toBe(true);
}

async function homeNodes(app: App): Promise<StudioNode[]> {
  const record = await loadLayout(store, app, NOW);
  const out: StudioNode[] = [];
  const walk = (node: StudioNode) => {
    out.push(node);
    node.children?.forEach(walk);
  };
  for (const p of record.draft.pages) if (p.studio) walk(p.studio.body);
  return out;
}
const texts = async (app: App) => (await homeNodes(app)).flatMap((x) => (x.text ? [x.text] : []));

/** A paid template on the market: a 3-month plan at $24 and lifetime at $149, the design staying when a plan ends (or not). */
async function paidTemplate(options: { afterEnd?: "keep" | "restore"; nodes?: (designer: { clientId: string; app: App }) => Promise<StudioNode[]> } = {}) {
  const clientId = await account("Studio Nur");
  const joined = await joinAsDesigner(store, { id: clientId }, { name: "Studio Nur", slug: "", country: "TR", bio: "", terms: true }, NOW);
  if (!joined.ok) throw new Error("join");
  const app = await project(clientId, "Nur project");
  await write(app, options.nodes ? await options.nodes({ clientId, app }) : [{ id: "t1", type: "text", text: "Hello from Nur" } as StudioNode]);
  let template = await startTemplate(store, joined.designer, app, NOW);
  await store.updateMarketTemplate(
    template.id,
    {
      texts: { en: { title: "Rosé Atelier", short: "A soft flower shop.", description: "Photos first." } },
      screens: [(await loadLayout(store, app, NOW)).draft.pages.find((p) => p.studio)!.slug],
      free: false,
      plans: [
        { period: "3m", cents: 2400 },
        { period: "life", cents: 14900 },
      ],
      afterEnd: options.afterEnd ?? "keep",
    },
    NOW,
  );
  template = (await store.getMarketTemplate(template.id))!;
  const sent = await sendForReview({ store, blobs, now: NOW, baseUrl: BASE }, template, app, { rights: true, note: "" }, "nur@market.test");
  if (!sent.ok) throw new Error(sent.message + (sent.errors ?? []).join(" "));
  const decided = await decideReview(store, sent.template, { decision: "approved", notes: "", teamNote: "", checks: [] }, { email: "deniz@yallapp.test", name: "Deniz" }, NOW);
  if (!decided.ok) throw new Error("review");
  return { template: (await store.getMarketTemplate(template.id))!, designer: joined.designer, designerApp: app, designerClient: clientId };
}

async function buyer(name = "Tulip") {
  const clientId = await account(name);
  const flowers = await project(clientId, `${name} Flowers`);
  await write(flowers, [{ id: "own", type: "text", text: "Our own design" } as StudioNode]);
  const cafe = await project(clientId, `${name} Café`, "restaurant");
  const client = (await store.getClientById(clientId))!;
  const user = (await store.getUserById(client.userId))!;
  return { client, user, flowers: (await store.getAppById(flowers.id))!, cafe: (await store.getAppById(cafe.id))! };
}

// ——— A fake Kashier: sessions it started, paid when told ———
function fakeKashier() {
  const sessions = new Map<string, { body: Record<string, unknown>; paid: boolean }>();
  let reads = 0;
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    if (url.pathname === "/v3/payment/sessions" && init?.method === "POST") {
      const id = `66f0${(sessions.size + 1).toString().padStart(4, "0")}aa`;
      sessions.set(id, { body: JSON.parse(String(init.body)) as Record<string, unknown>, paid: false });
      return json({ _id: id, sessionUrl: `https://kashier.test/session/${id}` });
    }
    const read = /^\/v3\/payment\/sessions\/([^/]+)\/payment$/.exec(url.pathname);
    if (read) {
      reads++;
      const s = sessions.get(read[1]!);
      if (!s) return json({ message: "Not found" }, 404);
      return json({ data: { status: s.paid ? "SUCCESS" : "PENDING", amount: s.body.amount, currency: s.body.currency, merchantOrderId: s.body.order, transactionId: `TX-${read[1]}` } });
    }
    return json({}, 404);
  }) as typeof fetch;
  return { sessions, fetcher, pay: (id: string) => (sessions.get(id)!.paid = true), reads: () => reads };
}

const ACCOUNT: PaymentAccount = { provider: "kashier", keys: { merchantId: "MID-5252-525", apiKey: "kashier-api", secretKey: "kashier-secret", sandbox: true } };

function checkoutDeps(kashier: ReturnType<typeof fakeKashier>, now = NOW, egpPerUsd: number | null = 50): CheckoutDeps & DeliverDeps {
  return {
    store,
    blobs,
    now,
    account: ACCOUNT,
    egpPerUsd,
    urls: { kashier: "https://kashier.test" },
    fetcher: kashier.fetcher,
    baseUrl: BASE,
    appsOf: (clientId) => store.listAppsByClient(clientId),
    planOf: async () => null,
  };
}

const callbacks = (token: string) => ({ returnUrl: `${BASE}/api/pay/kashier/template/${token}`, webhookUrl: `${BASE}/api/pay/kashier/template/${token}` });

async function buy(t: MarketTemplate, b: Awaited<ReturnType<typeof buyer>>, kashier: ReturnType<typeof fakeKashier>, input: { plan?: string; appId?: string | null; renew?: TemplateLicence | null; now?: Date } = {}) {
  const started = await startTemplateCheckout(checkoutDeps(kashier, input.now), {
    client: b.client,
    user: b.user,
    apps: await store.listAppsByClient(b.client.id),
    template: t,
    plan: input.plan ?? "3m",
    appId: input.appId === undefined ? b.flowers.id : input.appId,
    renew: input.renew ?? null,
    consent: true,
    city: "Istanbul",
    ip: "198.51.100.7",
    callbackUrls: callbacks,
  });
  if (!started.ok) throw new Error(started.message);
  return started.order;
}

describe("106.2 plans and prices", () => {
  it("reads the designer's plans: free, or each plan offered with a price from $1 to $10,000", () => {
    expect(readPlans({ free: true, offered: ["1m"], prices: { "1m": "x" } })).toEqual({ ok: true, free: true, plans: [] });
    expect(readPlans({ free: false, offered: [], prices: {} })).toEqual({ ok: false, errors: { plans: "Offer at least one plan, or make the template free." } });
    expect(readPlans({ free: false, offered: ["3m", "life"], prices: { "3m": "$24", life: "1,149.50", "1m": "9" } })).toEqual({
      ok: true,
      free: false,
      plans: [
        { period: "3m", cents: 2400 },
        { period: "life", cents: 114950 },
      ],
    });
    const bad = readPlans({ free: false, offered: ["1m", "1y", "2y"], prices: { "1m": "0.50", "1y": "10000.01", "2y": "abc" } });
    expect(bad.ok ? null : Object.keys(bad.errors)).toEqual(["price_1m", "price_1y", "price_2y"]);
    expect(readUsd("24.5")).toBe(2450);
    expect(readUsd("24.555")).toBeNull();
  });

  it("shows the lowest price per month among the plans for a time, the lifetime price once, or Free", () => {
    expect(priceTag({ free: true, plans: [] })).toEqual({ kind: "free" });
    expect(priceTag({ free: false, plans: [{ period: "1m", cents: 900 }, { period: "1y", cents: 7900 }, { period: "life", cents: 14900 }] })).toEqual({ kind: "from", cents: 658 });
    expect(priceTag({ free: false, plans: [{ period: "life", cents: 14900 }] })).toEqual({ kind: "once", cents: 14900 });
    // A price out of bounds (edited by hand) isn't offered.
    expect(offeredPlans({ free: false, plans: [{ period: "1m", cents: 50 }, { period: "6m", cents: 4500 }] })).toEqual([{ period: "6m", cents: 4500 }]);
    expect(perMonthCents({ period: "6m", cents: 4500 })).toBe(750);
    expect(formatUsd(658)).toBe("$6.58");
    expect(formatUsd(2400)).toBe("$24");
  });

  it("splits a sale: exactly 75% the designer's and the rest Yallapp's, to the cent", () => {
    expect(splitSale(2400)).toEqual({ designerCents: 1800, yallappCents: 600 });
    expect(splitSale(999)).toEqual({ designerCents: 749, yallappCents: 250 });
    for (const cents of [100, 101, 333, 14900, 1_000_000]) {
      const { designerCents, yallappCents } = splitSale(cents);
      expect(designerCents + yallappCents).toBe(cents);
    }
  });

  it("ends a period on the same day of the month, or the month's last day", () => {
    expect(periodEnd(new Date("2026-01-31T09:00:00Z"), "1m")).toEqual(new Date("2026-02-28T09:00:00Z"));
    expect(periodEnd(new Date("2026-11-15T10:00:00Z"), "3m")).toEqual(new Date("2027-02-15T10:00:00Z"));
    expect(periodEnd(new Date("2028-02-29T10:00:00Z"), "1y")).toEqual(new Date("2029-02-28T10:00:00Z"));
    expect(periodEnd(NOW, "life")).toBeNull();
  });

  it("charges pounds through Kashier at the team's rate, dollars where only dollars go", () => {
    expect(chargeFor(2400, "kashier", 50)).toEqual({ cents: 120000, currency: "EGP", egpPerUsd: 50 });
    expect(chargeFor(2400, "kashier", null)).toBeNull();
    expect(chargeFor(2400, "iyzico", null)).toEqual({ cents: 2400, currency: "USD", egpPerUsd: null });
  });
});

describe("106.2 the market's cards and the paid filter", () => {
  it("shows a paid template from its lowest monthly price, under Paid", async () => {
    const { template } = await paidTemplate();
    const catalog = await marketCatalog(store, "en", NOW);
    const card = catalog.cards.find((c) => c.id === template.id)!;
    expect(card.price).toEqual({ kind: "from", cents: 800 });
    expect(card.free).toBe(false);
    expect(filterCards(catalog.cards, readMarketQuery({ price: "paid" })).map((c) => c.id)).toEqual([template.id]);
    expect(filterCards(catalog.cards, readMarketQuery({ price: "free" }))).toEqual([]);
  });
});

describe("106.2 checkout", () => {
  it("starts a one-time payment in pounds for the plan's price, with the sale's split; refuses what doesn't fit", async () => {
    const { template, designerClient } = await paidTemplate();
    const b = await buyer();
    const kashier = fakeKashier();
    const base = { client: b.client, user: b.user, apps: await store.listAppsByClient(b.client.id), template, plan: "3m", appId: b.flowers.id, renew: null, consent: true, city: "Istanbul", ip: "198.51.100.7", callbackUrls: callbacks };
    const deps = checkoutDeps(kashier);
    expect(await startTemplateCheckout(deps, { ...base, consent: false })).toMatchObject({ ok: false, field: "consent" });
    expect(await startTemplateCheckout(deps, { ...base, plan: "1m" })).toMatchObject({ ok: false, field: "plan" });
    expect(await startTemplateCheckout(deps, { ...base, appId: b.cafe.id })).toMatchObject({ ok: false, field: "app" });
    expect(appProblem(template, b.cafe)).toBe("kind");
    expect(appProblem(template, b.flowers)).toBeNull();
    // No rate: Kashier can't charge pounds for a price in dollars.
    expect(await startTemplateCheckout(checkoutDeps(kashier, NOW, null), base)).toMatchObject({ ok: false, message: "Card payments for templates aren't available right now. Message us on WhatsApp." });
    // The designer can't buy their own.
    const own = await store.getClientById(designerClient);
    expect(await startTemplateCheckout(deps, { ...base, client: own! })).toMatchObject({ ok: false, message: "This is your own template: you can't get it for your own apps." });
    expect(kashier.sessions.size).toBe(0);

    const started = await startTemplateCheckout(deps, base);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.url).toBe("https://kashier.test/session/66f00001aa");
    expect(started.order).toMatchObject({ kind: "buy", plan: "3m", status: "pending", grossCents: 2400, designerCents: 1800, yallappCents: 600, amountCents: 120000, currency: "EGP", egpPerUsd: 50, appId: b.flowers.id, paymentProvider: "kashier", providerRef: "66f00001aa", consentAt: NOW });
    expect(kashier.sessions.get("66f00001aa")!.body).toMatchObject({ amount: "1200.00", currency: "EGP", type: "one-time" });
    // Nothing is the buyer's before Kashier confirms it.
    expect(await store.listTemplateLicences({ clientId: b.client.id })).toEqual([]);
  });

  it("delivers a confirmed payment once: the licence for 3 months, the template on the app, the period recorded", async () => {
    const { template } = await paidTemplate();
    const b = await buyer();
    const kashier = fakeKashier();
    const order = await buy(template, b, kashier);
    // Kashier hasn't confirmed it: it waits (its webhook may still come).
    expect(await completeTemplateOrder(checkoutDeps(kashier), order, {})).toEqual({ kind: "pending" });
    kashier.pay("66f00001aa");
    const deps = checkoutDeps(kashier, at(0.001));
    // The webhook and the buyer's return at once.
    const [first, second] = await Promise.all([completeTemplateOrder(deps, order, {}), completeTemplateOrder(deps, order, {})]);
    expect([first.kind, second.kind].sort()).toEqual(["already_paid", "paid"]);
    expect(await completeTemplateOrder(deps, (await store.getTemplateOrder(order.id))!, {})).toMatchObject({ kind: "already_paid" });
    const licences = await store.listTemplateLicences({ clientId: b.client.id });
    expect(licences).toHaveLength(1);
    expect(licences[0]).toMatchObject({ id: order.id, plan: "3m", status: "active", appId: b.flowers.id, afterEnd: "keep", endsAt: periodEnd(at(0.001), "3m") });
    expect(await store.listTemplateLicencePeriods(order.id)).toHaveLength(1);
    expect(await store.getTemplateOrder(order.id)).toMatchObject({ status: "paid", paymentId: "TX-66f00001aa", licenceId: order.id, appliedAt: at(0.001), startsAt: at(0.001) });
    expect(await texts(b.flowers)).toContain("Hello from Nur");
    expect(getsUpdates(licences[0]!, at(30))).toBe(true);
    expect(getsUpdates(licences[0]!, at(100))).toBe(false);
  });

  it("buys to apply later, then the licence waits on no app", async () => {
    const { template } = await paidTemplate();
    const b = await buyer();
    const kashier = fakeKashier();
    const order = await buy(template, b, kashier, { appId: null, plan: "life" });
    kashier.pay("66f00001aa");
    const done = await completeTemplateOrder(checkoutDeps(kashier), order, {});
    expect(done).toMatchObject({ kind: "paid", applied: null });
    expect(await store.getTemplateLicence(order.id)).toMatchObject({ plan: "life", endsAt: null, appId: null, afterEnd: null });
    expect(await texts(b.flowers)).toEqual(["Our own design"]);
    const rows = await buyerLicences(store, b.client.id, await store.listAppsByClient(b.client.id), "en", NOW);
    expect(rows[0]).toMatchObject({ state: "not_applied", renewable: false });
  });

  it("renews from the end date while the plan runs, from today once it ended; two renewals add up", async () => {
    const { template } = await paidTemplate();
    const b = await buyer();
    const kashier = fakeKashier();
    const order = await buy(template, b, kashier);
    kashier.pay("66f00001aa");
    await completeTemplateOrder(checkoutDeps(kashier), order, {});
    const licence = (await store.getTemplateLicence(order.id))!;
    const end = licence.endsAt!;
    // Two renewals paid together, 20 days before the end.
    const r1 = await buy(template, b, kashier, { renew: licence, now: at(70) });
    const r2 = await buy(template, b, kashier, { renew: licence, now: at(70) });
    expect(r1).toMatchObject({ kind: "renew", licenceId: licence.id, appId: null });
    kashier.pay("66f00002aa");
    kashier.pay("66f00003aa");
    await Promise.all([completeTemplateOrder(checkoutDeps(kashier, at(70)), r1, {}), completeTemplateOrder(checkoutDeps(kashier, at(70)), r2, {})]);
    expect((await store.getTemplateLicence(licence.id))!.endsAt).toEqual(periodEnd(periodEnd(end, "3m")!, "3m"));
    expect(await store.listTemplateLicencePeriods(licence.id)).toHaveLength(3);
    // A renewal can't be bought by someone else, nor for a lifetime licence.
    const other = await buyer("Lale");
    expect(await startTemplateCheckout(checkoutDeps(kashier), { client: other.client, user: other.user, apps: [], template, plan: "3m", appId: null, renew: licence, consent: true, city: "", ip: "", callbackUrls: callbacks })).toMatchObject({
      ok: false,
      message: "This plan can't be renewed. Buy the template again instead.",
    });
  });
});

describe("106.2 the daily job: reminders and the end of a plan", () => {
  async function bought(afterEnd: "keep" | "restore") {
    const { template } = await paidTemplate({ afterEnd });
    const b = await buyer();
    const kashier = fakeKashier();
    const order = await buy(template, b, kashier);
    kashier.pay("66f00001aa");
    await completeTemplateOrder(checkoutDeps(kashier), order, {});
    return { template, b, licence: (await store.getTemplateLicence(order.id))!, kashier };
  }
  const mails: { key: string; to: string; values: Record<string, string> }[] = [];
  const daily = (now: Date): MarketDailyDeps => ({
    store,
    blobs,
    now,
    baseUrl: BASE,
    mail: async (key, to, values) => {
      mails.push({ key, to, values });
    },
    planOf: async () => null,
  });
  beforeEach(() => {
    mails.length = 0;
  });

  it("reminds 14 days before and on the last day, once each; then the design stays without updates (keep)", async () => {
    const { b, licence } = await bought("keep");
    const end = licence.endsAt!;
    const before = (days: number) => new Date(end.getTime() - days * DAY);
    expect(await runStudioMarketDaily(daily(before(20)))).toMatchObject({ reminded: 0, lastDay: 0, ended: 0 });
    expect(await runStudioMarketDaily(daily(before(13)))).toMatchObject({ reminded: 1 });
    expect(await runStudioMarketDaily(daily(before(12)))).toMatchObject({ reminded: 0 });
    expect(mails.map((m) => m.key)).toEqual(["market_template_reminder"]);
    expect(mails[0]!.values.intro_line).toContain("ends in 13 days");
    expect(mails[0]!.values.renew_url).toBe(`${BASE}/studio/market/checkout/${(await store.getMarketTemplate(licence.templateId))!.slug}?renew=${licence.id}`);
    expect(await runStudioMarketDaily(daily(before(0.5)))).toMatchObject({ lastDay: 1 });
    expect(await runStudioMarketDaily(daily(before(0.4)))).toMatchObject({ lastDay: 0 });
    expect(mails[1]!.values.intro_line).toContain("Today is the last day");
    // The end: once.
    expect(await runStudioMarketDaily(daily(new Date(end.getTime() + 1000)))).toMatchObject({ ended: 1, restored: 0 });
    expect(await runStudioMarketDaily(daily(new Date(end.getTime() + 2000)))).toMatchObject({ ended: 0 });
    const ended = (await store.getTemplateLicence(licence.id))!;
    expect(ended).toMatchObject({ status: "ended", appId: b.flowers.id });
    expect(getsUpdates(ended, new Date(end.getTime() + 1000))).toBe(false);
    expect(await texts(b.flowers)).toContain("Hello from Nur");
    expect(mails.at(-1)).toMatchObject({ key: "market_template_ended" });
    expect(mails.at(-1)!.values.after_line).toContain("stays on Tulip Flowers");
    const audit = (await store.listAuditEntries({ clientId: b.client.id, offset: 0, limit: 50 })).items.find((e) => e.action === "market.licence_ended");
    expect(audit).toMatchObject({ actorEmail: "Daily job", targetType: "market_licence", targetId: licence.id });
    const rows = await buyerLicences(store, b.client.id, await store.listAppsByClient(b.client.id), "en", new Date(end.getTime() + 1000));
    expect(rows[0]).toMatchObject({ state: "ended", renewable: true });
  });

  it("puts the app back on its previous design when the template said so (restore), and a renewal paid in time wins", async () => {
    const { b, licence, template, kashier } = await bought("restore");
    const end = licence.endsAt!;
    // Renewed the day before: the plan goes on.
    const renewal = await buy(template, b, kashier, { renew: licence, now: new Date(end.getTime() - DAY) });
    kashier.pay("66f00002aa");
    await completeTemplateOrder(checkoutDeps(kashier, new Date(end.getTime() - DAY)), renewal, {});
    expect(await runStudioMarketDaily(daily(new Date(end.getTime() + 1000)))).toMatchObject({ ended: 0 });
    const renewed = (await store.getTemplateLicence(licence.id))!;
    expect(renewed.endsAt).toEqual(periodEnd(end, "3m"));
    // Then it ends.
    expect(await runStudioMarketDaily(daily(new Date(renewed.endsAt!.getTime() + 1000)))).toMatchObject({ ended: 1, restored: 1 });
    expect(await texts(b.flowers)).toEqual(["Our own design"]);
    expect(await store.getTemplateLicence(licence.id)).toMatchObject({ status: "ended", appId: null });
    expect(mails.at(-1)!.values.after_line).toContain("went back to the design it had before");
  });

  it("writes its lines in the buyer's language", () => {
    expect(marketMailLines("ar").plan("3m")).toBe("3 أشهر");
    expect(marketMailLines("tr").ends(null)).toBe("Artık sizin: hiç bitmez.");
    expect(marketMailLines("en").paid("EGP 1,200", "Kashier", "$24")).toBe("EGP 1,200 (about $24) by card through Kashier");
  });
});

describe("106.2 the template's pictures and fonts: the template's own, then the buyer's own", () => {
  it("copies the designer's pictures for the template, then into the buyer's account; the designer deleting theirs breaks nothing", async () => {
    let designerAsset = "";
    const { template, designerClient } = await paidTemplate({
      nodes: async ({ clientId }) => {
        designerAsset = seededUuid(`designer-picture-${clientId}`);
        await blobs.put(`assets/${clientId}/${designerAsset}.png`, png("rose"), "image/png");
        await store.createAsset({ id: designerAsset, clientId, kind: "design_image", blobKey: `assets/${clientId}/${designerAsset}.png`, contentType: "image/png", size: png("rose").length, createdAt: NOW });
        return [{ id: "pic", type: "image", image_url: `${BASE}/api/v1/assets/${designerAsset}` } as StudioNode, { id: "t1", type: "text", text: "Hello from Nur" } as StudioNode];
      },
    });
    const version = (await store.getMarketTemplateVersion(template.currentVersionId!))!;
    const file = (await versionDesign(blobs, version))!;
    const shown = JSON.stringify(file.pages);
    expect(shown).not.toContain(designerAsset);
    const copied = platformPicture(/https:\/\/yallapp\.com\.tr\/api\/v1\/assets\/[0-9a-f-]{36}/.exec(shown)![0], BASE)!;
    expect(await store.getAsset(copied.id)).toMatchObject({ clientId: designerClient, kind: "design_image" });

    // The designer deletes their picture: the template keeps its own copy.
    await store.deleteAsset(designerAsset);
    const b = await buyer();
    const kashier = fakeKashier();
    const order = await buy(template, b, kashier);
    kashier.pay("66f00001aa");
    expect(await completeTemplateOrder(checkoutDeps(kashier), order, {})).toMatchObject({ kind: "paid", applied: true });
    const picture = (await homeNodes(b.flowers)).find((x) => x.image_url)!.image_url!;
    const mine = platformPicture(picture, BASE)!;
    expect(mine.id).not.toBe(copied.id);
    expect(await store.getAsset(mine.id)).toMatchObject({ clientId: b.client.id, kind: "design_image" });
    // Copied once: the same picture again is the same copy.
    const again = await copyPictures({ store, blobs, now: NOW, baseUrl: BASE }, [`${BASE}/api/v1/assets/${copied.id}`], b.client.id, "buyer");
    expect(again.get(`${BASE}/api/v1/assets/${copied.id}`)).toBe(picture);
    // Pictures elsewhere stay where they are.
    expect(await copyPictures({ store, blobs, now: NOW, baseUrl: BASE }, ["https://images.example.com/rose.jpg", `${BASE}/design-pictures/rose.jpg`], b.client.id, "buyer")).toEqual(new Map());
  });

  it("takes the project's uploaded fonts with the template and adds them to the buyer's app", async () => {
    const { template } = await paidTemplate({
      nodes: async ({ clientId, app }) => {
        const added = await addOwnFont({ store, blobs, plans: await effectivePlans(store), now: NOW }, { id: app.id, clientId }, { family: "Nur Serif", licence: true, files: [{ name: "nur.ttf", data: FONT }], by: "nur@market.test" });
        expect(added.ok).toBe(true);
        return [{ id: "t1", type: "text", text: "Hello from Nur", font: { family: "Nur Serif" } } as StudioNode];
      },
    });
    const version = (await store.getMarketTemplateVersion(template.currentVersionId!))!;
    expect(blobs.files.has(fontsKey(version))).toBe(true);
    expect((await readTemplateFonts(blobs, version))!.fonts.map((f) => f.family)).toEqual(["Nur Serif"]);
    expect(JSON.stringify((await versionDesign(blobs, version))!.pages)).toContain("Nur Serif");

    const b = await buyer();
    const kashier = fakeKashier();
    const order = await buy(template, b, kashier);
    kashier.pay("66f00001aa");
    expect(await completeTemplateOrder(checkoutDeps(kashier), order, {})).toMatchObject({ kind: "paid", applied: true });
    const fonts = await store.listOwnFonts(b.flowers.id);
    expect(fonts.map((f) => f.family)).toEqual(["Nur Serif"]);
    expect((await store.getAsset(fonts[0]!.files[0]!.assetId))?.clientId).toBe(b.client.id);
    expect((await homeNodes(b.flowers)).find((x) => x.text === "Hello from Nur")?.font?.family).toBe("Nur Serif");
  });
});
