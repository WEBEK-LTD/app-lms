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
export type DemoId = AppType | Extract<AppVertical, "clinic" | "restaurant" | "fitness">;

/** The kind a demo shows. */
export function demoKind(id: DemoId): KindInfo {
  return isAppType(id) ? defaultKind(id) : KINDS.find((k) => k.vertical === id)!;
}

/** One demo per engine, and per kind with its own demo, in the registry's order. */
export const DEMO_TYPES: readonly DemoId[] = KINDS.filter((k) => demoSlugOfKind(k) !== null).map((k) => (k.vertical ?? k.engine) as DemoId);

/** Each demo's address on /demo and of its download: /demo/download/<slug> (lib/app/kinds.ts). */
export const DEMO_SLUGS = Object.fromEntries(DEMO_TYPES.map((id) => [id, demoSlugOfKind(demoKind(id))!])) as Record<DemoId, string>;

export function demoTypeOfSlug(slug: string): DemoId | null {
  return DEMO_TYPES.find((id) => DEMO_SLUGS[id] === slug) ?? null;
}

/** 21 Which demo an app is: its vertical's, when that has a demo, else its engine's. */
export function demoIdOf(app: Pick<App, "appType"> & { vertical?: AppVertical | null }): DemoId {
  const vertical = app.vertical ?? null;
  return vertical && (DEMO_TYPES as readonly string[]).includes(vertical) ? (vertical as DemoId) : app.appType;
}
