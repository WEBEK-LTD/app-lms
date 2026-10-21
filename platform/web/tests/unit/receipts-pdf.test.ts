import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bidiRuns, ltrSpan } from "@/lib/arabic-shape";
import { formatAmount } from "@/lib/billing/prices";
import { formatCents } from "@/lib/catalog/money";
import { DEFAULT_CONTACT } from "@/lib/contact";
import type { App, CatalogOrder, Donation, PlanPayment } from "@/lib/data/types";
import { donationReceipt, orderReceipt, planReceipt, receiptDate, receiptFilename } from "@/lib/receipts/build";
import { parseInvoiceLines } from "@/lib/receipts/invoice-setting";
import { renderReceiptPdf } from "@/lib/receipts/pdf";
import { receiptWords } from "@/lib/receipts/words";
import { LANGS } from "@/i18n/config";
import { pdfAllText } from "./pdf-text";

/**
 * 71 Receipts as PDF: what each receipt says (plan and storage payments to
 * Yallapp, a business's orders and donations), in English, Arabic and
 * Turkish, read back from the PDF the way a reader extracts its text.
 */

/** RECEIPT_SAMPLES_DIR=<folder>: the samples are kept there, to look at (pdftoppm -png). */
async function keep(name: string, pdf: Buffer): Promise<void> {
  const dir = process.env.RECEIPT_SAMPLES_DIR;
  if (!dir) return;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), pdf);
}

/** Text without spaces: a reader puts spaces where glyphs stand apart, which differs between readers. */
const squash = (text: string) => text.normalize("NFKC").replace(/\s+/g, "");

const PAID_AT = new Date("2026-10-21T11:05:00Z");

const planPayment: PlanPayment = {
  id: "0f8e2c1a-1111-4222-8333-944455556666",
  clientId: "c1",
  appId: "a1",
  plan: "growth",
  months: 12,
  amountCents: 162_000,
  currency: "EGP",
  status: "paid",
  tokenHash: "x",
  paymentId: "TX-998877",
  createdAt: PAID_AT,
  paidAt: PAID_AT,
  paymentProvider: "kashier",
  providerRef: "sess1",
  shownCents: 3_300,
  shownCurrency: "USD",
  purpose: "plan",
  storagePacks: [{ offer: "s25", gb: 25, cents: 30_000, packId: null }],
};

function plan(lang: (typeof LANGS)[number], invoiceLines: string[] = []) {
  return planReceipt({
    lang,
    payment: planPayment,
    planName: "Growth",
    appName: lang === "ar" ? "أكاديمية النور" : "Ada Academy",
    billedTo: lang === "ar" ? { name: "أحمد المصري", email: "ahmed@example.com" } : { name: "Ada Lovelace", email: "ada@academy.test" },
    coupon: { code: "WELCOME10", discountCents: 18_000, currency: "EGP" },
    zone: "Africa/Cairo",
    contact: DEFAULT_CONTACT,
    invoiceLines,
  });
}

const shopApp = {
  appName: "مطعم الشام",
  supportEmail: "hello@alsham.test",
  hostedSettings: { supportWhatsapp: "+20 100 123 4567" },
  primaryColor: "#1F6F5C",
  demo: false,
} as unknown as Pick<App, "appName" | "supportEmail" | "hostedSettings" | "primaryColor" | "demo">;

const order: CatalogOrder = {
  id: 42,
  appId: "a2",
  tokenHash: "t",
  userId: 7,
  status: "processing",
  lines: [
    { productId: 1, name: "شاورما دجاج", quantity: 2, unitCents: 12_500, imageAssetId: null, digital: false, options: [{ group: "الحجم", name: "كبير", priceDeltaCents: 2_500 }] },
    { productId: 2, name: "Ayran", quantity: 1, unitCents: 4_000, imageAssetId: null, digital: false },
  ],
  subtotalCents: 29_000,
  shippingCents: 3_000,
  totalCents: 32_000,
  currency: "TRY",
  customer: { name: "Elif Yılmaz", phone: "+905321234567", email: "elif@example.com", city: "İstanbul", address: "Bağdat Caddesi 1" },
  paymentId: "PAY-1",
  createdAt: PAID_AT,
  paidAt: PAID_AT,
  updatedAt: PAID_AT,
  commissionCents: 1_600,
  itemTransactionIds: null,
  payoutApprovedAt: null,
  fulfilment: { type: "delivery", scheduledFor: null, address: { address: "Bağdat Caddesi 1", district: "Kadıköy", notes: null } },
  fulfilmentStatus: "received",
  paymentProvider: "iyzico",
  providerRef: "tok",
  refundedCents: 4_000,
};

const donation: Donation = {
  id: 42,
  appId: "a3",
  campaignId: 1,
  campaignTitle: "Winter food parcels",
  tokenHash: "t",
  receiptCode: "r".repeat(32),
  userId: null,
  amountCents: 25_000,
  currency: "EGP",
  recurring: "monthly",
  anonymous: false,
  message: null,
  donorName: "Mona Hassan",
  donorEmail: "mona@example.com",
  donorPhone: null,
  status: "paid",
  paymentId: "TX-5",
  createdAt: PAID_AT,
  paidAt: PAID_AT,
  updatedAt: PAID_AT,
  paymentProvider: "fawaterk",
  providerRef: "5001",
};

describe("71 the bidirectional runs of a line", () => {
  it("keeps a left-to-right line as it is", () => {
    expect(bidiRuns("Receipt 1042", "ltr")).toEqual([{ text: "Receipt 1042", rtl: false }]);
  });

  it("puts an Arabic line's words right to left, Latin words and numbers reading left to right", () => {
    // Drawn left to right: "Growth", then the Arabic word at the right.
    expect(bidiRuns("باقة Growth", "rtl")).toEqual([
      { text: "Growth", rtl: false },
      { text: "باقة ", rtl: true },
    ]);
    expect(bidiRuns("المبلغ 1,500 جنيه", "rtl")).toEqual([
      { text: " جنيه", rtl: true },
      { text: "1,500", rtl: false },
      { text: "المبلغ ", rtl: true },
    ]);
  });

  it("keeps Arabic words together inside an English line", () => {
    expect(bidiRuns("2 × شاورما دجاج", "ltr")).toEqual([
      { text: "2 × ", rtl: false },
      { text: "شاورما دجاج", rtl: true },
    ]);
  });

  it("reads a marked span (a phone number) left to right as one piece", () => {
    expect(bidiRuns(`واتساب ${ltrSpan("+90 544 673 19 42")}`, "rtl")).toEqual([
      { text: "+90 544 673 19 42", rtl: false },
      { text: "واتساب ", rtl: true },
    ]);
    // Without the mark, the numbers would go right to left, one group after another.
    expect(bidiRuns("واتساب +90 544", "rtl").map((r) => r.text)).not.toContain("+90 544");
  });
});

describe("71 receipts as PDF", () => {
  it("has every word in English, Arabic and Turkish", () => {
    const keys = Object.keys(receiptWords("en")).sort();
    for (const lang of LANGS) {
      expect(Object.keys(receiptWords(lang)).sort(), lang).toEqual(keys);
      for (const [key, text] of Object.entries(receiptWords(lang))) expect(text.trim(), `${lang} ${key}`).not.toBe("");
    }
    // Arabic in Arabic letters, Turkish with its own.
    expect(receiptWords("ar").paid).toBe("مدفوع");
    expect(receiptWords("tr").paid).toBe("Ödendi");
  });

  it("writes a plan payment in English: Yallapp, the client, the items, the coupon, the provider, the price shown", async () => {
    const pdf = await renderReceiptPdf(plan("en"));
    await keep("plan-en.pdf", pdf);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const text = squash(await pdfAllText(pdf));
    for (const part of [
      "Yallapp",
      "Cairo,Egypt",
      "info@yallapp.com.tr",
      "WhatsApp+905446731942",
      "Receipt",
      "No.YA-0F8E2C1A",
      "21October2026",
      "14:05",
      "(GMT+3)",
      "Paid",
      "Billedto",
      "AdaLovelace",
      "ada@academy.test",
      "AdaAcademy",
      "Growthplan",
      "1year",
      "Storage+25GB",
      "CouponWELCOME10",
      `−${formatAmount(18_000, "EGP")}`,
      "Total",
      "Card,throughKashier",
      "TX-998877",
      "Priceshown:about$33.",
    ]) {
      expect(text, part).toContain(squash(part));
    }
    // The amounts as everywhere else: "EGP 1,500", "EGP 300", "EGP 1,620".
    expect(formatAmount(150_000, "EGP").replace(/\s/g, " ")).toBe("EGP 1,500");
    for (const cents of [150_000, 30_000, 180_000, 162_000]) expect(text).toContain(squash(formatAmount(cents, "EGP")));
    // No tax lines and no registration details the team didn't give.
    expect(text).not.toMatch(/VAT|Tax|Registration/i);
  });

  it("writes it in Arabic, right to left, with the letters joined and readable as text", async () => {
    const pdf = await renderReceiptPdf(plan("ar"));
    await keep("plan-ar.pdf", pdf);
    const text = squash(await pdfAllText(pdf));
    for (const part of ["إيصال", "مدفوع", "إلى", "أحمد المصري", "أكاديمية النور", "التطبيق", "باقة", "سنة واحدة", "الإجمالي", "القسيمة", "بطاقة، عبر", "القاهرة، مصر", "حوالي", "أكتوبر"]) {
      expect(text, part).toContain(squash(part));
    }
    // Latin and numbers stay as they are inside the Arabic.
    for (const part of ["Growth", "Kashier", "TX-998877", "WELCOME10", "EGP1,620", "+25GB", "ahmed@example.com"]) expect(text, part).toContain(squash(part));
  });

  it("writes it in Turkish, with Turkish letters", async () => {
    const pdf = await renderReceiptPdf(plan("tr"));
    await keep("plan-tr.pdf", pdf);
    const text = squash(await pdfAllText(pdf));
    for (const part of ["Makbuz", "Ödendi", "Alıcı", "Growth paketi", "1 yıl", "Kupon WELCOME10", "Toplam", "Kart, Kashier üzerinden", "Kahire, Mısır", "Ekim"]) {
      expect(text, part).toContain(squash(part));
    }
  });

  it("shows the lines the team set for invoices, and nothing else", async () => {
    const lines = parseInvoiceLines("Yallapp Yazılım Ltd.\n\n  Tax no. 1234567890 \n");
    expect(lines).toEqual({ ok: true, lines: ["Yallapp Yazılım Ltd.", "Tax no. 1234567890"] });
    expect(parseInvoiceLines("a\nb\nc\nd\ne").ok).toBe(false);
    expect(parseInvoiceLines("x".repeat(121)).ok).toBe(false);
    const text = squash(await pdfAllText(await renderReceiptPdf(plan("en", ["Yallapp Yazılım Ltd.", "Tax no. 1234567890"]))));
    expect(text).toContain(squash("Yallapp Yazılım Ltd."));
    expect(text).toContain(squash("Tax no. 1234567890"));
  });

  it("writes a business's order: the business, the customer, the items in Arabic, delivery, the refund and Yallapp's account", async () => {
    const receipt = orderReceipt({ lang: "en", app: shopApp, order, zone: "Europe/Istanbul" });
    expect(receipt.status).toEqual({ label: "Partly refunded", tone: "partly" });
    const pdf = await renderReceiptPdf(receipt);
    await keep("order-en.pdf", pdf);
    const text = squash(await pdfAllText(pdf));
    for (const part of [
      "مطعم الشام",
      "hello@alsham.test",
      "WhatsApp +20 100 123 4567",
      "Order 1042",
      "21 October 2026",
      "14:05",
      "Customer",
      "Elif Yılmaz",
      "elif@example.com",
      "+905321234567",
      "شاورما دجاج",
      "كبير",
      "Ayran",
      "Delivery to Bağdat Caddesi 1, Kadıköy",
      "Delivery fee",
      "Subtotal",
      "Refunded",
      "Card, through iyzico",
      "PAY-1",
      "Paid into Yallapp's payment account",
    ]) {
      expect(text, part).toContain(squash(part));
    }
    // Lira as the shop's prices: "₺250.00" for two dishes, "₺320.00" in all, "₺40.00" refunded.
    expect(formatCents(25_000, "TRY")).toBe("₺250.00");
    for (const amount of ["₺250.00", "₺40.00", "₺290.00", "₺30.00", "₺320.00", "−₺40.00"]) expect(text, amount).toContain(squash(amount));
    expect(receiptFilename("1042")).toBe("receipt-1042.pdf");
  });

  it("writes an order in the app's Arabic, and a refunded one says so", async () => {
    const refunded = orderReceipt({ lang: "ar", app: shopApp, order: { ...order, status: "refunded", refundedCents: 32_000, commissionCents: null }, zone: "Asia/Riyadh" });
    expect(refunded.status).toEqual({ label: "مسترد", tone: "refunded" });
    const pdf = await renderReceiptPdf(refunded);
    await keep("order-ar.pdf", pdf);
    const text = squash(await pdfAllText(pdf));
    for (const part of ["مطعم الشام", "العميل", "شاورما دجاج", "رسوم التوصيل", "المبلغ المسترد", "مسترد", "بطاقة، عبر", "الطلب", "Elif Yılmaz", "₺320.00", "PAY-1"]) {
      expect(text, part).toContain(squash(part));
    }
    // 14:05 in Riyadh.
    expect(text).toContain("14:05");
    expect(text).not.toContain(squash("Yallapp's payment account"));
  });

  it("writes a donation in Turkish, and a demo app's receipt charges nothing", async () => {
    const receipt = donationReceipt({ lang: "tr", app: { ...shopApp, appName: "Harbour Food Bank" }, donation, zone: "Africa/Cairo" });
    const pdf = await renderReceiptPdf(receipt);
    await keep("donation-tr.pdf", pdf);
    const text = squash(await pdfAllText(pdf));
    for (const part of ["Bağış makbuzu", "No. D-1042", "Harbour Food Bank", "Bağışçı", "Mona Hassan", "Winter food parcels", "Aylık bağış", "Kart, Fawaterk üzerinden", "TX-5", "Ödendi", "21 Ekim 2026"]) {
      expect(text, part).toContain(squash(part));
    }
    expect(text).toContain(squash(formatCents(25_000, "EGP")));
    const demo = donationReceipt({ lang: "en", app: { ...shopApp, demo: true }, donation, zone: "Africa/Cairo" });
    expect(demo.status.tone).toBe("demo");
    expect(demo.payment.rows).toEqual([["Paid with", "Demo: nothing was charged"]]);
  });

  it("dates a receipt in the account's or app's time zone", () => {
    // Egypt keeps summer time until the end of October.
    expect(receiptDate("en", PAID_AT, "Africa/Cairo")).toBe(`21 October 2026 at 14:05 ${ltrSpan("(GMT+3)")}`);
    expect(receiptDate("ar", PAID_AT, "Africa/Cairo")).toBe(`21 أكتوبر 2026 في 14:05 ${ltrSpan("(GMT+3)")}`);
    expect(receiptDate("en", PAID_AT, "Asia/Tokyo")).toContain("20:05");
    expect(receiptDate("tr", PAID_AT, "Europe/Istanbul")).toContain("21 Ekim 2026");
  });

  it("lays a long order out over more than one page", async () => {
    const many = { ...order, lines: Array.from({ length: 40 }, (_, i) => ({ ...order.lines[1]!, productId: i, name: `Item ${i + 1}` })) };
    const pdf = await renderReceiptPdf(orderReceipt({ lang: "en", app: shopApp, order: many, zone: "Europe/Istanbul" }));
    const text = await pdfAllText(pdf);
    expect(text).toContain("Item 1 ");
    expect(text).toContain("Item 40");
    expect(text).toContain("Thank you. Keep this receipt for your records.");
  });
});
