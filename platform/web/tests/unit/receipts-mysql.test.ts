import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import { sha256Hex } from "@/lib/crypto/tokens";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { PlanPayment } from "@/lib/data/types";
import { planReceiptPdf } from "@/lib/receipts/service";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { pdfAllText } from "./pdf-text";

/**
 * 71 Receipts on MySQL: a plan payment found by its ID (the admin's
 * download), only within the account when one is given (the dashboard's),
 * and the team's lines for invoices kept as a platform setting.
 * Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-10-21T09:00:00.000Z");

describe.skipIf(!url)("71 receipts on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await store.setPlatformSetting("invoice", null, "admin@yallapp.test", NOW);
    clearPlatformSettingsCache();
    await pool.end();
  });

  const payment = (clientId: string): PlanPayment => ({
    id: randomUUID(),
    clientId,
    appId: null,
    plan: "pro",
    months: 1,
    amountCents: 48_000,
    currency: "EGP",
    status: "paid",
    tokenHash: sha256Hex(randomUUID()),
    paymentId: "TX-71",
    createdAt: NOW,
    paidAt: NOW,
    paymentProvider: "fawaterk",
    providerRef: "5001",
  });

  it("finds a payment by its ID, within its account only", async () => {
    const a = await registerClient(store, { name: "Ada Lovelace", email: `ada-${randomUUID()}@mysql.test`, whatsapp: "+201001234567", siteUrl: "https://a.test", password: null }, NOW);
    const b = await registerClient(store, { name: "Bob Stone", email: `bob-${randomUUID()}@mysql.test`, whatsapp: "+905321234567", siteUrl: "https://b.test", password: null }, NOW);
    const mine = payment(a.client.id);
    const theirs = payment(b.client.id);
    await store.createPlanPayment(mine);
    await store.createPlanPayment(theirs);
    expect((await store.listPlanPayments({ id: mine.id, limit: 1 })).map((p) => p.id)).toEqual([mine.id]);
    expect(await store.listPlanPayments({ clientId: a.client.id, id: theirs.id, limit: 1 })).toEqual([]);
    expect((await store.listPlanPayments({ clientId: a.client.id, limit: 10 })).map((p) => p.id)).toEqual([mine.id]);
  });

  it("keeps the lines for invoices, and the receipt shows them", async () => {
    await store.setPlatformSetting("invoice", { lines: ["Yallapp Yazılım Ltd.", "Tax no. 1234567890"] }, "admin@yallapp.test", NOW);
    clearPlatformSettingsCache();
    expect((await store.listPlatformSettings()).find((s) => s.key === "invoice")?.value).toEqual({ lines: ["Yallapp Yazılım Ltd.", "Tax no. 1234567890"] });
    const a = await registerClient(store, { name: "Ada Lovelace", email: `ada-${randomUUID()}@mysql.test`, whatsapp: "+201001234567", siteUrl: "https://a.test", password: null }, NOW);
    const paid = payment(a.client.id);
    await store.createPlanPayment(paid);
    const receipt = await planReceiptPdf(store, paid, "tr");
    const text = await pdfAllText(receipt!.pdf);
    expect(text).toContain("Yallapp Yazılım Ltd.");
    expect(text).toContain("Fawaterk");
    expect(receipt!.filename).toMatch(/^receipt-YA-[0-9A-F]{8}\.pdf$/);
  });
});
