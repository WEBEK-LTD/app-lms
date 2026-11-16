import { beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { can } from "@/lib/admin/permissions";
import {
  givePrimeGift,
  primeGiftActive,
  readGiftForm,
  removePrimeGift,
} from "@/lib/admin/prime-gift";
import { runWeeklySummaries } from "@/lib/analytics/weekly";
import { registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { newApp } from "@/lib/app/setup";
import { sha256Hex } from "@/lib/crypto/tokens";
import { MemoryStore } from "@/lib/data/memory";
import {
  DEFAULT_CATALOG_SETTINGS,
  type App,
  type CatalogOrder,
  type CatalogProductInput,
  type Client,
  type User,
} from "@/lib/data/types";
import type { sendPush, ServiceAccount } from "@/lib/hosted/push";
import type { OwnerDeps } from "@/lib/owner/http";
import { runPrimeChecks } from "@/lib/owner/prime-jobs";
import { periodOf } from "@/lib/owner/prime-plus";
import { handleOwner } from "@/lib/owner/service";
import type { Plan } from "@/lib/plans";
import {
  checkDelivery,
  deliveryOf,
  deliverySlotsJson,
} from "@/lib/selling/delivery";
import { expectOwnerContract } from "./owner-contract";
import { KEY, NOW, days } from "./helpers";

/**
 * 132 Prime's second set and Prime as a gift: the gift given from Admin
 * (whatever the plan, with an end or until removed, audited, only with
 * `prime.gift`), the sales goal with Today's ring and its push once per
 * period, low stock as a smart alert, customer and product insights (names
 * only for those who may see orders), ratings and reviews, the weekly
 * report's switch and Prime's lines in it, and the quick actions (a coupon,
 * a flash sale, a delivery slot closed for a day, a restaurant's busy time),
 * each checked against docs/api/owner.yaml; a regular app has none of them.
 */

const SECRET = "test-signing-secret-0123456789abcdef0123456789";
const PASSWORD = "a-long-owner-password";
const ACCOUNT: ServiceAccount = {
  project_id: "yallapp-business",
  client_email: "push@yallapp-business.test",
  private_key: "-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----",
};

interface Pushed {
  targets: unknown[];
  title: string;
  body: string;
  data: Record<string, string>;
}

async function ownerOf(
  store: MemoryStore,
  email: string,
): Promise<{ user: User; client: Client }> {
  const { user, client } = await registerClient(
    store,
    {
      name: "Leyla Kaya",
      email,
      whatsapp: "+905446731942",
      siteUrl: "",
      password: null,
    },
    NOW,
  );
  await store.updateUser(
    user.id,
    { passwordHash: await hashPassword(PASSWORD) },
    NOW,
  );
  return {
    user: (await store.getUserById(user.id))!,
    client: (await store.getClientById(client.id))!,
  };
}

async function addApp(
  store: MemoryStore,
  client: Client,
  app: Partial<App> & Pick<App, "appType">,
  plan: Plan,
): Promise<App> {
  const full: App = {
    ...newApp(client.id, null, NOW, app.appType, app.vertical ?? null),
    backend: "hosted",
    websiteDoneAt: NOW,
    catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "EGP" },
    ...app,
  };
  await store.createApp(full);
  await activateClient(
    store,
    {
      clientId: client.id,
      appId: full.id,
      plan,
      activeUntil: days(30),
      paymentNote: "",
    },
    KEY,
    NOW,
  );
  return full;
}

describe("132 Prime as a gift and Prime's second set", () => {
  let store: MemoryStore;
  let user: User;
  let client: Client;
  let flowers: App;
  let regular: App;
  let food: App;
  let pushes: Pushed[];
  let now: Date;
  const send = (async (_a, targets, message) => {
    pushes.push({ targets, ...message });
    return { sent: targets.length, invalidTokens: [] };
  }) as typeof sendPush;
  const admin = {
    id: "00000000-0000-4000-8000-0000000000ad",
    email: "team@yallapp.test",
  };

  function deps(): OwnerDeps {
    return {
      store,
      now,
      ip: "198.51.100.7",
      signingSecret: SECRET,
      encryptionKey: KEY,
      baseUrl: "https://yallapp.test",
      paymentUrls: {},
      media: null,
      mail: async () => undefined,
      sendPush: send,
    };
  }

  async function call(
    method: string,
    route: string,
    options: {
      params?: Record<string, string | number>;
      token?: string | null;
      body?: unknown;
      query?: Record<string, string>;
    } = {},
  ) {
    const path = route.replace(/\{(\w+)\}/g, (_, name: string) =>
      String(options.params?.[name] ?? `{${name}}`),
    );
    const result = await handleOwner(deps(), {
      method,
      path: path.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
      acceptLanguage: null,
    });
    expectOwnerContract(method, route, result);
    return result as {
      status: number;
      body: Record<string, unknown> & { [key: string]: never };
    };
  }

  async function signIn(email = "leyla@flowers.test") {
    const result = await call("POST", "/auth/sign-in", {
      body: {
        email,
        password: PASSWORD,
        device: { name: "Pixel 8", platform: "android", app_version: "1.0.3" },
      },
    });
    expect(result.status).toBe(200);
    return (result.body as unknown as { access_token: string }).access_token;
  }

  const product = (
    input: Partial<CatalogProductInput>,
  ): CatalogProductInput => ({
    appId: flowers.id,
    name: "Product",
    description: "",
    priceCents: 10000,
    salePriceCents: null,
    categoryIds: [],
    imageAssetIds: [],
    stock: null,
    digital: false,
    featured: false,
    active: true,
    sku: null,
    ...input,
  });

  async function sale(
    app: App,
    at: Date,
    cents: number,
    who: { userId?: number; name?: string; phone?: string },
    lines: { productId: number; name: string; quantity: number }[] = [
      { productId: 1, name: "Roses", quantity: 1 },
    ],
  ): Promise<CatalogOrder> {
    const order = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: sha256Hex(`o-${Math.random()}`),
      userId: who.userId ?? null,
      status: "pending",
      lines: lines.map((l) => ({
        ...l,
        unitCents: Math.round(cents / lines.length / l.quantity),
        imageAssetId: null,
        digital: false,
      })),
      subtotalCents: cents,
      shippingCents: 0,
      totalCents: cents,
      currency: "EGP",
      customer: who.name
        ? {
            name: who.name,
            phone: who.phone ?? "+201000000000",
            email: "x@example.com",
            city: "Cairo",
            address: "Somewhere 1",
          }
        : null,
      paymentId: null,
      createdAt: at,
      paidAt: null,
      updatedAt: at,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    } as Omit<CatalogOrder, "id">);
    await store.payCatalogOrder(app.id, order.id, "PAY", at);
    return (await store.getCatalogOrder(app.id, order.id))!;
  }

  beforeEach(async () => {
    store = new MemoryStore();
    now = NOW;
    pushes = [];
    ({ user, client } = await ownerOf(store, "leyla@flowers.test"));
    await activateClient(
      store,
      {
        clientId: client.id,
        plan: "studio_1",
        activeUntil: days(30),
        paymentNote: "",
      },
      KEY,
      NOW,
    );
    flowers = await addApp(
      store,
      client,
      { appType: "store", appName: "Leqaa", connector: { kind: "catalog" } },
      "studio_1",
    );
    regular = await addApp(
      store,
      client,
      {
        appType: "store",
        appName: "Corner Shop",
        connector: { kind: "catalog" },
      },
      "business",
    );
    food = await addApp(
      store,
      client,
      {
        appType: "food",
        appName: "Koshari Now",
        connector: { kind: "restaurants" },
      },
      "studio_1",
    );
  });

  describe("Prime as a gift", () => {
    it("only the team members with prime.gift may give it", () => {
      expect(can("owner", "prime.gift")).toBe(true);
      expect(can("admin", "prime.gift")).toBe(true);
      expect(can("support", "prime.gift")).toBe(false);
      expect(can("viewer", "prime.gift")).toBe(false);
      expect(readGiftForm({ until: "2020-01-01" }, NOW)).toMatchObject({
        ok: false,
        errors: { until: "The last day can't be in the past." },
      });
      expect(readGiftForm({ until: "soon" }, NOW)).toMatchObject({ ok: false });
      expect(
        readGiftForm({ until: "", note: "  Launch   week " }, NOW),
      ).toEqual({ ok: true, until: null, note: "Launch week" });
    });

    it("makes a regular app Prime until removed, audited; never its plan", async () => {
      const token = await signIn();
      const features = async () => {
        const me = await call("GET", "/me", { token });
        return (
          me.body.apps as unknown as {
            id: string;
            features: { prime: boolean };
            prime_gift: { until: string | null } | null;
            plan: { id: string };
          }[]
        ).find((a) => a.id === regular.id)!;
      };
      expect((await features()).features.prime).toBe(false);
      expect(
        (
          await call("GET", "/apps/{app_id}/prime/insights", {
            token,
            params: { app_id: regular.id },
          })
        ).body,
      ).toMatchObject({ code: "not_available" });

      await givePrimeGift(
        store,
        {
          admin,
          clientId: client.id,
          apps: [regular],
          until: null,
          note: "Launch week",
        },
        NOW,
      );
      const given = await features();
      expect(given).toMatchObject({
        features: { prime: true },
        prime_gift: { until: null },
        plan: { id: "business" },
      });
      expect(
        (
          await call("GET", "/apps/{app_id}/prime/insights", {
            token,
            params: { app_id: regular.id },
          })
        ).status,
      ).toBe(200);
      // An app Prime by its plan says nothing of a gift.
      const me = await call("GET", "/me", { token });
      expect(
        (me.body.apps as unknown as { id: string; prime_gift: unknown }[]).find(
          (a) => a.id === flowers.id,
        )!.prime_gift,
      ).toBeNull();
      const audit = await store.listAuditEntries({
        clientId: client.id,
        offset: 0,
        limit: 10,
      });
      expect(
        audit.items.map((e) => [e.action, e.actorEmail, e.summary]),
      ).toContainEqual([
        "client.prime_gift",
        "team@yallapp.test",
        "Prime given as a gift to Corner Shop until removed",
      ]);
      // The license is untouched.
      expect((await store.getLicenseForApp(client.id, regular.id))!.plan).toBe(
        "business",
      );

      expect(
        await removePrimeGift(
          store,
          { admin, clientId: client.id, apps: [regular] },
          NOW,
        ),
      ).toBe(1);
      expect(await features()).toMatchObject({
        features: { prime: false },
        prime_gift: null,
      });
      expect(
        (
          await store.listAuditEntries({
            clientId: client.id,
            action: "client.prime_gift_remove",
            offset: 0,
            limit: 10,
          })
        ).total,
      ).toBe(1);
    });

    it("ends on its own after its last day", async () => {
      const token = await signIn();
      const until = new Date(NOW.getTime() + 2 * 86_400_000);
      await givePrimeGift(
        store,
        { admin, clientId: client.id, apps: [regular], until, note: null },
        NOW,
      );
      expect(primeGiftActive({ until }, NOW)).toBe(true);
      const at = async (when: Date) => {
        now = when;
        const me = await call("GET", "/me", { token: await signIn() });
        return (
          me.body.apps as unknown as {
            id: string;
            features: { prime: boolean };
            prime_gift: { until: string | null } | null;
          }[]
        ).find((a) => a.id === regular.id)!;
      };
      void token;
      expect(await at(NOW)).toMatchObject({
        features: { prime: true },
        prime_gift: { until: until.toISOString() },
      });
      expect(await at(new Date(until.getTime() + 1))).toMatchObject({
        features: { prime: false },
        prime_gift: null,
      });
    });

    it("the smart alerts' job and the weekly summary count it too", async () => {
      await givePrimeGift(
        store,
        {
          admin,
          clientId: client.id,
          apps: [regular],
          until: null,
          note: null,
        },
        NOW,
      );
      await store.savePrimeAlerts({
        userId: user.id,
        appId: regular.id,
        clientId: client.id,
        alerts: [
          {
            kind: "sales_goal",
            on: true,
            minutes: null,
            amountCents: 100_00,
            byTime: null,
            stars: null,
            period: "day",
          },
        ],
        briefOn: false,
        briefTime: "08:30",
        updatedAt: NOW,
      });
      expect(
        (await runPrimeChecks({ store, now: NOW, account: ACCOUNT, send }))
          .people,
      ).toBe(1);
      await removePrimeGift(
        store,
        { admin, clientId: client.id, apps: [regular] },
        NOW,
      );
      expect(
        (await runPrimeChecks({ store, now: NOW, account: ACCOUNT, send }))
          .people,
      ).toBe(0);
    });
  });

  it("a sales goal: Today's ring, and a push once when it's reached", async () => {
    const token = await signIn();
    const device = (await store.listOwnerDevices(user.id))[0]!;
    await store.updateOwnerDevice(device.id, { pushToken: "token-owner" });
    const put = (body: unknown) =>
      call("PUT", "/apps/{app_id}/prime/alerts", {
        token,
        params: { app_id: flowers.id },
        body,
      });
    expect(
      (
        await put({
          items: [
            {
              kind: "sales_goal",
              on: true,
              amount_cents: 1000_00,
              period: "year",
            },
          ],
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await put({
          items: [
            { kind: "sales_goal", on: true, amount_cents: 0, period: "day" },
          ],
        })
      ).status,
    ).toBe(400);
    // Off at 0 is kept (the app sends every alert each time).
    expect(
      (
        await put({
          items: [
            {
              kind: "sales_goal",
              on: false,
              amount_cents: 0,
              period: null,
              threshold: null,
            },
          ],
        })
      ).status,
    ).toBe(200);
    const saved = await put({
      items: [
        { kind: "sales_goal", on: true, amount_cents: 1000_00, period: "day" },
      ],
    });
    expect(
      (saved.body.items as unknown as { kind: string }[]).find(
        (i) => i.kind === "sales_goal",
      ),
    ).toMatchObject({ on: true, amount_cents: 1000_00, period: "day" });
    await sale(flowers, new Date(NOW.getTime() - 3_600_000), 400_00, {
      name: "Omar",
    });
    const today = await call("GET", "/apps/{app_id}/today", {
      token,
      params: { app_id: flowers.id },
    });
    expect(today.body.goal).toMatchObject({
      period: "day",
      target: { amount_cents: 1000_00 },
      current: { amount_cents: 400_00 },
      pct: 40,
      reached: false,
      label: "Today's goal",
    });
    expect(
      (await runPrimeChecks({ store, now: NOW, account: ACCOUNT, send }))
        .alerts,
    ).toBe(0);
    await sale(flowers, new Date(NOW.getTime() - 60_000), 700_00, {
      name: "Salma",
    });
    expect(
      (
        await call("GET", "/apps/{app_id}/today", {
          token,
          params: { app_id: flowers.id },
        })
      ).body.goal,
    ).toMatchObject({ pct: 100, reached: true });
    await runPrimeChecks({ store, now: NOW, account: ACCOUNT, send });
    expect(pushes.map((p) => [p.title, p.body, p.data.alert])).toEqual([
      ["Goal reached!", "E£1,100.00 of your E£1,000.00 goal", "sales_goal"],
    ]);
    // Once in its period.
    await runPrimeChecks({
      store,
      now: new Date(NOW.getTime() + 10 * 60_000),
      account: ACCOUNT,
      send,
    });
    expect(pushes).toHaveLength(1);
    // A regular app's Today has no goal.
    expect(
      (
        await call("GET", "/apps/{app_id}/today", {
          token,
          params: { app_id: regular.id },
        })
      ).body.goal,
    ).toBeUndefined();
    expect(periodOf("week", "2026-11-19", "UTC").key).toBe("2026-11-16");
    expect(periodOf("month", "2026-12-19", "UTC")).toMatchObject({
      key: "2026-12-01",
      end: new Date("2027-01-01T00:00:00Z"),
    });
  });

  it("low stock and sold out as a smart alert; product insights", async () => {
    const token = await signIn();
    const device = (await store.listOwnerDevices(user.id))[0]!;
    await store.updateOwnerDevice(device.id, { pushToken: "token-owner" });
    const early = new Date(NOW.getTime() - 40 * 86_400_000);
    // 5 in stock, 3 sold: 2 left.
    const roses = await store.createCatalogProduct(
      product({ name: "Red roses", stock: 5 }),
      early,
    );
    const tulips = await store.createCatalogProduct(
      product({ name: "Tulips", stock: 0 }),
      early,
    );
    const vase = await store.createCatalogProduct(
      product({ name: "Vase", stock: 40 }),
      early,
    );
    await store.createCatalogProduct(
      product({ name: "Card", stock: 1, addon: true, addonFor: null }),
      early,
    );
    await sale(
      flowers,
      new Date(NOW.getTime() - 86_400_000),
      300_00,
      { name: "Omar" },
      [{ productId: roses.id, name: "Red roses", quantity: 3 }],
    );
    await call("PUT", "/apps/{app_id}/prime/alerts", {
      token,
      params: { app_id: flowers.id },
      body: { items: [{ kind: "low_stock", on: true, threshold: 3 }] },
    });
    await runPrimeChecks({ store, now: NOW, account: ACCOUNT, send });
    expect(
      pushes.map((p) => [p.title, p.data.alert, p.data.product_id]).sort(),
    ).toEqual(
      [
        ["Red roses: 2 left", "low_stock", String(roses.id)],
        ["Sold out: Tulips", "low_stock", String(tulips.id)],
      ].sort(),
    );
    const insights = await call("GET", "/apps/{app_id}/prime/products", {
      token,
      params: { app_id: flowers.id },
    });
    expect(insights.body).toMatchObject({
      threshold: 3,
      best: [{ id: roses.id, units: 3, total: { amount_cents: 300_00 } }],
      low_stock: [{ id: roses.id, stock: 2 }],
      out_of_stock: [{ id: tulips.id }],
    });
    expect((insights.body.slow as unknown as { id: number }[])[0]!.id).not.toBe(
      roses.id,
    );
    expect(
      (insights.body.slow as unknown as { id: number }[]).map((p) => p.id),
    ).toContain(vase.id);
    // The food app sells no products of its own.
    expect(
      (
        await call("GET", "/apps/{app_id}/prime/products", {
          token,
          params: { app_id: food.id },
        })
      ).body,
    ).toMatchObject({ code: "not_available" });
  });

  it("customer insights: new and returning, the best customers, those who haven't come back; names only for who may see orders", async () => {
    const token = await signIn();
    const day = 86_400_000;
    await sale(flowers, new Date(NOW.getTime() - 50 * day), 200_00, {
      name: "Omar Nabil",
      phone: "+201001",
    });
    await sale(flowers, new Date(NOW.getTime() - 2 * day), 900_00, {
      name: "Omar Nabil",
      phone: "+201001",
    });
    await sale(flowers, new Date(NOW.getTime() - 3 * day), 300_00, {
      name: "Hana Fathy",
      phone: "+201002",
    });
    await sale(flowers, new Date(NOW.getTime() - 45 * day), 150_00, {
      name: "Karim Adel",
      phone: "+201003",
    });
    await sale(flowers, new Date(NOW.getTime() - 100 * day), 500_00, {
      name: "Nour Hany",
      phone: "+201004",
    });
    const got = await call("GET", "/apps/{app_id}/prime/customers", {
      token,
      params: { app_id: flowers.id },
    });
    expect(got.body).toMatchObject({
      period: "month",
      customers: 2,
      new: 1,
      returning: 1,
      top: [
        { name: "Omar Nabil", orders: 1, spend: { amount_cents: 900_00 } },
        { name: "Hana Fathy", orders: 1, spend: { amount_cents: 300_00 } },
      ],
      lapsed_30: { count: 1, people: [{ name: "Karim Adel" }] },
      lapsed_60: {
        count: 1,
        people: [{ name: "Nour Hany", spend: { amount_cents: 500_00 } }],
      },
      names_shown: true,
    });
    // A team member with Analytics only sees the numbers.
    const member = await store.createUser({
      email: "kerem@flowers.test",
      name: "Kerem",
      passwordHash: await hashPassword(PASSWORD),
      now: NOW,
    });
    await store.saveTeamMember({
      clientId: client.id,
      userId: member.id,
      role: "staff",
      areas: ["analytics"],
      appIds: null,
      addedBy: user.email,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const staff = await call("GET", "/apps/{app_id}/prime/customers", {
      token: await signIn("kerem@flowers.test"),
      params: { app_id: flowers.id },
    });
    expect(staff.body).toMatchObject({
      names_shown: false,
      top: [{ name: null }, { name: null }],
    });
    expect(JSON.stringify(staff.body)).not.toContain("Omar");
  });

  it("quick actions: a coupon and a flash sale with the dashboard's rules", async () => {
    const token = await signIn();
    const roses = await store.createCatalogProduct(
      product({ name: "Red roses" }),
      NOW,
    );
    const coupon = await call("POST", "/apps/{app_id}/prime/coupons", {
      token,
      params: { app_id: flowers.id },
      body: { code: "leqaa10", kind: "percent", value: "10", public: true },
    });
    expect(coupon).toMatchObject({
      status: 201,
      body: { code: "LEQAA10", kind: "percent", value: 10, public: true },
    });
    expect(
      (
        await call("POST", "/apps/{app_id}/prime/coupons", {
          token,
          params: { app_id: flowers.id },
          body: { code: "LEQAA10", kind: "percent", value: "10" },
        })
      ).body,
    ).toMatchObject({
      errors: { code: "You already have a coupon with this code." },
    });
    expect(
      (
        await call("POST", "/apps/{app_id}/prime/coupons", {
          token,
          params: { app_id: flowers.id },
          body: { code: "X", kind: "percent", value: "300" },
        })
      ).body,
    ).toMatchObject({
      code: "invalid_request",
      errors: { code: expect.any(String), value: expect.any(String) },
    });
    expect(
      (await store.listCatalogCoupons(flowers.id)).map((c) => c.code),
    ).toEqual(["LEQAA10"]);
    const flash = await call("POST", "/apps/{app_id}/prime/flash-sales", {
      token,
      params: { app_id: flowers.id },
      body: {
        title: "Rose hour",
        product_ids: [roses.id],
        kind: "percent",
        value: "25",
        starts_at: "2026-10-13T10:00",
        ends_at: "2026-10-13T22:00",
        limit: 12,
      },
    });
    expect(flash).toMatchObject({
      status: 201,
      body: {
        title: "Rose hour",
        product_ids: [roses.id],
        percent: 25,
        limit: 12,
        sold: 0,
      },
    });
    expect(
      (
        await call("POST", "/apps/{app_id}/prime/flash-sales", {
          token,
          params: { app_id: flowers.id },
          body: {
            title: "Bad",
            product_ids: [999999],
            kind: "percent",
            value: "25",
            starts_at: "2026-10-13T10:00",
            ends_at: "2026-10-13T22:00",
          },
        })
      ).status,
    ).toBe(400);
    // Not for a regular app, nor a food app.
    expect(
      (
        await call("POST", "/apps/{app_id}/prime/coupons", {
          token,
          params: { app_id: regular.id },
          body: { code: "A10", kind: "percent", value: "10" },
        })
      ).body,
    ).toMatchObject({ code: "not_available" });
    expect(
      (
        await call("POST", "/apps/{app_id}/prime/coupons", {
          token,
          params: { app_id: food.id },
          body: { code: "A10", kind: "percent", value: "10" },
        })
      ).body,
    ).toMatchObject({ code: "not_available" });
  });

  it("quick actions: a delivery slot closed for a day, and the checkout stops offering it", async () => {
    const token = await signIn();
    const delivery = {
      ...deliveryOf(flowers, true)!,
      enabled: true,
      timezone: "UTC",
      maxDays: 14,
    };
    await store.updateApp(
      flowers.id,
      {
        catalogSettings: {
          ...DEFAULT_CATALOG_SETTINGS,
          currency: "EGP",
          delivery,
        },
      },
      NOW,
    );
    const date = "2026-10-13";
    const listed = await call("GET", "/apps/{app_id}/prime/delivery-slots", {
      token,
      params: { app_id: flowers.id },
      query: { date },
    });
    expect(listed.body).toMatchObject({
      date,
      slots: [
        { id: "s1", label: "10:00–13:00", closed: false },
        { id: "s2" },
        { id: "s3" },
      ],
    });
    const closed = await call(
      "PUT",
      "/apps/{app_id}/prime/delivery-slots/{slot_id}",
      {
        token,
        params: { app_id: flowers.id, slot_id: "s2" },
        body: { date, closed: true },
      },
    );
    expect(closed.body).toMatchObject({
      slots: [
        { id: "s1", closed: false },
        { id: "s2", closed: true },
        { id: "s3", closed: false },
      ],
    });
    const app = (await store.getAppById(flowers.id))!;
    const s = deliveryOf(app)!;
    expect(
      deliverySlotsJson(s, date, {}, NOW, "EGP", true).slots.find(
        (x) => x.id === "s2",
      ),
    ).toMatchObject({ available: false, full: false });
    expect(
      await checkDelivery(
        s,
        { delivery_date: date, delivery_slot: "s2" },
        NOW,
        async () => ({}),
        true,
      ),
    ).toMatchObject({ ok: false, code: "slot_full", status: 409 });
    expect(
      await checkDelivery(
        s,
        { delivery_date: date, delivery_slot: "s3" },
        NOW,
        async () => ({}),
        true,
      ),
    ).toMatchObject({ ok: true });
    // Opened again.
    await call("PUT", "/apps/{app_id}/prime/delivery-slots/{slot_id}", {
      token,
      params: { app_id: flowers.id, slot_id: "s2" },
      body: { date, closed: false },
    });
    expect(
      await checkDelivery(
        deliveryOf((await store.getAppById(flowers.id))!)!,
        { delivery_date: date, delivery_slot: "s2" },
        NOW,
        async () => ({}),
        true,
      ),
    ).toMatchObject({ ok: true });
    expect(
      (
        await call("PUT", "/apps/{app_id}/prime/delivery-slots/{slot_id}", {
          token,
          params: { app_id: flowers.id, slot_id: "s2" },
          body: { date: "2020-01-01", closed: true },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call("PUT", "/apps/{app_id}/prime/delivery-slots/{slot_id}", {
          token,
          params: { app_id: flowers.id, slot_id: "nope" },
          body: { date, closed: true },
        })
      ).status,
    ).toBe(404);
  });

  it("quick actions: a restaurant's busy time; ratings and reviews; the weekly report", async () => {
    const token = await signIn();
    const place = { address: "Zamalek", details: null, lat: null, lng: null };
    const r = await store.createRestaurant(
      {
        appId: food.id,
        name: "Zooba",
        description: null,
        logoAssetId: null,
        coverAssetId: null,
        cuisines: [],
        address: place,
        phone: null,
        hours: [],
        prepMinutes: 20,
        minOrderCents: 0,
        maxKm: null,
        commissionBp: 1000,
        active: true,
        position: 1,
      },
      { sections: [], nextId: 1 },
      NOW,
    );
    expect(
      (
        await call("PUT", "/apps/{app_id}/restaurants/{restaurant_id}/busy", {
          token,
          params: { app_id: food.id, restaurant_id: r.id },
          body: { minutes: 7 },
        })
      ).status,
    ).toBe(400);
    const busy = await call(
      "PUT",
      "/apps/{app_id}/restaurants/{restaurant_id}/busy",
      {
        token,
        params: { app_id: food.id, restaurant_id: r.id },
        body: { minutes: 30 },
      },
    );
    expect(busy.body).toMatchObject({
      id: r.id,
      busy_until: new Date(NOW.getTime() + 30 * 60_000).toISOString(),
    });
    expect((await store.getRestaurant(food.id, r.id))!.busyUntil).toEqual(
      new Date(NOW.getTime() + 30 * 60_000),
    );
    await call("PUT", "/apps/{app_id}/restaurants/{restaurant_id}/busy", {
      token,
      params: { app_id: food.id, restaurant_id: r.id },
      body: { minutes: 0 },
    });
    expect((await store.getRestaurant(food.id, r.id))!.busyUntil).toBeNull();

    const o = await store.createFoodOrder({
      appId: food.id,
      restaurantId: r.id,
      restaurantName: "Zooba",
      userId: null,
      customerName: "Mona Hassan",
      customerPhone: "+201001112222",
      lines: [
        {
          dishId: 1,
          name: "Burger",
          quantity: 1,
          choices: [],
          note: null,
          unitCents: 100_00,
        },
      ],
      subtotalCents: 100_00,
      deliveryFeeCents: 0,
      totalCents: 100_00,
      commissionCents: 0,
      currency: "EGP",
      paymentMethod: "cash",
      paymentStatus: "paid",
      orderId: null,
      status: "delivered",
      dropoff: place,
      zoneId: null,
      distanceKm: 1,
      notes: null,
      readyAt: null,
      rejection: null,
      shipmentId: null,
      rating: {
        restaurant: 2,
        courier: null,
        comment: "Cold fries",
        at: NOW.toISOString(),
      },
      timeline: [],
      lang: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const reviews = await call("GET", "/apps/{app_id}/prime/reviews", {
      token,
      params: { app_id: food.id },
    });
    expect(reviews.body).toMatchObject({
      average: 2,
      count: 1,
      items: [
        {
          source: "food",
          id: o.id,
          rating: 2,
          comment: "Cold fries",
          name: "Mona Hassan",
          about: "Zooba",
          // 132 Answered from the phone: the reply under the rating.
          can_reply: true,
          reply: null,
        },
      ],
    });
    expect(
      (
        await call("GET", "/apps/{app_id}/prime/reviews", {
          token,
          params: { app_id: flowers.id },
        })
      ).body,
    ).toMatchObject({ code: "not_available" });

    expect(
      (
        await call("GET", "/apps/{app_id}/prime/weekly-report", {
          token,
          params: { app_id: flowers.id },
        })
      ).body,
    ).toEqual({ on: true, email: "leyla@flowers.test" });
    expect(
      (
        await call("PUT", "/apps/{app_id}/prime/weekly-report", {
          token,
          params: { app_id: flowers.id },
          body: { on: false },
        })
      ).body,
    ).toEqual({ on: false, email: "leyla@flowers.test" });
    expect((await store.getAppById(flowers.id))!.weeklySummary).toBe(false);
  });

  it("the weekly summary of a Prime app has its best sellers and customers", async () => {
    const monday = new Date("2026-10-19T09:00:00Z");
    await sale(
      flowers,
      new Date("2026-10-14T10:00:00Z"),
      300_00,
      { name: "Omar", phone: "+201001" },
      [{ productId: 1, name: "Red roses", quantity: 1 }],
    );
    await sale(
      flowers,
      new Date("2026-10-15T10:00:00Z"),
      200_00,
      { name: "Hana", phone: "+201002" },
      [{ productId: 2, name: "Tulips", quantity: 1 }],
    );
    await sale(
      flowers,
      new Date("2026-10-16T10:00:00Z"),
      300_00,
      { name: "Omar", phone: "+201001" },
      [{ productId: 1, name: "Red roses", quantity: 1 }],
    );
    await sale(
      flowers,
      new Date("2026-09-20T10:00:00Z"),
      100_00,
      { name: "Hana", phone: "+201002" },
      [{ productId: 2, name: "Tulips", quantity: 1 }],
    );
    await sale(regular, new Date("2026-10-14T10:00:00Z"), 300_00, {
      name: "Omar",
      phone: "+201001",
    });
    const sent: { to: string; values: Record<string, unknown> }[] = [];
    await runWeeklySummaries({
      store,
      now: monday,
      baseUrl: "https://yallapp.test",
      mail: async (_key, to, values) => void sent.push({ to, values }),
    });
    const of = (name: string) =>
      sent.find((m) => m.values.app_name === name)!.values.summary as string;
    expect(of("Leqaa")).toContain("Best sellers: Red roses, Tulips");
    expect(of("Leqaa")).toContain("Customers: 2 (1 new, 1 came back)");
    expect(of("Corner Shop")).not.toContain("Best sellers");
  });
});
