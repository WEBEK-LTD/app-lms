"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/admin/audit";
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
  const admin = await requireAdmin("plans.edit");
  const read = readForm(formData);
  if (!read.ok) return { errors: read.errors, values: echo(formData) };
  const now = new Date();
  const coupon: Coupon = { id: newId(), ...read.coupon, createdAt: now, updatedAt: now, createdBy: admin.email };
  if (!(await (await getStore()).createCoupon(coupon))) return { errors: { code: "Another coupon has this code." }, values: echo(formData) };
  await recordAudit({ actor: admin, action: "coupon.create", target: { type: "coupon", id: coupon.id }, summary: `Created the coupon ${coupon.code}`, after: read.coupon });
  revalidatePath("/admin/coupons", "layout");
  redirect(`/admin/coupons/${coupon.id}?done=created`);
}

export async function updateCouponAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("plans.edit");
  const id = String(formData.get("id") ?? "");
  const store = await getStore();
  const saved = await store.getCoupon(id);
  if (!saved) return { message: "This coupon no longer exists." };
  const read = readForm(formData);
  if (!read.ok) return { errors: read.errors, values: echo(formData) };
  if (!(await store.updateCoupon(id, read.coupon, new Date()))) return { errors: { code: "Another coupon has this code." }, values: echo(formData) };
  await recordAudit({ actor: admin, action: "coupon.update", target: { type: "coupon", id }, summary: `Saved the coupon ${read.coupon.code}`, before: saved, after: { ...saved, ...read.coupon } });
  revalidatePath("/admin/coupons", "layout");
  return { ok: true, message: `${read.coupon.code} saved.`, values: echo(formData) };
}

/** Turns a coupon off (clients can't use it anymore) or on again. */
export async function setCouponActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("plans.edit");
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "on";
  const store = await getStore();
  const saved = await store.getCoupon(id);
  if (!saved) redirect("/admin/coupons");
  await store.updateCoupon(id, { active }, new Date());
  await recordAudit({
    actor: admin,
    action: active ? "coupon.enable" : "coupon.disable",
    target: { type: "coupon", id },
    summary: `Turned the coupon ${saved.code} ${active ? "on" : "off"}`,
  });
  revalidatePath("/admin/coupons", "layout");
  redirect(`/admin/coupons/${id}?done=${active ? "enabled" : "disabled"}`);
}
