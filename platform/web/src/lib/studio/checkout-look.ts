/**
 * 131.25 The store's checkout in a premium look (`Config.screens.checkout`),
 * for every store app, Leqaa's first: `gift`, a gift checkout in five
 * steps on one screen (who it is from, who it is for, when, the card's
 * message, then pay) with the gift card's live preview, the bouquet's
 * photo and an order summary that always shows the chosen day and slot
 * and the delivery fee's breakdown. Its fields and rules are the store's
 * gift checkout (the commerce side: the sender's name, phone and email;
 * the recipient's name, phone and address with the owner's allowed
 * countries and cities, and a map pin where delivery is priced by the
 * kilometre; the delivery day and slot, required, after the cut-off;
 * the occasions' ready messages, `gift_messages`; the discount code);
 * this is only how it looks. Missing, the cart and checkout as before;
 * an app that doesn't know the look keeps its own.
 */

export const CHECKOUT_LOOKS = ["gift"] as const;
export type CheckoutLookName = (typeof CHECKOUT_LOOKS)[number];

/** The five steps, in order; "when" is required. */
export const GIFT_STEPS = ["from", "to", "when", "message", "pay"] as const;
export type GiftStep = (typeof GIFT_STEPS)[number];

export interface CheckoutLook {
  look: CheckoutLookName;
  /** The steps' colour by day and by night (#RRGGBB); missing, the app's main colour. */
  accent?: string;
  dark_accent?: string;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** 131.25 The checkout's look as saved, checked: an unknown look none at all, the colours #RRGGBB. */
export function parseCheckoutLook(value: unknown, problems: string[]): CheckoutLook | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!(CHECKOUT_LOOKS as readonly unknown[]).includes(v.look)) return null;
  const out: CheckoutLook = { look: v.look as CheckoutLookName };
  for (const key of ["accent", "dark_accent"] as const) {
    const c = v[key];
    if (c === undefined || c === null || c === "") continue;
    if (typeof c === "string" && HEX.test(c)) out[key] = c.toUpperCase();
    else problems.push("The checkout's colour must be a colour like #8E2445.");
  }
  return out;
}

/**
 * 131.25 Sample data the canvas and the app's gallery draw the look with
 * (marked for the integrator: the real ones are the store's gift checkout,
 * its delivery zones and slots and its `gift_messages`). Never shown to a
 * customer: an app draws the shop's own.
 */
export const GIFT_SAMPLE = {
  occasions: ["love", "birthday", "anniversary", "congratulations", "new_baby", "get_well", "thank_you", "sympathy"] as const,
  slots: ["10:00–13:00", "13:00–16:00", "16:00–19:00", "19:00–22:00"] as const,
} as const;
