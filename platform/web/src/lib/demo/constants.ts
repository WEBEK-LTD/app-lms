import type { App, AppType, AppVertical } from "../data/types";
import { defaultKind, demoSlugOfKind, isAppType, KINDS, type KindInfo } from "../app/kinds";
import type { RateLimitRule } from "../rate-limit";

/**
 * Demo apps people can try before they pay (roadmap 16): one per app type,
 * on the hosted API, made by the admin's Demo apps page. These values are
 * public: the /demo page shows the sign-in number and code.
 */

/**
 * The one number that signs in to the demo apps, with a fixed code and no
 * message sent. 555-01XX numbers are reserved for fiction in North America,
 * so the number belongs to nobody. It works in demo apps only (lib/hosted/service.ts).
 */
export const DEMO_SIGN_IN = {
  countryCode: "+1",
  /** As typed in the app after the country code. */
  number: "2025550123",
  e164: "+12025550123",
  /** As the /demo page shows it. */
  display: "+1 202 555 0123",
  code: "246810",
} as const;

/** The name the shared demo account starts with, and goes back to every day. */
export const DEMO_USER_NAME = "Demo visitor";

/** What visitors add in a demo app (orders, bookings, messages, favorites, progress) is deleted after this long. */
export const DEMO_RETENTION_HOURS = 24;

/**
 * Sign-in limits for the demo number, which everyone shares (so the usual
 * per-number limits would lock everyone out): per visitor's IP, and in total
 * per demo app.
 */
export const DEMO_LIMITS = {
  ip: { name: "demo-otp:ip", limit: 10, windowSeconds: 3600 },
  app: { name: "demo-otp:app", limit: 300, windowSeconds: 3600 },
} satisfies Record<string, RateLimitRule>;

/** The account that owns the demo apps. It has no password: the team opens it with "Manage their app". */
export const DEMO_ACCOUNT = { email: "demos@yallapp.com.tr", name: "Yallapp demos" } as const;

/** The demo apps never expire: their Business license runs to the end of 2099. */
export const DEMO_LICENSE_UNTIL = new Date("2099-12-31T23:59:59.999Z");

/**
 * 21 Which demo: an engine's (its default kind), or a vertical's that has
 * its own demo (a clinic and 27 a gym, on the bookings engine; 26 a café, on the store engine).
 */
/**
 * The demos of Yallapp Studio's own project types (104 delivery, 105.1 food
 * delivery, 105.2 rides; 110.5 105.9 a live taxi app, 105.4 a school and
 * 105.3 an academy with many teachers), shown on /demo/studio only.
 */
/**
 * 123 The premium academy (lib/studio/academy.ts): a Studio demo of the
 * academy kind started from its template, told apart from the academy's
 * own demo by the template it started from (`App.design`).
 */
export const PREMIUM_ACADEMY_DEMO = "premium_academy" as const;
/** The premium academy's template (lib/studio/sections.ts), which its demo app keeps as its design. */
export const PREMIUM_ACADEMY_TEMPLATE = "academy_premium";

/**
 * 131.20 Leqaa, the flower shop (lib/studio/demo-designs/leqaa-signature.ts):
 * a Studio demo of the store kind (the store engine, no vertical), as the
 * premium academy is of the academy's: a store needs nothing a flower shop
 * doesn't (its products, sizes and add-ons are the store's own options, its
 * delivery date the store's), so it takes every source a store does (the
 * products kept in Yallapp, WooCommerce through the plugin, Shopify, ikas,
 * Ticimax, IdeaSoft, Wix, Salla, Zid, its own API). It is told apart from
 * the store's own demo (the App editor's Lale Flowers) by the template it
 * started from (`App.design`), its Signature look A.
 */
export const FLOWER_SHOP_DEMO = "flowers" as const;
/** 131.20 Leqaa's look A, the template its demo app keeps as its design. */
export const FLOWER_SHOP_TEMPLATE = "flowers_signature_a";

/**
 * 206 The premium shop types' demos (lib/studio/shop-types.ts), each a
 * Studio demo of the store kind told apart from the store's own demo by its
 * look A (`App.design`), as Leqaa is: its template id by its demo id. A
 * later type adds its line here.
 */
export const SHOP_TYPE_DEMOS = {
  // 206 Lujain (لجين), the clothes shop: A a black and white boutique, B streetwear (NOUN).
  clothes: "clothes_signature_a",
} as const;
export type ShopTypeDemo = keyof typeof SHOP_TYPE_DEMOS;
export const CLOTHES_DEMO = "clothes" as const satisfies ShopTypeDemo;

export type StudioDemoId = Extract<AppType, "delivery" | "food" | "rides" | "school" | "travel"> | Extract<AppVertical, "taxi" | "instructors" | "marketplace"> | typeof PREMIUM_ACADEMY_DEMO | typeof FLOWER_SHOP_DEMO | ShopTypeDemo;

/** 206 The Studio demos of a template rather than a kind (a store told apart by its look A): Leqaa and the shop types', their look A by their id. */
export const STORE_TEMPLATE_DEMOS: Readonly<Record<typeof FLOWER_SHOP_DEMO | ShopTypeDemo, string>> = { [FLOWER_SHOP_DEMO]: FLOWER_SHOP_TEMPLATE, ...SHOP_TYPE_DEMOS };

/** 206 Whether a demo is a store's template demo (Leqaa, a shop type's). */
export function isStoreTemplateDemo(id: string): id is typeof FLOWER_SHOP_DEMO | ShopTypeDemo {
  return Object.hasOwn(STORE_TEMPLATE_DEMOS, id);
}
export type DemoId = Exclude<AppType, StudioDemoId> | Extract<AppVertical, "clinic" | "restaurant" | "fitness"> | StudioDemoId;

/** The kinds only Studio offers (lib/studio/section.ts STUDIO_ONLY_KINDS). */
const STUDIO_DEMO_KINDS: readonly string[] = ["delivery", "food", "rides", "taxi", "school", "instructors", "marketplace", "travel", PREMIUM_ACADEMY_DEMO, FLOWER_SHOP_DEMO, ...Object.keys(SHOP_TYPE_DEMOS)];

export function isStudioDemo(id: DemoId): id is StudioDemoId {
  return STUDIO_DEMO_KINDS.includes(id);
}

/** The kind a demo shows. */
export function demoKind(id: DemoId): KindInfo {
  // 123 The premium academy is an academy.
  if (id === PREMIUM_ACADEMY_DEMO) return defaultKind("lms");
  // 131.20 Leqaa is a store; 206 and so is each shop type's demo.
  if (isStoreTemplateDemo(id)) return defaultKind("store");
  return isAppType(id) ? defaultKind(id) : KINDS.find((k) => k.vertical === id)!;
}

/**
 * One demo per engine, and per kind with its own demo, in the registry's
 * order. 29 An engine's default kind is the engine's demo, even with a
 * vertical (the charity is the donations engine's).
 */
export const ALL_DEMO_TYPES: readonly DemoId[] = [
  ...KINDS.filter((k) => demoSlugOfKind(k) !== null).map((k) => (defaultKind(k.engine) === k ? (k.engine as DemoId) : (k.vertical as DemoId))),
  // 123 The premium academy, a template's demo rather than a kind's.
  PREMIUM_ACADEMY_DEMO,
  // 131.20 Leqaa, the flower shop, a template's demo too (the store's).
  FLOWER_SHOP_DEMO,
  // 206 The shop types' demos, templates' demos of the store too.
  ...(Object.keys(SHOP_TYPE_DEMOS) as ShopTypeDemo[]),
];

/** The regular apps' demos, on /demo. */
export const DEMO_TYPES: readonly DemoId[] = ALL_DEMO_TYPES.filter((id) => !isStudioDemo(id));

/** Yallapp Studio's demos, on /demo/studio. */
export const STUDIO_DEMO_TYPES: readonly StudioDemoId[] = ALL_DEMO_TYPES.filter(isStudioDemo);

/** Each demo's address on /demo (or /demo/studio) and of its download: /demo/download/<slug> (lib/app/kinds.ts). */
export const DEMO_SLUGS = Object.fromEntries(ALL_DEMO_TYPES.map((id) => [id, id === PREMIUM_ACADEMY_DEMO ? "premium-academy" : isStoreTemplateDemo(id) ? id.replaceAll("_", "-") : demoSlugOfKind(demoKind(id))!])) as Record<DemoId, string>;

export function demoTypeOfSlug(slug: string): DemoId | null {
  return ALL_DEMO_TYPES.find((id) => DEMO_SLUGS[id] === slug) ?? null;
}

/** 21 Which demo an app is: its vertical's, when that has a demo, else its engine's. */
export function demoIdOf(app: Pick<App, "appType"> & { vertical?: AppVertical | null; design?: string | null }): DemoId {
  // 123 The premium academy's demo keeps its template as its design.
  if (app.appType === "lms" && !app.vertical && app.design === PREMIUM_ACADEMY_TEMPLATE) return PREMIUM_ACADEMY_DEMO;
  // 131.20 Leqaa's demo keeps its look A as its design; 206 so does each shop type's.
  if (app.appType === "store" && !app.vertical && app.design) {
    const own = (Object.keys(STORE_TEMPLATE_DEMOS) as (keyof typeof STORE_TEMPLATE_DEMOS)[]).find((id) => STORE_TEMPLATE_DEMOS[id] === app.design);
    if (own) return own;
  }
  const vertical = app.vertical ?? null;
  return vertical && (ALL_DEMO_TYPES as readonly string[]).includes(vertical) ? (vertical as DemoId) : (app.appType as DemoId);
}
