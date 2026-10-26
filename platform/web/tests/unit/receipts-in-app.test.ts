import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { sha256Hex } from "@/lib/crypto/tokens";
import { DEFAULT_CATALOG_SETTINGS, type App } from "@/lib/data/types";
import { myOrdersRoute } from "@/lib/hosted/connectors/catalog";
import { customerLang } from "@/lib/receipts/service";
import { NOW, setupClient } from "./helpers";

/** 96.3 Tickets, paid courses and memberships are the customer's orders in the app, with receipts; 96.4 in their language. */

describe("the customer's orders in apps that aren't shops", () => {
  it("lists a ticket order, paid or waiting for a bank transfer, never an unpaid card checkout", async () => {
    const { store } = await setupClient();
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const app: App = { ...newApp(client.id, null, NOW, "events"), backend: "hosted", appName: "Harbour Nights", connector: { kind: "events" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: null } };
    await store.createApp(app);
    const base = {
      appId: app.id,
      userId: 7,
      lines: [{ productId: 3, name: "Jazz night · Standard", quantity: 2, unitCents: 25000, imageAssetId: null, digital: true }],
      subtotalCents: 50000,
      shippingCents: 0,
      totalCents: 50000,
      currency: "TRY" as const,
      customer: null,
      paymentId: null,
      createdAt: NOW,
      updatedAt: NOW,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
      lang: "ar",
    };
    await store.createCatalogOrder({ ...base, tokenHash: sha256Hex("paid"), status: "processing", paymentId: "pi_1", paidAt: NOW });
    await store.createCatalogOrder({ ...base, tokenHash: sha256Hex("card"), status: "pending", paidAt: null });
    await store.createCatalogOrder({
      ...base,
      tokenHash: sha256Hex("bank"),
      status: "pending",
      paidAt: null,
      manualPayment: { method: "bank_transfer", name: "Bank transfer", instructions: "IBAN TR00", dueAt: NOW.toISOString() },
    });
    const deps = { store, app, assetUrl: (id: string) => `https://cdn.test/${id}`, platformUrl: "https://yallapp.test" };
    const request = { method: "GET", path: ["me", "orders"], query: new URLSearchParams(), body: null, user: { id: 7 } as never, now: NOW };
    const listed = await myOrdersRoute(deps, request)!;
    const items = (listed!.body as { items: { status: string; receipt_url?: unknown; pay_outside: unknown }[] }).items;
    expect(items.map((o) => o.status).sort()).toEqual(["pending", "processing"]);
    expect(items.find((o) => o.status === "pending")!.pay_outside).toMatchObject({ name: "Bank transfer" });
    expect(items.every((o) => "receipt_url" in o)).toBe(true);
    // Only these routes: anything else is the connector's own.
    expect(myOrdersRoute(deps, { ...request, path: ["me", "tickets"] })).toBeNull();
    expect(myOrdersRoute(deps, { ...request, method: "POST", path: ["me", "orders", "1", "return"] })).toBeNull();
  });

  it("makes the receipt in the language the customer checked out in, when the app has it", async () => {
    const { store } = await setupClient();
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const app = newApp(client.id, null, NOW, "store");
    await store.createApp(app);
    expect(await customerLang(store, app, "ar")).toBe("ar");
    expect(await customerLang(store, app, null)).toBe("en");
  });
});
