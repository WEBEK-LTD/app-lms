"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { readCouponForm } from "@/lib/billing/coupons";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { Coupon } from "@/lib/data/types";
import { formValues, type FormState } from "@/lib/forms";

function readForm(formData: FormData) {
  return readCouponForm({
    values: formValues(formData),
    plans: formData.getAll("plans").map(String),
    periods: formData.getAll("periods").map(String),
  });
}

/** Echoed back to the form after an error, checkboxes included. */
function echo(formData: FormData): Record<string, string> {
  return { ...formValues(formData), plans: formData.getAll("plans").join(","), periods: formData.getAll("periods").join(",") };
}

export async function createCouponAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const read = readForm(formData);
  if (!read.ok) return { errors: read.errors, values: echo(formData) };
  const now = new Date();
  const coupon: Coupon = { id: newId(), ...read.coupon, createdAt: now, updatedAt: now, createdBy: admin.email };
  // audit: coupon.create
  if (!(await (await getStore()).createCoupon(coupon))) return { errors: { code: "Another coupon has this code." }, values: echo(formData) };
  revalidatePath("/admin/coupons", "layout");
  redirect(`/admin/coupons/${coupon.id}?done=created`);
}

export async function updateCouponAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const store = await getStore();
  if (!(await store.getCoupon(id))) return { message: "This coupon no longer exists." };
  const read = readForm(formData);
  if (!read.ok) return { errors: read.errors, values: echo(formData) };
  // audit: coupon.update
  if (!(await store.updateCoupon(id, read.coupon, new Date()))) return { errors: { code: "Another coupon has this code." }, values: echo(formData) };
  revalidatePath("/admin/coupons", "layout");
  return { ok: true, message: `${read.coupon.code} saved.`, values: echo(formData) };
}

/** Turns a coupon off (clients can't use it anymore) or on again. */
export async function setCouponActiveAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "on";
  const store = await getStore();
  if (!(await store.getCoupon(id))) redirect("/admin/coupons");
  // audit: coupon.disable (or coupon.enable when `active`)
  await store.updateCoupon(id, { active }, new Date());
  revalidatePath("/admin/coupons", "layout");
  redirect(`/admin/coupons/${id}?done=${active ? "enabled" : "disabled"}`);
}
