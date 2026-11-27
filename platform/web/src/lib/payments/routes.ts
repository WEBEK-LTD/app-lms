import type { PaymentProviderId } from "../data/types";
import { appUrl } from "../env";

/** 37 What a payment pays: a plan, a shop's order (products, courses, memberships, tickets, a restaurant's order), a donation, 106.2 a Studio Market template, or 233 a Yallapp Community course. */
export type PaymentKind = "plan" | "order" | "donation" | "template" | "course";

export const PAYMENT_KINDS: PaymentKind[] = ["plan", "order", "donation", "template", "course"];

/** iyzico's callbacks, as before Phase 37 (they post the token back). */
const IYZICO_PATHS: Record<PaymentKind, string> = { plan: "/api/pay/plan", order: "/api/pay/iyzico", donation: "/api/pay/donation", template: "/api/pay/template", course: "/api/pay/course" };

/**
 * 37 Where the provider sends the customer back, and where it posts its
 * webhook: iyzico posts its token to the callback; Kashier and Fawaterk
 * send the customer back (GET) and post their webhook (POST) to
 * /api/pay/<provider>/<kind>/<token>. The token is the payment link's own.
 * 96.1 Stripe and PayPal only send the customer back there (GET).
 */
export function callbackUrls(base: string, kind: PaymentKind, provider: PaymentProviderId, token: string): { returnUrl: string; webhookUrl: string | null } {
  const t = encodeURIComponent(token);
  if (provider === "iyzico") return { returnUrl: `${base}${IYZICO_PATHS[kind]}/${t}`, webhookUrl: null };
  const url = `${base}/api/pay/${provider}/${kind}/${t}`;
  // 96.1 Stripe and PayPal send the customer back; their payments are read back then, and by the pending-payments check (no webhook).
  return { returnUrl: url, webhookUrl: provider === "stripe" || provider === "paypal" ? null : url };
}

/** Where the buyer goes after the gateway: a path on this site, or 233 the Community's own site (a full address). */
export function settledLocation(path: string): string {
  return /^https:\/\//.test(path) ? path : `${appUrl()}${path}`;
}
