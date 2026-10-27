import { verify, X509Certificate } from "node:crypto";
import { appleToken, type AppleCredentials } from "../publishing/review";
import { APPLE_ROOT_CA_G3 } from "./apple-root";

/**
 * 100.2 / 100.3 The App Store side of in-app purchases. The store products are
 * made and kept in step through the App Store Connect API with the app's own
 * key (the one used for publishing); purchases and App Store Server
 * Notifications arrive as JWS signed by Apple and are checked offline against
 * Apple Root CA - G3.
 *
 * Request shapes follow Apple's App Store Connect API (4.4.1 and later):
 * display names and descriptions live on a product *version*
 * (inAppPurchaseVersions, subscriptionVersions, subscriptionGroupVersions,
 * with /v2 localizations), a subscription's territories on its plan
 * availability (planType UPFRONT), an In-App Purchase's price is one manual
 * price in a base territory that Apple equalizes, and a subscription's price
 * is set territory by territory from the base price point's equalizations.
 */

export type AppleBillingErrorCode = "apple_refused" | "apple_not_found" | "apple_failed" | "apple_invalid" | "apple_no_app";

export class AppleBillingError extends Error {
  constructor(
    readonly code: AppleBillingErrorCode,
    /** Apple's own words (its `errors[0].detail`), or why a signed payload was refused. */
    readonly detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "AppleBillingError";
  }
}

// App Store Connect ------------------------------------------------------------

const ASC = "https://api.appstoreconnect.apple.com";
const LOCALE = "en-US";

interface Resource {
  id: string;
  type?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { id: string; type: string } | null }>;
}
interface Document {
  data?: Resource | Resource[] | null;
  links?: { next?: string };
}

type Call = (method: "GET" | "POST" | "PATCH", path: string, body?: unknown) => Promise<Document>;

/** One authorised caller per operation: 401/403 refused, 404 not found, 409/422 Apple refused the content. */
function connect(fetcher: typeof fetch, credentials: AppleCredentials, now: Date): Call {
  const headers = { authorization: `Bearer ${appleToken(credentials, now)}`, accept: "application/json", "content-type": "application/json" };
  return async (method, path, body) => {
    let response: Response;
    try {
      response = await fetcher(path.startsWith("https://") ? path : `${ASC}${path}`, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new AppleBillingError("apple_failed");
    }
    if (!response.ok) {
      const answer = (await response.json().catch(() => ({}))) as { errors?: { detail?: string; title?: string }[] };
      const detail = answer.errors?.[0]?.detail ?? answer.errors?.[0]?.title;
      const status = response.status;
      const code = status === 401 || status === 403 ? "apple_refused" : status === 404 ? "apple_not_found" : status === 409 || status === 422 ? "apple_invalid" : "apple_failed";
      throw new AppleBillingError(code, detail);
    }
    if (response.status === 204) return {};
    return (await response.json().catch(() => ({}))) as Document;
  };
}

const list = (doc: Document): Resource[] => (Array.isArray(doc.data) ? doc.data : []);
const one = (doc: Document): Resource => {
  if (!doc.data || Array.isArray(doc.data)) throw new AppleBillingError("apple_failed", "no resource in Apple's answer");
  return doc.data;
};
const q = encodeURIComponent;
const ref = (type: string, id: string) => ({ data: { type, id } });
const related = (item: Resource, name: string) => item.relationships?.[name]?.data?.id;

/** Every page of a list (Apple's `links.next`), up to 20 pages. */
async function listAll(call: Call, path: string): Promise<Resource[]> {
  const out: Resource[] = [];
  let next: string | undefined = path;
  for (let page = 0; next && page < 20; page++) {
    const doc = await call("GET", next);
    out.push(...list(doc));
    next = doc.links?.next;
  }
  return out;
}

/** The App Store Connect app (its Apple ID) with this bundle ID. */
export async function findAppleAppId(fetcher: typeof fetch, credentials: AppleCredentials, bundleId: string, now: Date): Promise<string> {
  const call = connect(fetcher, credentials, now);
  const apps = list(await call("GET", `/v1/apps?filter[bundleId]=${q(bundleId)}&limit=1`));
  const app = apps.find((item) => item.attributes?.bundleId === undefined || item.attributes.bundleId === bundleId);
  if (!app) throw new AppleBillingError("apple_no_app");
  return app.id;
}

export interface ApplePricePoint {
  id: string;
  /** As Apple gives it, in the territory's currency ("4.99", "499.0"). */
  customerPrice: string;
}

/** The store price closest to the site price (ties: the lower one); free points are left out. */
export function nearestPricePoint<T extends ApplePricePoint>(points: readonly T[], amount: number): T | null {
  let best: T | null = null;
  for (const point of points) {
    const price = Number(point.customerPrice);
    if (!(price > 0)) continue;
    if (!best) {
      best = point;
      continue;
    }
    const gap = Math.abs(price - amount);
    const bestPrice = Number(best.customerPrice);
    const bestGap = Math.abs(bestPrice - amount);
    if (gap < bestGap - 1e-9 || (Math.abs(gap - bestGap) <= 1e-9 && price < bestPrice)) best = point;
  }
  return best;
}

const TERRITORIES: Record<string, string> = {
  TRY: "TUR",
  EGP: "EGY",
  SAR: "SAU",
  AED: "ARE",
  KWD: "KWT",
  QAR: "QAT",
  JOD: "JOR",
  USD: "USA",
  EUR: "DEU",
  GBP: "GBR",
};

/** The App Store territory whose prices are in this currency (the base of the price). */
export function territoryFor(currency: string): string {
  return TERRITORIES[currency.toUpperCase()] ?? "USA";
}

const pricePoints = (items: Resource[]): ApplePricePoint[] => items.map((item) => ({ id: item.id, customerPrice: String(item.attributes?.customerPrice ?? "") }));

function choosePoint(points: ApplePricePoint[], price: StorePrice, territory: string): ApplePricePoint {
  const point = nearestPricePoint(points, price.amount);
  if (!point) throw new AppleBillingError("apple_failed", `no price points in ${territory}`);
  return point;
}

/** Every App Store territory (175 today). */
async function allTerritories(call: Call): Promise<string[]> {
  return (await listAll(call, "/v1/territories?limit=200")).map((item) => item.id);
}

/**
 * App Store Connect's limits (App Store Connect Help › In-App Purchase
 * information): reference name 64 characters, display name 2 to 30,
 * description 45. Cut by characters, not UTF-16 units.
 */
export const APPLE_LIMITS = { referenceName: 64, displayName: 30, description: 45 } as const;
const clip = (value: string, max: number) => Array.from(value.replace(/\s+/g, " ").trim()).slice(0, max).join("").trim();
function displayName(title: string): string {
  const name = clip(title, APPLE_LIMITS.displayName);
  if (Array.from(name).length < 2) throw new AppleBillingError("apple_invalid", "the display name needs at least two characters");
  return name;
}

export interface StorePrice {
  currency: string;
  amount: number;
}

export interface AppleProductResult {
  /** The product's state (MISSING_METADATA, READY_TO_SUBMIT, WAITING_FOR_REVIEW, APPROVED, …). */
  state: string;
  /** The state of its newest metadata version (PREPARE_FOR_SUBMISSION, WAITING_FOR_REVIEW, APPROVED, …). */
  versionState: string | null;
  /** The base territory's customer price, as Apple gives it ("4.99"). */
  price: string;
  territory: string;
}

/** The three kinds of products whose English text lives on a version. */
const FAMILIES = {
  iap: { versions: (id: string) => `/v2/inAppPurchases/${q(id)}/versions?limit=50`, version: "inAppPurchaseVersions", parent: "inAppPurchase", parentType: "inAppPurchases", text: "inAppPurchaseLocalizations" },
  subscription: { versions: (id: string) => `/v1/subscriptions/${q(id)}/versions?limit=50`, version: "subscriptionVersions", parent: "subscription", parentType: "subscriptions", text: "subscriptionLocalizations" },
  group: { versions: (id: string) => `/v1/subscriptionGroups/${q(id)}/versions?limit=50`, version: "subscriptionGroupVersions", parent: "subscriptionGroup", parentType: "subscriptionGroups", text: "subscriptionGroupLocalizations" },
} as const;

/** Versions waiting for or in App Review can't take new text; it goes in with the next sync. */
const LOCKED = new Set(["READY_FOR_REVIEW", "WAITING_FOR_REVIEW", "IN_REVIEW"]);

/**
 * The English text of a product: unchanged when its newest version already
 * says it; otherwise written into the open draft (PREPARE_FOR_SUBMISSION) or a
 * new version. Returns the state of the version holding it.
 */
async function upsertText(call: Call, family: keyof typeof FAMILIES, parentId: string, attributes: { name: string; description?: string }): Promise<string | null> {
  const f = FAMILIES[family];
  const versions = list(await call("GET", f.versions(parentId)));
  const draft = versions.find((item) => item.attributes?.state === "PREPARE_FOR_SUBMISSION");
  const newest = draft ?? [...versions].sort((a, b) => Number(b.attributes?.version ?? 0) - Number(a.attributes?.version ?? 0))[0];
  const english = async (versionId: string) =>
    list(await call("GET", `/v1/${f.version}/${q(versionId)}/localizations?limit=50`)).find((item) => item.attributes?.locale === LOCALE);
  const stateOf = (item: Resource | undefined) => (item?.attributes?.state ? String(item.attributes.state) : null);

  let current = newest ? await english(newest.id) : undefined;
  const same = current && current.attributes?.name === attributes.name && (attributes.description === undefined || current.attributes?.description === attributes.description);
  if (same) return stateOf(newest);
  if (!draft && newest && LOCKED.has(String(newest.attributes?.state))) return stateOf(newest);

  const version = draft ?? one(await call("POST", `/v1/${f.version}`, { data: { type: f.version, relationships: { [f.parent]: ref(f.parentType, parentId) } } }));
  if (!draft) current = await english(version.id);
  if (current) {
    await call("PATCH", `/v2/${f.text}/${q(current.id)}`, { data: { type: f.text, id: current.id, attributes } });
  } else {
    await call("POST", `/v2/${f.text}`, { data: { type: f.text, attributes: { ...attributes, locale: LOCALE }, relationships: { version: ref(f.version, version.id) } } });
  }
  return stateOf(version) ?? "PREPARE_FOR_SUBMISSION";
}

/** A one-time product (a paid course): made or found by product ID, then its English text, price and availability. */
export async function upsertNonConsumable(
  fetcher: typeof fetch,
  credentials: AppleCredentials,
  input: { appId: string; productId: string; referenceName: string; title: string; description: string; price: StorePrice },
  now: Date,
): Promise<AppleProductResult & { iapId: string }> {
  const call = connect(fetcher, credentials, now);
  const found = list(await call("GET", `/v1/apps/${q(input.appId)}/inAppPurchasesV2?filter[productId]=${q(input.productId)}&limit=1`)).find(
    (item) => item.attributes?.productId === input.productId,
  );
  const iap =
    found ??
    one(
      await call("POST", "/v2/inAppPurchases", {
        data: {
          type: "inAppPurchases",
          attributes: { name: clip(input.referenceName, APPLE_LIMITS.referenceName), productId: input.productId, inAppPurchaseType: "NON_CONSUMABLE" },
          relationships: { app: ref("apps", input.appId) },
        },
      }),
    );
  const id = iap.id;

  const versionState = await upsertText(call, "iap", id, { name: displayName(input.title), description: clip(input.description, APPLE_LIMITS.description) });

  // Sold everywhere, and in territories Apple adds later (a POST replaces the availability).
  const territories = await allTerritories(call);
  await call("POST", "/v1/inAppPurchaseAvailabilities", {
    data: {
      type: "inAppPurchaseAvailabilities",
      attributes: { availableInNewTerritories: true },
      relationships: { inAppPurchase: ref("inAppPurchases", id), availableTerritories: { data: territories.map((t) => ({ type: "territories", id: t })) } },
    },
  });

  // One manual price in the base territory; Apple equalizes the others. Skipped when it's already the price.
  const territory = territoryFor(input.price.currency);
  const point = choosePoint(pricePoints(list(await call("GET", `/v2/inAppPurchases/${q(id)}/pricePoints?filter[territory]=${q(territory)}&limit=8000`))), input.price, territory);
  const manual = found
    ? await call("GET", `/v1/inAppPurchasePriceSchedules/${q(id)}/manualPrices?filter[territory]=${q(territory)}&include=inAppPurchasePricePoint&limit=50`).catch((error: unknown) => {
        if (error instanceof AppleBillingError && error.code === "apple_not_found") return {};
        throw error;
      })
    : {};
  const currentPoint = list(manual).find((item) => !item.attributes?.startDate);
  if (!currentPoint || related(currentPoint, "inAppPurchasePricePoint") !== point.id) {
    await call("POST", "/v1/inAppPurchasePriceSchedules", {
      data: {
        type: "inAppPurchasePriceSchedules",
        relationships: {
          inAppPurchase: ref("inAppPurchases", id),
          baseTerritory: ref("territories", territory),
          manualPrices: { data: [{ type: "inAppPurchasePrices", id: "${price}" }] },
        },
      },
      included: [
        {
          type: "inAppPurchasePrices",
          id: "${price}",
          attributes: { startDate: null },
          relationships: { inAppPurchaseV2: ref("inAppPurchases", id), inAppPurchasePricePoint: ref("inAppPurchasePricePoints", point.id) },
        },
      ],
    });
  }

  const fresh = one(await call("GET", `/v2/inAppPurchases/${q(id)}`));
  return { iapId: id, state: String(fresh.attributes?.state ?? iap.attributes?.state ?? ""), versionState, price: point.customerPrice, territory };
}

/** A subscription (a membership plan): its group, the subscription, their English text, availability and price. */
export async function upsertSubscription(
  fetcher: typeof fetch,
  credentials: AppleCredentials,
  input: {
    appId: string;
    groupReferenceName: string;
    /** The group's name in the App Store (defaults to its reference name). */
    groupTitle?: string;
    productId: string;
    referenceName: string;
    title: string;
    description: string;
    period: "month" | "year";
    price: StorePrice;
    /** 1 is the highest level; a plan's monthly and yearly products share one. */
    groupLevel?: number;
    /** Current subscribers keep their price when it changes (default); false moves them to the new one. */
    preserveCurrentPrice?: boolean;
  },
  now: Date,
): Promise<AppleProductResult & { subscriptionId: string; groupId: string }> {
  const call = connect(fetcher, credentials, now);
  const groupReference = clip(input.groupReferenceName, APPLE_LIMITS.referenceName);

  const group =
    list(await call("GET", `/v1/apps/${q(input.appId)}/subscriptionGroups?filter[referenceName]=${q(groupReference)}&limit=1`)).find(
      (item) => item.attributes?.referenceName === groupReference,
    ) ??
    one(
      await call("POST", "/v1/subscriptionGroups", {
        data: { type: "subscriptionGroups", attributes: { referenceName: groupReference }, relationships: { app: ref("apps", input.appId) } },
      }),
    );
  await upsertText(call, "group", group.id, { name: displayName(input.groupTitle ?? input.groupReferenceName) });

  const found = list(await call("GET", `/v1/subscriptionGroups/${q(group.id)}/subscriptions?filter[productId]=${q(input.productId)}&limit=1`)).find(
    (item) => item.attributes?.productId === input.productId,
  );
  const subscription =
    found ??
    one(
      await call("POST", "/v1/subscriptions", {
        data: {
          type: "subscriptions",
          attributes: {
            name: clip(input.referenceName, APPLE_LIMITS.referenceName),
            productId: input.productId,
            subscriptionPeriod: input.period === "year" ? "ONE_YEAR" : "ONE_MONTH",
            groupLevel: input.groupLevel ?? 1,
          },
          relationships: { group: ref("subscriptionGroups", group.id) },
        },
      }),
    );
  const id = subscription.id;

  const versionState = await upsertText(call, "subscription", id, { name: displayName(input.title), description: clip(input.description, APPLE_LIMITS.description) });

  // Sold everywhere, billed per period (planType UPFRONT): the plan availability is patched or made.
  const territories = (await allTerritories(call)).map((t) => ({ type: "territories", id: t }));
  const plan = found ? list(await call("GET", `/v1/subscriptions/${q(id)}/planAvailabilities?limit=200`)).find((item) => item.attributes?.planType === "UPFRONT") : undefined;
  if (plan) {
    await call("PATCH", `/v1/subscriptionPlanAvailabilities/${q(plan.id)}`, {
      data: { type: "subscriptionPlanAvailabilities", id: plan.id, attributes: { availableInNewTerritories: true }, relationships: { availableTerritories: { data: territories } } },
    });
  } else {
    await call("POST", "/v1/subscriptionPlanAvailabilities", {
      data: {
        type: "subscriptionPlanAvailabilities",
        attributes: { availableInNewTerritories: true, planType: "UPFRONT" },
        relationships: { subscription: ref("subscriptions", id), availableTerritories: { data: territories } },
      },
    });
  }

  // The price: the nearest point in the base territory and its equalizations elsewhere, one
  // subscriptionPrices each (Apple doesn't equalize subscriptions itself); unchanged territories are skipped.
  const territory = territoryFor(input.price.currency);
  const point = choosePoint(pricePoints(list(await call("GET", `/v1/subscriptions/${q(id)}/pricePoints?filter[territory]=${q(territory)}&limit=8000`))), input.price, territory);
  const equalized = list(await call("GET", `/v1/subscriptionPricePoints/${q(point.id)}/equalizations?include=territory&limit=8000`))
    .map((item) => ({ territory: related(item, "territory"), pointId: item.id }))
    .filter((item): item is { territory: string; pointId: string } => !!item.territory && item.territory !== territory);
  const today = now.toISOString().slice(0, 10);
  const current = new Map<string, { pointId: string | undefined; start: string }>();
  if (found) {
    for (const price of await listAll(call, `/v1/subscriptions/${q(id)}/prices?include=territory,subscriptionPricePoint&limit=200`)) {
      const at = related(price, "territory");
      const start = String(price.attributes?.startDate ?? "");
      if (!at || start > today) continue;
      const known = current.get(at);
      if (!known || start >= known.start) current.set(at, { pointId: related(price, "subscriptionPricePoint"), start });
    }
  }
  const changes = [{ territory, pointId: point.id }, ...equalized].filter((item) => current.get(item.territory)?.pointId !== item.pointId);
  for (let at = 0; at < changes.length; at += 5) {
    await Promise.all(
      changes.slice(at, at + 5).map((change) =>
        call("POST", "/v1/subscriptionPrices", {
          data: {
            type: "subscriptionPrices",
            attributes: { startDate: null, preserveCurrentPrice: input.preserveCurrentPrice ?? true },
            relationships: {
              subscription: ref("subscriptions", id),
              territory: ref("territories", change.territory),
              subscriptionPricePoint: ref("subscriptionPricePoints", change.pointId),
            },
          },
        }),
      ),
    );
  }

  const fresh = one(await call("GET", `/v1/subscriptions/${q(id)}`));
  return {
    subscriptionId: id,
    groupId: group.id,
    state: String(fresh.attributes?.state ?? subscription.attributes?.state ?? ""),
    versionState,
    price: point.customerPrice,
    territory,
  };
}

/**
 * 100.2 Stops selling a product no longer on the source: no territories and
 * none added later (a one-time product's availability; a subscription's plan
 * availability). Never deleted: people who bought keep it. Nothing to do when
 * it was never made.
 */
export async function removeFromSale(
  fetcher: typeof fetch,
  credentials: AppleCredentials,
  input: { appId: string; productId: string; type: "one_time" | "subscription"; groupReferenceName: string },
  now: Date,
): Promise<void> {
  const call = connect(fetcher, credentials, now);
  const none = { availableTerritories: { data: [] } };
  if (input.type === "one_time") {
    const iap = list(await call("GET", `/v1/apps/${q(input.appId)}/inAppPurchasesV2?filter[productId]=${q(input.productId)}&limit=1`)).find((item) => item.attributes?.productId === input.productId);
    if (!iap) return;
    await call("POST", "/v1/inAppPurchaseAvailabilities", {
      data: { type: "inAppPurchaseAvailabilities", attributes: { availableInNewTerritories: false }, relationships: { inAppPurchase: ref("inAppPurchases", iap.id), ...none } },
    });
    return;
  }
  const groupReference = clip(input.groupReferenceName, APPLE_LIMITS.referenceName);
  const group = list(await call("GET", `/v1/apps/${q(input.appId)}/subscriptionGroups?filter[referenceName]=${q(groupReference)}&limit=1`)).find((item) => item.attributes?.referenceName === groupReference);
  if (!group) return;
  const subscription = list(await call("GET", `/v1/subscriptionGroups/${q(group.id)}/subscriptions?filter[productId]=${q(input.productId)}&limit=1`)).find((item) => item.attributes?.productId === input.productId);
  if (!subscription) return;
  for (const plan of list(await call("GET", `/v1/subscriptions/${q(subscription.id)}/planAvailabilities?limit=200`))) {
    await call("PATCH", `/v1/subscriptionPlanAvailabilities/${q(plan.id)}`, { data: { type: "subscriptionPlanAvailabilities", id: plan.id, attributes: { availableInNewTerritories: false }, relationships: none } });
  }
}

/** Points the app's App Store Server Notifications (V2, production and sandbox) at Yallapp. */
export async function setNotificationUrls(fetcher: typeof fetch, credentials: AppleCredentials, appId: string, url: string, now: Date): Promise<void> {
  const call = connect(fetcher, credentials, now);
  await call("PATCH", `/v1/apps/${q(appId)}`, {
    data: {
      type: "apps",
      id: appId,
      attributes: {
        subscriptionStatusUrl: url,
        subscriptionStatusUrlVersion: "V2",
        subscriptionStatusUrlForSandbox: url,
        subscriptionStatusUrlVersionForSandbox: "V2",
      },
    },
  });
}

// Signed data (JWS) ------------------------------------------------------------

/** Marks Apple puts on its certificates: the leaf (receipt signing) and the intermediate (WWDR). */
const LEAF_OID = "1.2.840.113635.100.6.11.1";
const INTERMEDIATE_OID = "1.2.840.113635.100.6.2.1";

export interface JwsOptions {
  now: Date;
  /** Trusted roots (PEM); Apple Root CA - G3 by default. */
  rootCertificates?: readonly string[];
}

function refuse(detail: string): never {
  throw new AppleBillingError("apple_invalid", detail);
}

/**
 * Checks a JWS from Apple offline and returns its payload: ES256, an x5c chain
 * leaf → intermediate → root where the root is a trusted one, each certificate
 * signed by the next and valid at `now`, Apple's marks on the leaf and the
 * intermediate, then the signature with the leaf's key. Revocation (OCSP) is
 * not checked.
 */
export function verifyAppleJws(jws: string, options: JwsOptions): Record<string, unknown> {
  const parts = typeof jws === "string" ? jws.split(".") : [];
  if (parts.length !== 3 || parts.some((part) => !part)) refuse("not a JWS");
  const [head, body, signature] = parts as [string, string, string];
  const header = (parseJson(head) ?? {}) as { alg?: unknown; x5c?: unknown };
  if (header.alg !== "ES256") refuse("alg isn't ES256");
  const x5c = header.x5c;
  if (!Array.isArray(x5c) || x5c.length !== 3 || !x5c.every((item) => typeof item === "string")) refuse("x5c isn't a chain of three certificates");
  let chain: X509Certificate[] = [];
  try {
    chain = (x5c as string[]).map((item) => new X509Certificate(Buffer.from(item, "base64")));
  } catch {
    refuse("a certificate in x5c can't be read");
  }
  const [leaf, intermediate, root] = chain as [X509Certificate, X509Certificate, X509Certificate];

  const trusted = (options.rootCertificates ?? [APPLE_ROOT_CA_G3]).map((pem) => new X509Certificate(pem));
  if (!trusted.some((cert) => cert.raw.equals(root.raw))) refuse("the chain doesn't end at Apple's root");
  if (!root.verify(root.publicKey)) refuse("the root isn't self-signed");
  if (!intermediate.ca || !intermediate.checkIssued(root) || !intermediate.verify(root.publicKey)) refuse("the intermediate isn't signed by the root");
  if (!leaf.checkIssued(intermediate) || !leaf.verify(intermediate.publicKey)) refuse("the leaf isn't signed by the intermediate");
  const at = options.now.getTime();
  for (const cert of chain) {
    if (!(new Date(cert.validFrom).getTime() <= at && at <= new Date(cert.validTo).getTime())) refuse("a certificate isn't valid now");
  }
  if (!extensionOids(leaf.raw).includes(LEAF_OID)) refuse("the leaf lacks Apple's receipt signing mark");
  if (!extensionOids(intermediate.raw).includes(INTERMEDIATE_OID)) refuse("the intermediate lacks Apple's WWDR mark");

  const key = leaf.publicKey;
  if (key.asymmetricKeyType !== "ec" || key.asymmetricKeyDetails?.namedCurve !== "prime256v1") refuse("the leaf key isn't P-256");
  const ok = verify("sha256", Buffer.from(`${head}.${body}`), { key, dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url"));
  if (!ok) refuse("the signature doesn't match");
  const payload = parseJson(body);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) refuse("the payload isn't an object");
  return payload as Record<string, unknown>;
}

function parseJson(part: string): unknown {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return refuse("a JWS part isn't JSON");
  }
}

/** The OIDs of a certificate's extensions (DER: Certificate › tbsCertificate › [3] › Extensions). */
export function extensionOids(der: Buffer): string[] {
  const read = (buf: Buffer, at: number) => {
    const tag = buf[at] ?? -1;
    let length = buf[at + 1] ?? 0;
    let start = at + 2;
    if (length & 0x80) {
      const bytes = length & 0x7f;
      length = 0;
      for (let i = 0; i < bytes; i++) length = length * 256 + (buf[start + i] ?? 0);
      start += bytes;
    }
    return { tag, start, end: start + length };
  };
  const children = (buf: Buffer, from: number, to: number) => {
    const out: ReturnType<typeof read>[] = [];
    for (let at = from; at < to; ) {
      const item = read(buf, at);
      if (item.end > to) break;
      out.push(item);
      at = item.end;
    }
    return out;
  };
  const cert = read(der, 0);
  const tbs = children(der, cert.start, cert.end)[0];
  if (!tbs) return [];
  const wrapper = children(der, tbs.start, tbs.end).find((item) => item.tag === 0xa3);
  if (!wrapper) return [];
  const extensions = children(der, wrapper.start, wrapper.end)[0];
  if (!extensions) return [];
  return children(der, extensions.start, extensions.end).flatMap((extension) => {
    const oid = children(der, extension.start, extension.end)[0];
    return oid && oid.tag === 0x06 ? [decodeOid(der.subarray(oid.start, oid.end))] : [];
  });
}

function decodeOid(bytes: Buffer): string {
  const parts: number[] = [];
  let value = 0;
  for (const byte of bytes) {
    value = value * 128 + (byte & 0x7f);
    if (!(byte & 0x80)) {
      if (parts.length === 0) parts.push(Math.min(2, Math.floor(value / 40)), value - Math.min(2, Math.floor(value / 40)) * 40);
      else parts.push(value);
      value = 0;
    }
  }
  return parts.join(".");
}

export type AppleEnvironment = "Production" | "Sandbox";

export interface AppleTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  bundleId: string;
  purchaseDate: Date;
  expiresDate: Date | null;
  revocationDate: Date | null;
  /** 0: another reason, 1: an issue in the app (Apple's revocationReason). */
  revocationReason: number | null;
  /** "Non-Consumable", "Auto-Renewable Subscription", … */
  type: string;
  environment: AppleEnvironment;
  appAccountToken: string | null;
}

export interface AppleCheck extends JwsOptions {
  bundleId: string;
}

const text = (value: unknown): string | null => (typeof value === "string" && value ? value : typeof value === "number" ? String(value) : null);
const date = (value: unknown): Date | null => (typeof value === "number" && Number.isFinite(value) ? new Date(value) : null);
const int = (value: unknown): number | null => (typeof value === "number" && Number.isInteger(value) ? value : null);

function environmentOf(value: unknown): AppleEnvironment {
  if (value === "Production" || value === "Sandbox") return value;
  return refuse("not the App Store's production or sandbox environment");
}

function transactionOf(payload: Record<string, unknown>, bundleId: string): AppleTransaction {
  if (payload.bundleId !== bundleId) refuse("another app's transaction");
  const transactionId = text(payload.transactionId);
  const productId = text(payload.productId);
  const purchaseDate = date(payload.purchaseDate);
  if (!transactionId || !productId || !purchaseDate) refuse("the transaction misses its ID, product or date");
  return {
    transactionId,
    originalTransactionId: text(payload.originalTransactionId) ?? transactionId,
    productId,
    bundleId,
    purchaseDate,
    expiresDate: date(payload.expiresDate),
    revocationDate: date(payload.revocationDate),
    revocationReason: int(payload.revocationReason),
    type: text(payload.type) ?? "",
    environment: environmentOf(payload.environment),
    appAccountToken: text(payload.appAccountToken),
  };
}

/** A signed transaction from the app (StoreKit's `jwsRepresentation`), for this bundle ID. */
export function verifySignedTransaction(jws: string, options: AppleCheck): AppleTransaction {
  return transactionOf(verifyAppleJws(jws, options), options.bundleId);
}

export interface AppleNotification {
  notificationType: string;
  subtype: string | null;
  notificationUUID: string;
  environment: AppleEnvironment;
  transaction: AppleTransaction | null;
  /** autoRenewStatus 1: renews, 0: turned off; expirationIntent as Apple numbers it. */
  renewalInfo: { autoRenewStatus: number | null; expirationIntent: number | null } | null;
}

/** An App Store Server Notification V2 (`signedPayload`), for this bundle ID. */
export function verifyNotification(signedPayload: string, options: AppleCheck): AppleNotification {
  const payload = verifyAppleJws(signedPayload, options);
  const notificationType = text(payload.notificationType);
  const notificationUUID = text(payload.notificationUUID);
  if (!notificationType || !notificationUUID) refuse("not a notification");
  // Most notifications carry `data`; a SUMMARY (renewal date extensions) carries `summary`.
  const data = (payload.data ?? payload.summary) as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") refuse("the notification has no data");
  if (data.bundleId !== options.bundleId) refuse("another app's notification");
  const signedTransaction = text(data.signedTransactionInfo);
  const signedRenewal = text(data.signedRenewalInfo);
  const renewal = signedRenewal ? verifyAppleJws(signedRenewal, options) : null;
  return {
    notificationType,
    subtype: text(payload.subtype),
    notificationUUID,
    environment: environmentOf(data.environment),
    transaction: signedTransaction ? verifySignedTransaction(signedTransaction, options) : null,
    renewalInfo: renewal ? { autoRenewStatus: int(renewal.autoRenewStatus), expirationIntent: int(renewal.expirationIntent) } : null,
  };
}
