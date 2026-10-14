import { describe, expect, it } from "vitest";
import { appsByType, appsByWebsite, buildStats, clientsByState, hostedUsage, revenue, revenueWindowStart, signUpsSince } from "@/lib/admin/overview";
import { MemoryStore } from "@/lib/data/memory";
import type { App, Build, CatalogOrder, Client, License, PlanPayment } from "@/lib/data/types";
import { days, NOW, setupClient } from "./helpers";

const client = (status: Client["status"], createdAt: Date) => ({ status, createdAt }) as Client;
const license = (expiresAt: Date) => ({ expiresAt }) as License;

describe("admin overview numbers", () => {
  it("counts clients by state and new sign-ups", () => {
    const rows = [
      { client: client("pending", days(-1)), license: null },
      { client: client("pending", days(-20)), license: null },
      { client: client("active", days(-3)), license: license(days(30)) },
      { client: client("active", days(-100)), license: license(days(-1)) },
      { client: client("active", days(-200)), license: null },
      { client: client("suspended", days(-6)), license: license(days(30)) },
    ];
    expect(clientsByState(rows, NOW)).toEqual({ pending: 2, active: 1, expired: 2, suspended: 1 });
    expect(signUpsSince(rows, NOW, 7)).toBe(3);
    expect(signUpsSince(rows, NOW, 30)).toBe(4);
  });

  it("adds up plan payments and commission per currency and month", () => {
    const pay = (amountCents: number, currency: PlanPayment["currency"], paidAt: Date | null, status: PlanPayment["status"] = "paid") =>
      ({ amountCents, currency, paidAt, status }) as PlanPayment;
    const order = (commissionCents: number | null, currency: CatalogOrder["currency"], paidAt: Date, status: CatalogOrder["status"] = "completed") =>
      ({ commissionCents, currency, paidAt, status }) as CatalogOrder;
    const result = revenue(
      [
        pay(480_000, "TRY", new Date("2026-10-02T09:00:00Z")),
        pay(100_000, "TRY", new Date("2026-09-30T23:59:00Z")),
        pay(9_900, "USD", new Date("2026-03-15T00:00:00Z")),
        pay(5_000, "TRY", null, "pending"),
        pay(7_000, "TRY", new Date("2026-10-03T00:00:00Z"), "failed"),
        // Older than the 12 months.
        pay(1_000, "TRY", new Date("2025-10-31T00:00:00Z")),
      ],
      [
        order(1_200, "TRY", new Date("2026-10-05T00:00:00Z")),
        order(800, "TRY", new Date("2026-10-06T00:00:00Z"), "refunded"),
        order(null, "TRY", new Date("2026-10-06T00:00:00Z")),
        order(300, "EUR", new Date("2025-11-01T00:00:00Z")),
      ],
      NOW,
    );
    expect(revenueWindowStart(NOW).toISOString()).toBe("2025-11-01T00:00:00.000Z");
    expect(result.months).toHaveLength(12);
    expect(result.months[0]!.month).toBe("2025-11");
    expect(result.months[11]!.month).toBe("2026-10");
    expect(result.currencies).toEqual(["TRY", "USD", "EUR"]);
    expect(result.thisMonth).toEqual({ TRY: { plans: 480_000, commission: 1_200 } });
    expect(result.months.find((m) => m.month === "2026-09")!.byCurrency).toEqual({ TRY: { plans: 100_000, commission: 0 } });
    expect(result.last12Months).toEqual({
      TRY: { plans: 580_000, commission: 1_200 },
      USD: { plans: 9_900, commission: 0 },
      EUR: { plans: 0, commission: 300 },
    });
  });

  it("counts the last week's builds and their success rate", () => {
    const build = (status: Build["status"], createdAt: Date) => ({ status, createdAt }) as Build;
    const stats = buildStats(
      [
        build("queued", days(-0.1)),
        build("building", days(-1)),
        build("failed", days(-2)),
        build("ready", days(-3)),
        build("ready", days(-6.9)),
        build("failed", days(-8)),
      ],
      NOW,
    );
    expect(stats).toEqual({ total: 5, queued: 1, running: 1, ready: 2, failed: 1, successRate: 66.7 });
    expect(buildStats([], NOW).successRate).toBeNull();
  });

  it("groups apps by type and by website or platform, and counts hosted app users", () => {
    const app = (id: string, appType: App["appType"], backend: App["backend"], connector: App["connector"] = null) =>
      ({ id, appType, backend, connector }) as App;
    const apps = [
      app("a", "lms", "wordpress"),
      app("b", "lms", "hosted", { kind: "courses" }),
      app("c", "store", "hosted", { kind: "platform", platform: "ikas", settings: {}, secretsEncrypted: "" }),
      app("d", "store", "hosted", { kind: "platform", platform: "ikas", settings: {}, secretsEncrypted: "" }),
      app("e", "booking", "custom_api"),
    ];
    expect(appsByType(apps)).toEqual([
      { key: "lms", count: 2 },
      { key: "store", count: 2 },
      { key: "booking", count: 1 },
    ]);
    expect(appsByWebsite(apps)).toEqual([
      { key: "ikas", count: 2 },
      { key: "courses", count: 1 },
      { key: "custom_api", count: 1 },
      { key: "wordpress", count: 1 },
    ]);
    expect(hostedUsage(apps, { b: 4, c: 10, a: 99 })).toEqual({ apps: 3, users: 14 });
  });

  it("matches the data the store returns", async () => {
    const { store, client: c } = await setupClient({ plan: "pro" });
    const pending = await store.createUser({ email: "pending@academy.test", name: "Pending", passwordHash: null, now: days(-2) });
    await store.createClient({ userId: pending.id, whatsapp: "+905440000000", siteUrl: "https://p.test", now: days(-2) });
    const rows = await store.listClients({ filter: "all", now: NOW });
    expect(clientsByState(rows, NOW)).toMatchObject({ active: 1, pending: 1 });
    expect(rows.find((r) => r.client.id === c.id)).toBeTruthy();

    await store.createPlanPayment({
      id: "p1",
      clientId: c.id,
      appId: null,
      plan: "pro",
      months: 12,
      amountCents: 480_000,
      currency: "TRY",
      status: "pending",
      tokenHash: "t1",
      paymentId: null,
      createdAt: days(-1),
      paidAt: null,
    });
    await store.payPlanPayment("p1", "iyz-1", days(-1));
    const paid = await store.listPaidPlanPaymentsSince(revenueWindowStart(NOW));
    expect(revenue(paid, await store.listMarketplaceOrdersSince(revenueWindowStart(NOW)), NOW).thisMonth).toEqual({
      TRY: { plans: 480_000, commission: 0 },
    });
    expect(await new MemoryStore().countHostedUsersByApp()).toEqual({});
  });
});
