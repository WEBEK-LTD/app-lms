import type { CatalogCoupon, CatalogCurrency } from "../data/types";
import { formatCents, parsePrice } from "./money";

/**
 * 91.1 Coupons of shops without a website: a share or an amount off the
 * subtotal (shipping stays), with an optional minimum order, end date and
 * number of uses. The app's cart says whether one applies and what it takes
 * off; the payment page charges the total less it, and a paid order counts
 * one use.
 */

export const COUPON_CODE = /^[A-Z0-9][A-Z0-9-]{1,49}$/;

/** A code as the shop and its customers type it: case and spaces don't matter. */
export function normalizeCouponCode(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const value = code.trim().toUpperCase().replace(/\s+/g, "");
  return COUPON_CODE.test(value) ? value : null;
}

export type CouponCheck = { ok: true; discountCents: number } | { ok: false; message: string };

/** What a coupon takes off a subtotal now, or why it doesn't apply. Never more than the subtotal. */
export function couponDiscount(coupon: CatalogCoupon | null, subtotalCents: number, currency: CatalogCurrency, now: Date): CouponCheck {
  if (!coupon || !coupon.active) return { ok: false, message: "This coupon doesn't exist." };
  if (coupon.endsAt && coupon.endsAt.getTime() <= now.getTime()) return { ok: false, message: "This coupon has expired." };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return { ok: false, message: "This coupon has been used up." };
  if (coupon.minOrderCents !== null && subtotalCents < coupon.minOrderCents) {
    return { ok: false, message: `This coupon is for orders of ${formatCents(coupon.minOrderCents, currency)} or more.` };
  }
  const off = coupon.kind === "percent" ? Math.round((subtotalCents * coupon.value) / 100) : coupon.value;
  return { ok: true, discountCents: Math.max(0, Math.min(off, subtotalCents)) };
}

/**
 * The discount spread over the order's lines (in proportion, the last line
 * taking what rounding leaves), for payment providers that want the lines
 * to add up to the amount charged. Each line keeps at least one cent.
 */
export function spreadDiscount(lineCents: number[], discountCents: number): number[] {
  const total = lineCents.reduce((sum, cents) => sum + cents, 0);
  const off = Math.min(discountCents, Math.max(0, total - lineCents.length));
  if (off <= 0 || total <= 0) return [...lineCents];
  let left = off;
  return lineCents.map((cents, i) => {
    const share = i === lineCents.length - 1 ? left : Math.min(left, Math.floor((cents * off) / total));
    const taken = Math.min(share, cents - 1);
    left -= taken;
    return cents - taken;
  });
}

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/** The dashboard's "Add a coupon" form. */
export function parseCoupon(v: Record<string, string>, now: Date): Parsed<Omit<CatalogCoupon, "id" | "appId" | "usedCount" | "createdAt" | "active">> {
  const errors: Record<string, string> = {};
  const code = normalizeCouponCode(v.code ?? "");
  if (!code) errors.code = "Use 2 to 50 letters, digits or dashes, like SPRING10.";
  const kind = v.kind === "amount" ? "amount" : "percent";
  let value = 0;
  if (kind === "percent") {
    value = Number((v.value ?? "").trim());
    if (!Number.isInteger(value) || value < 1 || value > 100) errors.value = "Enter a percentage from 1 to 100.";
  } else {
    const cents = parsePrice(v.value ?? "");
    if (cents === null || cents <= 0) errors.value = "Enter an amount, like 50.";
    else value = cents;
  }
  const minText = (v.minOrder ?? "").trim();
  const minOrderCents = minText === "" ? null : parsePrice(minText);
  if (minText !== "" && (minOrderCents === null || minOrderCents <= 0)) errors.minOrder = "Enter an amount, like 300, or leave it empty.";
  const endsText = (v.endsOn ?? "").trim();
  let endsAt: Date | null = null;
  if (endsText !== "") {
    endsAt = /^\d{4}-\d{2}-\d{2}$/.test(endsText) ? new Date(`${endsText}T23:59:59Z`) : null;
    if (!endsAt || Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= now.getTime()) errors.endsOn = "Choose a day from today on, or leave it empty.";
  }
  const usesText = (v.maxUses ?? "").trim();
  const maxUses = usesText === "" ? null : Number(usesText);
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 1_000_000)) errors.maxUses = "Enter a number of uses, or leave it empty for no limit.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { code: code!, kind, value, minOrderCents, endsAt, maxUses } };
}
