import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import type { BlobStore } from "@/lib/blobs";
import { MemoryStore } from "@/lib/data/memory";
import type { App, MarketDiscount, MarketTemplate, TemplateLicence } from "@/lib/data/types";
import { loadLayout, saveDraft } from "@/lib/pages/layout";
import type { StudioNode } from "@/lib/pages/types";
import type { PaymentAccount } from "@/lib/payments/provider";
import { en as appEn } from "@/lib/studio/app-words";
import { makeStudioProject } from "@/lib/studio/new-project";
import { TEMPLATES, type SectionWord } from "@/lib/studio/sections";
import { filterCards, flashStrip, marketCatalog, readMarketQuery } from "@/lib/studio-market/catalog";
import { completeTemplateOrder, quoteCheckout, startTemplateCheckout, type CheckoutDeps, type DeliverDeps } from "@/lib/studio-market/checkout";
import { createDiscount, deleteDiscount, designerZone, endDiscount, templateDiscounts } from "@/lib/studio-market/designer-discounts";
import { joinAsDesigner } from "@/lib/studio-market/designers";
import {
  bestAutomatic,
  COUPON_HOLD_MS,
  couponProblem,
  discountedCents,
  discountLive,
  discountState,
  localDateTime,
  marketPrice,
  normalizeCode,
  offCents,
  quotePlan,
  reachesFloor,
  readDiscount,
  validCode,
  type DiscountForm,
} from "@/lib/studio-market/discounts";
import { splitSale } from "@/lib/studio-market/plans";
import { decideReview } from "@/lib/studio-market/review";
import { sendForReview, startTemplate } from "@/lib/studio-market/templates";
import { getDashT } from "@/i18n/dashboard";

/**
 * 106.12 Studio Market, stage 4: price drops, flash sales and coupon codes.
 * Each type alone; nothing stacks (the better of the automatic price or the
 * code); the dates' edges in UTC; a coupon's usage limit with buyers paying
 * at once, only paid orders counting; the 75/25 split of the price paid, to
 * the cent; the lowest price ($1); the market's flash strip; and a price
 * changed in the browser refused.
 */

const BLOBS = mkdtempSync(join(tmpdir(), "studio-market-discounts-"));
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

const NOW = new Date("2026-11-18T10:00:00Z");
const HOUR = 3_600_000;
const DAY = 86_400_000;
const at = (hours: number) => new Date(NOW.getTime() + hours * HOUR);
const BASE = "https://yallapp.com.tr";
const BLANK = TEMPLATES.find((t) => t.id === "blank")!;
const words = (name: string) => (word: SectionWord) => String(appEn[word]).replaceAll("{app}", name);

let store: MemoryStore;
let blobs: MemoryBlobs;
let n = 0;

beforeEach(() => {
  store = new MemoryStore();
  blobs = new MemoryBlobs();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

async function account(name: string, whatsapp = "+905446731942"): Promise<string> {
  n += 1;
  const { client } = await registerClient(store, { name, email: `${name.toLowerCase().replace(/\W+/g, "-")}-${n}@discounts.test`, whatsapp, siteUrl: "", password: null }, NOW);
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

/** A paid template on the market: 3 months at $24 ($8/mo) and lifetime at $149. */
async function paidTemplate(plans: MarketTemplate["plans"] = [
  { period: "3m", cents: 2400 },
  { period: "life", cents: 14900 },
]) {
  const clientId = await account("Studio Lale");
  const joined = await joinAsDesigner(store, { id: clientId }, { name: "Studio Lale", slug: `studio-lale-${n}`, country: "TR", bio: "", terms: true }, NOW);
  if (!joined.ok) throw new Error("join");
  const app = await project(clientId, "Lale project");
  await write(app, [{ id: "t1", type: "text", text: "Hello from Lale" } as StudioNode]);
  let template = await startTemplate(store, joined.designer, app, NOW);
  await store.updateMarketTemplate(
    template.id,
    { texts: { en: { title: "Peony House", short: "Peonies.", description: "Flowers." } }, screens: [(await loadLayout(store, app, NOW)).draft.pages.find((p) => p.studio)!.slug], free: false, plans },
    NOW,
  );
  template = (await store.getMarketTemplate(template.id))!;
  const sent = await sendForReview({ store, blobs, now: NOW, baseUrl: BASE }, template, app, { rights: true, note: "" }, "lale@discounts.test");
  if (!sent.ok) throw new Error(sent.message);
  const decided = await decideReview(store, sent.template, { decision: "approved", notes: "", teamNote: "", checks: [] }, { email: "deniz@yallapp.test", name: "Deniz" }, NOW);
  if (!decided.ok) throw new Error("review");
  return { template: (await store.getMarketTemplate(template.id))!, designer: joined.designer, designerClient: clientId };
}

async function buyer(name = "Zeynep") {
  const clientId = await account(name);
  const flowers = await project(clientId, `${name} Flowers`);
  const client = (await store.getClientById(clientId))!;
  const user = (await store.getUserById(client.userId))!;
  return { client, user, flowers: (await store.getAppById(flowers.id))! };
}

// ——— A fake Kashier: sessions it started, paid when told ———
function fakeKashier() {
  const sessions = new Map<string, { body: Record<string, unknown>; paid: boolean }>();
  let fail = false;
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    if (url.pathname === "/v3/payment/sessions" && init?.method === "POST") {
      if (fail) return json({ message: "Down" }, 500);
      const id = `66f0${(sessions.size + 1).toString().padStart(4, "0")}aa`;
      sessions.set(id, { body: JSON.parse(String(init.body)) as Record<string, unknown>, paid: false });
      return json({ _id: id, sessionUrl: `https://kashier.test/session/${id}` });
    }
    const read = /^\/v3\/payment\/sessions\/([^/]+)\/payment$/.exec(url.pathname);
    if (read) {
      const s = sessions.get(read[1]!);
      if (!s) return json({ message: "Not found" }, 404);
      return json({ data: { status: s.paid ? "SUCCESS" : "PENDING", amount: s.body.amount, currency: s.body.currency, merchantOrderId: s.body.order, transactionId: `TX-${read[1]}` } });
    }
    return json({}, 404);
  }) as typeof fetch;
  return { sessions, fetcher, pay: (id: string) => (sessions.get(id)!.paid = true), down: (v: boolean) => (fail = v) };
}

const ACCOUNT: PaymentAccount = { provider: "kashier", keys: { merchantId: "MID-5252-525", apiKey: "kashier-api", secretKey: "kashier-secret", sandbox: true } };

function checkoutDeps(kashier: ReturnType<typeof fakeKashier>, now = NOW): CheckoutDeps & DeliverDeps {
  return { store, blobs, now, account: ACCOUNT, egpPerUsd: 50, urls: { kashier: "https://kashier.test" }, fetcher: kashier.fetcher, baseUrl: BASE, appsOf: (clientId) => store.listAppsByClient(clientId), planOf: async () => null };
}

const callbacks = (token: string) => ({ returnUrl: `${BASE}/api/pay/kashier/template/${token}`, webhookUrl: `${BASE}/api/pay/kashier/template/${token}` });

async function checkout(
  t: MarketTemplate,
  b: Awaited<ReturnType<typeof buyer>>,
  kashier: ReturnType<typeof fakeKashier>,
  input: { plan?: string; code?: string; expectedCents?: number; now?: Date; renew?: TemplateLicence | null; appId?: string | null } = {},
) {
  return startTemplateCheckout(checkoutDeps(kashier, input.now), {
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
    code: input.code,
    expectedCents: input.expectedCents,
  });
}

const form = (over: Partial<DiscountForm>): DiscountForm => ({ kind: "drop", offType: "percent", percent: "", amount: "", allPlans: true, plans: [], startsAt: "", endsAt: "", code: "", limit: "", zone: "UTC", ...over });

/** A discount made the designer's way, through the form. */
async function discount(template: MarketTemplate, designer: { id: string }, over: Partial<DiscountForm>, now = NOW): Promise<MarketDiscount> {
  const made = await createDiscount(store, designer, template, form(over), now);
  if (!made.ok) throw new Error(JSON.stringify(made.errors));
  return made.discount;
}

const d = (over: Partial<MarketDiscount>): MarketDiscount => ({
  id: over.id ?? `d-${Math.random().toString(36).slice(2)}`,
  templateId: "t",
  designerId: "x",
  kind: "drop",
  code: null,
  offType: "percent",
  offValue: 10,
  plans: null,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

describe("106.12 each discount type", () => {
  it("takes a percentage (rounded to the cent) or an amount off", () => {
    expect(offCents(2400, { offType: "percent", offValue: 20 })).toBe(480);
    expect(offCents(2499, { offType: "percent", offValue: 15 })).toBe(375); // 374.85
    expect(offCents(250, { offType: "percent", offValue: 1 })).toBe(3); // 2.5, half up
    expect(discountedCents(2400, { offType: "amount", offValue: 450 })).toBe(1950);
    expect(discountedCents(2499, { offType: "percent", offValue: 15 })).toBe(2124);
  });

  it("a price drop, a flash sale and a coupon each on some or all plans, lifetime too", async () => {
    const { template, designer } = await paidTemplate();
    const drop = await discount(template, designer, { kind: "drop", offType: "amount", amount: "4", allPlans: false, plans: ["3m"] });
    expect(drop).toMatchObject({ kind: "drop", offType: "amount", offValue: 400, plans: ["3m"], startsAt: null, endsAt: null, code: null, usageLimit: null });
    const flash = await discount(template, designer, { kind: "flash", offType: "percent", percent: "20%", endsAt: "2026-11-18T12:00" });
    // A flash sale without a start starts now.
    expect(flash).toMatchObject({ kind: "flash", offValue: 20, plans: null, startsAt: NOW, endsAt: new Date("2026-11-18T12:00:00Z") });
    const coupon = await discount(template, designer, { kind: "coupon", offType: "percent", percent: "30", allPlans: false, plans: ["life"], code: " lale-30 ", limit: "5" });
    expect(coupon).toMatchObject({ kind: "coupon", code: "LALE-30", plans: ["life"], usageLimit: 5 });
    const [threeMonths, life] = template.plans;
    expect(bestAutomatic(threeMonths!, [drop], NOW)?.cents).toBe(2000);
    expect(bestAutomatic(life!, [drop], NOW)).toBeNull();
    expect(bestAutomatic(life!, [flash], NOW)?.cents).toBe(11920);
    // A coupon is never automatic.
    expect(bestAutomatic(life!, [coupon], NOW)).toBeNull();
    expect(quotePlan(life!, [], coupon, NOW)).toMatchObject({ cents: 10430, wins: "code", discount: { kind: "coupon", code: "LALE-30", listCents: 14900, offCents: 4470 } });
    expect(quotePlan(threeMonths!, [], coupon, NOW)).toMatchObject({ cents: 2400, wins: "none", wrongPlan: true, discount: null });
  });

  it("keeps codes in upper case and reads them in any case, with Arabic digits and Turkish İ", () => {
    expect(normalizeCode(" lale30 ")).toBe("LALE30");
    expect(normalizeCode("Lale 30")).toBe("LALE30");
    expect(normalizeCode("LALE٣٠")).toBe("LALE30");
    expect(normalizeCode("İndirim")).toBe("INDIRIM");
    expect(normalizeCode("ındırım")).toBe("INDIRIM");
    expect(normalizeCode("ＬＡＬＥ３０")).toBe("LALE30");
    expect(validCode("LALE-30")).toBe(true);
    expect(["AB", "-LALE", "LALE-", "LA_LE", "ÇİÇEK", "X".repeat(25), "لالة"].map((c) => validCode(normalizeCode(c)))).toEqual([false, false, false, false, false, false, false]);
  });

  it("checks the designer's form: the amount, the plans, the dates, the code and the limit", async () => {
    const { template } = await paidTemplate();
    const errors = (over: Partial<DiscountForm>) => {
      const read = readDiscount(form(over), template, NOW);
      return read.ok ? {} : read.errors;
    };
    expect(errors({ kind: "other", percent: "10" })).toEqual({ kind: "Choose a price drop, a flash sale or a coupon code." });
    expect(errors({ percent: "0" })).toHaveProperty("percent");
    expect(errors({ percent: "101" })).toHaveProperty("percent");
    expect(errors({ percent: "12.5" })).toHaveProperty("percent");
    expect(errors({ offType: "amount", amount: "0" })).toHaveProperty("amount");
    expect(errors({ offType: "amount", amount: "10000.01" })).toHaveProperty("amount");
    expect(errors({ offType: "nothing" })).toHaveProperty("offType");
    expect(errors({ percent: "10", allPlans: false, plans: [] })).toEqual({ plans: "Choose at least one plan, or all plans." });
    // A plan the template doesn't offer isn't one to choose.
    expect(errors({ percent: "10", allPlans: false, plans: ["1m"] })).toHaveProperty("plans");
    expect(errors({ percent: "10", endsAt: "2026-11-18T09:59" })).toEqual({ endsAt: "Enter an end after the start, later than now." });
    expect(errors({ percent: "10", startsAt: "2026-11-20T10:00", endsAt: "2026-11-20T10:00" })).toHaveProperty("endsAt");
    expect(errors({ percent: "10", startsAt: "tomorrow" })).toHaveProperty("startsAt");
    expect(errors({ kind: "flash", percent: "10" })).toEqual({ endsAt: "A flash sale needs an end." });
    expect(errors({ kind: "flash", percent: "10", endsAt: "2026-12-02T10:01" })).toEqual({ endsAt: "A flash sale runs up to 14 days." });
    expect(errors({ kind: "flash", percent: "10", endsAt: "2026-12-02T10:00" })).toEqual({});
    expect(errors({ kind: "coupon", percent: "10", code: "ab" })).toHaveProperty("code");
    expect(errors({ kind: "coupon", percent: "10", code: "SPRING", limit: "0" })).toHaveProperty("limit");
    expect(errors({ kind: "coupon", percent: "10", code: "SPRING", limit: "1.5" })).toHaveProperty("limit");
    expect(errors({ kind: "coupon", percent: "10", code: "SPRING", limit: "" })).toEqual({});
    // A free template has no discounts.
    expect(readDiscount(form({ percent: "10" }), { free: true, plans: [] }, NOW)).toEqual({ ok: false, errors: { form: "Discounts are for templates with paid plans." } });
  });

  it("keeps a coupon's code once per template, and ends or deletes only the designer's own", async () => {
    const { template, designer } = await paidTemplate();
    await discount(template, designer, { kind: "coupon", percent: "10", code: "SPRING" });
    expect(await createDiscount(store, designer, template, form({ kind: "coupon", percent: "20", code: "spring" }), NOW)).toEqual({ ok: false, errors: { code: "This template has this code already. Choose another one." } });
    const other = await paidTemplate();
    expect(await createDiscount(store, other.designer, template, form({ percent: "10" }), NOW)).toMatchObject({ ok: false });
    const drop = await discount(template, designer, { percent: "10" });
    expect(await endDiscount(store, other.designer, drop.id, at(1))).toBe(false);
    expect(await deleteDiscount(store, other.designer, drop.id)).toBe(false);
    expect(await endDiscount(store, designer, drop.id, at(1))).toBe(true);
    expect(await endDiscount(store, designer, drop.id, at(2))).toBe(false);
    expect(await store.getMarketDiscount(drop.id)).toMatchObject({ endsAt: at(1) });
    // A scheduled one ended now never ends before it starts.
    const later = await discount(template, designer, { percent: "10", startsAt: "2026-11-25T10:00" });
    expect(await endDiscount(store, designer, later.id, at(1))).toBe(true);
    expect(await store.getMarketDiscount(later.id)).toMatchObject({ startsAt: at(1), endsAt: at(1) });
    const rows = await templateDiscounts(store, template, at(2));
    expect(rows.coupon.map((r) => r.state)).toEqual(["live"]);
    expect(rows.drop.map((r) => r.state)).toEqual(["ended", "ended"]);
    expect(await deleteDiscount(store, designer, drop.id)).toBe(true);
    expect(await store.getMarketDiscount(drop.id)).toBeNull();
  });
});

describe("106.12 nothing stacks: the better of the automatic price or the code", () => {
  const plan = { period: "3m" as const, cents: 2400 };
  const drop = d({ id: "drop", kind: "drop", offType: "amount", offValue: 400 });
  const flash = d({ id: "flash", kind: "flash", offType: "percent", offValue: 20, startsAt: NOW, endsAt: at(2) });
  const coupon = (percent: number) => d({ id: `coupon-${percent}`, kind: "coupon", code: `C${percent}`, offValue: percent });

  it("takes the best automatic price, never a drop and a flash sale together", () => {
    expect(bestAutomatic(plan, [drop, flash], NOW)).toMatchObject({ cents: 1920, discount: { id: "flash" } });
    // Never 2400 − 400 − 20%.
    expect(quotePlan(plan, [drop, flash], null, NOW)).toMatchObject({ cents: 1920, wins: "auto", discount: { id: "flash", kind: "flash", offCents: 480 } });
    // A tie: the one that lasts longer (the drop has no end).
    const sameFlash = d({ id: "flash-4", kind: "flash", offType: "amount", offValue: 400, startsAt: NOW, endsAt: at(2) });
    expect(bestAutomatic(plan, [sameFlash, drop], NOW)?.discount.id).toBe("drop");
  });

  it("the code wins only when it is better; a tie keeps the automatic price and the code isn't used", () => {
    expect(quotePlan(plan, [drop, flash], coupon(30), NOW)).toMatchObject({ cents: 1680, wins: "code", discount: { id: "coupon-30", kind: "coupon", code: "C30", listCents: 2400, offCents: 720 } });
    expect(quotePlan(plan, [drop, flash], coupon(10), NOW)).toMatchObject({ cents: 1920, wins: "auto", code: { cents: 2160 }, discount: { id: "flash" } });
    expect(quotePlan(plan, [drop, flash], coupon(20), NOW)).toMatchObject({ cents: 1920, wins: "auto", discount: { id: "flash" } });
    expect(quotePlan(plan, [], null, NOW)).toMatchObject({ cents: 2400, wins: "none", discount: null, wrongPlan: false });
  });

  it("at checkout: the code's price when better, the automatic one when not; the order keeps what it got", async () => {
    const { template, designer } = await paidTemplate();
    await discount(template, designer, { kind: "drop", offType: "amount", amount: "4", allPlans: false, plans: ["3m"] });
    await discount(template, designer, { kind: "flash", percent: "20", endsAt: "2026-11-18T12:00" });
    await discount(template, designer, { kind: "coupon", percent: "30", code: "LALE30", allPlans: false, plans: ["3m"] });
    await discount(template, designer, { kind: "coupon", percent: "10", code: "TEN" });
    const b = await buyer();
    const kashier = fakeKashier();
    const better = await checkout(template, b, kashier, { code: "lale30" });
    expect(better).toMatchObject({ ok: true, order: { grossCents: 1680, designerCents: 1260, yallappCents: 420, amountCents: 84000, discount: { kind: "coupon", code: "LALE30", listCents: 2400, offCents: 720 } } });
    expect(kashier.sessions.get("66f00001aa")!.body).toMatchObject({ amount: "840.00", currency: "EGP" });
    const worse = await checkout(template, b, kashier, { code: "ten" });
    expect(worse).toMatchObject({ ok: true, order: { grossCents: 1920, discount: { kind: "flash", code: null, offCents: 480 } } });
    // Lifetime: the flash sale's 20% (the drop is for 3 months only).
    expect(await checkout(template, b, kashier, { plan: "life", appId: null })).toMatchObject({ ok: true, order: { plan: "life", grossCents: 11920, discount: { kind: "flash" } } });
  });
});

describe("106.12 the dates: from the start (inclusive) to the end (exclusive), in UTC", () => {
  it("counts from its start and stops at its end, to the millisecond", () => {
    const sale = d({ kind: "flash", startsAt: new Date("2026-11-20T00:00:00.000Z"), endsAt: new Date("2026-11-21T00:00:00.000Z") });
    expect(discountLive(sale, new Date("2026-11-19T23:59:59.999Z"))).toBe(false);
    expect(discountLive(sale, new Date("2026-11-20T00:00:00.000Z"))).toBe(true);
    expect(discountLive(sale, new Date("2026-11-20T23:59:59.999Z"))).toBe(true);
    expect(discountLive(sale, new Date("2026-11-21T00:00:00.000Z"))).toBe(false);
    expect(discountState(sale, new Date("2026-11-19T12:00:00Z"))).toBe("scheduled");
    expect(discountState(sale, new Date("2026-11-21T00:00:00.000Z"))).toBe("ended");
    expect(discountLive(d({}), new Date("2030-01-01T00:00:00Z"))).toBe(true);
    const plan = { period: "1m" as const, cents: 900 };
    expect(bestAutomatic(plan, [sale], new Date("2026-11-21T00:00:00.000Z"))).toBeNull();
    expect(bestAutomatic(plan, [sale], new Date("2026-11-20T00:00:00.000Z"))?.cents).toBe(810);
  });

  it("reads the designer's times in their time zone and keeps the instant", () => {
    expect(localDateTime("2026-11-20T09:00", "Europe/Istanbul")).toEqual(new Date("2026-11-20T06:00:00Z"));
    expect(localDateTime("2026-11-20T09:00", "Africa/Cairo")).toEqual(new Date("2026-11-20T07:00:00Z"));
    expect(localDateTime("2026-11-20T09:00", "UTC")).toEqual(new Date("2026-11-20T09:00:00Z"));
    expect(localDateTime("20/11/2026 09:00", "UTC")).toBeNull();
    expect(designerZone({ whatsapp: "+201001234567" })).toBe("Africa/Cairo");
    expect(designerZone({ whatsapp: "+905321234567" })).toBe("Europe/Istanbul");
    expect(designerZone({ whatsapp: "" })).toBe("Europe/Istanbul");
  });

  it("refuses a code before its start and after its end, with its own message", async () => {
    const { template, designer } = await paidTemplate();
    await discount(template, designer, { kind: "coupon", percent: "30", code: "SOON", startsAt: "2026-11-18T12:00" });
    await discount(template, designer, { kind: "coupon", percent: "30", code: "BRIEF", endsAt: "2026-11-18T12:00" });
    const plan = template.plans[0]!;
    expect(await quoteCheckout(store, template, plan, "soon", at(1.999))).toEqual({ ok: false, message: "This code isn't valid yet." });
    expect(await quoteCheckout(store, template, plan, "soon", at(2))).toMatchObject({ ok: true, quote: { wins: "code" } });
    expect(await quoteCheckout(store, template, plan, "brief", at(1.999))).toMatchObject({ ok: true, quote: { cents: 1680 } });
    expect(await quoteCheckout(store, template, plan, "brief", at(2))).toEqual({ ok: false, message: "This code has expired." });
    expect(await quoteCheckout(store, template, plan, "nope", NOW)).toEqual({ ok: false, message: "We don't know this code. Check it and try again." });
    // A code of another template isn't this one's.
    const other = await paidTemplate();
    await discount(other.template, other.designer, { kind: "coupon", percent: "30", code: "OTHER" });
    expect(await quoteCheckout(store, template, plan, "OTHER", NOW)).toMatchObject({ ok: false, message: "We don't know this code. Check it and try again." });
  });
});

describe("106.12 a coupon's usage limit: paid orders only, buyers paying at once", () => {
  it("gives the last uses to as many buyers as the limit, holds them while being paid, and counts only paid ones", async () => {
    const { template, designer } = await paidTemplate();
    const coupon = await discount(template, designer, { kind: "coupon", percent: "30", code: "TWO", limit: "2" });
    const buyers = await Promise.all(["A", "B", "C", "D"].map((x) => buyer(`Buyer ${x}`)));
    const kashier = fakeKashier();
    // Four buyers at once: two get the code, two are told its last uses are being paid.
    const started = await Promise.all(buyers.map((b) => checkout(template, b, kashier, { code: "two" })));
    expect(started.filter((s) => s.ok)).toHaveLength(2);
    expect(started.filter((s) => !s.ok).map((s) => !s.ok && s.message)).toEqual([
      "This code's last use is in a payment someone is making now. Try again in a while.",
      "This code's last use is in a payment someone is making now. Try again in a while.",
    ]);
    expect(kashier.sessions.size).toBe(2);
    const [first, second] = started.filter((s): s is Extract<typeof s, { ok: true }> => s.ok).map((s) => s.order);
    const late = started.findIndex((s) => !s.ok);
    // The page closed without a payment: the order fails and its use is free again.
    expect(await store.failTemplateOrder(second!.id)).toBe(true);
    const again = await checkout(template, buyers[late]!, kashier, { code: "TWO" });
    expect(again.ok).toBe(true);
    // Not paid yet: nothing counts as used.
    expect((await store.countMarketDiscountUses([coupon.id]))[coupon.id]).toBeUndefined();
    kashier.pay(first!.providerRef!);
    expect(await completeTemplateOrder(checkoutDeps(kashier), first!, {})).toMatchObject({ kind: "paid" });
    expect((await store.countMarketDiscountUses([coupon.id]))[coupon.id]).toBe(1);
    expect((await templateDiscounts(store, template, NOW)).coupon[0]).toMatchObject({ uses: 1, state: "live" });
    // One paid, one being paid: none left for now.
    const other = buyers.find((b) => b !== buyers[late] && b.client.id !== first!.clientId && b.client.id !== second!.clientId)!;
    expect(await checkout(template, other, kashier, { code: "TWO" })).toMatchObject({ ok: false, field: "code", message: "This code's last use is in a payment someone is making now. Try again in a while." });
    // A payment page left open longer than it can be paid holds nothing.
    const afterHold = new Date(NOW.getTime() + COUPON_HOLD_MS + 1);
    expect(await checkout(template, other, kashier, { code: "TWO", now: afterHold })).toMatchObject({ ok: true });
    // Both paid: used up, whoever asks, and the page says so first.
    const fourthOrder = (await store.listTemplateOrders({ clientId: other.client.id }))[0]!;
    kashier.pay(fourthOrder.providerRef!);
    expect(await completeTemplateOrder(checkoutDeps(kashier, afterHold), fourthOrder, {})).toMatchObject({ kind: "paid" });
    expect((await store.countMarketDiscountUses([coupon.id]))[coupon.id]).toBe(2);
    expect(await checkout(template, buyers[late]!, kashier, { code: "two", now: afterHold })).toMatchObject({ ok: false, message: "This code is used up." });
    expect(await quoteCheckout(store, template, template.plans[0]!, "two", afterHold)).toEqual({ ok: false, message: "This code is used up." });
    expect((await templateDiscounts(store, template, afterHold)).coupon[0]).toMatchObject({ uses: 2, state: "used_up" });
    // Only two of its orders were paid; the others never count.
    expect((await store.listTemplateOrders({ templateId: template.id })).map((o) => o.status).sort()).toEqual(["failed", "paid", "paid", "pending"]);
  });

  it("a buyer trying again isn't held up by their own unpaid page", async () => {
    const { template, designer } = await paidTemplate();
    await discount(template, designer, { kind: "coupon", percent: "30", code: "ONE", limit: "1" });
    const b = await buyer();
    const kashier = fakeKashier();
    expect(await checkout(template, b, kashier, { code: "ONE" })).toMatchObject({ ok: true });
    expect(await checkout(template, b, kashier, { code: "ONE" })).toMatchObject({ ok: true });
    expect(await checkout(template, await buyer("Other"), kashier, { code: "ONE" })).toMatchObject({ ok: false, message: "This code's last use is in a payment someone is making now. Try again in a while." });
  });

  it("frees the use when the gateway's page can't start", async () => {
    const { template, designer } = await paidTemplate();
    await discount(template, designer, { kind: "coupon", percent: "30", code: "ONE", limit: "1" });
    const kashier = fakeKashier();
    kashier.down(true);
    const b = await buyer();
    expect(await checkout(template, b, kashier, { code: "ONE" })).toMatchObject({ ok: false, message: "The payment couldn't start. Try again in a few minutes." });
    expect((await store.listTemplateOrders({ clientId: b.client.id })).map((o) => o.status)).toEqual(["failed"]);
    kashier.down(false);
    expect(await checkout(template, await buyer("Other"), kashier, { code: "ONE" })).toMatchObject({ ok: true });
  });

  it("a code without a limit is never used up", async () => {
    const { template, designer } = await paidTemplate();
    const coupon = await discount(template, designer, { kind: "coupon", percent: "30", code: "OPEN" });
    expect(couponProblem(coupon, 10_000, NOW)).toBeNull();
    expect(couponProblem({ ...coupon, usageLimit: 3 }, 3, NOW)).toBe("used_up");
    expect(couponProblem({ ...coupon, kind: "drop" }, 0, NOW)).toBe("unknown");
    const kashier = fakeKashier();
    const results = await Promise.all([buyer("A"), buyer("B"), buyer("C")].map(async (b) => checkout(template, await b, kashier, { code: "open" })));
    expect(results.every((r) => r.ok)).toBe(true);
  });
});

describe("106.12 the split is of the price paid, to the cent", () => {
  it("75% the designer's and the rest Yallapp's of every discounted price", async () => {
    const { template, designer } = await paidTemplate([
      { period: "1m", cents: 999 },
      { period: "6m", cents: 2499 },
      { period: "life", cents: 14999 },
    ]);
    await discount(template, designer, { kind: "coupon", offType: "amount", amount: "0.33", code: "CENTS", allPlans: false, plans: ["1m"] });
    await discount(template, designer, { kind: "coupon", percent: "15", code: "FIFTEEN" });
    const b = await buyer();
    const kashier = fakeKashier();
    const cases: [string, string, number][] = [
      ["1m", "CENTS", 966],
      ["6m", "FIFTEEN", 2124],
      ["life", "FIFTEEN", 12749],
    ];
    for (const [plan, code, gross] of cases) {
      const started = await checkout(template, b, kashier, { plan, code, appId: null });
      if (!started.ok) throw new Error(started.message);
      const { designerCents, yallappCents } = started.order;
      expect([started.order.grossCents, designerCents + yallappCents]).toEqual([gross, gross]);
      expect({ designerCents, yallappCents }).toEqual(splitSale(gross));
      expect(started.order.amountCents).toBe(gross * 50);
      expect(started.order.discount!.listCents - started.order.discount!.offCents).toBe(gross);
    }
    expect(splitSale(966)).toEqual({ designerCents: 725, yallappCents: 241 });
    expect(splitSale(2124)).toEqual({ designerCents: 1593, yallappCents: 531 });
    expect(splitSale(12749)).toEqual({ designerCents: 9562, yallappCents: 3187 });
  });

  it("delivers a discounted order like any other, and a renewal takes the discount too", async () => {
    const { template, designer } = await paidTemplate();
    await discount(template, designer, { kind: "flash", percent: "20", endsAt: "2026-11-18T12:00" });
    const b = await buyer();
    const kashier = fakeKashier();
    const bought = await checkout(template, b, kashier);
    if (!bought.ok) throw new Error(bought.message);
    kashier.pay("66f00001aa");
    expect(await completeTemplateOrder(checkoutDeps(kashier), bought.order, {})).toMatchObject({ kind: "paid", applied: true, order: { status: "paid", grossCents: 1920, designerCents: 1440, yallappCents: 480 } });
    const licence = (await store.getTemplateLicence(bought.order.id))!;
    const renewal = await checkout(template, b, kashier, { renew: licence, appId: null, now: at(1) });
    expect(renewal).toMatchObject({ ok: true, order: { kind: "renew", grossCents: 1920, discount: { kind: "flash" } } });
    // After the flash sale: the plan's own price.
    expect(await checkout(template, b, kashier, { renew: licence, appId: null, now: at(2) })).toMatchObject({ ok: true, order: { grossCents: 2400, discount: null } });
  });
});

describe("106.12 the lowest price: $1", () => {
  it("never makes a paid plan free: 100% off or more than the price leaves $1", () => {
    expect(discountedCents(2400, { offType: "percent", offValue: 100 })).toBe(100);
    expect(discountedCents(2400, { offType: "amount", offValue: 5000 })).toBe(100);
    expect(discountedCents(2400, { offType: "amount", offValue: 2300 })).toBe(100);
    expect(discountedCents(2400, { offType: "amount", offValue: 2299 })).toBe(101);
    expect(reachesFloor(2400, { offType: "percent", offValue: 100 })).toBe(true);
    expect(reachesFloor(2400, { offType: "amount", offValue: 2300 })).toBe(false);
    // A plan at $1 has nothing to take off: no discount shown.
    expect(bestAutomatic({ period: "1m", cents: 100 }, [d({ offValue: 50 })], NOW)).toBeNull();
    expect(quotePlan({ period: "1m", cents: 100 }, [], d({ kind: "coupon", code: "X", offValue: 50 }), NOW)).toMatchObject({ cents: 100, wins: "none", discount: null });
  });

  it("charges $1 at checkout for a 100% code", async () => {
    const { template, designer } = await paidTemplate();
    await discount(template, designer, { kind: "coupon", percent: "100", code: "ALL" });
    const started = await checkout(template, await buyer(), fakeKashier(), { code: "all" });
    expect(started).toMatchObject({ ok: true, order: { grossCents: 100, designerCents: 75, yallappCents: 25, amountCents: 5000, discount: { listCents: 2400, offCents: 2300 } } });
  });
});

describe("106.12 the cards and the market's flash strip", () => {
  it("shows “From $X/mo” at the discounted price, the old one struck through, and a flash sale's end", () => {
    const template = { free: false, plans: [{ period: "3m" as const, cents: 2400 }, { period: "life" as const, cents: 14900 }] };
    expect(marketPrice(template, [], NOW)).toEqual({ tag: { kind: "from", cents: 800 }, wasCents: null, flashEndsAt: null });
    const drop = d({ kind: "drop", offType: "amount", offValue: 400, plans: ["3m"] });
    expect(marketPrice(template, [drop], NOW)).toEqual({ tag: { kind: "from", cents: 667 }, wasCents: 800, flashEndsAt: null });
    const flash = d({ kind: "flash", offValue: 20, startsAt: NOW, endsAt: at(2) });
    expect(marketPrice(template, [drop, flash], NOW)).toEqual({ tag: { kind: "from", cents: 640 }, wasCents: 800, flashEndsAt: at(2) });
    // Lifetime only: "$X once" struck through.
    expect(marketPrice({ free: false, plans: [{ period: "life", cents: 14900 }] }, [flash], NOW)).toEqual({ tag: { kind: "once", cents: 11920 }, wasCents: 14900, flashEndsAt: at(2) });
    // A flash sale only on lifetime still has its countdown; the "from" price is the plans' for a time.
    expect(marketPrice(template, [d({ kind: "flash", offValue: 20, plans: ["life"], startsAt: NOW, endsAt: at(3) })], NOW)).toEqual({ tag: { kind: "from", cents: 800 }, wasCents: null, flashEndsAt: at(3) });
    // Free stays free.
    expect(marketPrice({ free: true, plans: [] }, [flash], NOW)).toEqual({ tag: { kind: "free" }, wasCents: null, flashEndsAt: null });
  });

  it("lists the templates on a flash sale now, the soonest to end first", async () => {
    const one = await paidTemplate();
    const two = await paidTemplate();
    const three = await paidTemplate();
    const four = await paidTemplate();
    await discount(one.template, one.designer, { kind: "flash", percent: "20", endsAt: "2026-11-18T15:00" });
    await discount(two.template, two.designer, { kind: "flash", percent: "10", endsAt: "2026-11-18T12:00" });
    // Not started yet, a coupon, a drop: none of them is in the strip.
    await discount(three.template, three.designer, { kind: "flash", percent: "20", startsAt: "2026-11-18T11:00", endsAt: "2026-11-18T13:00" });
    await discount(three.template, three.designer, { kind: "coupon", percent: "50", code: "HALF" });
    await discount(four.template, four.designer, { kind: "drop", percent: "50" });
    // A flash sale a better drop beats on every plan isn't one either.
    await discount(four.template, four.designer, { kind: "flash", percent: "10", endsAt: "2026-11-18T12:00" });
    const now = (await marketCatalog(store, "en", NOW)).cards;
    expect(flashStrip(now, NOW).map((c) => c.id)).toEqual([two.template.id, one.template.id]);
    expect(now.find((c) => c.id === two.template.id)).toMatchObject({ price: { kind: "from", cents: 720 }, wasCents: 800, flashEndsAt: "2026-11-18T12:00:00.000Z" });
    expect(now.find((c) => c.id === four.template.id)).toMatchObject({ price: { kind: "from", cents: 400 }, wasCents: 800, flashEndsAt: null });
    // An hour later the third has started; two hours later the second ended.
    expect(flashStrip((await marketCatalog(store, "en", at(1))).cards, at(1)).map((c) => c.id)).toEqual([two.template.id, three.template.id, one.template.id]);
    const later = (await marketCatalog(store, "en", at(2))).cards;
    expect(flashStrip(later, at(2)).map((c) => c.id)).toEqual([three.template.id, one.template.id]);
    expect(later.find((c) => c.id === two.template.id)).toMatchObject({ price: { cents: 800 }, wasCents: null, flashEndsAt: null });
    expect(flashStrip((await marketCatalog(store, "en", at(5))).cards, at(5))).toEqual([]);
    // Still under "Paid".
    expect(filterCards(now, readMarketQuery({ price: "paid" }))).toHaveLength(4);
  });
});

describe("106.12 the price comes from the server, never the browser", () => {
  it("refuses a total that isn't the price worked out, without starting a payment", async () => {
    const { template, designer } = await paidTemplate();
    await discount(template, designer, { kind: "coupon", percent: "30", code: "LALE30", allPlans: false, plans: ["3m"] });
    const b = await buyer();
    const kashier = fakeKashier();
    const changed = { ok: false, field: "price", message: "The price changed. Check it, then pay again." };
    expect(await checkout(template, b, kashier, { expectedCents: 100 })).toEqual(changed);
    expect(await checkout(template, b, kashier, { code: "LALE30", expectedCents: 1000 })).toEqual(changed);
    expect(await checkout(template, b, kashier, { code: "LALE30", expectedCents: Number.NaN })).toEqual(changed);
    // A code for another plan can't lower this one.
    expect(await checkout(template, b, kashier, { plan: "life", appId: null, code: "LALE30", expectedCents: 10430 })).toEqual({ ok: false, field: "code", message: "This code isn't for the plan you chose." });
    expect(kashier.sessions.size).toBe(0);
    expect(await store.listTemplateOrders({ clientId: b.client.id })).toEqual([]);
    // The price it shows: paid as worked out.
    expect(await checkout(template, b, kashier, { code: "LALE30", expectedCents: 1680 })).toMatchObject({ ok: true, order: { grossCents: 1680 } });
    // A flash sale that ends while the buyer is paying: the new price is shown first.
    await discount(template, designer, { kind: "flash", percent: "50", endsAt: "2026-11-18T11:00" });
    expect(await checkout(template, b, kashier, { expectedCents: 1200 })).toMatchObject({ ok: true, order: { grossCents: 1200 } });
    expect(await checkout(template, b, kashier, { expectedCents: 1200, now: at(1) })).toEqual(changed);
  });
});

describe("106.12 a discount on a free template, or of another designer", () => {
  it("is refused", async () => {
    const { template, designer } = await paidTemplate();
    await store.updateMarketTemplate(template.id, { free: true, plans: [] }, NOW);
    const free = (await store.getMarketTemplate(template.id))!;
    expect(await createDiscount(store, designer, free, form({ percent: "10" }), NOW)).toEqual({ ok: false, errors: { form: "Discounts are for templates with paid plans." } });
    expect(DAY).toBe(24 * HOUR);
  });
});

describe("106.12 the words", () => {
  it("fill in their numbers in each language", () => {
    expect(getDashT("en")("marketDiscounts.runningCount", { count: 3 })).toBe("3 running");
    expect(getDashT("en")("marketDiscounts.runningCount", { count: 0 })).toBe("No discount running");
    expect(getDashT("en")("marketDiscounts.endsInDays", { days: 2, time: "04:12:09" })).toBe("Ends in 2 days, 04:12:09");
    expect(getDashT("en")("marketDiscounts.endsInDays", { days: 1, time: "04:12:09" })).toBe("Ends in 1 day, 04:12:09");
    expect(getDashT("ar")("marketDiscounts.endsInDays", { days: 3, time: "04:12:09" })).toBe("بيخلص بعد 3 أيام و04:12:09");
    expect(getDashT("ar")("marketDiscounts.runningCount", { count: 11 })).toBe("11 خصم شغّال");
    expect(getDashT("tr")("marketDiscounts.comingCount", { count: 2 })).toBe("2 indirim sırada");
    expect(getDashT("tr")("marketDiscounts.endsInDays", { days: 2, time: "04:12:09" })).toBe("2 gün 04:12:09 sonra bitiyor");
  });
});
