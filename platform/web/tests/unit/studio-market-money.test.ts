import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { redactSecrets, REDACTED } from "@/lib/admin/audit";
import { ADMIN_ROLES, can } from "@/lib/admin/permissions";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import type { BlobStore } from "@/lib/blobs";
import { decrypt, keyId, keyIdOf, withOldKeys } from "@/lib/crypto/encryption";
import { runRekey } from "@/lib/jobs/rekey";
import { MemoryStore } from "@/lib/data/memory";
import { isPrivateAsset, type App, type MarketTemplate, type TemplateDesigner, type TemplateOrder } from "@/lib/data/types";
import { renderEmail } from "@/lib/email/send";
import { loadLayout, saveDraft } from "@/lib/pages/layout";
import type { StudioNode } from "@/lib/pages/types";
import type { PaymentAccount } from "@/lib/payments/provider";
import { renderReceiptPdf } from "@/lib/receipts/pdf";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { en as appEn } from "@/lib/studio/app-words";
import { makeStudioProject } from "@/lib/studio/new-project";
import { TEMPLATES, type SectionWord } from "@/lib/studio/sections";
import { completeTemplateOrder, startTemplateCheckout, type CheckoutDeps, type DeliverDeps } from "@/lib/studio-market/checkout";
import { joinAsDesigner } from "@/lib/studio-market/designers";
import {
  cancelPayout,
  centsDecimal,
  CSV_COLUMNS,
  designerMoney,
  markPayoutSent,
  MONEY_MESSAGES,
  PAYOUT_MIN_CENTS,
  payoutAccount,
  nextPeriod,
  payoutPeriod,
  payoutRun,
  payoutsCsv,
  payoutsToDo,
  preparePayouts,
  periodCutoff,
  readSent,
  recordSale,
  saleEntry,
  saleState,
  syncLedger,
} from "@/lib/studio-market/money";
import {
  compact,
  DETAILS_MESSAGES,
  detailsAccount,
  detailsIdNumber,
  detailsView,
  ibanValid,
  maskAccount,
  readPayoutDetails,
  reviewPayoutDetails,
  savePayoutDetails,
  swiftValid,
  type DetailsInput,
} from "@/lib/studio-market/payout-details";
import { payoutAmount, payoutMonth, payoutReceipt } from "@/lib/studio-market/payout-receipt";
import { lastSalesDayOf, payoutDayOf, salePeriod } from "@/lib/studio-market/payout-calendar";
import { payoutsAlertKey, runStudioMarketDaily } from "@/lib/studio-market/daily";
import { splitSale } from "@/lib/studio-market/plans";
import { decideReview } from "@/lib/studio-market/review";
import { sendForReview, startTemplate } from "@/lib/studio-market/templates";
import { DEFAULT_CONTACT } from "@/lib/contact";

/**
 * 106.11 The designer's money, on the memory store (the store's own rules
 * run on MySQL and MariaDB too: studio-market-store-suite.ts): each paid
 * sale in the ledger with its exact split, the balance (available, pending,
 * paid out), USD 250 and the carry-over, the checks before the first
 * payout, the ID number and the account encrypted and masked, the bank's
 * file, "Mark as sent" and its receipt, and who may do it.
 */

const BLOBS = mkdtempSync(join(tmpdir(), "studio-market-money-"));
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

const KEY = Buffer.alloc(32, 9);
const NOW = new Date("2026-11-15T10:00:00Z");
const DAY = 86_400_000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY);
/** Days of the next months, at 09:00 UTC (noon in Istanbul): after their 1st's cut-off. */
const DEC = (day: number) => new Date(Date.UTC(2026, 11, day, 9));
const JAN = (day: number) => new Date(Date.UTC(2027, 0, day, 9));
const FEB = (day: number) => new Date(Date.UTC(2027, 1, day, 9));
const BASE = "https://yallapp.com.tr";
const BLANK = TEMPLATES.find((t) => t.id === "blank")!;
const words = (name: string) => (word: SectionWord) => String(appEn[word]).replaceAll("{app}", name);
/** A real Turkish IBAN (its check digits right) and Ziraat's SWIFT code. */
const IBAN = "TR330006100519786457841326";
const SWIFT = "TCZBTR2A";
const ID_NUMBER = "12345678950";

let store: MemoryStore;
let blobs: MemoryBlobs;
let n = 0;

beforeEach(() => {
  store = new MemoryStore();
  blobs = new MemoryBlobs();
});

async function account(name: string): Promise<string> {
  n += 1;
  const { client } = await registerClient(store, { name, email: `${name.toLowerCase().replace(/\W+/g, "-")}-${n}@money.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  return client.id;
}

async function project(clientId: string, name: string): Promise<App> {
  return makeStudioProject(store, { clientId, name, kind: kindById("store")!, source: "catalog", template: BLANK, words: words(name), lang: "en" }, NOW);
}

/** A paid template on the market (3 months at `cents`, lifetime at $149) and its designer. */
async function paidTemplate(cents = 2400): Promise<{ template: MarketTemplate; designer: TemplateDesigner }> {
  const clientId = await account("Studio Nur");
  const joined = await joinAsDesigner(store, { id: clientId }, { name: "Studio Nur", slug: "", country: "TR", bio: "", terms: true }, NOW);
  if (!joined.ok) throw new Error("join");
  const app = await project(clientId, "Nur project");
  const record = await loadLayout(store, app, NOW);
  const first = record.draft.pages.findIndex((x) => x.studio);
  const pages = record.draft.pages.map((p, i) => (i === first && p.studio ? { ...p, studio: { ...p.studio, body: { ...p.studio.body, children: [{ id: "t1", type: "text", text: "Hello from Nur" } as StudioNode] } } } : p));
  expect((await saveDraft(store, app, { ...record.draft, pages }, NOW)).ok).toBe(true);
  let template = await startTemplate(store, joined.designer, app, NOW);
  await store.updateMarketTemplate(
    template.id,
    {
      texts: { en: { title: "Rosé Atelier", short: "A soft flower shop.", description: "Photos first." } },
      screens: [(await loadLayout(store, app, NOW)).draft.pages.find((p) => p.studio)!.slug],
      free: false,
      plans: [
        { period: "3m", cents },
        { period: "life", cents: 14900 },
      ],
    },
    NOW,
  );
  template = (await store.getMarketTemplate(template.id))!;
  const sent = await sendForReview({ store, blobs, now: NOW, baseUrl: BASE }, template, app, { rights: true, note: "" }, "nur@money.test");
  if (!sent.ok) throw new Error(sent.message);
  const decided = await decideReview(store, sent.template, { decision: "approved", notes: "", teamNote: "", checks: [] }, { email: "deniz@yallapp.test", name: "Deniz" }, NOW);
  if (!decided.ok) throw new Error("review");
  return { template: (await store.getMarketTemplate(template.id))!, designer: joined.designer };
}

// ——— A fake Kashier: sessions it started, paid when told ———
function fakeKashier() {
  const sessions = new Map<string, { body: Record<string, unknown>; paid: boolean }>();
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
      const s = sessions.get(read[1]!);
      if (!s) return json({ message: "Not found" }, 404);
      return json({ data: { status: s.paid ? "SUCCESS" : "PENDING", amount: s.body.amount, currency: s.body.currency, merchantOrderId: s.body.order, transactionId: `TX-${read[1]}` } });
    }
    return json({}, 404);
  }) as typeof fetch;
  return { fetcher, pay: (id: string) => (sessions.get(id)!.paid = true) };
}

const ACCOUNT: PaymentAccount = { provider: "kashier", keys: { merchantId: "MID-5252-525", apiKey: "kashier-api", secretKey: "kashier-secret", sandbox: true } };

function deps(kashier: ReturnType<typeof fakeKashier>, now = NOW): CheckoutDeps & DeliverDeps {
  return { store, blobs, now, account: ACCOUNT, egpPerUsd: 50, urls: { kashier: "https://kashier.test" }, fetcher: kashier.fetcher, baseUrl: BASE, appsOf: (c) => store.listAppsByClient(c), planOf: async () => null };
}

/** A buyer pays for the 3-month plan ("apply it later": no app needed), confirmed by Kashier. */
async function sell(template: MarketTemplate, kashier: ReturnType<typeof fakeKashier>, now = NOW): Promise<TemplateOrder> {
  const clientId = await account("Tulip");
  const client = (await store.getClientById(clientId))!;
  const user = (await store.getUserById(client.userId))!;
  const started = await startTemplateCheckout(deps(kashier, now), {
    client,
    user,
    apps: [],
    template: (await store.getMarketTemplate(template.id))!,
    plan: "3m",
    appId: null,
    renew: null,
    consent: true,
    city: "Istanbul",
    ip: "198.51.100.7",
    callbackUrls: (token) => ({ returnUrl: `${BASE}/api/pay/kashier/template/${token}`, webhookUrl: `${BASE}/api/pay/kashier/template/${token}` }),
  });
  if (!started.ok) throw new Error(started.message);
  kashier.pay(started.order.providerRef!);
  const done = await completeTemplateOrder(deps(kashier, now), started.order, {});
  expect(done.kind).toBe("paid");
  return (await store.getTemplateOrder(started.order.id))!;
}

const input = (over: Partial<DetailsInput> = {}): DetailsInput => ({
  legalName: "Nur Yılmaz",
  country: "TR",
  idType: "national_id",
  idNumber: ID_NUMBER,
  holderName: "Nur Yılmaz",
  accountKind: "iban",
  account: "TR33 0006 1005 1978 6457 8413 26",
  swift: "tczb tr2a",
  bankCode: "",
  bankName: "Ziraat Bankası",
  bankCountry: "TR",
  address: "Moda Cd. 12, Kadıköy, 34710 İstanbul",
  confirm: true,
  hasDocument: true,
  ...over,
});

/** The designer's checks sent (and, unless told, approved by the team). */
async function checks(designer: TemplateDesigner, approve = true, now = NOW) {
  const read = readPayoutDetails(input(), await store.getDesignerPayoutDetails(designer.id));
  if (!read.ok) throw new Error(JSON.stringify(read.errors));
  const details = await savePayoutDetails({ store, key: KEY, now }, designer, read.value, "4c2b8f3e-1d7a-4f0e-9b6a-2a5d8c9e0f11");
  if (!approve) return details;
  const reviewed = await reviewPayoutDetails(store, details, { decision: "approve", note: "", seen: details.submittedAt }, "deniz@yallapp.test", now);
  if (!reviewed.ok) throw new Error("review");
  return reviewed.details;
}

const team = (now = NOW) => ({ store, key: KEY, now, by: "deniz@yallapp.test" });

describe("106.11 the ledger", () => {
  it("splits every sale from $0.00 to $10,000.00 cent-exact: 75% the designer's (half a cent up), the rest Yallapp's, adding up", () => {
    for (let gross = 0; gross <= 1_000_000; gross++) {
      const { designerCents, yallappCents } = splitSale(gross);
      // The reference in exact integer arithmetic: 75% rounded half up.
      const exact = Number((BigInt(gross) * 75n + 50n) / 100n);
      if (designerCents !== exact || designerCents + yallappCents !== gross || !Number.isSafeInteger(designerCents)) throw new Error(`${gross}: ${designerCents} + ${yallappCents}`);
    }
    expect(splitSale(101)).toEqual({ designerCents: 76, yallappCents: 25 });
    expect(splitSale(102)).toEqual({ designerCents: 77, yallappCents: 25 });
    expect(splitSale(2)).toEqual({ designerCents: 2, yallappCents: 0 });
    expect(splitSale(1_000_000)).toEqual({ designerCents: 750_000, yallappCents: 250_000 });
    // Whole cents only: never a fraction, a negative or an unsafe number.
    for (const bad of [10.5, -1, Number.NaN, 2 ** 53]) expect(() => splitSale(bad)).toThrow(RangeError);
  });

  it("records each paid sale once, from the order's own amounts, whatever the price", async () => {
    const prices = [100, 101, 102, 199, 333, 2400, 2499, 9_999, 14_900, 33_333, 99_999, 1_000_000];
    const { template, designer } = await paidTemplate(prices[0]);
    const kashier = fakeKashier();
    const orders: TemplateOrder[] = [];
    for (const [i, cents] of prices.entries()) {
      await store.updateMarketTemplate(template.id, { plans: [{ period: "3m", cents }] }, at(i));
      orders.push(await sell(template, kashier, at(i)));
    }
    const ledger = await store.listDesignerLedger({ designerId: designer.id });
    expect(ledger).toHaveLength(prices.length);
    for (const [i, order] of orders.entries()) {
      const entry = ledger.find((e) => e.id === order.id)!;
      expect(entry).toMatchObject({ designerId: designer.id, templateId: template.id, clientId: order.clientId, kind: "buy", plan: "3m", earnedAt: order.paidAt });
      expect([entry.grossCents, entry.designerCents, entry.yallappCents]).toEqual([order.grossCents, order.designerCents, order.yallappCents]);
      expect(entry.grossCents).toBe(prices[i]);
      expect(entry.designerCents).toBe(splitSale(prices[i]!).designerCents);
    }
    const { money } = await designerMoney(store, designer.id, at(20));
    expect(money.earnedCents).toBe(prices.reduce((sum, cents) => sum + splitSale(cents).designerCents, 0));
    expect(money).toMatchObject({ sales: prices.length, availableCents: money.earnedCents, pendingCents: 0, paidCents: 0 });
  });

  it("keeps the order's amounts as they are, refuses amounts that don't add up, and leaves out what isn't paid", async () => {
    const { template, designer } = await paidTemplate();
    const order = await sell(template, fakeKashier());
    const entry = saleEntry({ ...order, grossCents: 2000, designerCents: 1500, yallappCents: 500 }, NOW)!;
    expect([entry.grossCents, entry.designerCents, entry.yallappCents]).toEqual([2000, 1500, 500]);
    expect(saleEntry({ ...order, designerCents: 1801 }, NOW)).toBeNull();
    expect(saleEntry({ ...order, grossCents: 24.5, designerCents: 18.375, yallappCents: 6.125 }, NOW)).toBeNull();
    expect(saleEntry({ ...order, status: "pending" }, NOW)).toBeNull();
    expect(saleEntry({ ...order, status: "failed" }, NOW)).toBeNull();
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await recordSale(store, { ...order, id: "b2a4c3d1-0000-4000-8000-000000000001", designerCents: 1 }, NOW)).toBe(false);
    // Said without the buyer or the amounts: the order's reference only.
    expect(error.mock.calls.flat().join(" ")).toContain("b2a4c3d1-0000-4000-8000-000000000001");
    error.mockRestore();
    // Delivered again (the webhook and the return): still one entry.
    expect(await recordSale(store, order, at(1))).toBe(false);
    expect(await store.listDesignerLedger({ designerId: designer.id })).toHaveLength(1);
  });

  it("puts in the sales a delivery cut short missed, only paid ones, once", async () => {
    const { template, designer } = await paidTemplate();
    const order = await sell(template, fakeKashier());
    const missed: TemplateOrder = { ...order, id: "c0ffee00-0000-4000-8000-000000000002", tokenHash: "f".repeat(64), paidAt: at(1) };
    await store.createTemplateOrder(missed);
    await store.createTemplateOrder({ ...order, id: "c0ffee00-0000-4000-8000-000000000003", tokenHash: "e".repeat(64), status: "pending", paidAt: null });
    expect(await syncLedger(store, at(2))).toBe(1);
    expect(await syncLedger(store, at(3), designer.id)).toBe(0);
    expect((await store.listDesignerLedger({ designerId: designer.id })).map((e) => e.id).sort()).toEqual([order.id, missed.id].sort());
  });

  it("has no way back for a paid order: no refunds, so the ledger only grows", async () => {
    // Checkout's only change of status after paid is none: failing works on pending orders only.
    const { template } = await paidTemplate();
    const order = await sell(template, fakeKashier());
    expect(await store.failTemplateOrder(order.id)).toBe(false);
    expect(await store.payTemplateOrder(order.id, "TX-again", at(1))).toBe(false);
    expect((await store.getTemplateOrder(order.id))!.status).toBe("paid");
  });
});

describe("106.11 USD 250 and the carry-over", () => {
  it("carries a balance under $250 over to the next 1st, pays what's before the cut-off once it's $250, one payout a month", async () => {
    // $100 for three months: $75 the designer's each time, in November.
    const { template, designer } = await paidTemplate(10_000);
    const kashier = fakeKashier();
    await checks(designer);
    for (let i = 0; i < 3; i++) await sell(template, kashier, at(i));
    // A $34 sale ($25.50 theirs) on 1 December: after December's cut-off.
    await store.updateMarketTemplate(template.id, { plans: [{ period: "3m", cents: 3400 }] }, at(3));
    await sell(template, kashier, DEC(1));
    let run = await payoutRun(store, DEC(2));
    expect(run.period).toBe("2026-12");
    expect(run.rows.find((r) => r.designer.id === designer.id)).toMatchObject({ state: "below", dueCents: 22_500, laterCents: 2550, money: { availableCents: 25_050 } });
    expect((await preparePayouts(team(DEC(2)))).prepared).toEqual([]);
    expect(await payoutsToDo(store, DEC(2))).toBe(0);
    // 1 January: November's $225 carried over with December's sale, $250.50 in all.
    run = await payoutRun(store, JAN(2));
    expect(run.rows.find((r) => r.designer.id === designer.id)).toMatchObject({ state: "due", dueCents: 25_050, laterCents: 0 });
    expect(await payoutsToDo(store, JAN(2))).toBe(1);
    const { prepared } = await preparePayouts(team(JAN(2)));
    expect(prepared).toHaveLength(1);
    expect(prepared[0]).toMatchObject({ designerId: designer.id, period: "2027-01", amountCents: 25_050, status: "processing", currency: "USD" });
    // Pending now: on its way, out of the balance available.
    let { money } = await designerMoney(store, designer.id, JAN(2));
    expect(money).toMatchObject({ earnedCents: 25_050, availableCents: 0, pendingCents: 25_050, paidCents: 0 });
    // Preparing again the same month makes nothing more.
    expect((await preparePayouts(team(JAN(2)))).prepared).toEqual([]);
    const sent = await markPayoutSent(team(JAN(3)), prepared[0]!, { reference: "SWIFT-20270103-0042", sentOn: "2027-01-03" });
    expect(sent.ok).toBe(true);
    ({ money } = await designerMoney(store, designer.id, JAN(3)));
    expect(money).toMatchObject({ availableCents: 0, pendingCents: 0, paidCents: 25_050 });

    // A sale in January, $300 theirs: January's payout went out, so it waits for 1 February.
    await store.updateMarketTemplate(template.id, { plans: [{ period: "3m", cents: 40_000 }] }, JAN(4));
    await sell(template, kashier, JAN(5));
    run = await payoutRun(store, JAN(6));
    expect(run.rows.find((r) => r.designer.id === designer.id)).toMatchObject({ state: "sent", dueCents: 0, laterCents: 30_000 });
    expect((await preparePayouts(team(JAN(6)))).prepared).toEqual([]);
    // 1 February: due, its balance before the cut-off.
    run = await payoutRun(store, FEB(2));
    expect(run.rows.find((r) => r.designer.id === designer.id)).toMatchObject({ state: "due", dueCents: 30_000, money: { availableCents: 30_000, paidCents: 25_050 } });
    expect((await preparePayouts(team(FEB(2)))).prepared.map((p) => [p.period, p.amountCents])).toEqual([["2027-02", 30_000]]);
  });

  it("is due from $250.00 exactly, not at $249.99", async () => {
    const { template, designer } = await paidTemplate();
    await checks(designer);
    const entry = (id: string, designerCents: number) => ({ id, designerId: designer.id, templateId: template.id, clientId: designer.clientId, kind: "buy" as const, plan: "3m" as const, grossCents: designerCents * 2, designerCents, yallappCents: designerCents, earnedAt: NOW, createdAt: NOW });
    await store.recordDesignerSale(entry("a0000000-0000-4000-8000-000000000001", 24_999));
    const state = async () => (await payoutRun(store, DEC(2))).rows.find((r) => r.designer.id === designer.id)!;
    expect(await state()).toMatchObject({ state: "below", dueCents: PAYOUT_MIN_CENTS - 1 });
    await store.recordDesignerSale(entry("a0000000-0000-4000-8000-000000000002", 1));
    expect(await state()).toMatchObject({ state: "due", dueCents: PAYOUT_MIN_CENTS });
  });

  it("doesn't pay a balance that changed between reading it and writing the payout, nor a sale after the cut-off", async () => {
    const { template, designer } = await paidTemplate(40_000);
    await checks(designer);
    await sell(template, fakeKashier());
    const run = await payoutRun(store, DEC(2));
    const row = run.rows.find((r) => r.designer.id === designer.id)!;
    expect(row.dueCents).toBe(30_000);
    // A sale after the cut-off changes nothing in December's run.
    const sale = (id: string, earnedAt: Date) => ({ id, designerId: designer.id, templateId: template.id, clientId: designer.clientId, kind: "buy" as const, plan: "3m" as const, grossCents: 100, designerCents: 75, yallappCents: 25, earnedAt, createdAt: DEC(2) });
    await store.recordDesignerSale(sale("d00d0000-0000-4000-8000-000000000003", DEC(1)));
    // A late one before it (a delivery cut short) lands between reading the balance ($300) and writing the payout.
    await store.recordDesignerSale(sale("d00d0000-0000-4000-8000-000000000004", at(1)));
    const stale = { ...(await preparePayouts(team(DEC(2)))).prepared[0]!, id: "e0000000-0000-4000-8000-000000000005", period: "2026-11" };
    expect(await store.createDesignerPayout(stale, { before: run.cutoff, expectedCents: 30_000 })).toBe("changed");
    // Prepared again, it reads the balance again and pays what's before the cut-off ($300.75), never the 1 December sale.
    expect(stale.amountCents).toBe(30_075);
    expect((await designerMoney(store, designer.id, DEC(2))).money).toMatchObject({ pendingCents: 30_075, availableCents: 75 });
  });
});

describe("106.11 the checks before the first payout", () => {
  it("keeps the payouts back until the team approves the checks, and again after a change", async () => {
    const { template, designer } = await paidTemplate(40_000);
    await sell(template, fakeKashier());
    const state = async (now = DEC(2)) => (await payoutRun(store, now)).rows.find((r) => r.designer.id === designer.id)!.state;
    // $300 earned, no checks yet: waiting for them (the template was published without them).
    expect(template.status).toBe("published");
    expect(await state()).toBe("checks");
    const sent = await checks(designer, false, at(1));
    expect(sent.status).toBe("submitted");
    expect(await state()).toBe("checks");
    expect((await preparePayouts(team(DEC(2)))).prepared).toEqual([]);
    // A fix needs a note, then the designer is sent back.
    expect(await reviewPayoutDetails(store, sent, { decision: "fix", note: " ", seen: sent.submittedAt }, "deniz@yallapp.test", at(1))).toEqual({ ok: false, errors: { note: DETAILS_MESSAGES.note } });
    const fix = await reviewPayoutDetails(store, sent, { decision: "fix", note: "The account holder's name doesn't match your ID.", seen: sent.submittedAt }, "deniz@yallapp.test", at(1));
    expect(fix).toMatchObject({ ok: true, details: { status: "changes_requested", reviewNote: "The account holder's name doesn't match your ID." } });
    expect(await state()).toBe("checks");
    // Sent again, then approved: due.
    const again = await checks(designer, false, at(2));
    // The team approves what it opened before the change: refused, the new checks are looked at again.
    expect(await reviewPayoutDetails(store, again, { decision: "approve", note: "", seen: sent.submittedAt }, "deniz@yallapp.test", at(2))).toEqual({ ok: false, errors: { form: DETAILS_MESSAGES.changed } });
    expect((await reviewPayoutDetails(store, again, { decision: "approve", note: "", seen: again.submittedAt }, "deniz@yallapp.test", at(2))).ok).toBe(true);
    expect(await state(DEC(2))).toBe("due");
    // A change of bank after the approval: checked again before the next payout.
    await checks(designer, false, at(3));
    expect(await state(DEC(3))).toBe("checks");
    expect((await preparePayouts(team(DEC(3)))).prepared).toEqual([]);
  });

  it("reads the checks: the ID, an IBAN by its check digits, SWIFT/BIC, the bank's country and the address", () => {
    expect(ibanValid(IBAN)).toBe(true);
    expect(ibanValid("GB82 WEST 1234 5698 7654 32")).toBe(true);
    expect(ibanValid("TR330006100519786457841327")).toBe(false);
    expect(ibanValid("TR33")).toBe(false);
    expect(swiftValid("TCZBTR2A")).toBe(true);
    expect(swiftValid("TCZBTR2AXXX")).toBe(true);
    expect(swiftValid("TCZB2A")).toBe(false);
    const ok = readPayoutDetails(input(), null);
    expect(ok).toMatchObject({ ok: true, value: { account: IBAN, swift: SWIFT, idNumber: ID_NUMBER, accountKind: "iban", bankCode: null } });
    const bad = readPayoutDetails(
      input({ legalName: "N", country: "XX", idType: "other", idNumber: "12", account: "TR330006100519786457841327", swift: "TCZB", bankName: "", address: "x", confirm: false, hasDocument: false }),
      null,
    );
    expect(bad).toEqual({
      ok: false,
      errors: {
        legalName: DETAILS_MESSAGES.legalName,
        country: DETAILS_MESSAGES.country,
        idType: DETAILS_MESSAGES.idType,
        idNumber: DETAILS_MESSAGES.idNumber,
        document: DETAILS_MESSAGES.document,
        account: DETAILS_MESSAGES.iban,
        swift: DETAILS_MESSAGES.swift,
        bankName: DETAILS_MESSAGES.bankName,
        address: DETAILS_MESSAGES.address,
        confirm: DETAILS_MESSAGES.confirm,
      },
    });
    // The IBAN and the SWIFT code name the bank's country.
    expect(readPayoutDetails(input({ bankCountry: "EG" }), null)).toMatchObject({ ok: false, errors: { account: DETAILS_MESSAGES.ibanCountry, swift: DETAILS_MESSAGES.swiftCountry } });
    // Without an IBAN: the account number, a routing code.
    expect(readPayoutDetails(input({ accountKind: "number", account: "000123456789", bankCountry: "US", swift: "CHASUS33", bankCode: "021000021" }), null)).toMatchObject({ ok: true, value: { accountKind: "number", account: "000123456789", bankCode: "021000021" } });
  });

  it("keeps the saved ID number, account and document when their fields are left empty, but not an account of another kind", async () => {
    const { designer } = await paidTemplate();
    const saved = await checks(designer, false);
    const keep = readPayoutDetails(input({ idNumber: "", account: "", hasDocument: false }), saved);
    expect(keep).toMatchObject({ ok: true, value: { idNumber: null, account: null } });
    const again = await savePayoutDetails({ store, key: KEY, now: at(1) }, designer, keep.ok ? keep.value : (null as never), null);
    expect(detailsIdNumber(again, KEY)).toBe(ID_NUMBER);
    expect(detailsAccount(again, KEY)).toBe(IBAN);
    expect(again.idDocumentAssetId).toBe(saved.idDocumentAssetId);
    expect(again).toMatchObject({ status: "submitted", submittedAt: at(1), createdAt: saved.createdAt });
    expect(readPayoutDetails(input({ accountKind: "number", account: "" }), saved)).toMatchObject({ ok: false, errors: { account: DETAILS_MESSAGES.account } });
  });
});

describe("106.11 encrypted at rest, masked when shown", () => {
  it("seals the ID number and the account with the platform's key, bound to the designer, never in the store as they were typed", async () => {
    const { designer, template } = await paidTemplate();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const details = await checks(designer);
    const stored = (await store.getDesignerPayoutDetails(designer.id))!;
    expect(stored.idNumberEncrypted).toMatch(/^v2\./);
    expect(stored.accountEncrypted).toMatch(/^v2\./);
    const everything = JSON.stringify(stored);
    for (const secret of [IBAN, ID_NUMBER, "0006100519786457841326", "TR33 0006"]) expect(everything).not.toContain(secret);
    expect(detailsIdNumber(stored, KEY)).toBe(ID_NUMBER);
    expect(detailsAccount(stored, KEY)).toBe(IBAN);
    // Moved to another designer's row, or opened with another key: it doesn't open.
    expect(() => detailsAccount({ ...stored, designerId: "another-designer" }, KEY)).toThrow();
    expect(() => detailsAccount(stored, Buffer.alloc(32, 1))).toThrow();
    // Shown masked; in full only when asked to (the team with market.payouts).
    expect(detailsView(stored, KEY, false)).toMatchObject({ idNumber: "•••• 8950", account: "TR33 •••• 1326", masked: true, legalName: "Nur Yılmaz" });
    expect(detailsView(stored, KEY, true)).toMatchObject({ idNumber: ID_NUMBER, account: IBAN, masked: false });
    expect(maskAccount("000123456789", "number")).toBe("•••• 6789");
    expect(maskAccount("1234", "number")).toBe("•••• 34");
    // A payout keeps the account sealed again, bound to it, and its hint masked.
    await store.updateMarketTemplate(template.id, { plans: [{ period: "3m", cents: 40_000 }] }, NOW);
    await sell(template, fakeKashier());
    const [payout] = (await preparePayouts(team(DEC(2)))).prepared;
    expect(payout!.accountEncrypted).not.toContain(IBAN);
    expect(payout!.accountEncrypted).not.toBe(stored.accountEncrypted);
    expect(payout!.accountHint).toBe("TR33 •••• 1326");
    expect(payoutAccount(payout!, KEY)).toBe(IBAN);
    expect(() => decrypt(payout!.accountEncrypted, KEY, "studio_market_payouts.account:another")).toThrow();
    // Nothing was logged with them.
    const said = [...log.mock.calls, ...warn.mock.calls, ...error.mock.calls].flat().map(String).join(" ");
    for (const secret of [IBAN, ID_NUMBER]) expect(said).not.toContain(secret);
    log.mockRestore();
    warn.mockRestore();
    error.mockRestore();
    expect(details.status).toBe("approved");
  });

  it("moves the sealed values to a new key with the rekey job, like every other secret", async () => {
    const { designer, template } = await paidTemplate(40_000);
    await checks(designer);
    await sell(template, fakeKashier());
    const [payout] = (await preparePayouts(team(DEC(2)))).prepared;
    // A new platform key, the old one kept to open what it sealed until the job moved it.
    const next = withOldKeys(Buffer.alloc(32, 4), [KEY]);
    const state = await runRekey(store, next, { clock: () => DEC(3) });
    expect(state).toMatchObject({ done: true, failed: 0 });
    expect(state!.moved).toBeGreaterThanOrEqual(3);
    const details = (await store.getDesignerPayoutDetails(designer.id))!;
    const moved = (await store.getDesignerPayout(payout!.id))!;
    for (const value of [details.idNumberEncrypted, details.accountEncrypted, moved.accountEncrypted]) expect(keyIdOf(value)).toBe(keyId(next));
    const fresh = Buffer.alloc(32, 4);
    expect([detailsIdNumber(details, fresh), detailsAccount(details, fresh), payoutAccount(moved, fresh)]).toEqual([ID_NUMBER, IBAN, IBAN]);
  });

  it("keeps the ID document private and IBANs out of the audit log", () => {
    expect(isPrivateAsset("designer_id_document")).toBe(true);
    expect(isPrivateAsset("salary_receipt")).toBe(true);
    expect(isPrivateAsset("icon")).toBe(false);
    expect(redactSecrets({ iban: IBAN, status: "approved" })).toEqual({ iban: REDACTED, status: "approved" });
    expect(compact(" tr33-0006 ")).toBe("TR330006");
  });
});

describe("106.11 the bank's file", () => {
  it("has one row per payout to send: the account in full, the amount in dollars and cents, text kept as text", async () => {
    const { template, designer } = await paidTemplate(40_133);
    await checks(designer);
    await sell(template, fakeKashier());
    await store.updateTemplateDesigner(designer.id, { name: "=HYPERLINK(\"x\"), Studio" }, NOW);
    const [payout] = (await preparePayouts(team(DEC(2)))).prepared;
    expect(payout!.amountCents).toBe(30_100);
    const designers = new Map((await store.listTemplateDesigners([designer.id])).map((d) => [d.id, d]));
    const csv = payoutsCsv([payout!, { ...payout!, id: "sent-one", status: "sent" }], designers, KEY);
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines.at(-1)).toBe("");
    expect(lines[0]).toBe(CSV_COLUMNS.join(","));
    expect(lines).toHaveLength(3);
    const row = lines[1]!;
    expect(row.startsWith(`${payout!.id},`)).toBe(true);
    expect(row).toContain(`"'=HYPERLINK(""x""), Studio (${designer.slug})"`);
    expect(row).toContain(`,IBAN,${IBAN},${SWIFT},,Ziraat Bankası,TR,301.00,USD,Yallapp Studio Market 2026-12 ${payout!.id.slice(0, 8).toUpperCase()}`);
    expect(row).toContain('"Moda Cd. 12, Kadıköy, 34710 İstanbul"');
    expect(row).not.toContain("•");
    expect(csv).not.toContain("sent-one");
    expect([0, 5, 99, 100, 25_000, 30_100, 100_000_000].map(centsDecimal)).toEqual(["0.00", "0.05", "0.99", "1.00", "250.00", "301.00", "1000000.00"]);
    expect(() => centsDecimal(1.5)).toThrow(RangeError);
  });
});

describe("106.11 Mark as sent", () => {
  async function prepared() {
    const { template, designer } = await paidTemplate(40_000);
    await checks(designer);
    await sell(template, fakeKashier());
    const [payout] = (await preparePayouts(team(DEC(2)))).prepared;
    return { designer, payout: payout! };
  }

  it("records the bank's reference and day once, and moves the amount from pending to paid out", async () => {
    const { designer, payout } = await prepared();
    expect(readSent({ reference: "x", sentOn: "2026-12-03" }, payout, DEC(3))).toEqual({ ok: false, errors: { reference: MONEY_MESSAGES.reference } });
    // Not before it was prepared (2 Dec), nor after today, nor a day that doesn't exist.
    for (const sentOn of ["2026-12-01", "2026-12-04", "2026-02-30", "03/12/2026"]) expect(readSent({ reference: "SWIFT-1", sentOn }, payout, DEC(3))).toEqual({ ok: false, errors: { sentOn: MONEY_MESSAGES.sentOn } });
    const done = await markPayoutSent(team(DEC(3)), payout, { reference: "  SWIFT-20261203-0042 ", sentOn: "2026-12-03" });
    expect(done).toMatchObject({ ok: true, payout: { status: "sent", bankReference: "SWIFT-20261203-0042", sentOn: "2026-12-03", sentAt: DEC(3), sentBy: "deniz@yallapp.test" } });
    expect(await markPayoutSent(team(DEC(3)), payout, { reference: "SWIFT-AGAIN", sentOn: "2026-12-03" })).toEqual({ ok: false, errors: { form: MONEY_MESSAGES.notProcessing } });
    expect(await markPayoutSent(team(DEC(3)), (await store.getDesignerPayout(payout.id))!, { reference: "SWIFT-AGAIN", sentOn: "2026-12-03" })).toEqual({ ok: false, errors: { form: MONEY_MESSAGES.notProcessing } });
    expect(await cancelPayout(team(DEC(3)), (await store.getDesignerPayout(payout.id))!, "Too late.")).toEqual({ ok: false, errors: { form: MONEY_MESSAGES.notProcessing } });
    const { money, payouts } = await designerMoney(store, designer.id, DEC(3));
    expect(money).toMatchObject({ earnedCents: 30_000, availableCents: 0, pendingCents: 0, paidCents: 30_000 });
    expect(payouts.map((p) => [p.status, p.bankReference])).toEqual([["sent", "SWIFT-20261203-0042"]]);
    expect(await payoutsToDo(store, DEC(3))).toBe(0);
  });

  it("cancels a payout the bank didn't send, with why: the amount is back and the month can be prepared again", async () => {
    const { designer, payout } = await prepared();
    expect(await cancelPayout(team(DEC(3)), payout, "no")).toEqual({ ok: false, errors: { note: MONEY_MESSAGES.note } });
    expect(await cancelPayout(team(DEC(3)), payout, "The bank returned it: the IBAN was closed.")).toEqual({ ok: true });
    expect((await designerMoney(store, designer.id, DEC(3))).money).toMatchObject({ availableCents: 30_000, pendingCents: 0, paidCents: 0 });
    expect((await preparePayouts(team(DEC(4)))).prepared.map((p) => p.amountCents)).toEqual([30_000]);
  });

  it("writes the receipt in the designer's language, as a PDF and in the email", async () => {
    const { designer, payout } = await prepared();
    const done = await markPayoutSent(team(DEC(3)), payout, { reference: "SWIFT-20261117-0042", sentOn: "2026-12-03" });
    if (!done.ok) throw new Error("sent");
    for (const lang of ["en", "ar", "tr"] as const) {
      const document = payoutReceipt({ lang, payout: done.payout, designer, contact: DEFAULT_CONTACT, invoiceLines: [] });
      const pdf = await renderReceiptPdf(document);
      expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
      expect(document.totals[0]!.value).toContain("$300.00");
      expect(document.buyer!.lines.join(" ")).toContain("TR33 •••• 1326");
      expect(JSON.stringify(document)).not.toContain(IBAN);
    }
    expect(payoutReceipt({ lang: "ar", payout: done.payout, designer, contact: DEFAULT_CONTACT, invoiceLines: [] }).title).toBe("إيصال دفعة");
    expect(payoutMonth("2026-11", "en")).toBe("November 2026");
    expect(payoutMonth("2026-11", "tr")).toBe("Kasım 2026");
    expect([30_000, 25_050, 5, 123_456_789].map(payoutAmount)).toEqual(["$300.00", "$250.50", "$0.05", "$1,234,567.89"]);
    clearPlatformSettingsCache();
    const values = { name: "Nur", amount: "$300.00", month: payoutMonth("2026-11", "ar"), sent_on: "17 نوفمبر 2026", bank_name: "Ziraat Bankası", account_hint: "TR33 •••• 1326", bank_reference: "SWIFT-20261117-0042", payout_id: payout.id, money_url: `${BASE}/designer/money` };
    const ar = await renderEmail(store, "market_payout_sent", values, undefined, "ar");
    expect(ar.subject).toBe("دفعتك من ماركت Studio: $300.00");
    expect(ar.text).toContain("مرجع البنك: SWIFT-20261117-0042");
    expect(ar.html).toContain('dir="rtl"');
    const en = await renderEmail(store, "market_payout_sent", { ...values, month: "November 2026", sent_on: "17 Nov 2026" });
    expect(en.text).toContain("We sent your Studio Market payout for November 2026 by SWIFT on 17 Nov 2026.");
    expect(en.text).toContain("It's exactly 75% of your sales");
    expect(en.text).not.toContain(IBAN);
    clearPlatformSettingsCache();
  });
});

describe("106.11 the payout of the 1st: the cut-off at midnight Istanbul time", () => {
  /** A designer with approved checks and their own sales in the ledger, at those times and amounts (their 75%). */
  async function designerWith(sales: [Date, number][]) {
    const { template, designer } = await paidTemplate();
    await checks(designer);
    for (const [i, [earnedAt, cents]] of sales.entries()) {
      await store.recordDesignerSale({ id: `5a1e0000-0000-4000-8000-${String(i).padStart(12, "0")}`, designerId: designer.id, templateId: template.id, clientId: designer.clientId, kind: "buy", plan: "3m", grossCents: cents * 2, designerCents: cents, yallappCents: cents, earnedAt, createdAt: earnedAt });
    }
    return designer;
  }
  const rowOf = async (designer: TemplateDesigner, now: Date) => (await payoutRun(store, now)).rows.find((r) => r.designer.id === designer.id)!;

  it("cuts off at 00:00 on the 1st in Istanbul (21:00 UTC the day before): 23:59 is in, 00:01 waits for the next 1st", async () => {
    expect(periodCutoff("2026-12")).toEqual(new Date("2026-11-30T21:00:00.000Z"));
    // 30 November 23:59 in Istanbul, and 1 December 00:01.
    const lastMinute = new Date("2026-11-30T20:59:00.000Z");
    const firstMinute = new Date("2026-11-30T21:01:00.000Z");
    expect([salePeriod(lastMinute), salePeriod(firstMinute)]).toEqual(["2026-12", "2027-01"]);
    const designer = await designerWith([
      [lastMinute, 30_000],
      [firstMinute, 20_000],
    ]);
    // On the 1st, when the daily job runs (06:10 UTC): December's run pays the 23:59 sale only.
    const run = await payoutRun(store, new Date("2026-12-01T06:10:00.000Z"));
    expect(run.period).toBe("2026-12");
    expect(run.cutoff).toEqual(periodCutoff("2026-12"));
    expect(await rowOf(designer, new Date("2026-12-01T06:10:00.000Z"))).toMatchObject({ state: "due", dueCents: 30_000, laterCents: 20_000 });
    const [payout] = (await preparePayouts(team(new Date("2026-12-01T06:10:00.000Z")))).prepared;
    expect(payout).toMatchObject({ period: "2026-12", amountCents: 30_000 });
    // The 00:01 sale is in January's run (under $250 then: it carries over).
    expect(await rowOf(designer, JAN(2))).toMatchObject({ state: "below", dueCents: 20_000 });
  });

  it("counts the month in Istanbul, not in UTC", () => {
    // 30 November 22:00 UTC is already 1 December 01:00 in Istanbul: December's run, a sale toward January.
    const late = new Date("2026-11-30T22:00:00.000Z");
    expect(late.toISOString().slice(0, 7)).toBe("2026-11");
    expect(payoutPeriod(late)).toBe("2026-12");
    expect(salePeriod(late)).toBe("2027-01");
    // 1 December 20:59 UTC is still 1 December (23:59) in Istanbul.
    expect(payoutPeriod(new Date("2026-12-01T20:59:00.000Z"))).toBe("2026-12");
    expect(payoutPeriod(new Date("2026-11-30T20:59:59.999Z"))).toBe("2026-11");
  });

  it("goes over the year's end: 31 December 23:59 is January's run, 00:01 on 1 January is February's", async () => {
    expect(nextPeriod("2026-12")).toBe("2027-01");
    expect(periodCutoff("2027-01")).toEqual(new Date("2026-12-31T21:00:00.000Z"));
    const lastMinute = new Date("2026-12-31T20:59:00.000Z");
    const firstMinute = new Date("2026-12-31T21:01:00.000Z");
    expect([payoutPeriod(lastMinute), payoutPeriod(firstMinute)]).toEqual(["2026-12", "2027-01"]);
    expect([salePeriod(lastMinute), salePeriod(firstMinute)]).toEqual(["2027-01", "2027-02"]);
    const designer = await designerWith([
      [lastMinute, 26_000],
      [firstMinute, 26_000],
    ]);
    const newYear = new Date("2027-01-01T06:10:00.000Z");
    expect(await rowOf(designer, newYear)).toMatchObject({ state: "due", dueCents: 26_000, laterCents: 26_000 });
    expect((await preparePayouts(team(newYear))).prepared.map((p) => [p.period, p.amountCents])).toEqual([["2027-01", 26_000]]);
    expect(await rowOf(designer, FEB(1))).toMatchObject({ state: "due", dueCents: 26_000 });
  });

  it("tells the designer their next payout and which sales it has, the others toward the 1st after it", async () => {
    const designer = await designerWith([
      [new Date("2026-11-20T10:00:00.000Z"), 30_000],
      [new Date("2026-11-30T21:01:00.000Z"), 5_000],
    ]);
    // 30 November: the next payout is 1 December, with the 20 November sale; the 1 December one counts toward 1 January.
    let { next, sales, payouts } = await designerMoney(store, designer.id, new Date("2026-11-30T12:00:00.000Z"));
    expect(next).toMatchObject({ period: "2026-12", includedCents: 30_000, laterCents: 5_000, belowMin: false });
    expect(payoutDayOf(next.period, "en")).toBe("1 December 2026");
    expect(lastSalesDayOf(next.period, "en")).toBe("30 November 2026");
    expect(payoutDayOf(next.period, "ar")).toBe("1 ديسمبر 2026");
    expect(payoutDayOf(next.period, "tr")).toBe("1 Aralık 2026");
    expect(sales.map((e) => saleState(e, payouts, next)).sort()).toEqual(["later", "next"]);
    // Prepared on 2 December, then sent: the next one is 1 January, under $250 so far.
    const [payout] = (await preparePayouts(team(DEC(2)))).prepared;
    ({ next, sales, payouts } = await designerMoney(store, designer.id, DEC(2)));
    expect(next).toMatchObject({ period: "2027-01", includedCents: 5_000, belowMin: true });
    expect(Object.fromEntries(sales.map((e) => [e.designerCents, saleState(e, payouts, next)]))).toEqual({ 30000: "on_way", 5000: "carried" });
    await markPayoutSent(team(DEC(3)), payout!, { reference: "SWIFT-20261203-0001", sentOn: "2026-12-03" });
    ({ next, sales, payouts } = await designerMoney(store, designer.id, DEC(3)));
    expect(Object.fromEntries(sales.map((e) => [e.designerCents, saleState(e, payouts, next)]))).toEqual({ 30000: "paid", 5000: "carried" });
  });

  it("alerts the team on the 1st that the month's payouts are ready to prepare, once, and closes when they are", async () => {
    await designerWith([[new Date("2026-11-20T10:00:00.000Z"), 30_000]]);
    const alerts: string[] = [];
    const daily = (now: Date) =>
      runStudioMarketDaily({ store, blobs, now, baseUrl: BASE, mail: async () => undefined, planOf: async () => null, alertMail: async (alert) => void alerts.push(alert.title) });
    // 30 November: nothing to prepare yet.
    expect((await daily(new Date("2026-11-30T06:10:00.000Z"))).payoutsDue).toBe(0);
    expect(await store.listTeamAlerts({ open: true, limit: 10 })).toEqual([]);
    // The 1st: one alert, emailed once, counted the next day.
    expect((await daily(new Date("2026-12-01T06:10:00.000Z"))).payoutsDue).toBe(1);
    await daily(new Date("2026-12-02T06:10:00.000Z"));
    const [alert] = await store.listTeamAlerts({ open: true, limit: 10 });
    expect(alert).toMatchObject({ kind: "market_payouts", key: payoutsAlertKey("2026-12"), link: "/admin/market/payouts", count: 2 });
    expect(alert!.detail).toContain("1 designer is due, $300 in all, for the sales paid up to 30 November 2026 (midnight Istanbul time).");
    expect(alerts).toEqual(["Studio Market payouts of 1 December 2026 are ready to prepare"]);
    // Prepared: it closes by itself.
    await preparePayouts(team(DEC(2)));
    await daily(new Date("2026-12-03T06:10:00.000Z"));
    expect(await store.listTeamAlerts({ open: true, limit: 10 })).toEqual([]);
  });
});

describe("106.11 who may do it", () => {
  it("lets owners and admins pay designers (market.payouts), not support or viewers", () => {
    expect(ADMIN_ROLES.map((role) => [role, can(role, "market.payouts")])).toEqual([
      ["owner", true],
      ["admin", true],
      ["support", false],
      ["viewer", false],
    ]);
    // Reviewing templates stays support's too.
    expect(can("support", "market.review")).toBe(true);
    expect(can(null, "market.payouts")).toBe(false);
  });
});
