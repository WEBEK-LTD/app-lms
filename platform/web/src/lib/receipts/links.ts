import { hmacSha256, safeEqual } from "../crypto/tokens";

/**
 * 71 The links customers download their receipts from, without signing in:
 * a donation's receipt has its own random code (29); an order's link names
 * the app and the order with a signature made with SIGNING_SECRET, so nobody
 * can guess another order's. They don't expire, like the donation's page.
 */

const base = (platformUrl: string) => platformUrl.replace(/\/+$/, "");

function signature(appId: string, orderId: number, secret: string): string {
  return hmacSha256(`order-receipt:${secret}`, `${appId}:${orderId}`);
}

/** "<app>.<order>.<signature>". */
export function orderReceiptCode(appId: string, orderId: number, secret: string): string {
  return `${appId}.${orderId}.${signature(appId, orderId, secret)}`;
}

/** The order's receipt as a PDF. */
export function orderReceiptUrl(platformUrl: string, appId: string, orderId: number, secret: string): string {
  return `${base(platformUrl)}/receipts/orders/${orderReceiptCode(appId, orderId, secret)}`;
}

/** The app and order a link names, when its signature is right; else null. */
export function readOrderReceiptCode(code: string, secret: string): { appId: string; orderId: number } | null {
  const match = /^([0-9a-f-]{36})\.(\d{1,15})\.([A-Za-z0-9_-]{43})$/i.exec(code);
  if (!match) return null;
  const [, appId, id, sig] = match;
  const orderId = Number(id);
  if (!Number.isSafeInteger(orderId) || !safeEqual(sig!, signature(appId!, orderId, secret))) return null;
  return { appId: appId!, orderId };
}

/** A donation's receipt as a PDF, next to its page (/receipts/<code>). */
export function donationReceiptPdfUrl(platformUrl: string, receiptCode: string): string {
  return `${base(platformUrl)}/receipts/${receiptCode}/pdf`;
}
