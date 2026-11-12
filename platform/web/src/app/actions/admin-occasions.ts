"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { formValues, type FormState } from "@/lib/forms";
import { OCCASION_TEMPLATES } from "@/lib/occasions";
import { createOccasion, deleteOccasion, readOccasionForm, runOccasionNextYear, updateOccasion } from "@/lib/occasions/admin";

/** 124 Admin › Occasions. Each save also creates or updates the occasion's coupon (lib/occasions/admin.ts). */

function revalidate() {
  revalidatePath("/admin/occasions", "layout");
  revalidatePath("/admin/coupons", "layout");
  // The occasions' own pages on the website.
  for (const t of Object.values(OCCASION_TEMPLATES)) revalidatePath(`/${t.slug}`);
}

export async function createOccasionAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("plans.edit");
  const values = formValues(formData);
  const result = await createOccasion(await getStore(), { template: values.template, fields: readOccasionForm(values) }, admin, new Date());
  if (!result.ok) return { errors: result.errors, message: result.message, values };
  revalidate();
  redirect(`/admin/occasions/${result.occasion.id}?done=created`);
}

export async function updateOccasionAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("plans.edit");
  const values = formValues(formData);
  const result = await updateOccasion(await getStore(), String(formData.get("id") ?? ""), readOccasionForm(values), admin, new Date());
  if (!result.ok) return { errors: result.errors, message: result.message, values };
  revalidate();
  return { ok: true, message: `${result.occasion.name} saved. Its coupon ${result.occasion.couponCode} is updated.`, values };
}

/** "Run it again next year": a new occasion a year on, which takes over the coupon. */
export async function nextYearOccasionAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("plans.edit");
  const result = await runOccasionNextYear(await getStore(), String(formData.get("id") ?? ""), admin, new Date());
  if (!result.ok) return { message: result.message ?? "Next year's occasion couldn't be made." };
  revalidate();
  redirect(`/admin/occasions/${result.occasion.id}?done=next_year`);
}

/** Deletes the occasion and turns its coupon off. */
export async function deleteOccasionAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("plans.edit");
  const result = await deleteOccasion(await getStore(), String(formData.get("id") ?? ""), admin, new Date());
  if (!result.ok) return { message: "This occasion no longer exists." };
  revalidate();
  redirect("/admin/occasions?done=deleted");
}
