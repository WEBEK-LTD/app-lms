"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, requestIp, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App, ComplaintDecision, ComplaintStatus } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import { decideComplaint, supportReply, teamNote } from "@/lib/market/complaints";
import { complaintDecisionDeps } from "@/lib/market/decisions";
import { complaintReference } from "@/lib/market/json";
import { currencyDecimals, toMinor } from "@/lib/market/currency";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { parseCourierTermsForm } from "@/lib/market/delivery-forms";
import { parseClubPlanForm, parseCouponForm } from "@/lib/market/offer-forms";
import { marketCurrency, marketSettingsOf } from "@/lib/market/settings";
import { parseMarketSettingsForm } from "@/lib/market/settings-form";
import { parseServiceAreaForm } from "@/lib/market/areas";
import { newId } from "@/lib/crypto/tokens";
import { ownerPauseVendorCoupon } from "@/lib/market/vendor-coupons";

/**
 * 115.12 The app owner's complaint queue: replies the customer reads, the
 * team's own notes, who has the ticket, its status, sharing it with the
 * place, and the decision, carried out by lib/market/complaints.ts.
 */

const STATUSES: ComplaintStatus[] = ["open", "in_review", "waiting_for_customer"];
const OUTCOMES: ComplaintDecision["outcome"][] = ["refund", "partial_refund", "compensation", "no_refund"];
const TARGETS = ["payment", "wallet", "coupon"] as const;

async function requireMarketApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("orders");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "restaurants") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

/** Who did it, as the ticket shows it: the signed-in person's email. */
function whoOf(context: ClientContext): string {
  return (context.member ?? context.staff ?? context.user).email;
}

async function complaintOf(context: ClientContext & { app: App }, formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return null;
  return (await getStore()).getMarketComplaint(context.app.id, id);
}

function back(id: number, message?: string): never {
  revalidatePath("/dashboard/market/complaints", "layout");
  revalidatePath("/studio/project/market/complaints", "layout");
  redirect(`/dashboard/market/complaints/${id}${message ? `?error=${encodeURIComponent(message)}` : ""}`);
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

export async function replyComplaintAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const c = await complaintOf(context, formData);
  if (!c) redirect("/dashboard/market/complaints");
  const patch = supportReply(c, text(formData, "text"), whoOf(context), new Date());
  if (patch) {
    await (await getStore()).updateMarketComplaint(context.app.id, c.id, { ...patch, assignee: c.assignee ?? whoOf(context) });
    await recordStaffChange(context, `Answered complaint ${complaintReference(c)}`);
  }
  back(c.id);
}

export async function noteComplaintAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const c = await complaintOf(context, formData);
  if (!c) redirect("/dashboard/market/complaints");
  const patch = teamNote(c, text(formData, "text"), whoOf(context), new Date());
  if (patch) await (await getStore()).updateMarketComplaint(context.app.id, c.id, patch);
  back(c.id);
}

export async function takeComplaintAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const c = await complaintOf(context, formData);
  if (!c) redirect("/dashboard/market/complaints");
  await (await getStore()).updateMarketComplaint(context.app.id, c.id, { assignee: whoOf(context), ...(c.status === "open" ? { status: "in_review" } : {}), updatedAt: new Date() });
  back(c.id);
}

export async function statusComplaintAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const c = await complaintOf(context, formData);
  if (!c) redirect("/dashboard/market/complaints");
  const status = text(formData, "status") as ComplaintStatus;
  // Closing goes through a decision; these are the working states only.
  if (STATUSES.includes(status) && !c.decision) await (await getStore()).updateMarketComplaint(context.app.id, c.id, { status, updatedAt: new Date() });
  back(c.id);
}

export async function shareComplaintAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const c = await complaintOf(context, formData);
  if (!c) redirect("/dashboard/market/complaints");
  await (await getStore()).updateMarketComplaint(context.app.id, c.id, { sharedWithVendor: formData.get("share") === "1", updatedAt: new Date() });
  await recordStaffChange(context, `${formData.get("share") === "1" ? "Shared" : "Stopped sharing"} complaint ${complaintReference(c)} with the place`);
  back(c.id);
}

export async function decideComplaintAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const c = await complaintOf(context, formData);
  if (!c) redirect("/dashboard/market/complaints");
  const store = await getStore();
  const order = await store.getMarketOrder(context.app.id, c.orderId);
  if (!order) back(c.id, "The order isn't there any more.");
  const outcome = text(formData, "outcome") as ComplaintDecision["outcome"];
  if (!OUTCOMES.includes(outcome)) back(c.id, "Choose what you decide.");
  const to = text(formData, "to");
  const amountText = text(formData, "amount");
  const amount = amountText ? toMinor(amountText, currencyDecimals(order.currency)) : null;
  if (amountText && amount === null) back(c.id, "Write the amount as a number.");
  const now = new Date();
  const done = await decideComplaint(
    store,
    complaintDecisionDeps(store, context.app, encryptionKey(), { ip: await requestIp(), now }),
    c,
    order,
    {
      outcome,
      amount,
      to: (TARGETS as readonly string[]).includes(to) ? (to as (typeof TARGETS)[number]) : null,
      funder: text(formData, "funder") === "vendor" ? "vendor" : "owner",
      reason: text(formData, "reason") || null,
      shareWithVendor: formData.get("share") === "1",
    },
    whoOf(context),
    now,
  );
  if (!done.ok) back(c.id, done.error);
  await recordStaffChange(context, `Decided complaint ${complaintReference(c)}: ${outcome}`);
  back(c.id);
}

// 115.12 Offers & club: the owner's coupons and automatic offers, and the club's plans.

function backToOffers(message?: string): never {
  revalidatePath("/dashboard/market/offers");
  revalidatePath("/studio/project/market/offers");
  redirect(`/dashboard/market/offers${message ? `?error=${encodeURIComponent(message)}` : ""}`);
}

async function offerContext() {
  const context = await requireMarketApp();
  const store = await getStore();
  const settings = deliverySettingsOf(await store.getDeliverySettings(context.app.id));
  return { context, store, currency: marketCurrency(settings) };
}

const formOf = (formData: FormData) => Object.fromEntries([...formData.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]));

export async function createCouponAction(formData: FormData): Promise<void> {
  const { context, store, currency } = await offerContext();
  const parsed = parseCouponForm(formOf(formData), { appId: context.app.id, currency, now: new Date() });
  if (!parsed.ok) backToOffers(parsed.error);
  const made = await store.createMarketCoupon(parsed.value);
  if (!made) backToOffers("That code is in use already. Choose another.");
  await recordStaffChange(context, `Added the offer ${parsed.value.title}`);
  backToOffers();
}

export async function couponActiveAction(formData: FormData): Promise<void> {
  const { context, store } = await offerContext();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id) && id > 0) await store.updateMarketCoupon(context.app.id, id, { active: formData.get("active") === "1", updatedAt: new Date() });
  backToOffers();
}

/** 115.18 Pause a coupon a place made, or allow it again; the place can't undo the owner's pause. */
export async function ownerPauseCouponAction(formData: FormData): Promise<void> {
  const { context, store } = await offerContext();
  const paused = formData.get("paused") === "1";
  if (await ownerPauseVendorCoupon(store, context.app.id, Number(formData.get("id")), paused, new Date())) {
    await recordStaffChange(context, paused ? "Paused a place's offer" : "Allowed a place's offer again");
  }
  backToOffers();
}

export async function deleteCouponAction(formData: FormData): Promise<void> {
  const { context, store } = await offerContext();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id) && id > 0) {
    await store.deleteMarketCoupon(context.app.id, id);
    await recordStaffChange(context, `Deleted an offer`);
  }
  backToOffers();
}

export async function createClubPlanAction(formData: FormData): Promise<void> {
  const { context, store, currency } = await offerContext();
  const position = (await store.listMarketClubPlans(context.app.id)).length;
  const parsed = parseClubPlanForm(formOf(formData), { appId: context.app.id, currency, position, now: new Date() });
  if (!parsed.ok) backToOffers(parsed.error);
  await store.createMarketClubPlan(parsed.value);
  await recordStaffChange(context, `Added the club plan ${parsed.value.name}`);
  backToOffers();
}

export async function clubPlanActiveAction(formData: FormData): Promise<void> {
  const { context, store } = await offerContext();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id) && id > 0) await store.updateMarketClubPlan(context.app.id, id, { active: formData.get("active") === "1", updatedAt: new Date() });
  backToOffers();
}

// 115.12 Studio › Marketplace settings

function backToSettings(message?: string, saved?: string): never {
  revalidatePath("/dashboard/market/settings");
  revalidatePath("/studio/project/market/settings");
  const q = message ? `?error=${encodeURIComponent(message)}` : saved ? `?saved=${saved}` : "";
  redirect(`/dashboard/market/settings${q}`);
}

async function settingsContext() {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "restaurants") redirect("/dashboard");
  const app = context.app;
  const store = await getStore();
  const settings = deliverySettingsOf(await store.getDeliverySettings(app.id));
  return { context: context as ClientContext & { app: App }, app, store, settings };
}

/**
 * 115.13 A food delivery project grows into a marketplace, or goes back:
 * only its kind changes (the vertical `marketplace`), so its restaurants,
 * menus, couriers and orders stay. The app opens the marketplace once the
 * plan has `market` (lib/market/plan.ts).
 */
export async function setMarketplaceAction(formData: FormData): Promise<void> {
  const { context, app, store } = await settingsContext();
  const on = formData.get("marketplace") === "on";
  const vertical = on ? "marketplace" : null;
  if ((app.vertical ?? null) !== vertical) {
    const now = new Date();
    await recordStaffChange(context, on ? "Grew the food delivery app into a marketplace" : "Made the marketplace a food delivery app again", { vertical: app.vertical ?? null }, { vertical });
    await store.updateApp(app.id, { vertical }, now);
  }
  revalidatePath("/dashboard", "layout");
  revalidatePath("/studio/project", "layout");
  backToSettings(undefined, on ? "grown" : "food");
}

/** The marketplace as a whole: country, currency, taxes, the ways to pay, pick-up, orders for later, the club, the wallet, photos. */
export async function saveMarketSettingsAction(formData: FormData): Promise<void> {
  const { context, app, store, settings } = await settingsContext();
  const parsed = parseMarketSettingsForm(formOf(formData), marketSettingsOf(settings), settings.currency);
  if (!parsed.ok) backToSettings(parsed.error);
  await store.saveDeliverySettings(app.id, { ...settings, marketApp: parsed.value }, new Date());
  await recordStaffChange(context, "Changed the marketplace settings");
  backToSettings(undefined, "market");
}

/** 115 One of the areas the marketplace serves: a name, its centre on the map and a radius. */
export async function addServiceAreaAction(formData: FormData): Promise<void> {
  const { context, app, store, settings } = await settingsContext();
  const current = marketSettingsOf(settings);
  const owned = current.serviceAreas ?? [];
  const parsed = parseServiceAreaForm(formOf(formData), owned, newId);
  if (!parsed.ok) backToSettings(parsed.error);
  await store.saveDeliverySettings(app.id, { ...settings, marketApp: { ...current, serviceAreas: [...owned, parsed.value] } }, new Date());
  await recordStaffChange(context, `Added the delivery area ${parsed.value.name}`);
  backToSettings(undefined, "areas");
}

/** An area off the list. Places that delivered only there are asked to set their area again (10 km meanwhile). */
export async function removeServiceAreaAction(formData: FormData): Promise<void> {
  const { context, app, store, settings } = await settingsContext();
  const current = marketSettingsOf(settings);
  const owned = current.serviceAreas ?? [];
  const area = owned.find((a) => a.id === text(formData, "id"));
  if (!area) backToSettings(undefined, "areas");
  await store.saveDeliverySettings(app.id, { ...settings, marketApp: { ...current, serviceAreas: owned.filter((a) => a.id !== area.id) } }, new Date());
  await recordStaffChange(context, `Removed the delivery area ${area.name}`);
  backToSettings(undefined, "areas");
}

/** What the app's couriers cost customers and the places that use them. */
export async function saveCourierTermsAction(formData: FormData): Promise<void> {
  const { context, app, store, settings } = await settingsContext();
  const parsed = parseCourierTermsForm(formOf(formData), marketCurrency(settings));
  if (!parsed.ok) backToSettings(parsed.error);
  await store.saveDeliverySettings(app.id, { ...settings, market: parsed.value }, new Date());
  await recordStaffChange(context, "Changed the app's couriers' terms");
  backToSettings(undefined, "couriers");
}
