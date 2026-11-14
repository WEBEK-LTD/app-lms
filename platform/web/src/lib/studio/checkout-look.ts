import type { App } from "../data/types";

/**
 * 131 The store checkout's look in Studio (`Config.screens.checkout`), for
 * every store app: how the app draws its checkout (the delivery day and
 * slot picker, the gift details, the card messages) without a new build.
 * The flower shop's looks set `mode: "gift"`, which turns on the gift
 * checkout (the sender, the recipient and the address, the day and slot,
 * the card) as the store's own setting does (`StoreConfig.checkout_mode`).
 *
 * - `style`: `classic` one list, `cards` each part on its own card, `steps`
 *   one part at a time (who sends it, who receives it, when, the card);
 * - `chips`: the day and slot chips round (`pill`) or `square`;
 * - `surface`: the cards `plain` or frosted `glass`;
 * - `accent`: the chosen chip's and the button's colour (#RRGGBB); missing,
 *   the app's main colour; `radius`: the cards' corners, 0 to 32;
 * - `image_url`: a photo across the checkout's top (https);
 * - `title`: the checkout's title per language; empty, the app's words.
 *
 * Missing, the app's checkout is drawn as before.
 */

export const CHECKOUT_STYLES = ["classic", "cards", "steps"] as const;
export type CheckoutStyle = (typeof CHECKOUT_STYLES)[number];
export const CHECKOUT_CHIPS = ["pill", "square"] as const;
export const CHECKOUT_SURFACES = ["plain", "glass"] as const;

export interface CheckoutLook {
  mode?: "gift";
  style?: CheckoutStyle;
  chips?: (typeof CHECKOUT_CHIPS)[number];
  surface?: (typeof CHECKOUT_SURFACES)[number];
  accent?: string | null;
  radius?: number;
  image_url?: string | null;
  /** Per language code. */
  title?: Record<string, string>;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** A saved or sent look, cleaned; null when there's nothing in it. Problems are for the owner. */
export function parseCheckoutLook(input: unknown, problems: string[] = []): CheckoutLook | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Record<string, unknown>;
  const out: CheckoutLook = {};
  if (v.mode === "gift") out.mode = "gift";
  if ((CHECKOUT_STYLES as readonly unknown[]).includes(v.style)) out.style = v.style as CheckoutStyle;
  if ((CHECKOUT_CHIPS as readonly unknown[]).includes(v.chips)) out.chips = v.chips as CheckoutLook["chips"];
  if ((CHECKOUT_SURFACES as readonly unknown[]).includes(v.surface)) out.surface = v.surface as CheckoutLook["surface"];
  if (typeof v.accent === "string") {
    if (HEX.test(v.accent)) out.accent = v.accent.toUpperCase();
    else problems.push("The checkout's colour must be like #C2185B.");
  }
  if (typeof v.radius === "number" && Number.isFinite(v.radius)) {
    const radius = Math.round(v.radius);
    if (radius >= 0 && radius <= 32) out.radius = radius;
    else problems.push("The checkout's corners must be 0 to 32.");
  }
  if (typeof v.image_url === "string" && v.image_url !== "") {
    if (/^https:\/\/\S{1,1000}$/.test(v.image_url)) out.image_url = v.image_url;
    else problems.push("The checkout photo's address isn't one the app can open.");
  }
  if (v.title && typeof v.title === "object") {
    const title: Record<string, string> = {};
    for (const [lang, text] of Object.entries(v.title as Record<string, unknown>)) {
      if (/^[a-z]{2,3}$/.test(lang) && typeof text === "string" && text.trim()) title[lang] = text.trim().slice(0, 40);
    }
    if (Object.keys(title).length) out.title = title;
  }
  return Object.keys(out).length ? out : null;
}

/** The app's saved checkout look (Studio › Screens), or null. */
export function checkoutLookOf(app: Pick<App, "hostedSettings">): CheckoutLook | null {
  const screens = app.hostedSettings?.studioScreens as { checkout?: unknown } | null | undefined;
  return parseCheckoutLook(screens?.checkout);
}
