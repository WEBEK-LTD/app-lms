import { generateKeyPairSync, sign, X509Certificate, type KeyObject } from "node:crypto";
import { describe, expect, it } from "vitest";
import { APPLE_ROOT_CA_G3, APPLE_ROOT_CA_G3_SHA256 } from "@/lib/store-billing/apple-root";
import {
  AppleBillingError,
  extensionOids,
  findAppleAppId,
  nearestPricePoint,
  setNotificationUrls,
  territoryFor,
  upsertNonConsumable,
  upsertSubscription,
  verifyAppleJws,
  verifyNotification,
  verifySignedTransaction,
} from "@/lib/store-billing/apple";
import { NOW } from "./helpers";

const ec = () => generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const credentials = { keyId: "2X9R4HXF34", issuerId: "57246542-96fe-1a63-e053-0824d011072a", privateKey: ec().privateKey.export({ type: "pkcs8", format: "pem" }).toString() };
const APP = "6450000001";

// App Store Connect, answering from recorded-looking JSON:API documents ------------

interface Call {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
}
/** A JSON:API answer (201 for a POST, 200 otherwise), `{ status, body }` for an error, or one made from the request body. */
type Route = object | ((body: Record<string, unknown> | null) => object);

/** Answers `METHOD /path?query` exactly; anything else is a 404 the test sees in `unknown`. */
function asc(routes: Record<string, Route>) {
  const calls: Call[] = [];
  const unknown: string[] = [];
  const fetcher = (async (url: string, init: RequestInit = {}) => {
    const path = String(url).replace("https://api.appstoreconnect.apple.com", "");
    const method = init.method ?? "GET";
    const body = typeof init.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : null;
    calls.push({ method, path, body });
    expect((init.headers as Record<string, string>).authorization).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    const route = routes[`${method} ${path}`];
    if (route === undefined) {
      unknown.push(`${method} ${path}`);
      return Response.json({ errors: [{ status: "404", code: "NOT_FOUND", title: "The specified resource does not exist" }] }, { status: 404 });
    }
    const answer = typeof route === "function" ? route(body) : route;
    if ("status" in answer && "body" in answer && typeof answer.status === "number") return Response.json(answer.body, { status: answer.status });
    return Response.json(answer, { status: method === "POST" ? 201 : 200 });
  }) as unknown as typeof fetch;
  const writes = () => calls.filter((call) => call.method !== "GET").map((call) => `${call.method} ${call.path}`);
  return { fetcher, calls, unknown, writes };
}

const doc = <T>(data: T) => ({ data, links: { self: "https://api.appstoreconnect.apple.com/v1/..." } });
const territories = doc(["USA", "TUR", "DEU", "GBR", "SAU"].map((id) => ({ type: "territories", id, attributes: { currency: id === "TUR" ? "TRY" : "USD" } })));
const iapPoints = doc(
  ["0.0", "149.99", "179.99", "199.99", "249.99"].map((customerPrice, i) => ({
    type: "inAppPurchasePricePoints",
    id: `eyJzIjoiNjc0MTAwMDAwMSIsInQiOiJUVVIiLCJwIjoiMTAwMDEke2l9In0${i}`,
    attributes: { customerPrice, proceeds: String(Number(customerPrice) * 0.7) },
    relationships: { territory: { data: { type: "territories", id: "TUR" } } },
  })),
);

describe("100.2 App Store prices", () => {
  const points = [
    { id: "a", customerPrice: "0.0" },
    { id: "b", customerPrice: "4.99" },
    { id: "c", customerPrice: "5.99" },
    { id: "d", customerPrice: "9.99" },
  ];

  it("takes the store price closest to the site price, the lower one on a tie, never the free one", () => {
    expect(nearestPricePoint(points, 5.2)?.id).toBe("b");
    expect(nearestPricePoint(points, 5.49)?.id).toBe("b");
    expect(nearestPricePoint(points, 5.5)?.id).toBe("c");
    expect(nearestPricePoint(points, 100)?.id).toBe("d");
    expect(nearestPricePoint(points, 0)?.id).toBe("b");
    expect(nearestPricePoint([], 5)).toBeNull();
  });

  it("prices in the territory of the site's currency, the United States otherwise", () => {
    expect(territoryFor("TRY")).toBe("TUR");
    expect(territoryFor("eur")).toBe("DEU");
    expect(territoryFor("AED")).toBe("ARE");
    expect(territoryFor("JOD")).toBe("JOR");
    expect(territoryFor("USD")).toBe("USA");
    expect(territoryFor("CHF")).toBe("USA");
  });
});

describe("100.2 App Store Connect products", () => {
  it("finds the app by bundle ID, and says when there's none", async () => {
    const store = asc({
      "GET /v1/apps?filter[bundleId]=com.ada.app&limit=1": doc([{ type: "apps", id: APP, attributes: { bundleId: "com.ada.app", name: "Ada" } }]),
      "GET /v1/apps?filter[bundleId]=com.none.app&limit=1": doc([]),
    });
    expect(await findAppleAppId(store.fetcher, credentials, "com.ada.app", NOW)).toBe(APP);
    await expect(findAppleAppId(store.fetcher, credentials, "com.none.app", NOW)).rejects.toMatchObject({ code: "apple_no_app" });
  });

  it("makes a course's one-time product: the product, its English text on the open version, availability and the nearest price", async () => {
    const store = asc({
      [`GET /v1/apps/${APP}/inAppPurchasesV2?filter[productId]=course_12&limit=1`]: doc([]),
      "POST /v2/inAppPurchases": (body) => {
        const attributes = (body?.data as { attributes: Record<string, unknown> }).attributes;
        return doc({ type: "inAppPurchases", id: "6741000001", attributes: { ...attributes, state: "MISSING_METADATA", familySharable: false } });
      },
      "GET /v2/inAppPurchases/6741000001/versions?limit=50": doc([{ type: "inAppPurchaseVersions", id: "iapv-1", attributes: { version: 1, state: "PREPARE_FOR_SUBMISSION" } }]),
      "GET /v1/inAppPurchaseVersions/iapv-1/localizations?limit=50": doc([]),
      "POST /v2/inAppPurchaseLocalizations": doc({ type: "inAppPurchaseLocalizations", id: "loc-1", attributes: { locale: "en-US", state: "PREPARE_FOR_SUBMISSION" } }),
      "GET /v1/territories?limit=200": territories,
      "POST /v1/inAppPurchaseAvailabilities": doc({ type: "inAppPurchaseAvailabilities", id: "6741000001", attributes: { availableInNewTerritories: true } }),
      "GET /v2/inAppPurchases/6741000001/pricePoints?filter[territory]=TUR&limit=8000": iapPoints,
      "POST /v1/inAppPurchasePriceSchedules": doc({ type: "inAppPurchasePriceSchedules", id: "6741000001" }),
      "GET /v2/inAppPurchases/6741000001": doc({ type: "inAppPurchases", id: "6741000001", attributes: { productId: "course_12", state: "READY_TO_SUBMIT" } }),
    });
    const result = await upsertNonConsumable(
      store.fetcher,
      credentials,
      {
        appId: APP,
        productId: "course_12",
        referenceName: `Course: ${"Arabic for beginners, ".repeat(5)}`,
        title: "Arabic for beginners: the complete course",
        description: "Forty lessons from the alphabet to conversation, with exercises.",
        price: { currency: "TRY", amount: 189 },
      },
      NOW,
    );
    expect(store.unknown).toEqual([]);
    expect(result).toEqual({ iapId: "6741000001", state: "READY_TO_SUBMIT", versionState: "PREPARE_FOR_SUBMISSION", price: "179.99", territory: "TUR" });
    expect(store.writes()).toEqual(["POST /v2/inAppPurchases", "POST /v2/inAppPurchaseLocalizations", "POST /v1/inAppPurchaseAvailabilities", "POST /v1/inAppPurchasePriceSchedules"]);

    const [create, text, availability, schedule] = store.calls.filter((call) => call.method === "POST").map((call) => call.body as { data: Record<string, unknown>; included?: unknown[] });
    expect(create!.data).toMatchObject({ type: "inAppPurchases", attributes: { productId: "course_12", inAppPurchaseType: "NON_CONSUMABLE" }, relationships: { app: { data: { type: "apps", id: APP } } } });
    expect(String((create!.data.attributes as { name: string }).name).length).toBeLessThanOrEqual(64);
    expect(text!.data).toEqual({
      type: "inAppPurchaseLocalizations",
      attributes: { name: "Arabic for beginners: the comp", description: "Forty lessons from the alphabet to conversati", locale: "en-US" },
      relationships: { version: { data: { type: "inAppPurchaseVersions", id: "iapv-1" } } },
    });
    expect(availability!.data).toMatchObject({ attributes: { availableInNewTerritories: true }, relationships: { inAppPurchase: { data: { id: "6741000001" } } } });
    expect((availability!.data.relationships as { availableTerritories: { data: unknown[] } }).availableTerritories.data).toHaveLength(5);
    expect(schedule).toEqual({
      data: {
        type: "inAppPurchasePriceSchedules",
        relationships: {
          inAppPurchase: { data: { type: "inAppPurchases", id: "6741000001" } },
          baseTerritory: { data: { type: "territories", id: "TUR" } },
          manualPrices: { data: [{ type: "inAppPurchasePrices", id: "${price}" }] },
        },
      },
      included: [
        {
          type: "inAppPurchasePrices",
          id: "${price}",
          attributes: { startDate: null },
          relationships: {
            inAppPurchaseV2: { data: { type: "inAppPurchases", id: "6741000001" } },
            inAppPurchasePricePoint: { data: { type: "inAppPurchasePricePoints", id: iapPoints.data[2]!.id } },
          },
        },
      ],
    });
  });

  it("leaves an approved product alone when its text and price are already right", async () => {
    const store = asc({
      [`GET /v1/apps/${APP}/inAppPurchasesV2?filter[productId]=course_12&limit=1`]: doc([{ type: "inAppPurchases", id: "6741000001", attributes: { productId: "course_12", state: "APPROVED" } }]),
      "GET /v2/inAppPurchases/6741000001/versions?limit=50": doc([{ type: "inAppPurchaseVersions", id: "iapv-1", attributes: { version: 1, state: "APPROVED" } }]),
      "GET /v1/inAppPurchaseVersions/iapv-1/localizations?limit=50": doc([{ type: "inAppPurchaseLocalizations", id: "loc-1", attributes: { locale: "en-US", name: "Arabic for beginners", description: "Forty lessons." } }]),
      "GET /v1/territories?limit=200": territories,
      "POST /v1/inAppPurchaseAvailabilities": doc({ type: "inAppPurchaseAvailabilities", id: "6741000001" }),
      "GET /v2/inAppPurchases/6741000001/pricePoints?filter[territory]=TUR&limit=8000": iapPoints,
      "GET /v1/inAppPurchasePriceSchedules/6741000001/manualPrices?filter[territory]=TUR&include=inAppPurchasePricePoint&limit=50": doc([
        { type: "inAppPurchasePrices", id: "eyJpIjoiNjc0MTAwMDAwMSJ9", attributes: { startDate: null }, relationships: { inAppPurchasePricePoint: { data: { type: "inAppPurchasePricePoints", id: iapPoints.data[2]!.id } } } },
      ]),
      "GET /v2/inAppPurchases/6741000001": doc({ type: "inAppPurchases", id: "6741000001", attributes: { state: "APPROVED" } }),
    });
    const result = await upsertNonConsumable(
      store.fetcher,
      credentials,
      { appId: APP, productId: "course_12", referenceName: "Course: Arabic", title: "Arabic for beginners", description: "Forty lessons.", price: { currency: "TRY", amount: 180 } },
      NOW,
    );
    expect(store.unknown).toEqual([]);
    expect(store.writes()).toEqual(["POST /v1/inAppPurchaseAvailabilities"]);
    expect(result).toMatchObject({ state: "APPROVED", versionState: "APPROVED", price: "179.99" });
  });

  it("puts new text on a new version once the last one is approved, and a new price in the schedule", async () => {
    const store = asc({
      [`GET /v1/apps/${APP}/inAppPurchasesV2?filter[productId]=course_12&limit=1`]: doc([{ type: "inAppPurchases", id: "6741000001", attributes: { productId: "course_12", state: "APPROVED" } }]),
      "GET /v2/inAppPurchases/6741000001/versions?limit=50": doc([{ type: "inAppPurchaseVersions", id: "iapv-1", attributes: { version: 1, state: "APPROVED" } }]),
      "GET /v1/inAppPurchaseVersions/iapv-1/localizations?limit=50": doc([{ type: "inAppPurchaseLocalizations", id: "loc-1", attributes: { locale: "en-US", name: "Arabic", description: "Old." } }]),
      "POST /v1/inAppPurchaseVersions": doc({ type: "inAppPurchaseVersions", id: "iapv-2", attributes: { version: 2, state: "PREPARE_FOR_SUBMISSION" } }),
      "GET /v1/inAppPurchaseVersions/iapv-2/localizations?limit=50": doc([{ type: "inAppPurchaseLocalizations", id: "loc-2", attributes: { locale: "en-US", name: "Arabic", description: "Old." } }]),
      "PATCH /v2/inAppPurchaseLocalizations/loc-2": doc({ type: "inAppPurchaseLocalizations", id: "loc-2" }),
      "GET /v1/territories?limit=200": territories,
      "POST /v1/inAppPurchaseAvailabilities": doc({ type: "inAppPurchaseAvailabilities", id: "6741000001" }),
      "GET /v2/inAppPurchases/6741000001/pricePoints?filter[territory]=TUR&limit=8000": iapPoints,
      "GET /v1/inAppPurchasePriceSchedules/6741000001/manualPrices?filter[territory]=TUR&include=inAppPurchasePricePoint&limit=50": doc([
        { type: "inAppPurchasePrices", id: "p", attributes: { startDate: null }, relationships: { inAppPurchasePricePoint: { data: { type: "inAppPurchasePricePoints", id: iapPoints.data[2]!.id } } } },
      ]),
      "POST /v1/inAppPurchasePriceSchedules": doc({ type: "inAppPurchasePriceSchedules", id: "6741000001" }),
      "GET /v2/inAppPurchases/6741000001": doc({ type: "inAppPurchases", id: "6741000001", attributes: { state: "APPROVED" } }),
    });
    const result = await upsertNonConsumable(
      store.fetcher,
      credentials,
      { appId: APP, productId: "course_12", referenceName: "Course: Arabic", title: "Arabic for beginners", description: "Forty lessons.", price: { currency: "TRY", amount: 240 } },
      NOW,
    );
    expect(store.unknown).toEqual([]);
    expect(store.writes()).toEqual(["POST /v1/inAppPurchaseVersions", "PATCH /v2/inAppPurchaseLocalizations/loc-2", "POST /v1/inAppPurchaseAvailabilities", "POST /v1/inAppPurchasePriceSchedules"]);
    expect(store.calls.find((call) => call.method === "PATCH")?.body).toEqual({
      data: { type: "inAppPurchaseLocalizations", id: "loc-2", attributes: { name: "Arabic for beginners", description: "Forty lessons." } },
    });
    expect(result).toMatchObject({ versionState: "PREPARE_FOR_SUBMISSION", price: "249.99" });
  });

  it("makes a plan's subscription: group, subscription, their text, availability and a price in every territory", async () => {
    const equalized = ["USA", "DEU", "GBR", "SAU"].map((territory, i) => ({
      type: "subscriptionPricePoints",
      id: `eyJzIjoiNjc0MjAwMDAwMSIsInQiOiI${territory}In0`,
      attributes: { customerPrice: ["9.99", "9.99", "8.99", "37.99"][i], proceeds: "0" },
      relationships: { territory: { data: { type: "territories", id: territory } } },
    }));
    const store = asc({
      [`GET /v1/apps/${APP}/subscriptionGroups?filter[referenceName]=Memberships&limit=1`]: doc([]),
      "POST /v1/subscriptionGroups": doc({ type: "subscriptionGroups", id: "21000001", attributes: { referenceName: "Memberships" } }),
      "GET /v1/subscriptionGroups/21000001/versions?limit=50": doc([]),
      "POST /v1/subscriptionGroupVersions": doc({ type: "subscriptionGroupVersions", id: "sgv-1", attributes: { version: 1, state: "PREPARE_FOR_SUBMISSION" } }),
      "GET /v1/subscriptionGroupVersions/sgv-1/localizations?limit=50": doc([]),
      "POST /v2/subscriptionGroupLocalizations": doc({ type: "subscriptionGroupLocalizations", id: "sgl-1" }),
      "GET /v1/subscriptionGroups/21000001/subscriptions?filter[productId]=plan_pmpro_3&limit=1": doc([]),
      "POST /v1/subscriptions": (body) => doc({ type: "subscriptions", id: "6742000001", attributes: { ...(body?.data as { attributes: object }).attributes, state: "MISSING_METADATA" } }),
      "GET /v1/subscriptions/6742000001/versions?limit=50": doc([]),
      "POST /v1/subscriptionVersions": doc({ type: "subscriptionVersions", id: "sv-1", attributes: { version: 1, state: "PREPARE_FOR_SUBMISSION" } }),
      "GET /v1/subscriptionVersions/sv-1/localizations?limit=50": doc([]),
      "POST /v2/subscriptionLocalizations": doc({ type: "subscriptionLocalizations", id: "sl-1" }),
      "GET /v1/territories?limit=200": territories,
      "POST /v1/subscriptionPlanAvailabilities": doc({ type: "subscriptionPlanAvailabilities", id: "spa-1" }),
      "GET /v1/subscriptions/6742000001/pricePoints?filter[territory]=TUR&limit=8000": doc(
        ["299.99", "349.99", "399.99"].map((customerPrice, i) => ({ type: "subscriptionPricePoints", id: `tur-${i}`, attributes: { customerPrice, proceeds: "0", proceedsYear2: "0" } })),
      ),
      "GET /v1/subscriptionPricePoints/tur-1/equalizations?include=territory&limit=8000": doc(equalized),
      "POST /v1/subscriptionPrices": doc({ type: "subscriptionPrices", id: "price" }),
      "GET /v1/subscriptions/6742000001": doc({ type: "subscriptions", id: "6742000001", attributes: { productId: "plan_pmpro_3", state: "READY_TO_SUBMIT" } }),
    });
    const result = await upsertSubscription(
      store.fetcher,
      credentials,
      {
        appId: APP,
        groupReferenceName: "Memberships",
        productId: "plan_pmpro_3",
        referenceName: "Plan: Gold (monthly)",
        title: "Gold membership",
        description: "Every course, every month.",
        period: "month",
        price: { currency: "TRY", amount: 350 },
      },
      NOW,
    );
    expect(store.unknown).toEqual([]);
    expect(result).toEqual({ subscriptionId: "6742000001", groupId: "21000001", state: "READY_TO_SUBMIT", versionState: "PREPARE_FOR_SUBMISSION", price: "349.99", territory: "TUR" });
    const posts = store.calls.filter((call) => call.method === "POST");
    expect(posts.find((call) => call.path === "/v1/subscriptions")?.body).toEqual({
      data: {
        type: "subscriptions",
        attributes: { name: "Plan: Gold (monthly)", productId: "plan_pmpro_3", subscriptionPeriod: "ONE_MONTH", groupLevel: 1 },
        relationships: { group: { data: { type: "subscriptionGroups", id: "21000001" } } },
      },
    });
    expect(posts.find((call) => call.path === "/v2/subscriptionGroupLocalizations")?.body).toMatchObject({
      data: { attributes: { name: "Memberships", locale: "en-US" }, relationships: { version: { data: { type: "subscriptionGroupVersions", id: "sgv-1" } } } },
    });
    expect(posts.find((call) => call.path === "/v1/subscriptionPlanAvailabilities")?.body).toMatchObject({
      data: { attributes: { availableInNewTerritories: true, planType: "UPFRONT" }, relationships: { subscription: { data: { id: "6742000001" } } } },
    });
    const prices = posts.filter((call) => call.path === "/v1/subscriptionPrices").map((call) => call.body as { data: { attributes: object; relationships: Record<string, { data: { id: string } }> } });
    expect(prices.map((price) => [price.data.relationships.territory!.data.id, price.data.relationships.subscriptionPricePoint!.data.id])).toEqual([
      ["TUR", "tur-1"],
      ...equalized.map((point) => [point.relationships.territory.data.id, point.id]),
    ]);
    expect(prices[0]!.data.attributes).toEqual({ startDate: null, preserveCurrentPrice: true });
  });

  it("changes only the territories whose subscription price moved, and patches the plan availability", async () => {
    const store = asc({
      [`GET /v1/apps/${APP}/subscriptionGroups?filter[referenceName]=Memberships&limit=1`]: doc([{ type: "subscriptionGroups", id: "21000001", attributes: { referenceName: "Memberships" } }]),
      "GET /v1/subscriptionGroups/21000001/versions?limit=50": doc([{ type: "subscriptionGroupVersions", id: "sgv-1", attributes: { version: 1, state: "APPROVED" } }]),
      "GET /v1/subscriptionGroupVersions/sgv-1/localizations?limit=50": doc([{ type: "subscriptionGroupLocalizations", id: "sgl-1", attributes: { locale: "en-US", name: "Memberships" } }]),
      "GET /v1/subscriptionGroups/21000001/subscriptions?filter[productId]=plan_pmpro_3&limit=1": doc([{ type: "subscriptions", id: "6742000001", attributes: { productId: "plan_pmpro_3", state: "APPROVED" } }]),
      "GET /v1/subscriptions/6742000001/versions?limit=50": doc([{ type: "subscriptionVersions", id: "sv-1", attributes: { version: 1, state: "WAITING_FOR_REVIEW" } }]),
      "GET /v1/subscriptionVersions/sv-1/localizations?limit=50": doc([{ type: "subscriptionLocalizations", id: "sl-1", attributes: { locale: "en-US", name: "Gold", description: "Old." } }]),
      "GET /v1/territories?limit=200": territories,
      "GET /v1/subscriptions/6742000001/planAvailabilities?limit=200": doc([{ type: "subscriptionPlanAvailabilities", id: "spa-1", attributes: { planType: "UPFRONT", availableInNewTerritories: false } }]),
      "PATCH /v1/subscriptionPlanAvailabilities/spa-1": doc({ type: "subscriptionPlanAvailabilities", id: "spa-1" }),
      "GET /v1/subscriptions/6742000001/pricePoints?filter[territory]=USA&limit=8000": doc([{ type: "subscriptionPricePoints", id: "usa-9", attributes: { customerPrice: "9.99" } }]),
      "GET /v1/subscriptionPricePoints/usa-9/equalizations?include=territory&limit=8000": doc([
        { type: "subscriptionPricePoints", id: "deu-9", attributes: { customerPrice: "9.99" }, relationships: { territory: { data: { type: "territories", id: "DEU" } } } },
        { type: "subscriptionPricePoints", id: "gbr-8", attributes: { customerPrice: "8.99" }, relationships: { territory: { data: { type: "territories", id: "GBR" } } } },
      ]),
      "GET /v1/subscriptions/6742000001/prices?include=territory,subscriptionPricePoint&limit=200": {
        data: [
          { type: "subscriptionPrices", id: "p1", attributes: { startDate: null }, relationships: { territory: { data: { type: "territories", id: "USA" } }, subscriptionPricePoint: { data: { type: "subscriptionPricePoints", id: "usa-9" } } } },
          { type: "subscriptionPrices", id: "p2", attributes: { startDate: null }, relationships: { territory: { data: { type: "territories", id: "DEU" } }, subscriptionPricePoint: { data: { type: "subscriptionPricePoints", id: "deu-7" } } } },
        ],
        links: { next: "https://api.appstoreconnect.apple.com/v1/subscriptions/6742000001/prices?cursor=Mg&limit=200" },
      },
      "GET /v1/subscriptions/6742000001/prices?cursor=Mg&limit=200": doc([
        { type: "subscriptionPrices", id: "p3", attributes: { startDate: "2026-09-01" }, relationships: { territory: { data: { type: "territories", id: "DEU" } }, subscriptionPricePoint: { data: { type: "subscriptionPricePoints", id: "deu-9" } } } },
        { type: "subscriptionPrices", id: "p4", attributes: { startDate: "2026-12-01" }, relationships: { territory: { data: { type: "territories", id: "GBR" } }, subscriptionPricePoint: { data: { type: "subscriptionPricePoints", id: "gbr-8" } } } },
      ]),
      "POST /v1/subscriptionPrices": doc({ type: "subscriptionPrices", id: "price" }),
      "GET /v1/subscriptions/6742000001": doc({ type: "subscriptions", id: "6742000001", attributes: { state: "APPROVED" } }),
    });
    const result = await upsertSubscription(
      store.fetcher,
      credentials,
      {
        appId: APP,
        groupReferenceName: "Memberships",
        productId: "plan_pmpro_3",
        referenceName: "Plan: Gold",
        title: "Gold",
        description: "New text.",
        period: "month",
        price: { currency: "USD", amount: 10 },
        preserveCurrentPrice: false,
      },
      NOW,
    );
    expect(store.unknown).toEqual([]);
    // The text waits (the version is in review); USA and DEU (from September) already cost this; GBR's price starts later.
    expect(store.writes()).toEqual(["PATCH /v1/subscriptionPlanAvailabilities/spa-1", "POST /v1/subscriptionPrices"]);
    expect(store.calls.find((call) => call.path === "/v1/subscriptionPrices")?.body).toMatchObject({
      data: { attributes: { preserveCurrentPrice: false }, relationships: { territory: { data: { id: "GBR" } }, subscriptionPricePoint: { data: { id: "gbr-8" } } } },
    });
    expect(result).toMatchObject({ state: "APPROVED", versionState: "WAITING_FOR_REVIEW", price: "9.99", territory: "USA" });
  });

  it("points the app's notifications, production and sandbox, at Yallapp", async () => {
    const store = asc({ [`PATCH /v1/apps/${APP}`]: doc({ type: "apps", id: APP }) });
    await setNotificationUrls(store.fetcher, credentials, APP, "https://api.yallapp.com.tr/billing/notifications/apple/0b6f3c1e-7d2a-4f1b-9a51-3c2e8d9f0a11", NOW);
    expect(store.calls[0]).toEqual({
      method: "PATCH",
      path: `/v1/apps/${APP}`,
      body: {
        data: {
          type: "apps",
          id: APP,
          attributes: {
            subscriptionStatusUrl: "https://api.yallapp.com.tr/billing/notifications/apple/0b6f3c1e-7d2a-4f1b-9a51-3c2e8d9f0a11",
            subscriptionStatusUrlVersion: "V2",
            subscriptionStatusUrlForSandbox: "https://api.yallapp.com.tr/billing/notifications/apple/0b6f3c1e-7d2a-4f1b-9a51-3c2e8d9f0a11",
            subscriptionStatusUrlVersionForSandbox: "V2",
          },
        },
      },
    });
  });

  it("says why Apple refused: the key, the content (with Apple's words), or Apple being unreachable", async () => {
    const refused = asc({ [`PATCH /v1/apps/${APP}`]: { status: 401, body: { errors: [{ status: "401", code: "NOT_AUTHORIZED", title: "Authentication credentials are missing or invalid." }] } } });
    await expect(setNotificationUrls(refused.fetcher, credentials, APP, "https://x.test/a", NOW)).rejects.toMatchObject({ code: "apple_refused" });
    const conflict = asc({
      [`GET /v1/apps/${APP}/inAppPurchasesV2?filter[productId]=course_1&limit=1`]: doc([]),
      "POST /v2/inAppPurchases": { status: 409, body: { errors: [{ status: "409", code: "ENTITY_ERROR.ATTRIBUTE.INVALID.DUPLICATE", title: "The provided entity includes an attribute with a value that has already been used", detail: "The product ID you entered has already been used." }] } },
    });
    const error = await upsertNonConsumable(conflict.fetcher, credentials, { appId: APP, productId: "course_1", referenceName: "Course: A", title: "Course A", description: "", price: { currency: "USD", amount: 5 } }, NOW).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppleBillingError);
    expect(error).toMatchObject({ code: "apple_invalid", detail: "The product ID you entered has already been used." });
    const down = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(findAppleAppId(down, credentials, "com.ada.app", NOW)).rejects.toMatchObject({ code: "apple_failed" });
  });
});

// Signed data: a test chain shaped like Apple's ------------------------------------

/** A minimal DER writer, enough for X.509 v3 certificates signed with ECDSA P-256. */
const der = (tag: number, ...parts: Buffer[]) => {
  const body = Buffer.concat(parts);
  const n = body.length;
  const length = n < 0x80 ? Buffer.from([n]) : n < 0x100 ? Buffer.from([0x81, n]) : Buffer.from([0x82, n >> 8, n & 0xff]);
  return Buffer.concat([Buffer.from([tag]), length, body]);
};
const seq = (...parts: Buffer[]) => der(0x30, ...parts);
const oid = (dotted: string) => {
  const [first = 0, second = 0, ...rest] = dotted.split(".").map(Number);
  const bytes = [first * 40 + second];
  for (const n of rest) {
    const chunk = [n & 0x7f];
    for (let v = Math.floor(n / 128); v > 0; v = Math.floor(v / 128)) chunk.unshift((v & 0x7f) | 0x80);
    bytes.push(...chunk);
  }
  return der(0x06, Buffer.from(bytes));
};
const TRUE = der(0x01, Buffer.from([0xff]));
const utcTime = (date: Date) => der(0x17, Buffer.from(`${date.toISOString().replace(/[-:T]/g, "").slice(2, 14)}Z`));
const cn = (name: string) => seq(der(0x31, seq(oid("2.5.4.3"), der(0x0c, Buffer.from(name)))));
const ECDSA_SHA256 = seq(oid("1.2.840.10045.4.3.2"));
const LEAF_OID = "1.2.840.113635.100.6.11.1";
const INTERMEDIATE_OID = "1.2.840.113635.100.6.2.1";

function certificate(options: { serial: number; subject: string; issuer: string; key: KeyObject; signer: KeyObject; from: Date; to: Date; ca: boolean; marks: string[] }): Buffer {
  const extensions = [
    seq(oid("2.5.29.19"), TRUE, der(0x04, seq(...(options.ca ? [TRUE] : [])))),
    ...options.marks.map((mark) => seq(oid(mark), der(0x04, der(0x05)))),
  ];
  const tbs = seq(
    der(0xa0, der(0x02, Buffer.from([2]))),
    der(0x02, Buffer.from([options.serial])),
    ECDSA_SHA256,
    cn(options.issuer),
    seq(utcTime(options.from), utcTime(options.to)),
    cn(options.subject),
    options.key.export({ type: "spki", format: "der" }),
    der(0xa3, seq(...extensions)),
  );
  const signature = sign("sha256", tbs, options.signer);
  return seq(tbs, ECDSA_SHA256, der(0x03, Buffer.concat([Buffer.from([0]), signature])));
}

const toPem = (raw: Buffer) => `-----BEGIN CERTIFICATE-----\n${raw.toString("base64").replace(/(.{64})/g, "$1\n")}\n-----END CERTIFICATE-----\n`;

function chain(options: { leafTo?: Date; leafMarks?: string[]; leafSigner?: "intermediate" | "stranger" } = {}) {
  const root = ec();
  const intermediate = ec();
  const leaf = ec();
  const stranger = ec();
  const rootCert = certificate({ serial: 1, subject: "Test Root CA - G3", issuer: "Test Root CA - G3", key: root.publicKey, signer: root.privateKey, from: new Date("2020-01-01T00:00:00Z"), to: new Date("2040-01-01T00:00:00Z"), ca: true, marks: [] });
  const intermediateCert = certificate({
    serial: 2,
    subject: "Test Worldwide Developer Relations CA - G6",
    issuer: "Test Root CA - G3",
    key: intermediate.publicKey,
    signer: root.privateKey,
    from: new Date("2020-01-01T00:00:00Z"),
    to: new Date("2035-01-01T00:00:00Z"),
    ca: true,
    marks: [INTERMEDIATE_OID],
  });
  const leafCert = certificate({
    serial: 3,
    subject: "Test Prod ECC Mac App Store and iTunes Store Receipt Signing",
    issuer: "Test Worldwide Developer Relations CA - G6",
    key: leaf.publicKey,
    signer: options.leafSigner === "stranger" ? stranger.privateKey : intermediate.privateKey,
    from: new Date("2026-01-01T00:00:00Z"),
    to: options.leafTo ?? new Date("2028-01-01T00:00:00Z"),
    ca: false,
    marks: options.leafMarks ?? [LEAF_OID],
  });
  const jws = (payload: object, header: object = {}) => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const head = encode({ alg: "ES256", x5c: [leafCert, intermediateCert, rootCert].map((raw) => raw.toString("base64")), ...header });
    const body = encode(payload);
    const signature = sign("sha256", Buffer.from(`${head}.${body}`), { key: leaf.privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
    return `${head}.${body}.${signature}`;
  };
  return { jws, rootPem: toPem(rootCert), leafCert };
}

const transaction = {
  transactionId: "2000000812345678",
  originalTransactionId: "2000000812345678",
  webOrderLineItemId: "2000000067890123",
  bundleId: "com.ada.app",
  productId: "course_12",
  purchaseDate: Date.parse("2026-10-12T09:58:00Z"),
  originalPurchaseDate: Date.parse("2026-10-12T09:58:00Z"),
  quantity: 1,
  type: "Non-Consumable",
  appAccountToken: "6f1c2b7e-0a4d-4f8e-9b3a-1d2c3e4f5a6b",
  inAppOwnershipType: "PURCHASED",
  signedDate: Date.parse("2026-10-12T09:58:02Z"),
  environment: "Production",
  transactionReason: "PURCHASE",
  storefront: "TUR",
  storefrontId: "143480",
  price: 179990,
  currency: "TRY",
};

describe("100.3 Apple's signed transactions and notifications", () => {
  const test = chain();
  const check = { bundleId: "com.ada.app", now: NOW, rootCertificates: [test.rootPem] };

  it("bundles Apple Root CA - G3 as Apple publishes it", () => {
    const root = new X509Certificate(APPLE_ROOT_CA_G3);
    expect(root.fingerprint256).toBe(APPLE_ROOT_CA_G3_SHA256);
    expect(root.subject).toContain("CN=Apple Root CA - G3");
    expect(root.verify(root.publicKey)).toBe(true);
    expect(extensionOids(root.raw)).toEqual(["2.5.29.14", "2.5.29.19", "2.5.29.15"]);
  });

  it("reads a signed transaction whose chain ends at the trusted root", () => {
    expect(extensionOids(test.leafCert)).toContain(LEAF_OID);
    expect(verifySignedTransaction(test.jws(transaction), check)).toEqual({
      transactionId: "2000000812345678",
      originalTransactionId: "2000000812345678",
      productId: "course_12",
      bundleId: "com.ada.app",
      purchaseDate: new Date("2026-10-12T09:58:00Z"),
      expiresDate: null,
      revocationDate: null,
      revocationReason: null,
      type: "Non-Consumable",
      environment: "Production",
      appAccountToken: "6f1c2b7e-0a4d-4f8e-9b3a-1d2c3e4f5a6b",
    });
  });

  const refusal = (run: () => unknown) => {
    try {
      run();
    } catch (error) {
      expect(error).toBeInstanceOf(AppleBillingError);
      return (error as AppleBillingError).message;
    }
    return "accepted";
  };

  it("refuses another app's transaction, an expired leaf, a broken chain, a tampered payload and other roots", () => {
    expect(refusal(() => verifySignedTransaction(test.jws({ ...transaction, bundleId: "com.other.app" }), check))).toBe("apple_invalid: another app's transaction");
    const expired = chain({ leafTo: new Date("2026-06-01T00:00:00Z") });
    expect(refusal(() => verifySignedTransaction(expired.jws(transaction), { ...check, rootCertificates: [expired.rootPem] }))).toBe("apple_invalid: a certificate isn't valid now");
    const broken = chain({ leafSigner: "stranger" });
    expect(refusal(() => verifySignedTransaction(broken.jws(transaction), { ...check, rootCertificates: [broken.rootPem] }))).toBe("apple_invalid: the leaf isn't signed by the intermediate");
    const unmarked = chain({ leafMarks: [] });
    expect(refusal(() => verifySignedTransaction(unmarked.jws(transaction), { ...check, rootCertificates: [unmarked.rootPem] }))).toBe("apple_invalid: the leaf lacks Apple's receipt signing mark");
    const [head, , signature] = test.jws(transaction).split(".");
    const tampered = `${head}.${Buffer.from(JSON.stringify({ ...transaction, productId: "course_99" })).toString("base64url")}.${signature}`;
    expect(refusal(() => verifySignedTransaction(tampered, check))).toBe("apple_invalid: the signature doesn't match");
    // Without the test root, only Apple's own is trusted.
    expect(refusal(() => verifySignedTransaction(test.jws(transaction), { bundleId: "com.ada.app", now: NOW }))).toBe("apple_invalid: the chain doesn't end at Apple's root");
    expect(refusal(() => verifyAppleJws(test.jws(transaction, { alg: "HS256" }), check))).toBe("apple_invalid: alg isn't ES256");
    expect(refusal(() => verifyAppleJws("not.a.jws", check))).toBe("apple_invalid: a JWS part isn't JSON");
    expect(refusal(() => verifySignedTransaction(test.jws({ ...transaction, environment: "Xcode" }), check))).toBe("apple_invalid: not the App Store's production or sandbox environment");
  });

  it("reads a renewal with its transaction and renewal info", () => {
    const renewed = test.jws({
      notificationType: "DID_RENEW",
      subtype: "BILLING_RECOVERY",
      notificationUUID: "002e14d5-51f5-4503-b5a8-c3a1af68eb20",
      data: {
        appAppleId: 6450000001,
        bundleId: "com.ada.app",
        bundleVersion: "42",
        environment: "Sandbox",
        status: 1,
        signedTransactionInfo: test.jws({
          ...transaction,
          productId: "plan_pmpro_3",
          type: "Auto-Renewable Subscription",
          environment: "Sandbox",
          originalTransactionId: "2000000800000001",
          expiresDate: Date.parse("2026-11-12T09:58:00Z"),
          appAccountToken: undefined,
        }),
        signedRenewalInfo: test.jws({ autoRenewStatus: 1, autoRenewProductId: "plan_pmpro_3", productId: "plan_pmpro_3", originalTransactionId: "2000000800000001", environment: "Sandbox" }),
      },
      version: "2.0",
      signedDate: Date.parse("2026-10-12T09:58:03Z"),
    });
    const notification = verifyNotification(renewed, check);
    expect(notification).toMatchObject({
      notificationType: "DID_RENEW",
      subtype: "BILLING_RECOVERY",
      notificationUUID: "002e14d5-51f5-4503-b5a8-c3a1af68eb20",
      environment: "Sandbox",
      transaction: { productId: "plan_pmpro_3", originalTransactionId: "2000000800000001", expiresDate: new Date("2026-11-12T09:58:00Z"), environment: "Sandbox", appAccountToken: null },
      renewalInfo: { autoRenewStatus: 1, expirationIntent: null },
    });
  });

  it("reads a refund, Apple's test notification, and refuses another app's", () => {
    const refund = verifyNotification(
      test.jws({
        notificationType: "REFUND",
        notificationUUID: "7d3c1a2b-0000-4000-8000-000000000001",
        data: {
          bundleId: "com.ada.app",
          environment: "Production",
          signedTransactionInfo: test.jws({ ...transaction, revocationDate: Date.parse("2026-10-11T12:00:00Z"), revocationReason: 0 }),
        },
        version: "2.0",
      }),
      check,
    );
    expect(refund).toMatchObject({ notificationType: "REFUND", subtype: null, renewalInfo: null, transaction: { revocationDate: new Date("2026-10-11T12:00:00Z"), revocationReason: 0 } });
    const probe = verifyNotification(test.jws({ notificationType: "TEST", notificationUUID: "9a1b2c3d-0000-4000-8000-000000000002", data: { bundleId: "com.ada.app", environment: "Sandbox" } }), check);
    expect(probe).toMatchObject({ notificationType: "TEST", environment: "Sandbox", transaction: null, renewalInfo: null });
    expect(refusal(() => verifyNotification(test.jws({ notificationType: "TEST", notificationUUID: "x", data: { bundleId: "com.other.app", environment: "Sandbox" } }), check))).toBe("apple_invalid: another app's notification");
  });
});
