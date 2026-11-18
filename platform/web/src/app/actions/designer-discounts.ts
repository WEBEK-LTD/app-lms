"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { MarketTemplate, TemplateDesigner } from "@/lib/data/types";
import type { FormState } from "@/lib/forms";
import { recordStaffChange } from "@/lib/admin/audit";
import { DISCOUNT_MESSAGES } from "@/lib/studio-market/discounts";
import { createDiscount, deleteDiscount, designerZone, endDiscount } from "@/lib/studio-market/designer-discounts";
import { templateText } from "@/lib/studio-market/templates";
import { en } from "@/i18n/dashboard/market-discounts";

/**
 * 106.12 A designer's discounts on their own templates: a price drop, a
 * flash sale or a coupon code made, ended now or deleted. Only the
 * account's owner (the dashboard's owner-only `billing`), only on their own
 * templates. Times come in the designer's time zone.
 */

async function owner(): Promise<ClientContext> {
  const context = await clientFor("billing");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  return context;
}

async function designerOf(context: ClientContext): Promise<TemplateDesigner> {
  const designer = await (await getStore()).getTemplateDesignerByClient(context.client.id);
  if (!designer) redirect("/designer/join");
  return designer;
}

async function ownTemplate(designer: TemplateDesigner, id: unknown): Promise<MarketTemplate> {
  const template = typeof id === "string" && id ? await (await getStore()).getMarketTemplate(id) : null;
  if (!template || template.designerId !== designer.id) redirect("/designer/discounts");
  return template;
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

/** The key of a message in marketDiscounts.known, for the page's notice after a redirect. */
function noticeKey(message: string): string {
  return Object.entries(en.known).find(([, value]) => value === message)?.[0] ?? "gone";
}

function refresh(): void {
  revalidatePath("/designer", "layout");
  revalidatePath("/dashboard/studio-market", "layout");
}

/** A new price drop, flash sale or coupon code on one of the designer's templates. */
export async function createDiscountAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await owner();
  const designer = await designerOf(context);
  const template = await ownTemplate(designer, formData.get("template"));
  const fields = ["kind", "offType", "percent", "amount", "startsAt", "endsAt", "code", "limit"] as const;
  const values: Record<string, string> = Object.fromEntries(fields.map((f) => [f, text(formData, f)]));
  const plans = formData.getAll("plan").map(String);
  const allPlans = formData.get("allPlans") === "on";
  const store = await getStore();
  const made = await createDiscount(
    store,
    designer,
    template,
    { kind: values.kind!, offType: values.offType!, percent: values.percent!, amount: values.amount!, allPlans, plans, startsAt: values.startsAt!, endsAt: values.endsAt!, code: values.code!, limit: values.limit!, zone: designerZone(context.client) },
    new Date(),
  );
  const echoed = { ...values, plans: plans.join(","), allPlans: allPlans ? "on" : "" };
  if (!made.ok) return { errors: made.errors, ...(made.errors.form ? { message: made.errors.form } : {}), values: echoed };
  await recordStaffChange({ ...context, app: null }, `Added a ${made.discount.kind === "coupon" ? `coupon code ${made.discount.code}` : made.discount.kind === "flash" ? "flash sale" : "price drop"} to the Studio Market template “${templateText(template, "en").title}”`);
  refresh();
  return { ok: true, message: DISCOUNT_MESSAGES.saved, values: { kind: values.kind! } };
}

/** "End now" or "Delete" on one of the designer's discounts, back to its template's page. */
export async function changeDiscountAction(formData: FormData): Promise<void> {
  const context = await owner();
  const designer = await designerOf(context);
  const template = await ownTemplate(designer, formData.get("template"));
  const id = text(formData, "discount");
  const store = await getStore();
  const found = await store.getMarketDiscount(id);
  const page = `/designer/discounts/${template.id}`;
  if (!found || found.templateId !== template.id) redirect(`${page}?error=gone`);
  const deleting = formData.get("do") === "delete";
  const done = deleting ? await deleteDiscount(store, designer, id) : await endDiscount(store, designer, id, new Date());
  if (!done) redirect(`${page}?error=gone`);
  await recordStaffChange({ ...context, app: null }, `${deleting ? "Deleted" : "Ended"} a discount of the Studio Market template “${templateText(template, "en").title}”`);
  refresh();
  redirect(`${page}?done=${noticeKey(deleting ? DISCOUNT_MESSAGES.deleted : DISCOUNT_MESSAGES.ended)}#${found.kind}`);
}
