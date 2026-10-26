import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { recordBankTransfer } from "@/lib/billing/bank-transfer";
import { paidWith, planReceiptRows } from "@/lib/billing/receipt";
import { DEFAULT_CONTACT } from "@/lib/contact";
import type { App, PlanPayment } from "@/lib/data/types";
import { planReceipt } from "@/lib/receipts/build";
import { days, KEY, NOW, setupClient } from "./helpers";

/** 95.2 A client paid an app's plan into Yallapp's bank account: the team records it as a paid invoice that activates or extends the plan. */

function app(clientId: string, name: string, createdAt: Date): App {
  return { ...newApp(clientId, null, createdAt, "lms"), appName: name };
}

async function twoApps() {
  const setup = await setupClient({ plan: "pro", activeUntil: days(60) });
  const first = app(setup.client.id, "Ada Academy", NOW);
  await setup.store.createApp(first);
  const second = app(setup.client.id, "Ada Shop", days(1));
  await setup.store.createApp(second);
  return { ...setup, first, second };
}

const transfer = { plan: "growth" as const, months: 12 as const, amountCents: 1_500_000, currency: "EGP" as const, reference: "  FT2610261234  ", recordedBy: "team@yallapp.test" };

describe("a bank transfer the team records", () => {
  it("is a paid invoice that activates an app not activated yet, for the period it pays", async () => {
    const { store, client, first, second } = await twoApps();
    const outcome = await recordBankTransfer(store, { ...transfer, client, app: second }, KEY, NOW);
    expect(outcome.payment).toMatchObject({
      clientId: client.id,
      appId: second.id,
      status: "paid",
      method: "bank_transfer",
      bankReference: "FT2610261234",
      recordedBy: "team@yallapp.test",
      amountCents: 1_500_000,
      currency: "EGP",
      paidAt: NOW,
    });
    expect(outcome.activation.created).toBe(true);
    const license = await store.getLicenseForApp(client.id, second.id);
    expect(license?.plan).toBe("growth");
    expect(license?.expiresAt?.getTime()).toBe(outcome.activeUntil.getTime());
    expect(outcome.activeUntil.getTime()).toBeGreaterThan(days(360).getTime());
    // The other app keeps its own plan.
    expect((await store.getLicenseForApp(client.id, first.id))?.plan).toBe("pro");
    // It is among the invoices: the paid payments.
    const invoices = await store.listPlanPayments({ status: "paid", limit: 10 });
    expect(invoices.map((p) => p.id)).toContain(outcome.payment.id);
    expect((await store.listPlanPayments({ status: "pending", limit: 10 })).map((p) => p.id)).not.toContain(outcome.payment.id);
  });

  it("extends a running plan from its end, like a card payment", async () => {
    const { store, client, first } = await twoApps();
    const before = await store.getLicenseForApp(client.id, first.id);
    const outcome = await recordBankTransfer(store, { ...transfer, plan: "pro", client, app: first }, KEY, NOW);
    expect(outcome.activation.created).toBe(false);
    expect(outcome.change.kind).toBe("renew");
    expect(outcome.activeUntil.getTime()).toBeGreaterThan(before!.expiresAt!.getTime());
  });

  it("before the account's first app, activates the account for the app they make first", async () => {
    const { store, client } = await setupClient({ activate: false });
    const outcome = await recordBankTransfer(store, { ...transfer, client, app: null }, KEY, NOW);
    expect(outcome.payment.appId).toBeNull();
    expect(outcome.activation.created).toBe(true);
    expect((await store.getLicenseForApp(client.id, null))?.plan).toBe("growth");
    expect((await store.getClientById(client.id))?.status).toBe("active");
  });

  it("needs an amount", async () => {
    const { store, client, second } = await twoApps();
    await expect(recordBankTransfer(store, { ...transfer, amountCents: 0, client, app: second }, KEY, NOW)).rejects.toThrow();
  });
});

describe("what the invoice says", () => {
  const payment: PlanPayment = {
    id: "1a2b3c4d-0000-4000-8000-000000000000",
    clientId: "c",
    appId: "a",
    plan: "growth",
    months: 12,
    amountCents: 1_500_000,
    currency: "EGP",
    status: "paid",
    tokenHash: "x",
    paymentId: null,
    createdAt: NOW,
    paidAt: NOW,
    method: "bank_transfer",
    bankReference: "FT2610261234",
    recordedBy: "team@yallapp.test",
  };

  it("says how it was paid: a transfer with its reference, a card or a coupon", () => {
    expect(paidWith(payment)).toBe("Bank transfer to Yallapp (reference FT2610261234)");
    expect(paidWith({ ...payment, bankReference: null })).toBe("Bank transfer to Yallapp");
    expect(paidWith({ ...payment, method: null, paymentProvider: "kashier", paymentId: "TX-1" })).toBe("Card, through Kashier (reference TX-1)");
    expect(paidWith({ ...payment, method: null, amountCents: 0 })).toBe("The coupon covered the whole price: no card payment.");
    const rows = planReceiptRows({ payment, planName: "Growth", appName: "Ada Shop", billedTo: { name: "Ada", email: "ada@academy.test" }, paidOn: "26 Oct 2026" });
    expect(rows).toContainEqual(["Paid with", "Bank transfer to Yallapp (reference FT2610261234)"]);
  });

  it("names the transfer and its reference on the PDF, in the client's language", () => {
    const doc = (lang: "en" | "ar" | "tr") =>
      planReceipt({ lang, payment, planName: "Growth", appName: "Ada Shop", billedTo: { name: "Ada", email: "ada@academy.test" }, coupon: null, zone: "Africa/Cairo", contact: DEFAULT_CONTACT, invoiceLines: [] });
    const plain = (rows: [string, string][]) => rows.map(([label, value]) => [label, value.replace(/[⁦-⁩]/g, "")]);
    expect(plain(doc("en").payment.rows)).toEqual([
      ["Paid with", "Bank transfer to Yallapp"],
      ["Reference", "FT2610261234"],
    ]);
    expect(plain(doc("ar").payment.rows)[0]).toEqual(["طريقة الدفع", "تحويل بنكي إلى Yallapp"]);
    expect(plain(doc("tr").payment.rows)[0]).toEqual(["Ödeme yöntemi", "Yallapp hesabına banka havalesi"]);
  });
});
