import type { MarketClubPlanInput, MarketCouponInput } from "../data/types";
import { currencyDecimals, toMinor } from "./currency";

/**
 * 115.12 The owner's forms for coupons and the club (Studio › Offers & club):
 * read from the form's fields, checked, in the app's currency's minor units.
 * The amounts are the owner's own; nothing here sets a price.
 */

export type Parsed<T> = { ok: true; value: T } | { ok: false; field: string; error: string };

const str = (form: Record<string, string>, name: string) => (form[name] ?? "").trim();

function money(form: Record<string, string>, name: string, currency: string): number | null | "bad" {
  const v = str(form, name);
  if (!v) return null;
  const m = toMinor(v, currencyDecimals(currency));
  return m === null || m < 0 ? "bad" : m;
}

function whole(form: Record<string, string>, name: string): number | null | "bad" {
  const v = str(form, name);
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : "bad";
}

function day(form: Record<string, string>, name: string, end: boolean): Date | null | "bad" {
  const v = str(form, name);
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "bad";
  const d = new Date(`${v}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(d.getTime()) ? "bad" : d;
}

export function parseCouponForm(form: Record<string, string>, input: { appId: string; currency: string; now: Date }): Parsed<MarketCouponInput> {
  const title = str(form, "title").slice(0, 80);
  if (!title) return { ok: false, field: "title", error: "Give the offer a name customers see." };
  const code = str(form, "code").toUpperCase().replace(/\s+/g, "");
  if (code && !/^[A-Z0-9_-]{3,24}$/.test(code)) return { ok: false, field: "code", error: "Codes use 3 to 24 letters, digits, - or _." };
  const kind = str(form, "kind");
  if (kind !== "percent" && kind !== "amount" && kind !== "free_delivery") return { ok: false, field: "kind", error: "Choose what the offer takes off." };
  let value = 0;
  if (kind === "percent") {
    const p = Number(str(form, "value"));
    if (!Number.isFinite(p) || p <= 0 || p > 100) return { ok: false, field: "value", error: "Write a percentage from 1 to 100." };
    value = Math.round(p * 100) / 100;
  } else if (kind === "amount") {
    const m = money(form, "value", input.currency);
    if (m === null || m === "bad" || m === 0) return { ok: false, field: "value", error: "Write the amount it takes off." };
    value = m;
  }
  const maxDiscount = kind === "percent" ? money(form, "max_discount", input.currency) : null;
  if (maxDiscount === "bad") return { ok: false, field: "max_discount", error: "Write the most it takes off as an amount." };
  const minOrder = money(form, "min_order", input.currency);
  if (minOrder === "bad") return { ok: false, field: "min_order", error: "Write the smallest order as an amount." };
  const usesLimit = whole(form, "uses_limit");
  if (usesLimit === "bad") return { ok: false, field: "uses_limit", error: "Write how many times it can be used, or leave it empty." };
  const perUserLimit = whole(form, "per_user_limit");
  if (perUserLimit === "bad") return { ok: false, field: "per_user_limit", error: "Write how many times each person can use it, or leave it empty." };
  const startsAt = day(form, "starts", false);
  const endsAt = day(form, "ends", true);
  if (startsAt === "bad") return { ok: false, field: "starts", error: "Choose the day it starts." };
  if (endsAt === "bad") return { ok: false, field: "ends", error: "Choose the day it ends." };
  if (startsAt && endsAt && endsAt <= startsAt) return { ok: false, field: "ends", error: "It ends after it starts." };
  return {
    ok: true,
    value: {
      appId: input.appId,
      code: code || null,
      title,
      kind,
      value,
      maxDiscount,
      minOrder: minOrder ?? 0,
      currency: input.currency,
      paidBy: str(form, "paid_by") === "vendor" ? "vendor" : "owner",
      firstOrderOnly: form.first_order === "1",
      vendorIds: [],
      vendorKinds: [],
      departmentIds: [],
      usesLimit,
      perUserLimit,
      startsAt,
      endsAt,
      active: true,
      createdAt: input.now,
      updatedAt: input.now,
    },
  };
}

export function parseClubPlanForm(form: Record<string, string>, input: { appId: string; currency: string; position: number; now: Date }): Parsed<MarketClubPlanInput> {
  const name = str(form, "name").slice(0, 60);
  if (!name) return { ok: false, field: "name", error: "Give the plan a name." };
  const period = str(form, "period");
  if (period !== "month" && period !== "year") return { ok: false, field: "period", error: "Choose monthly or yearly." };
  const price = money(form, "price", input.currency);
  if (price === null || price === "bad") return { ok: false, field: "price", error: "Write the plan's price (0 for free)." };
  const benefit = str(form, "benefit");
  let freeDeliveryOver: number | null = null;
  let deliveryDiscountPercent: number | null = null;
  if (benefit === "free") {
    const over = money(form, "free_over", input.currency);
    if (over === "bad") return { ok: false, field: "free_over", error: "Write the smallest order for free delivery, or leave it empty." };
    freeDeliveryOver = over ?? 0;
  } else if (benefit === "percent") {
    const p = Number(str(form, "delivery_percent"));
    if (!Number.isInteger(p) || p < 1 || p > 100) return { ok: false, field: "delivery_percent", error: "Write a percentage from 1 to 100." };
    deliveryDiscountPercent = p;
  } else return { ok: false, field: "benefit", error: "Choose what members get on delivery." };
  const perks = str(form, "perks")
    .split(/\r?\n/)
    .map((l) => l.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 6);
  return {
    ok: true,
    value: {
      appId: input.appId,
      name,
      description: str(form, "description").slice(0, 200) || null,
      period,
      price,
      currency: input.currency,
      freeDeliveryOver,
      deliveryDiscountPercent,
      perks,
      active: true,
      position: input.position,
      createdAt: input.now,
      updatedAt: input.now,
    },
  };
}
