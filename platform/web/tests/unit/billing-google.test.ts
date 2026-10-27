import { createSign, generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  acknowledgeProductPurchase,
  acknowledgeSubscription,
  checkGoogleBilling,
  convertRegionPrices,
  deactivateProduct,
  fromMoney,
  GOOGLE_CERTS_URL,
  GoogleBillingError,
  googleBillingToken,
  listVoidedPurchases,
  parseDeveloperNotification,
  playDefaultLanguage,
  readProductPurchase,
  readSubscriptionPurchase,
  resetGoogleCerts,
  toMoney,
  upsertOneTimeProduct,
  upsertSubscription,
  verifyPubSubPush,
} from "@/lib/store-billing/google";
import { NOW } from "./helpers";

const APP = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.ada.app";

interface Call {
  url: string;
  method: string;
  body: unknown;
  auth: string | null;
}

type Answer = { status?: number; body?: unknown };
type Route = (call: Call) => Answer | undefined;

/** Google's APIs answering as they do (recorded shapes), recording the calls. */
function google(...routes: Route[]) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    const call: Call = { url: String(url), method: init.method ?? "GET", body: typeof init.body === "string" ? JSON.parse(init.body) : null, auth: headers.get("authorization") };
    calls.push(call);
    for (const route of routes) {
      const answer = route(call);
      if (answer) return answer.body === undefined ? new Response(null, { status: answer.status ?? 204 }) : Response.json(answer.body, { status: answer.status ?? 200 });
    }
    return Response.json({ error: { code: 404, message: "Not found", status: "NOT_FOUND" } }, { status: 404 });
  }) as unknown as typeof fetch;
  const deps = { fetcher, token: "ya29.token", packageName: "com.ada.app" };
  return { fetcher, calls, deps };
}

const on = (method: string, url: string, answer: Answer): Route => (call) => (call.method === method && call.url === url ? answer : undefined);

/** convertRegionPrices for 450.00 TRY, trimmed to three regions. */
const CONVERTED = {
  convertedRegionPrices: {
    TR: { regionCode: "TR", price: { currencyCode: "TRY", units: "529", nanos: 990000000 }, taxAmount: { currencyCode: "TRY", units: "88", nanos: 330000000 } },
    US: { regionCode: "US", price: { currencyCode: "USD", units: "13", nanos: 990000000 }, taxAmount: { currencyCode: "USD" } },
    DE: { regionCode: "DE", price: { currencyCode: "EUR", units: "14", nanos: 990000000 }, taxAmount: { currencyCode: "EUR", units: "2", nanos: 390000000 } },
  },
  convertedOtherRegionsPrice: { usdPrice: { currencyCode: "USD", units: "12", nanos: 990000000 }, eurPrice: { currencyCode: "EUR", units: "11", nanos: 990000000 } },
  regionVersion: { version: "2025/03" },
};
const convert = on("POST", `${APP}/pricing:convertRegionPrices`, { body: CONVERTED });

describe("100.2 Google Play prices", () => {
  it("turns a site price into Google's Money and back", () => {
    expect(fromMoney({ units: "529", nanos: 990000000 })).toBe("529.99");
    expect(fromMoney({ units: "2399" })).toBe("2399.00");
    expect(fromMoney({ units: "0", nanos: 500000 })).toBe("0.0005");
    expect(toMoney({ currency: "TRY", amount: "450.00" })).toEqual({ currencyCode: "TRY", units: "450", nanos: 0 });
    expect(toMoney({ currency: "USD", amount: "19.99" })).toEqual({ currencyCode: "USD", units: "19", nanos: 990000000 });
    expect(toMoney({ currency: "USD", amount: "7" })).toEqual({ currencyCode: "USD", units: "7", nanos: 0 });
    expect(() => toMoney({ currency: "USD", amount: "-1" })).toThrow();
    expect(() => toMoney({ currency: "usd", amount: "1" })).toThrow();
  });

  it("asks Google for the regional prices", async () => {
    const { deps, calls } = google(convert);
    const prices = await convertRegionPrices(deps, { currency: "TRY", amount: "450.00" });
    expect(calls).toEqual([{ url: `${APP}/pricing:convertRegionPrices`, method: "POST", body: { price: { currencyCode: "TRY", units: "450", nanos: 0 } }, auth: "Bearer ya29.token" }]);
    expect(prices.regions.map((r) => r.regionCode)).toEqual(["DE", "TR", "US"]);
    expect(prices.regions[1]?.price).toEqual({ currencyCode: "TRY", units: "529", nanos: 990000000 });
    expect(prices.otherRegions?.usdPrice.units).toBe("12");
    expect(prices.regionsVersion).toBe("2025/03");
  });

  it("refuses an empty conversion", async () => {
    const { deps } = google(on("POST", `${APP}/pricing:convertRegionPrices`, { body: { convertedRegionPrices: {} } }));
    await expect(convertRegionPrices(deps, { currency: "TRY", amount: "1" })).rejects.toMatchObject({ code: "google_invalid" });
  });
});

describe("100.2 Google Play products", () => {
  const otpPatch = (state: string) => (call: Call) =>
    call.method === "PATCH" && call.url.startsWith(`${APP}/onetimeproducts/course_12?`) ? { body: { ...(call.body as object), purchaseOptions: [{ purchaseOptionId: "buy", state }] } } : undefined;
  const batchStates = on("POST", `${APP}/oneTimeProducts/course_12/purchaseOptions:batchUpdateStates`, { body: { oneTimeProducts: [{ productId: "course_12", purchaseOptions: [{ purchaseOptionId: "buy", state: "ACTIVE" }] }] } });

  it("creates or updates a one-time product, then activates its purchase option", async () => {
    const { deps, calls } = google(convert, otpPatch("DRAFT"), batchStates);
    expect(await upsertOneTimeProduct(deps, { productId: "course_12", title: "Arabic for beginners", description: "Twelve lessons", price: { currency: "TRY", amount: "450.00" } })).toEqual({ state: "ACTIVE", price: "450.00" });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      `POST ${APP}/pricing:convertRegionPrices`,
      `PATCH ${APP}/onetimeproducts/course_12?allowMissing=true&regionsVersion.version=2025%2F03&updateMask=listings%2CpurchaseOptions`,
      `POST ${APP}/oneTimeProducts/course_12/purchaseOptions:batchUpdateStates`,
    ]);
    expect(calls[1]?.body).toEqual({
      packageName: "com.ada.app",
      productId: "course_12",
      listings: [{ languageCode: "en-US", title: "Arabic for beginners", description: "Twelve lessons" }],
      purchaseOptions: [
        {
          purchaseOptionId: "buy",
          buyOption: { legacyCompatible: true },
          regionalPricingAndAvailabilityConfigs: [
            { regionCode: "DE", price: { currencyCode: "EUR", units: "14", nanos: 990000000 }, availability: "AVAILABLE" },
            // The site's price where its currency is used: what people pay there.
            { regionCode: "TR", price: { currencyCode: "TRY", units: "450", nanos: 0 }, availability: "AVAILABLE" },
            { regionCode: "US", price: { currencyCode: "USD", units: "13", nanos: 990000000 }, availability: "AVAILABLE" },
          ],
          newRegionsConfig: { usdPrice: CONVERTED.convertedOtherRegionsPrice.usdPrice, eurPrice: CONVERTED.convertedOtherRegionsPrice.eurPrice, availability: "AVAILABLE" },
        },
      ],
    });
    expect(calls[2]?.body).toEqual({ requests: [{ activatePurchaseOptionRequest: { packageName: "com.ada.app", productId: "course_12", purchaseOptionId: "buy" } }] });
  });

  it("doesn't activate a purchase option already active, and keeps titles within Google's limits", async () => {
    const { deps, calls } = google(convert, otpPatch("ACTIVE"), batchStates);
    const result = await upsertOneTimeProduct(deps, { productId: "course_12", title: "x".repeat(80), description: "y".repeat(300), price: { currency: "USD", amount: "13.00" }, languageCode: "tr-TR" });
    expect(result).toEqual({ state: "ACTIVE", price: "13.00" });
    expect(calls).toHaveLength(2);
    expect((calls[1]?.body as { listings: unknown[] }).listings).toEqual([{ languageCode: "tr-TR", title: "x".repeat(55), description: "y".repeat(200) }]);
    // Cut by character, never inside one; an empty description takes the title.
    await upsertOneTimeProduct(deps, { productId: "course_12", title: "ع".repeat(60), description: " ", price: { currency: "TRY", amount: "450.00" } });
    expect((calls[3]?.body as { listings: unknown[] }).listings).toEqual([{ languageCode: "en-US", title: "ع".repeat(55), description: "ع".repeat(55) }]);
  });

  it("answers no kept price for a currency no region uses, and refuses product IDs Google doesn't take", async () => {
    const { deps, calls } = google(convert, otpPatch("ACTIVE"));
    expect(await upsertOneTimeProduct(deps, { productId: "course_12", title: "A", description: "B", price: { currency: "XAF", amount: "100" } })).toEqual({ state: "ACTIVE", price: null });
    await expect(upsertOneTimeProduct(deps, { productId: "Course-12", title: "A", description: "B", price: { currency: "TRY", amount: "1" } })).rejects.toThrow();
    await expect(upsertSubscription(deps, { productId: "p".repeat(41), title: "A", description: "B", period: "month", price: { currency: "TRY", amount: "1" } })).rejects.toThrow();
    expect(calls).toHaveLength(2);
  });

  it("creates a subscription with its base plan, then activates the base plan", async () => {
    const { deps, calls } = google(
      convert,
      (call) => (call.method === "POST" && call.url.startsWith(`${APP}/subscriptions?`) ? { body: { ...(call.body as object), basePlans: [{ basePlanId: "monthly", state: "DRAFT" }] } } : undefined),
      on("POST", `${APP}/subscriptions/plan_pmpro_3/basePlans/monthly:activate`, { body: { basePlans: [{ basePlanId: "monthly", state: "ACTIVE" }] } }),
    );
    const result = await upsertSubscription(deps, { productId: "plan_pmpro_3", title: "Gold", description: "Every course", period: "month", price: { currency: "TRY", amount: "199.00" } });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      `POST ${APP}/pricing:convertRegionPrices`,
      `GET ${APP}/subscriptions/plan_pmpro_3`,
      `POST ${APP}/subscriptions?productId=plan_pmpro_3&regionsVersion.version=2025%2F03`,
      `POST ${APP}/subscriptions/plan_pmpro_3/basePlans/monthly:activate`,
    ]);
    expect(calls[2]?.body).toEqual({
      packageName: "com.ada.app",
      productId: "plan_pmpro_3",
      listings: [{ languageCode: "en-US", title: "Gold", description: "Every course" }],
      basePlans: [
        {
          basePlanId: "monthly",
          autoRenewingBasePlanType: { billingPeriodDuration: "P1M" },
          regionalConfigs: [
            { regionCode: "DE", price: CONVERTED.convertedRegionPrices.DE.price, newSubscriberAvailability: true },
            { regionCode: "TR", price: { currencyCode: "TRY", units: "199", nanos: 0 }, newSubscriberAvailability: true },
            { regionCode: "US", price: CONVERTED.convertedRegionPrices.US.price, newSubscriberAvailability: true },
          ],
          otherRegionsConfig: { usdPrice: CONVERTED.convertedOtherRegionsPrice.usdPrice, eurPrice: CONVERTED.convertedOtherRegionsPrice.eurPrice, newSubscriberAvailability: true },
        },
      ],
    });
    expect(calls[3]?.body).toEqual({ packageName: "com.ada.app", productId: "plan_pmpro_3", basePlanId: "monthly" });
    expect(result).toEqual({ state: "ACTIVE", price: "199.00" });
  });

  it("patches an existing subscription, keeps its other base plans and listings, and stops selling the other period", async () => {
    const existing = {
      packageName: "com.ada.app",
      productId: "plan_pmpro_3",
      listings: [{ languageCode: "en-US", title: "Old" }, { languageCode: "ar", title: "ذهبي" }],
      basePlans: [{ basePlanId: "monthly", state: "ACTIVE", autoRenewingBasePlanType: { billingPeriodDuration: "P1M" } }],
    };
    const { deps, calls } = google(
      convert,
      on("GET", `${APP}/subscriptions/plan_pmpro_3`, { body: existing }),
      (call) =>
        call.method === "PATCH" && call.url.startsWith(`${APP}/subscriptions/plan_pmpro_3?`)
          ? {
              body: {
                ...existing,
                basePlans: [
                  { basePlanId: "monthly", state: "ACTIVE" },
                  { basePlanId: "yearly", state: "DRAFT", regionalConfigs: [{ regionCode: "TR", price: { currencyCode: "TRY", units: "2399", nanos: 0 }, newSubscriberAvailability: true }] },
                ],
              },
            }
          : undefined,
      (call) => (call.method === "POST" && call.url.includes("/basePlans/") ? { body: {} } : undefined),
    );
    const result = await upsertSubscription(deps, { productId: "plan_pmpro_3", title: "Gold", description: "Every course", period: "year", price: { currency: "TRY", amount: "1990.00" } });
    expect(result).toEqual({ state: "ACTIVE", price: "2399.00" });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      `POST ${APP}/pricing:convertRegionPrices`,
      `GET ${APP}/subscriptions/plan_pmpro_3`,
      `PATCH ${APP}/subscriptions/plan_pmpro_3?regionsVersion.version=2025%2F03&updateMask=listings%2CbasePlans`,
      `POST ${APP}/subscriptions/plan_pmpro_3/basePlans/monthly:deactivate`,
      `POST ${APP}/subscriptions/plan_pmpro_3/basePlans/yearly:activate`,
    ]);
    const body = calls[2]?.body as { listings: { languageCode: string }[]; basePlans: { basePlanId: string; state?: string; autoRenewingBasePlanType: unknown }[] };
    expect(body.listings.map((l) => l.languageCode)).toEqual(["en-US", "ar"]);
    expect(body.basePlans.map((b) => b.basePlanId)).toEqual(["monthly", "yearly"]);
    expect(body.basePlans[0]?.state).toBeUndefined();
    expect(body.basePlans[1]?.autoRenewingBasePlanType).toEqual({ billingPeriodDuration: "P1Y" });
  });

  it("stops selling without deleting, and does nothing for a product that isn't there", async () => {
    const one = google(
      on("GET", `${APP}/oneTimeProducts/course_12`, { body: { productId: "course_12", purchaseOptions: [{ purchaseOptionId: "buy", state: "ACTIVE" }] } }),
      on("POST", `${APP}/oneTimeProducts/course_12/purchaseOptions:batchUpdateStates`, { body: {} }),
    );
    await deactivateProduct(one.deps, { productId: "course_12", type: "one_time" });
    expect(one.calls.map((c) => c.method)).toEqual(["GET", "POST"]);
    expect(one.calls[1]?.body).toEqual({ requests: [{ deactivatePurchaseOptionRequest: { packageName: "com.ada.app", productId: "course_12", purchaseOptionId: "buy" } }] });

    const sub = google(
      on("GET", `${APP}/subscriptions/plan_1`, { body: { basePlans: [{ basePlanId: "monthly", state: "ACTIVE" }, { basePlanId: "yearly", state: "INACTIVE" }] } }),
      on("POST", `${APP}/subscriptions/plan_1/basePlans/monthly:deactivate`, { body: {} }),
    );
    await deactivateProduct(sub.deps, { productId: "plan_1", type: "subscription" });
    expect(sub.calls.map((c) => `${c.method} ${c.url}`)).toEqual([`GET ${APP}/subscriptions/plan_1`, `POST ${APP}/subscriptions/plan_1/basePlans/monthly:deactivate`]);

    const gone = google();
    await deactivateProduct(gone.deps, { productId: "course_9", type: "one_time" });
    await deactivateProduct(gone.deps, { productId: "plan_9", type: "subscription" });
    expect(gone.calls.every((c) => c.method === "GET")).toBe(true);
    expect(gone.calls.some((c) => c.method === "DELETE")).toBe(false);
  });

  it("reads the app's default language through an edit it then deletes", async () => {
    const { deps, calls } = google(
      on("POST", `${APP}/edits`, { body: { id: "edit-7", expiryTimeSeconds: "1793000000" } }),
      on("GET", `${APP}/edits/edit-7/details`, { body: { defaultLanguage: "tr-TR", contactEmail: "ada@academy.test" } }),
      on("DELETE", `${APP}/edits/edit-7`, {}),
    );
    expect(await playDefaultLanguage(deps)).toBe("tr-TR");
    expect(calls.map((c) => c.method)).toEqual(["POST", "GET", "DELETE"]);
  });
});

describe("100.2 Google Play errors", () => {
  it("maps Google's answers to codes", async () => {
    for (const [status, code] of [
      [401, "google_refused"],
      [403, "google_refused"],
      [404, "google_not_found"],
      [500, "google_failed"],
      [429, "google_failed"],
    ] as const) {
      const { deps } = google(() => ({ status, body: { error: { code: status } } }));
      await expect(checkGoogleBilling(deps)).rejects.toMatchObject({ code, status });
    }
    const down = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(checkGoogleBilling({ fetcher: down, token: "t", packageName: "com.ada.app" })).rejects.toMatchObject({ code: "google_failed" });
    const garbled = (async () => new Response("<html>", { status: 200 })) as unknown as typeof fetch;
    await expect(checkGoogleBilling({ fetcher: garbled, token: "t", packageName: "com.ada.app" })).rejects.toMatchObject({ code: "google_invalid" });
  });

  it("checks the service account with one cheap read", async () => {
    const { deps, calls } = google(on("GET", `${APP}/oneTimeProducts?pageSize=1`, { body: { oneTimeProducts: [] } }));
    await checkGoogleBilling(deps);
    expect(calls).toHaveLength(1);
    const refused = google(() => ({ status: 403, body: { error: { code: 403, message: "The caller does not have permission", status: "PERMISSION_DENIED" } } }));
    const error = await checkGoogleBilling(refused.deps).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GoogleBillingError);
    expect((error as GoogleBillingError).code).toBe("google_refused");
    expect((error as GoogleBillingError).message).toContain("manage store presence and orders");
  });

  it("calls a refused service account key google_key", async () => {
    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const fetcher = (async () => Response.json({ error: "invalid_grant" }, { status: 400 })) as unknown as typeof fetch;
    await expect(googleBillingToken(fetcher, JSON.stringify({ client_email: "billing@ada.iam.gserviceaccount.com", private_key: rsa }), NOW)).rejects.toMatchObject({ code: "google_key" });
    const ok = (async () => Response.json({ access_token: "ya29.ok" })) as unknown as typeof fetch;
    expect(await googleBillingToken(ok, JSON.stringify({ client_email: "billing@ada.iam.gserviceaccount.com", private_key: rsa }), NOW)).toBe("ya29.ok");
  });
});

describe("100.3 Google Play purchases", () => {
  const productPurchase = (extra: object) => ({
    kind: "androidpublisher#productPurchaseV2",
    productLineItem: [{ productId: "course_12", productOfferDetails: { purchaseOptionId: "buy", quantity: 1, refundableQuantity: 1, consumptionState: "CONSUMPTION_STATE_YET_TO_BE_CONSUMED" } }],
    purchaseStateContext: { purchaseState: "PURCHASED" },
    purchaseCompletionTime: "2026-10-12T09:58:00.123Z",
    orderId: "GPA.3398-1234-5678-90123",
    obfuscatedExternalAccountId: "u-4f2a",
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
    regionCode: "TR",
    ...extra,
  });

  it("reads a one-time purchase", async () => {
    const { deps, calls } = google(on("GET", `${APP}/purchases/productsv2/tokens/tok%2Fen.1`, { body: productPurchase({}) }));
    expect(await readProductPurchase(deps, "tok/en.1")).toEqual({
      productId: "course_12",
      orderId: "GPA.3398-1234-5678-90123",
      state: "purchased",
      acknowledged: false,
      obfuscatedAccountId: "u-4f2a",
      refunded: false,
      test: false,
    });
    expect(calls[0]?.method).toBe("GET");
  });

  it("maps pending, cancelled, refunded, acknowledged and test purchases", async () => {
    const read = async (extra: object) => readProductPurchase(google(() => ({ body: productPurchase(extra) })).deps, "t");
    expect(await read({ purchaseStateContext: { purchaseState: "PENDING" }, purchaseCompletionTime: undefined, orderId: undefined })).toMatchObject({ state: "pending", orderId: null, refunded: false });
    expect(await read({ purchaseStateContext: { purchaseState: "CANCELLED" }, purchaseCompletionTime: undefined })).toMatchObject({ state: "cancelled", refunded: false });
    expect(await read({ purchaseStateContext: { purchaseState: "CANCELLED" } })).toMatchObject({ state: "cancelled", refunded: true });
    expect(await read({ productLineItem: [{ productId: "course_12", productOfferDetails: { quantity: 1, refundableQuantity: 0 } }] })).toMatchObject({ refunded: true });
    expect(await read({ acknowledgementState: "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED", testPurchaseContext: { fopType: "TEST" } })).toMatchObject({ acknowledged: true, test: true });
    await expect(read({ purchaseStateContext: { purchaseState: "PURCHASE_STATE_UNSPECIFIED" } })).rejects.toMatchObject({ code: "google_invalid" });
    await expect(read({ productLineItem: [] })).rejects.toMatchObject({ code: "google_invalid" });
  });

  it("acknowledges one-time purchases and subscriptions", async () => {
    const { deps, calls } = google((call) => (call.method === "POST" && call.url.endsWith(":acknowledge") ? {} : undefined));
    await acknowledgeProductPurchase(deps, { productId: "course_12", purchaseToken: "tok1" });
    await acknowledgeSubscription(deps, { productId: "plan_pmpro_3", purchaseToken: "tok2" });
    expect(calls.map((c) => [c.method, c.url, c.body])).toEqual([
      ["POST", `${APP}/purchases/products/course_12/tokens/tok1:acknowledge`, {}],
      ["POST", `${APP}/purchases/subscriptions/plan_pmpro_3/tokens/tok2:acknowledge`, {}],
    ]);
  });

  const subscriptionPurchase = (extra: object) => ({
    kind: "androidpublisher#subscriptionPurchaseV2",
    startTime: "2026-09-12T10:00:00.000Z",
    regionCode: "TR",
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    latestOrderId: "GPA.3311-2222-3333-44444..1",
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    externalAccountIdentifiers: { obfuscatedExternalAccountId: "u-4f2a" },
    lineItems: [
      {
        productId: "plan_pmpro_3",
        expiryTime: "2026-11-12T10:00:00.000Z",
        autoRenewingPlan: { autoRenewEnabled: true, recurringPrice: { currencyCode: "TRY", units: "199" } },
        offerDetails: { basePlanId: "monthly" },
        latestSuccessfulOrderId: "GPA.3311-2222-3333-44444..1",
      },
    ],
    ...extra,
  });

  it("reads a subscription", async () => {
    const { deps, calls } = google(on("GET", `${APP}/purchases/subscriptionsv2/tokens/sub1`, { body: subscriptionPurchase({}) }));
    expect(await readSubscriptionPurchase(deps, "sub1")).toEqual({
      productId: "plan_pmpro_3",
      latestOrderId: "GPA.3311-2222-3333-44444..1",
      state: "active",
      expiresAt: new Date("2026-11-12T10:00:00.000Z"),
      acknowledged: true,
      autoRenewing: true,
      obfuscatedAccountId: "u-4f2a",
      test: false,
    });
    expect(calls).toHaveLength(1);
  });

  it("maps Google's subscription states", async () => {
    const states = {
      SUBSCRIPTION_STATE_PENDING: "pending",
      SUBSCRIPTION_STATE_ACTIVE: "active",
      SUBSCRIPTION_STATE_PAUSED: "paused",
      SUBSCRIPTION_STATE_IN_GRACE_PERIOD: "grace",
      SUBSCRIPTION_STATE_ON_HOLD: "on_hold",
      SUBSCRIPTION_STATE_CANCELED: "cancelled",
      SUBSCRIPTION_STATE_EXPIRED: "expired",
      SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: "expired",
    };
    for (const [google_, ours] of Object.entries(states)) {
      const { deps } = google(() => ({ body: subscriptionPurchase({ subscriptionState: google_ }) }));
      expect((await readSubscriptionPurchase(deps, "s")).state).toBe(ours);
    }
    const unknown = google(() => ({ body: subscriptionPurchase({ subscriptionState: "SUBSCRIPTION_STATE_UNSPECIFIED" }) }));
    await expect(readSubscriptionPurchase(unknown.deps, "s")).rejects.toMatchObject({ code: "google_invalid" });
    const pending = google(() => ({
      body: subscriptionPurchase({ subscriptionState: "SUBSCRIPTION_STATE_PENDING", acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING", externalAccountIdentifiers: undefined, lineItems: [{ productId: "plan_pmpro_3" }], testPurchase: {} }),
    }));
    expect(await readSubscriptionPurchase(pending.deps, "s")).toMatchObject({ expiresAt: null, acknowledged: false, autoRenewing: false, obfuscatedAccountId: null, latestOrderId: null, test: true });
  });

  it("lists voided purchases, subscriptions included, page by page", async () => {
    const { deps, calls } = google((call) =>
      call.url.startsWith(`${APP}/purchases/voidedpurchases?`)
        ? {
            body: {
              pageInfo: { totalResults: 4, resultPerPage: 4, startIndex: 0 },
              tokenPagination: { nextPageToken: "next-1" },
              voidedPurchases: [
                { kind: "androidpublisher#voidedPurchase", purchaseToken: "a", orderId: "GPA.1", purchaseTimeMillis: "1760000000000", voidedTimeMillis: "1760200000000", voidedSource: 0, voidedReason: 1 },
                { kind: "androidpublisher#voidedPurchase", purchaseToken: "b", orderId: "GPA.2", purchaseTimeMillis: "1760000000000", voidedTimeMillis: "1760200000001", voidedSource: 2, voidedReason: 7 },
                { kind: "androidpublisher#voidedPurchase", purchaseToken: "c", orderId: "GPA.3", purchaseTimeMillis: "1760000000000", voidedTimeMillis: "1760200000002", voidedSource: 2, voidedReason: 5 },
                { kind: "androidpublisher#voidedPurchase", purchaseToken: "d", orderId: "GPA.4", purchaseTimeMillis: "1760000000000", voidedTimeMillis: "1760200000003", voidedSource: 1, voidedReason: 0 },
              ],
            },
          }
        : undefined,
    );
    const since = new Date("2026-10-11T10:00:00Z");
    const page = await listVoidedPurchases(deps, { since });
    expect(calls[0]?.url).toBe(`${APP}/purchases/voidedpurchases?type=1&startTime=${since.getTime()}`);
    expect(page.nextPageToken).toBe("next-1");
    expect(page.items).toEqual([
      { purchaseToken: "a", orderId: "GPA.1", voidedAt: new Date(1760200000000), reason: "refund" },
      { purchaseToken: "b", orderId: "GPA.2", voidedAt: new Date(1760200000001), reason: "chargeback" },
      { purchaseToken: "c", orderId: "GPA.3", voidedAt: new Date(1760200000002), reason: "revoked" },
      { purchaseToken: "d", orderId: "GPA.4", voidedAt: new Date(1760200000003), reason: "other" },
    ]);
    await listVoidedPurchases(deps, { since: new Date("2026-01-01T00:00:00Z"), pageToken: "next-1", now: NOW });
    const url = new URL(calls[1]?.url ?? "");
    expect(url.searchParams.get("token")).toBe("next-1");
    expect(Number(url.searchParams.get("startTime"))).toBeGreaterThan(NOW.getTime() - 30 * 86_400_000);
  });

  it("answers no next page at the end", async () => {
    const { deps } = google(() => ({ body: {} }));
    expect(await listVoidedPurchases(deps, { since: NOW })).toEqual({ items: [], nextPageToken: null });
  });
});

describe("100.3 Pub/Sub push from Google", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "key-1", alg: "RS256", use: "sig" };
  const AUDIENCE = "https://yallapp.com.tr/api/platform/billing/notifications/google";
  const nowS = Math.floor(NOW.getTime() / 1000);

  function jwt(claims: Record<string, unknown>, options: { kid?: string; key?: typeof privateKey; alg?: string } = {}) {
    const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const unsigned = `${b64({ alg: options.alg ?? "RS256", kid: options.kid ?? "key-1", typ: "JWT" })}.${b64({
      aud: AUDIENCE,
      azp: "112233445566778899000",
      email: "pubsub-push@yallapp.iam.gserviceaccount.com",
      email_verified: true,
      exp: nowS + 3000,
      iat: nowS - 600,
      iss: "https://accounts.google.com",
      sub: "112233445566778899000",
      ...claims,
    })}`;
    const signature = createSign("RSA-SHA256").update(unsigned).sign(options.key ?? privateKey).toString("base64url");
    return `Bearer ${unsigned}.${signature}`;
  }

  function certs() {
    const calls: string[] = [];
    const fetcher = (async (url: string) => {
      calls.push(String(url));
      return Response.json({ keys: [jwk, { kty: "RSA", kid: "key-0", n: "AQAB", e: "AQAB", alg: "RS256" }] });
    }) as unknown as typeof fetch;
    return { fetcher, calls };
  }

  beforeEach(() => resetGoogleCerts());

  it("accepts Google's token and answers the service account, fetching the certificates once an hour", async () => {
    const { fetcher, calls } = certs();
    expect(await verifyPubSubPush(jwt({}), { audience: AUDIENCE, now: NOW, fetcher })).toBe("pubsub-push@yallapp.iam.gserviceaccount.com");
    expect(await verifyPubSubPush(jwt({ iss: "accounts.google.com" }), { audience: AUDIENCE, now: new Date(NOW.getTime() + 1000), fetcher })).toBe("pubsub-push@yallapp.iam.gserviceaccount.com");
    expect(calls).toEqual([GOOGLE_CERTS_URL]);
    await verifyPubSubPush(jwt({ exp: nowS + 7200 }), { audience: AUDIENCE, now: new Date(NOW.getTime() + 3_700_000), fetcher });
    expect(calls).toHaveLength(2);
  });

  it("refuses a wrong audience, an expired token, a bad signature, another issuer and a missing header", async () => {
    const { fetcher } = certs();
    const check = (header: string | null) => verifyPubSubPush(header, { audience: AUDIENCE, now: NOW, fetcher });
    await expect(check(jwt({ aud: "https://elsewhere.test/push" }))).rejects.toMatchObject({ code: "google_invalid" });
    await expect(check(jwt({ exp: nowS - 3600 }))).rejects.toMatchObject({ code: "google_invalid" });
    await expect(check(jwt({}, { key: other.privateKey }))).rejects.toMatchObject({ code: "google_invalid" });
    await expect(check(jwt({}, { kid: "key-0" }))).rejects.toMatchObject({ code: "google_invalid" });
    await expect(check(jwt({}, { kid: "unknown" }))).rejects.toMatchObject({ code: "google_invalid" });
    await expect(check(jwt({}, { alg: "HS256" }))).rejects.toMatchObject({ code: "google_invalid" });
    await expect(check(jwt({ iss: "https://evil.test" }))).rejects.toMatchObject({ code: "google_invalid" });
    await expect(check(jwt({ email: undefined }))).rejects.toMatchObject({ code: "google_invalid" });
    await expect(check(jwt({ email_verified: false }))).rejects.toMatchObject({ code: "google_invalid" });
    await expect(check(null)).rejects.toMatchObject({ code: "google_invalid" });
    await expect(check("Bearer nope")).rejects.toMatchObject({ code: "google_invalid" });
    const tampered = jwt({}).replace(/^Bearer ([^.]+)\.[^.]+\./, (_m, h: string) => `Bearer ${h}.${Buffer.from(JSON.stringify({ aud: AUDIENCE, iss: "https://accounts.google.com", exp: nowS + 3000, email: "attacker@evil.test" })).toString("base64url")}.`);
    await expect(check(tampered)).rejects.toMatchObject({ code: "google_invalid" });
  });

  it("says google_failed when Google's certificates can't be fetched", async () => {
    const down = (async () => new Response("unavailable", { status: 503 })) as unknown as typeof fetch;
    await expect(verifyPubSubPush(jwt({}), { audience: AUDIENCE, now: NOW, fetcher: down })).rejects.toMatchObject({ code: "google_failed" });
  });
});

describe("100.3 Google's developer notifications", () => {
  const data = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64");

  it("reads each kind", () => {
    expect(
      parseDeveloperNotification(
        data({ version: "1.0", packageName: "com.ada.app", eventTimeMillis: "1760200000000", oneTimeProductNotification: { version: "1.0", notificationType: 1, purchaseToken: "p1", sku: "course_12" } }),
      ),
    ).toEqual({ packageName: "com.ada.app", oneTime: { purchaseToken: "p1", sku: "course_12", notificationType: 1 } });
    expect(parseDeveloperNotification(data({ version: "1.0", packageName: "com.ada.app", subscriptionNotification: { version: "1.0", notificationType: 2, purchaseToken: "s1" } }))).toEqual({
      packageName: "com.ada.app",
      subscription: { purchaseToken: "s1", subscriptionId: null, notificationType: 2 },
    });
    expect(
      parseDeveloperNotification(data({ packageName: "com.ada.app", subscriptionNotification: { notificationType: "13", purchaseToken: "s1", subscriptionId: "plan_pmpro_3" } }))?.subscription,
    ).toEqual({ purchaseToken: "s1", subscriptionId: "plan_pmpro_3", notificationType: 13 });
    expect(parseDeveloperNotification(data({ packageName: "com.ada.app", voidedPurchaseNotification: { purchaseToken: "v1", orderId: "GPA.1", productType: 2, refundType: 1 } }))).toEqual({
      packageName: "com.ada.app",
      voided: { purchaseToken: "v1", orderId: "GPA.1", refundType: 1, productType: "one_time" },
    });
    expect(parseDeveloperNotification(data({ version: "1.0", packageName: "com.ada.app", testNotification: { version: "1.0" } }))).toEqual({ packageName: "com.ada.app", test: true });
    expect(parseDeveloperNotification(data({ packageName: "com.ada.app", pendingRefundReviewNotification: { orderId: "GPA.1" } }))).toEqual({ packageName: "com.ada.app" });
  });

  it("answers null for what isn't a notification", () => {
    expect(parseDeveloperNotification("not base64 json")).toBeNull();
    expect(parseDeveloperNotification(data({ oneTimeProductNotification: { notificationType: 1, purchaseToken: "p", sku: "s" } }))).toBeNull();
    expect(parseDeveloperNotification(data({ packageName: "com.ada.app", oneTimeProductNotification: { notificationType: 1 } }))).toBeNull();
    expect(parseDeveloperNotification(Buffer.from("[1,2]").toString("base64"))).toBeNull();
    expect(parseDeveloperNotification("")).toBeNull();
  });
});
