import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminRole } from "@/lib/admin/permissions";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { ClientContext } from "@/lib/auth/session";
import { sha256Hex } from "@/lib/crypto/tokens";
import { MemoryStore } from "@/lib/data/memory";
import type { App, CatalogOrder, Client, Donation, PlanPayment, User } from "@/lib/data/types";
import { DEFAULT_CATALOG_SETTINGS } from "@/lib/data/types";
import { OWNER_ACCESS } from "@/lib/team/permissions";
import { pdfAllText } from "./pdf-text";
import { NOW } from "./helpers";

/**
 * 71 Who may download which receipt: the dashboard's (the account's own paid
 * payments, for whoever may see billing), the admin's (our team), and the
 * customers' links (a donation's random code, an order's signed link). And
 * the payment emails carry the PDF, or go without it when it can't be made.
 */

const state: { store: MemoryStore; context: ClientContext | null; user: User | null; role: AdminRole | null } = {
  store: new MemoryStore(),
  context: null,
  user: null,
  role: null,
};

vi.mock("@/lib/data", () => ({ getStore: async () => state.store }));
vi.mock("@/lib/auth/session", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...real,
    getClientContext: async () => state.context,
    getCurrentUser: async () => state.user,
    getAdminRole: async () => state.role,
  };
});
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined, has: () => false }),
  headers: async () => new Headers(),
}));
vi.mock("@/lib/receipts/pdf", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/receipts/pdf")>();
  return { ...real, renderReceiptPdf: vi.fn(real.renderReceiptPdf) };
});

const { GET: dashboardPdf } = await import("@/app/dashboard/license/receipts/[id]/pdf/route");
const { GET: adminPdf } = await import("@/app/admin/payments/[id]/pdf/route");
const { GET: adminOrderPdf } = await import("@/app/admin/payments/orders/[appId]/[orderId]/pdf/route");
const { GET: donationPdf } = await import("@/app/receipts/[code]/pdf/route");
const { GET: orderPdf } = await import("@/app/receipts/orders/[code]/route");
const { orderReceiptCode } = await import("@/lib/receipts/links");
const { receiptAttachment, sendOrderReceipt, planReceiptPdf } = await import("@/lib/receipts/service");
const { sendPlanPaidMail } = await import("@/lib/billing/plan-mail");
const { renderReceiptPdf } = await import("@/lib/receipts/pdf");
const { signingSecret } = await import("@/lib/env");
const { clearPlatformSettingsCache } = await import("@/lib/settings/platform");

const params = <T,>(value: T) => ({ params: Promise.resolve(value) }) as never;
const request = (url = "http://localhost/x", headers: Record<string, string> = {}) => new Request(url, { headers });

async function account(email: string) {
  const { user, client } = await registerClient(state.store, { name: "Ada Lovelace", email, whatsapp: "+201001234567", siteUrl: "https://academy.test", password: null }, NOW);
  const active: Client = { ...client, status: "active" };
  return { user, client: active };
}

function contextOf(user: User, client: Client, overrides: Partial<ClientContext> = {}): ClientContext {
  return {
    user,
    staff: null,
    member: null,
    access: OWNER_ACCESS,
    businesses: [],
    client,
    apps: [],
    app: null,
    license: null,
    state: "active",
    account: "active",
    licenses: [],
    ...overrides,
  } as ClientContext;
}

async function planPayment(clientId: string, status: PlanPayment["status"], appId: string | null = null): Promise<PlanPayment> {
  const payment: PlanPayment = {
    id: crypto.randomUUID(),
    clientId,
    appId,
    plan: "growth",
    months: 12,
    amountCents: 150_000,
    currency: "EGP",
    status,
    tokenHash: sha256Hex(crypto.randomUUID()),
    paymentId: status === "paid" ? "TX-1" : null,
    createdAt: NOW,
    paidAt: status === "paid" ? NOW : null,
    paymentProvider: "kashier",
    providerRef: "sess",
  };
  await state.store.createPlanPayment(payment);
  return payment;
}

async function shop(clientId: string): Promise<App> {
  const app: App = { ...newApp(clientId, null, NOW, "store"), backend: "hosted", appName: "Harbour Books", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "TRY" } };
  await state.store.createApp(app);
  return app;
}

async function order(app: App, paid: boolean): Promise<CatalogOrder> {
  const created = await state.store.createCatalogOrder({
    appId: app.id,
    tokenHash: sha256Hex(crypto.randomUUID()),
    userId: null,
    status: "pending",
    lines: [{ productId: 1, name: "Atlas", quantity: 1, unitCents: 45_000, imageAssetId: null, digital: false }],
    subtotalCents: 45_000,
    shippingCents: 0,
    totalCents: 45_000,
    currency: "TRY",
    customer: { name: "Mona Hassan", phone: "+201001234567", email: "mona@example.com", city: "Cairo", address: "12 Tahrir St" },
    paymentId: null,
    createdAt: NOW,
    paidAt: null,
    updatedAt: NOW,
    commissionCents: null,
    itemTransactionIds: null,
    payoutApprovedAt: null,
    paymentProvider: "iyzico",
    providerRef: "tok",
  });
  if (paid) await state.store.payCatalogOrder(app.id, created.id, "PAY-9", NOW);
  return (await state.store.getCatalogOrder(app.id, created.id))!;
}

async function donation(app: App, paid: boolean): Promise<Donation> {
  const created = await state.store.createDonation({
    appId: app.id,
    campaignId: null,
    campaignTitle: "Winter food parcels",
    tokenHash: sha256Hex(crypto.randomUUID()),
    receiptCode: `r${crypto.randomUUID().replace(/-/g, "")}`,
    userId: null,
    amountCents: 25_000,
    currency: "TRY",
    recurring: "none",
    anonymous: false,
    message: null,
    donorName: "Mona Hassan",
    donorEmail: "mona@example.com",
    donorPhone: null,
    status: "pending",
    paymentId: null,
    createdAt: NOW,
    paidAt: null,
    updatedAt: NOW,
    paymentProvider: "iyzico",
    providerRef: "tok",
  });
  if (paid) await state.store.payDonation(app.id, created.id, "PAY-D", NOW);
  return (await state.store.getDonation(app.id, created.id))!;
}

async function expectPdf(response: Response, contains: string[]) {
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/pdf");
  expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="receipt-[A-Za-z0-9-]+\.pdf"$/);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe("%PDF-");
  const text = await pdfAllText(bytes);
  for (const part of contains) expect(text).toContain(part);
}

let mailDir = "";

beforeAll(async () => {
  mailDir = await mkdtemp(path.join(tmpdir(), "yallapp-receipts-mail-"));
  process.env.YALLAPP_MAIL_DIR = mailDir;
});

afterAll(async () => {
  delete process.env.YALLAPP_MAIL_DIR;
  await rm(mailDir, { recursive: true, force: true });
});

beforeEach(() => {
  state.store = new MemoryStore();
  state.context = null;
  state.user = null;
  state.role = null;
  clearPlatformSettingsCache();
});

describe("71 the dashboard's receipt PDF", () => {
  it("gives the account's own paid payment, and another account's is not found", async () => {
    const a = await account("ada@academy.test");
    const b = await account("bob@school.test");
    const own = await planPayment(a.client.id, "paid");
    const theirs = await planPayment(b.client.id, "paid");
    const pending = await planPayment(a.client.id, "pending");
    state.context = contextOf(a.user, a.client);
    await expectPdf(await dashboardPdf(request(), params({ id: own.id })), ["YA-", "Ada Lovelace", "ada@academy.test", "Kashier", "TX-1"]);
    expect((await dashboardPdf(request(), params({ id: theirs.id }))).status).toBe(404);
    expect((await dashboardPdf(request(), params({ id: pending.id }))).status).toBe(404);
    expect((await dashboardPdf(request(), params({ id: "not-a-payment" }))).status).toBe(404);
  });

  it("is for whoever may see billing: not a team member, not before signing in", async () => {
    const a = await account("ada@academy.test");
    const own = await planPayment(a.client.id, "paid");
    state.context = contextOf(a.user, a.client, { member: a.user, access: { role: "manager", areas: [], appIds: null } });
    expect((await dashboardPdf(request(), params({ id: own.id }))).status).toBe(403);
    state.context = null;
    const signedOut = await dashboardPdf(request(), params({ id: own.id }));
    expect(signedOut.status).toBe(303);
    expect(signedOut.headers.get("location")).toMatch(/\/sign-in$/);
    // A pending account goes to its waiting page.
    state.context = contextOf(a.user, { ...a.client, status: "pending" });
    expect((await dashboardPdf(request(), params({ id: own.id }))).status).toBe(303);
  });

  it("only shows the receipts of the apps the person works on", async () => {
    const a = await account("ada@academy.test");
    const app = await shop(a.client.id);
    const other = await shop(a.client.id);
    const payment = await planPayment(a.client.id, "paid", other.id);
    state.context = contextOf(a.user, a.client, { apps: [app], app });
    expect((await dashboardPdf(request(), params({ id: payment.id }))).status).toBe(404);
    state.context = contextOf(a.user, a.client, { apps: [app, other], app });
    await expectPdf(await dashboardPdf(request(), params({ id: payment.id })), ["Harbour Books"]);
  });

  it("is in the dashboard's language", async () => {
    const a = await account("ada@academy.test");
    await state.store.updateUser(a.user.id, { language: "tr" }, NOW);
    const own = await planPayment(a.client.id, "paid");
    state.user = { ...a.user, language: "tr" };
    state.context = contextOf(state.user, a.client);
    await expectPdf(await dashboardPdf(request(), params({ id: own.id })), ["Makbuz", "Ödendi"]);
  });
});

describe("71 the admin's receipt PDFs", () => {
  it("are for our team only, in the client's language", async () => {
    const a = await account("ada@academy.test");
    await state.store.updateUser(a.user.id, { language: "ar" }, NOW);
    const payment = await planPayment(a.client.id, "paid");
    state.user = { ...a.user, email: "viewer@yallapp.test" };
    state.role = "viewer";
    const response = await adminPdf(request(), params({ id: payment.id }));
    expect(response.status).toBe(200);
    expect(squash(await pdfAllText(new Uint8Array(await response.arrayBuffer())))).toContain("إيصال");
    expect((await adminPdf(request(), params({ id: "nope" }))).status).toBe(404);
    state.role = null;
    expect((await adminPdf(request(), params({ id: payment.id }))).status).toBe(404);
    state.user = null;
    expect((await adminPdf(request(), params({ id: payment.id }))).status).toBe(303);
  });

  it("give a shop's sale as the customer's receipt", async () => {
    const a = await account("ada@academy.test");
    const app = await shop(a.client.id);
    const paid = await order(app, true);
    state.user = { ...a.user, email: "admin@yallapp.test" };
    state.role = "support";
    await expectPdf(await adminOrderPdf(request(), params({ appId: app.id, orderId: String(paid.id) })), ["Harbour Books", "Mona Hassan", "Atlas"]);
    expect((await adminOrderPdf(request(), params({ appId: app.id, orderId: "abc" }))).status).toBe(404);
    expect((await adminOrderPdf(request(), params({ appId: crypto.randomUUID(), orderId: String(paid.id) }))).status).toBe(404);
  });
});

const squash = (text: string) => text.replace(/\s+/g, "");

describe("71 the customers' receipt links", () => {
  it("give an order's receipt only from a link we signed, and only once it is paid", async () => {
    const a = await account("ada@academy.test");
    const app = await shop(a.client.id);
    const other = await shop(a.client.id);
    const paid = await order(app, true);
    const unpaid = await order(app, false);
    const code = orderReceiptCode(app.id, paid.id, signingSecret());
    await expectPdf(await orderPdf(request(), params({ code })), ["Harbour Books", "Order 1", "Atlas", "PAY-9"]);
    // Another order, another app, a changed or foreign signature: not found.
    const [, , sig] = code.split(".");
    expect((await orderPdf(request(), params({ code: `${app.id}.${unpaid.id}.${sig}` }))).status).toBe(404);
    expect((await orderPdf(request(), params({ code: `${other.id}.${paid.id}.${sig}` }))).status).toBe(404);
    expect((await orderPdf(request(), params({ code: `${app.id}.${paid.id}.${"A".repeat(43)}` }))).status).toBe(404);
    expect((await orderPdf(request(), params({ code: orderReceiptCode(app.id, paid.id, "another-secret-0123456789abcdef0123") }))).status).toBe(404);
    expect((await orderPdf(request(), params({ code: orderReceiptCode(app.id, unpaid.id, signingSecret()) }))).status).toBe(404);
    expect((await orderPdf(request(), params({ code: "../../etc" }))).status).toBe(404);
  });

  it("give a donation's receipt from its code, in the language asked for when the app has it", async () => {
    const a = await account("ada@academy.test");
    const app = await shop(a.client.id);
    const paid = await donation(app, true);
    const pending = await donation(app, false);
    await expectPdf(await donationPdf(request(), params({ code: paid.receiptCode })), ["Donation receipt", "D-1", "Mona Hassan"]);
    // The language asked for (`lang`, else the browser's), when it is English, Arabic or Turkish.
    const ar = await donationPdf(request("http://localhost/x?lang=ar"), params({ code: paid.receiptCode }));
    expect(squash(await pdfAllText(new Uint8Array(await ar.arrayBuffer())))).toContain("إيصالتبرع");
    await expectPdf(await donationPdf(request("http://localhost/x", { "accept-language": "tr-TR,tr;q=0.9,en;q=0.8" }), params({ code: paid.receiptCode })), ["Bağış makbuzu"]);
    await expectPdf(await donationPdf(request("http://localhost/x?lang=fr"), params({ code: paid.receiptCode })), ["Donation receipt"]);
    expect((await donationPdf(request(), params({ code: pending.receiptCode }))).status).toBe(404);
    expect((await donationPdf(request(), params({ code: "x".repeat(32) }))).status).toBe(404);
    expect((await donationPdf(request(), params({ code: "short" }))).status).toBe(404);
  });
});

async function mails(): Promise<{ to: string; subject: string; text: string; attachments?: { filename: string; contentType: string; size: number; base64: string }[] }[]> {
  const files = (await readdir(mailDir)).sort();
  return Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(mailDir, f), "utf8"))));
}

describe("71 payment emails carry the receipt", () => {
  beforeEach(async () => {
    await rm(mailDir, { recursive: true, force: true });
  });

  it("attaches the order's receipt to the customer's email, with its link", async () => {
    const a = await account("ada@academy.test");
    const app = await shop(a.client.id);
    const paid = await order(app, true);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    await sendOrderReceipt(state.store, app, paid);
    const [mail] = await mails();
    expect(mail!.to).toBe("mona@example.com");
    expect(mail!.subject).toBe(`Your receipt from Harbour Books · order ${1000 + paid.id}`);
    expect(mail!.text).toContain(`/receipts/orders/${orderReceiptCode(app.id, paid.id, signingSecret())}`);
    expect(mail!.text).toContain("Atlas × 1: ₺450.00");
    expect(mail!.attachments).toHaveLength(1);
    const file = mail!.attachments![0]!;
    expect(file).toMatchObject({ filename: `receipt-${1000 + paid.id}.pdf`, contentType: "application/pdf" });
    const pdf = Buffer.from(file.base64, "base64");
    expect(pdf.length).toBe(file.size);
    expect(await pdfAllText(pdf)).toContain("Mona Hassan");
  });

  it("sends the email without the PDF when the PDF can't be made, and says why in the log", async () => {
    const a = await account("ada@academy.test");
    const app = await shop(a.client.id);
    const paid = await order(app, true);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(renderReceiptPdf).mockRejectedValueOnce(new Error("font missing"));
    await sendOrderReceipt(state.store, app, paid);
    const [mail] = await mails();
    expect(mail!.to).toBe("mona@example.com");
    expect(mail!.attachments).toBeUndefined();
    expect(errors.mock.calls.flat().join(" ")).toContain("the receipt PDF couldn't be made; the email goes without it: font missing");
    expect(await receiptAttachment(async () => null)).toEqual([]);
  });

  it("attaches the plan's receipt to the activation email, in the client's language", async () => {
    const a = await account("ada@academy.test");
    await state.store.updateUser(a.user.id, { language: "ar" }, NOW);
    const payment = await planPayment(a.client.id, "paid");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    await sendPlanPaidMail(state.store, a.client, {
      kind: "paid",
      payment,
      activeUntil: new Date("2027-10-21T00:00:00Z"),
      activation: { created: true, licenseKey: "YA-KEY", app: null } as never,
      change: {} as never,
    });
    const [mail] = await mails();
    expect(mail!.to).toBe("ada@academy.test");
    expect(mail!.attachments?.[0]).toMatchObject({ contentType: "application/pdf" });
    expect(squash(await pdfAllText(Buffer.from(mail!.attachments![0]!.base64, "base64")))).toContain("إيصال");
    expect(await planReceiptPdf(state.store, { ...payment, status: "pending" })).toBeNull();
  });
});
