import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { PendingPayment } from "@/lib/data/types";

/**
 * 80.3 Payments still pending, the same on the memory store and on MySQL or
 * MariaDB (migration 0059): started in the window, with a provider
 * reference, not asked about lately; oldest first; noted when asked.
 */

// Far in the past, so other tests' payments (started at their own times) stay out of the window.
const T0 = new Date("2004-03-01T09:00:00.000Z");
const MIN = 60_000;
const at = (m: number) => new Date(T0.getTime() + m * MIN);

export function pendingPaymentsStoreSuite(store: () => DataStore) {
  it("80.3 lists the pending payments due a check with their provider, and notes each check", async () => {
    const s = store();
    const { client } = await registerClient(s, { name: "Pat", email: `pat-${randomUUID()}@pending.test`, whatsapp: "+905446731945", siteUrl: "", password: null }, T0);
    const app = newApp(client.id, null, T0);
    await s.createApp(app);
    const order = (m: number, patch: { status?: "pending" | "processing"; providerRef?: string | null } = {}) =>
      s.createCatalogOrder({
        appId: app.id,
        tokenHash: randomUUID().replace(/-/g, ""),
        userId: null,
        status: patch.status ?? "pending",
        lines: [],
        subtotalCents: 500,
        shippingCents: 0,
        totalCents: 500,
        currency: "TRY",
        customer: null,
        paymentId: null,
        createdAt: at(m),
        paidAt: null,
        updatedAt: at(m),
        commissionCents: null,
        itemTransactionIds: null,
        payoutApprovedAt: null,
        paymentProvider: "kashier",
        providerRef: patch.providerRef === undefined ? `sess-${m}` : patch.providerRef,
      });
    const due = await order(10);
    await order(5, { status: "processing" });
    await order(6, { providerRef: null });
    const plan = { id: randomUUID(), clientId: client.id, appId: app.id, plan: "growth" as const, months: 1 as const, amountCents: 900, currency: "TRY" as const, status: "pending" as const, tokenHash: randomUUID().replace(/-/g, ""), paymentId: null, createdAt: at(2), paidAt: null, paymentProvider: "iyzico" as const, providerRef: "iyz-token" };
    await s.createPlanPayment(plan);

    const window = { startedAfter: at(0), startedBefore: at(60), checkedBefore: at(60), limit: 500 };
    // A database kept between runs may hold earlier runs' payments in the same window: only this account's count.
    const mine = (p: PendingPayment) => (p.kind === "plan" ? p.record.clientId === client.id : p.record.appId === app.id);
    const list = async (q: typeof window) => (await s.listPendingPayments(q)).filter(mine);
    const listed = await list(window);
    expect(listed.map((p) => [p.kind, p.record.id])).toEqual([
      ["plan", plan.id],
      ["order", due.id],
    ]);
    expect(listed[1]!.record).toMatchObject({ providerRef: "sess-10", paymentProvider: "kashier" });

    // Asked at minute 30: not due again before minute 30 is "checked before".
    await s.markPaymentChecked("order", due.id, at(30));
    await s.markPaymentChecked("plan", plan.id, at(30));
    expect(await list({ ...window, checkedBefore: at(29) })).toEqual([]);
    expect((await list({ ...window, checkedBefore: at(30) })).map((p) => p.kind)).toEqual(["plan", "order"]);
    // Started outside the window.
    expect(await list({ ...window, startedAfter: at(11) })).toEqual([]);
    expect((await s.getCatalogOrder(app.id, due.id))?.providerCheckedAt).toEqual(at(30));
  });
}
