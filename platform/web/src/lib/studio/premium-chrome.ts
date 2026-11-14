import type { StudioHeader, StudioHeaderStyle } from "../pages/types";

/**
 * 130.20–130.29 Premium chrome, for every Studio project: the premium page
 * headers (`StudioHeader.style`) and the premium looks of the app's own
 * system screens (`Config.screens.system`).
 *
 * The model: ONE project-level look for the system screens (the account,
 * settings, notifications, the language, editing the profile, help, about
 * and the legal pages, the lists of orders, bookings, trips, rides and
 * shipments, sign-in and the code screen, and the empty and loading
 * states), named like the premium header it goes with, and optionally a
 * different look (or `classic`, the app's own) for one screen. Missing
 * entirely, every screen keeps the app's own look, exactly as before.
 *
 * - `large`: the page's own colours, a large title that collapses into a
 *   compact bar as the screen scrolls, grouped rows in inset cards with
 *   tinted icon tiles; the account's hero card in the main colour's
 *   gradient.
 * - `glass`: a soft wash of the main and second colours behind frosted
 *   glass cards and a glass bar the screen scrolls under.
 * - `photo`: a photo (`image_url`, else the main to second colour gradient)
 *   under a shade at the top of the account and sign-in, the cards hanging
 *   over its foot.
 * - `brand`: the main colour across the top with the logo (or the app's
 *   name) in the middle between round glass buttons, the cards over it.
 *
 * The app draws them in the project's colours and fonts, by day and by
 * night, mirrored right to left, and still for people who turn movement
 * off. Studio's canvas draws them on the pages around those screens.
 */

/** The premium looks of the system screens; `classic` (only per screen) is the app's own. */
export const SYSTEM_LOOKS = ["large", "glass", "photo", "brand"] as const;
export type SystemLook = (typeof SYSTEM_LOOKS)[number];
export type SystemScreenLook = SystemLook | "classic";

/** The system screens a look applies to, each of which can have its own. */
export const SYSTEM_SCREENS = ["account", "settings", "notifications", "language", "edit_profile", "help", "lists", "sign_in", "code", "states"] as const;
export type SystemScreenKey = (typeof SYSTEM_SCREENS)[number];

/** `Config.screens.system`. */
export interface SystemScreensLook {
  look: SystemLook;
  /** A screen with another look than `look` (`classic`: the app's own); missing, `look`. */
  screens?: Partial<Record<SystemScreenKey, SystemScreenLook>>;
  /** The `photo` look's photo (an https address); null, the main to second colour gradient. */
  image_url?: string | null;
}

/** The premium header each system look goes with (the screens' own bars, and a demo's pages). */
export const LOOK_HEADER: Record<SystemLook, StudioHeaderStyle> = { large: "large", glass: "glass", photo: "photo", brand: "brand" };

/** The look one system screen has in this project; null, the app's own. */
export function systemLookFor(system: SystemScreensLook | null | undefined, screen: SystemScreenKey): SystemLook | null {
  if (!system) return null;
  const own = system.screens?.[screen];
  if (own === "classic") return null;
  return own ?? system.look;
}

/** Which system screen a page drawn around one of the app's screens is (lib/pages/inner-screens.ts and the tabs' screens); null, none. */
export function systemScreenOf(screen: string | null | undefined): SystemScreenKey | null {
  switch (screen) {
    case "account":
      return "account";
    case "settings":
    case "devices":
    case "change_password":
      return "settings";
    case "notifications":
      return "notifications";
    case "edit_profile":
      return "edit_profile";
    case "orders":
    case "food_orders":
    case "market_orders":
    case "my_rides":
    case "shipments":
    case "appointments":
    case "tickets":
    case "my_donations":
    case "trips":
      return "lists";
    default:
      return null;
  }
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost") ? url.toString() : null;
  } catch {
    return null;
  }
}

/** 130.21 The system screens' look as saved, checked: an unknown look none at all, unknown screens and looks dropped, the photo https. */
export function parseSystemLook(value: unknown, problems: string[]): SystemScreensLook | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!(SYSTEM_LOOKS as readonly unknown[]).includes(v.look)) return null;
  const out: SystemScreensLook = { look: v.look as SystemLook };
  if (v.screens && typeof v.screens === "object" && !Array.isArray(v.screens)) {
    const screens: Partial<Record<SystemScreenKey, SystemScreenLook>> = {};
    for (const key of SYSTEM_SCREENS) {
      const own = (v.screens as Record<string, unknown>)[key];
      if (own === "classic" || ((SYSTEM_LOOKS as readonly unknown[]).includes(own) && own !== out.look)) screens[key] = own as SystemScreenLook;
    }
    if (Object.keys(screens).length) out.screens = screens;
  }
  const image = httpsUrl(v.image_url);
  if (v.image_url && !image) problems.push("The photo's address isn't one the app can open.");
  if (image) out.image_url = image;
  return out;
}

/** 130.20 A header in a premium style, keeping what else it has. */
export function premiumHeader(header: StudioHeader, style: StudioHeaderStyle): StudioHeader {
  return { ...header, style };
}

/** 130.20 Whether a header's style collapses on scroll (`large`, `photo`, `search`), unless `collapse` is false. */
export function headerCollapses(header: Pick<StudioHeader, "style" | "collapse">): boolean {
  return (header.style === "large" || header.style === "photo" || header.style === "search") && header.collapse !== false;
}
