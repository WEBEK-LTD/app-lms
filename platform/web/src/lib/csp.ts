/**
 * 69 The pages' Content-Security-Policy: no <base> or plugin content from
 * elsewhere, never framed (next.config.ts sends it on every page; kept apart
 * from the nonce's helpers, lib/csp-nonce.ts, since next.config.ts loads it).
 * It names no frame, script or connect sources, so Stripe's form (144) and
 * its frames load on the payment page as Stripe.js starts them.
 */
export const PAGE_CSP = "base-uri 'self'; object-src 'none'; frame-ancestors 'none'";

/**
 * 155 The Stripe origins whose frames may use the Payment Request API on the
 * payment page, as Stripe's Google Pay guide gives the header
 * (docs.stripe.com/google-pay?platform=web): Stripe.js's frames and Checkout's.
 */
export const STRIPE_PAYMENT_ORIGINS = ["https://js.stripe.com", "https://checkout.stripe.com"] as const;

/** Every page: no camera, microphone, location or payments (the Payment Request API) for the page or any frame in it. */
export const PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(), payment=()";

/**
 * 155 The payment page (/pay/…): the same, but payments allowed for the page
 * itself and Stripe's frames, so Apple Pay and Google Pay can show in
 * Stripe's card form (Embedded Checkout). `self` too: Chrome on Android
 * needs it, Stripe says.
 */
export const PAY_PERMISSIONS_POLICY = `camera=(), microphone=(), geolocation=(), payment=(self ${STRIPE_PAYMENT_ORIGINS.map((o) => `"${o}"`).join(" ")})`;

/**
 * 178 The app preview (/preview-app/…) and the dashboard's Preview page
 * around it: the same, but the location allowed for the preview itself
 * (the platform's own origin, and so the preview's frame on the Preview
 * page), so a ride or taxi app's "My location" and its map find the person
 * in the preview as on a phone. Nothing else may ask for it.
 */
export const PREVIEW_PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(self), payment=()";
