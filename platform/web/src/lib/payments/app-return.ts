import type { CatalogOrder } from "../data/types";
import { PAY_LINK_MINUTES } from "../catalog/settings";

/**
 * 170 Paying in the app in the phone's browser sheet (SFSafariViewController
 * on iPhone, Chrome Custom Tabs on Android), where Apple Pay and Google Pay
 * show. The app opens `/pay/<token>/app`, which marks this payment as the
 * app's with a cookie kept to this payment's own pages (`Path=/pay/<token>`,
 * no secret in it) and goes on to the payment page. Once the payment ends,
 * the done page, the failed or pending page and the closed-link notes give
 * a "Back to the app" link on the app's own address (`yallapp-<app id>://`,
 * registered by the app's build), which brings the app back; the app then
 * asks `/pay/<token>/status` how it ended, never trusting the link.
 *
 * Apps already in the stores open the payment page in their web view, never
 * `/app`: their pages are unchanged.
 */
export const APP_RETURN_COOKIE = "yallapp_app_pay";

/** As long as the payment link lasts, and a little more for a slow 3-D Secure step. */
export const APP_RETURN_MAX_AGE = (PAY_LINK_MINUTES + 30) * 60;

/** A payment link's token as the platform makes them (`randomToken`: base64url). */
export const PAY_TOKEN = /^[A-Za-z0-9_-]{16,128}$/;

/** The app's own address scheme: `yallapp-` and its platform ID without dashes (the app's build registers the same). */
export function appReturnScheme(appId: string): string {
  return `yallapp-${appId.replace(/-/g, "").toLowerCase()}`;
}

/** How the payment ended, as the return link says it (the app checks it with the status). */
export type AppReturnResult = "paid" | "placed" | "pending" | "failed" | "closed";

/**
 * The link back to the app: `yallapp-<id>://app/pay-return?order=<id>&result=<result>`.
 * Only the order's ID and how it ended: never the payment's token, so another
 * app claiming the same address learns nothing it could pay or read with.
 */
export function appReturnLink(appId: string, orderId: number | null, result: AppReturnResult): string {
  const query = new URLSearchParams();
  if (orderId !== null) query.set("order", String(orderId));
  query.set("result", result);
  return `${appReturnScheme(appId)}://app/pay-return?${query.toString()}`;
}

/** The cookie that marks this payment as the app's, kept to its own pages. */
export function appReturnCookie(token: string, secure: boolean): string {
  return [
    `${APP_RETURN_COOKIE}=1`,
    `Path=/pay/${token}`,
    `Max-Age=${APP_RETURN_MAX_AGE}`,
    "HttpOnly",
    // Lax: sent when a gateway's page sends the customer back here (a top-level GET).
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

/** What the app reads at `/pay/<token>/status`. */
export type PayStatus = {
  /**
   * paid; awaiting_payment (96.2 a bank transfer or the owner's own method: placed, paid later);
   * started (a payment was started with the gateway and isn't confirmed yet: it may still be,
   * by its webhook or the pending-payments check, so the app never says it failed); open (no
   * payment started: nothing was charged); closed (cancelled or refunded); not_found.
   */
  state: "paid" | "awaiting_payment" | "started" | "open" | "closed" | "not_found";
  /** 134 A connected store's payment: the shop's platform has the order, or the shop confirms it. */
  shop_order?: "placed" | "confirming";
};

/** An order's payment as the app reads it on coming back. */
export function payStatusOf(order: Pick<CatalogOrder, "status" | "manualPayment" | "paymentProvider" | "providerRef"> | null): PayStatus["state"] {
  if (!order) return "not_found";
  if (order.status === "processing" || order.status === "completed") return "paid";
  if (order.status !== "pending") return "closed";
  if (order.manualPayment) return "awaiting_payment";
  return order.paymentProvider || order.providerRef ? "started" : "open";
}

/** Whether this request's payment page was opened by the app in the browser sheet (its cookie, sent only to this payment's pages). */
export function fromAppSheet(jar: { get(name: string): { value: string } | undefined }): boolean {
  return jar.get(APP_RETURN_COOKIE)?.value === "1";
}
