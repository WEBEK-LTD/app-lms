"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { FOOD_REJECTIONS, type App, type FoodOrder, type Restaurant, type RestaurantMenu } from "@/lib/data/types";
import { parseCourierForm } from "@/lib/delivery/forms";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { acceptOrder, cancelOrder, readyOrder, rejectOrder } from "@/lib/food/flow";
import {
  addSection,
  FOOD_LIMITS,
  moveInMenu,
  parseDishForm,
  parseHoursForm,
  parseRestaurantForm,
  removeDish,
  removeSection,
  renameSection,
  saveDish,
  setDishAvailable,
} from "@/lib/food/forms";
import { EMPTY_MENU } from "@/lib/food/menu";
import { FOOD_COMPANY_STEPS, foodOrderReference } from "@/lib/food/service";
import { formValues, type FormState } from "@/lib/forms";
import { parseAnyPhone } from "@/lib/hosted/phone";
import { hostedSettings } from "@/lib/hosted/service";
import { hostedSignInMethods } from "@/lib/hosted/sign-in-methods";
import { imageType } from "@/lib/images";
import type { TeamPermission } from "@/lib/team/permissions";

/**
 * 105.1 The Restaurants and Food orders pages of food delivery apps: each
 * restaurant with its details, hours, menu and staff, and the company's
 * steps on an order. Couriers and delivery settings are the delivery
 * pages' own (app/actions/delivery.ts).
 */

const IMAGE_MAX_BYTES = 3 * 1024 * 1024;

async function requireFoodApp(permission: TeamPermission): Promise<ClientContext & { app: App }> {
  const context = await clientFor(permission);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "restaurants") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function refresh() {
  revalidatePath("/dashboard/restaurants", "layout");
  revalidatePath("/dashboard/food-orders", "layout");
}

const idOf = (formData: FormData, name = "id") => {
  const n = Number(formData.get(name));
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

async function restaurantOf(app: App, formData: FormData): Promise<Restaurant | null> {
  const id = idOf(formData, "restaurant");
  return id === null ? null : (await getStore()).getRestaurant(app.id, id);
}

async function picture(context: ClientContext, file: FormDataEntryValue | null, now: Date): Promise<{ assetId: string | null } | { error: string }> {
  if (!file || typeof file === "string" || file.size === 0) return { assetId: null };
  if (file.size > IMAGE_MAX_BYTES) return { error: "The picture can be up to 3 MB." };
  const data = Buffer.from(await file.arrayBuffer());
  const type = imageType(data);
  if (!type) return { error: "Pictures must be PNG or JPEG files." };
  const assetId = newId();
  const blobKey = `assets/${context.client.id}/${assetId}.${type.extension}`;
  await getBlobStore().put(blobKey, data, type.contentType);
  await (await getStore()).createAsset({ id: assetId, clientId: context.client.id, kind: "product_image", blobKey, contentType: type.contentType, size: data.length, createdAt: now });
  return { assetId };
}

// Restaurants

export async function saveRestaurantAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireFoodApp("catalog");
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const existing = await restaurantOf(app, formData);
  if (formData.get("restaurant") && !existing) return { message: "This restaurant doesn't exist anymore." };
  const settings = deliverySettingsOf(await store.getDeliverySettings(app.id));
  const country = hostedSettings(app).defaultCountryCode;
  const parsed = parseRestaurantForm(values, (settings.cuisines ?? []).map((c) => c.id), (text) => parseAnyPhone(text, country)?.e164 ?? null);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const all = await store.listRestaurants(app.id);
  if (!existing && all.length >= FOOD_LIMITS.restaurants) return { message: `You can have up to ${FOOD_LIMITS.restaurants} restaurants.`, values };
  const logo = await picture(context, formData.get("logo"), now);
  if ("error" in logo) return { errors: { logo: logo.error }, values };
  const cover = await picture(context, formData.get("cover"), now);
  if ("error" in cover) return { errors: { cover: cover.error }, values };
  const logoAssetId = logo.assetId ?? (formData.get("removeLogo") === "on" ? null : (existing?.logoAssetId ?? null));
  const coverAssetId = cover.assetId ?? (formData.get("removeCover") === "on" ? null : (existing?.coverAssetId ?? null));
  if (existing) {
    await store.updateRestaurant(app.id, existing.id, { ...parsed.value, logoAssetId, coverAssetId }, now);
    await recordStaffChange(context, `Edited the restaurant ${parsed.value.name}`);
    refresh();
    return { ok: true, message: "Saved.", values };
  }
  const position = all.reduce((max, r) => Math.max(max, r.position), 0) + 1;
  const created = await store.createRestaurant({ appId: app.id, ...parsed.value, logoAssetId, coverAssetId, hours: [], active: true, position }, EMPTY_MENU, now);
  await recordStaffChange(context, `Added the restaurant ${parsed.value.name}`);
  refresh();
  redirect(`/dashboard/restaurants/${created.id}?added=1`);
}

export async function setRestaurantActiveAction(formData: FormData): Promise<void> {
  const context = await requireFoodApp("catalog");
  const restaurant = await restaurantOf(context.app, formData);
  if (!restaurant) return;
  const active = formData.get("active") === "true";
  await (await getStore()).updateRestaurant(context.app.id, restaurant.id, { active }, new Date());
  await recordStaffChange(context, `${active ? "Showed" : "Paused"} the restaurant ${restaurant.name}`);
  refresh();
}

/** Takes new orders again before its busy time ends. */
export async function openRestaurantAction(formData: FormData): Promise<void> {
  const context = await requireFoodApp("orders");
  const restaurant = await restaurantOf(context.app, formData);
  if (!restaurant) return;
  await (await getStore()).updateRestaurant(context.app.id, restaurant.id, { busyUntil: null }, new Date());
  refresh();
}

export async function deleteRestaurantAction(formData: FormData): Promise<void> {
  const context = await requireFoodApp("catalog");
  const restaurant = await restaurantOf(context.app, formData);
  if (!restaurant) return;
  await (await getStore()).deleteRestaurant(context.app.id, restaurant.id);
  await recordStaffChange(context, `Deleted the restaurant ${restaurant.name}`);
  refresh();
  redirect("/dashboard/restaurants");
}

export async function saveHoursAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireFoodApp("catalog");
  const values = formValues(formData);
  const restaurant = await restaurantOf(context.app, formData);
  if (!restaurant) return { message: "This restaurant doesn't exist anymore." };
  const parsed = parseHoursForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  await (await getStore()).updateRestaurant(context.app.id, restaurant.id, { hours: parsed.value }, new Date());
  await recordStaffChange(context, `Saved the opening hours of ${restaurant.name}`);
  refresh();
  return { ok: true, message: "Saved.", values };
}

// The menu

async function changeMenu(context: ClientContext & { app: App }, restaurant: Restaurant, change: (menu: RestaurantMenu) => { ok: true; menu: RestaurantMenu } | { ok: false; error: string }): Promise<string | null> {
  const store = await getStore();
  const menu = (await store.getRestaurantMenu(context.app.id, restaurant.id)) ?? EMPTY_MENU;
  const changed = change(menu);
  if (!changed.ok) return changed.error;
  await store.saveRestaurantMenu(context.app.id, restaurant.id, changed.menu, new Date());
  refresh();
  return null;
}

export async function addSectionAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireFoodApp("catalog");
  const values = formValues(formData);
  const restaurant = await restaurantOf(context.app, formData);
  if (!restaurant) return { message: "This restaurant doesn't exist anymore." };
  const error = await changeMenu(context, restaurant, (menu) => addSection(menu, values.name ?? ""));
  if (error) return { errors: { name: error }, values };
  return { ok: true, message: "Added. Add its dishes under it.", values: {} };
}

export async function renameSectionAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireFoodApp("catalog");
  const values = formValues(formData);
  const restaurant = await restaurantOf(context.app, formData);
  const section = idOf(formData, "section");
  if (!restaurant || section === null) return { message: "This restaurant doesn't exist anymore." };
  const error = await changeMenu(context, restaurant, (menu) => renameSection(menu, section, values.name ?? ""));
  if (error) return { errors: { name: error }, values };
  return { ok: true, message: "Saved.", values };
}

export async function deleteSectionAction(formData: FormData): Promise<void> {
  const context = await requireFoodApp("catalog");
  const restaurant = await restaurantOf(context.app, formData);
  const section = idOf(formData, "section");
  if (!restaurant || section === null) return;
  await changeMenu(context, restaurant, (menu) => ({ ok: true, menu: removeSection(menu, section) }));
}

export async function moveMenuItemAction(formData: FormData): Promise<void> {
  const context = await requireFoodApp("catalog");
  const restaurant = await restaurantOf(context.app, formData);
  const section = idOf(formData, "section");
  if (!restaurant || section === null) return;
  const dish = idOf(formData, "dish") ?? undefined;
  const step = formData.get("step") === "up" ? -1 : 1;
  await changeMenu(context, restaurant, (menu) => ({ ok: true, menu: moveInMenu(menu, { section, dish }, step) }));
}

export async function saveDishAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireFoodApp("catalog");
  const values = formValues(formData);
  const restaurant = await restaurantOf(context.app, formData);
  const section = idOf(formData, "section");
  if (!restaurant || section === null) return { message: "This restaurant doesn't exist anymore." };
  const dishId = idOf(formData, "dish");
  const parsed = parseDishForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const image = await picture(context, formData.get("image"), new Date());
  if ("error" in image) return { errors: { image: image.error }, values };
  const imageAssetId = image.assetId ?? (formData.get("removeImage") === "on" ? null : undefined);
  const error = await changeMenu(context, restaurant, (menu) => saveDish(menu, section, dishId, parsed.value, imageAssetId));
  if (error) return { errors: { choices: error }, values };
  await recordStaffChange(context, `${dishId ? "Edited" : "Added"} the dish ${parsed.value.name} at ${restaurant.name}`);
  return { ok: true, message: dishId ? "Saved." : "Added. Customers see it on the menu now.", values: dishId ? values : {} };
}

export async function deleteDishAction(formData: FormData): Promise<void> {
  const context = await requireFoodApp("catalog");
  const restaurant = await restaurantOf(context.app, formData);
  const dish = idOf(formData, "dish");
  if (!restaurant || dish === null) return;
  await changeMenu(context, restaurant, (menu) => ({ ok: true, menu: removeDish(menu, dish) }));
}

export async function setDishAvailableAction(formData: FormData): Promise<void> {
  const context = await requireFoodApp("catalog");
  const restaurant = await restaurantOf(context.app, formData);
  const dish = idOf(formData, "dish");
  if (!restaurant || dish === null) return;
  await changeMenu(context, restaurant, (menu) => ({ ok: true, menu: setDishAvailable(menu, dish, formData.get("available") === "true") }));
}

// Staff

export async function addStaffAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireFoodApp("orders");
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const restaurant = await restaurantOf(app, formData);
  if (!restaurant) return { message: "This restaurant doesn't exist anymore." };
  const methods = hostedSignInMethods(app);
  const parsed = parseCourierForm({ ...values, vehicle: "" }, hostedSettings(app).defaultCountryCode, methods.length === 1 && methods[0] === "email");
  if (!parsed.ok) return { errors: parsed.errors, values };
  if ((await store.listRestaurantStaff(app.id, restaurant.id)).length >= FOOD_LIMITS.staff) return { message: `A restaurant can have up to ${FOOD_LIMITS.staff} staff.`, values };
  const created = await store.createRestaurantStaff({ appId: app.id, restaurantId: restaurant.id, name: parsed.value.name, phone: parsed.value.phone, email: parsed.value.email, active: true }, new Date());
  if (!created.ok) return { errors: { phone: "This number or email already works for one of your restaurants." }, values };
  await recordStaffChange(context, `Added ${parsed.value.name} to the staff of ${restaurant.name}`);
  refresh();
  return { ok: true, message: "Added. They sign in to the app with this number and see the restaurant's orders.", values: {} };
}

export async function setStaffActiveAction(formData: FormData): Promise<void> {
  const context = await requireFoodApp("orders");
  const id = idOf(formData);
  if (id === null) return;
  await (await getStore()).updateRestaurantStaff(context.app.id, id, { active: formData.get("active") === "true" }, new Date());
  refresh();
}

export async function deleteStaffAction(formData: FormData): Promise<void> {
  const context = await requireFoodApp("orders");
  const id = idOf(formData);
  if (id === null) return;
  await (await getStore()).deleteRestaurantStaff(context.app.id, id);
  await recordStaffChange(context, "Removed a person from a restaurant's staff");
  refresh();
}

// Food orders

/** The company's steps on an order (Dashboard › Food orders): accept, turn down, ready, cancel. */
export async function foodOrderStepAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireFoodApp("orders");
  const { app } = context;
  const store = await getStore();
  const id = idOf(formData);
  const order: FoodOrder | null = id === null ? null : await store.getFoodOrder(app.id, id);
  if (!order) return { message: "This order doesn't exist anymore." };
  const step = String(formData.get("step") ?? "");
  if (!(FOOD_COMPANY_STEPS[order.status] ?? []).some((s) => s === step)) return { message: "This order can't move to that stage now." };
  const deps = { store, app, now: new Date() };
  const note = String(formData.get("note") ?? "").replace(/\s+/g, " ").trim().slice(0, 300) || null;
  let moved;
  if (step === "accepted") {
    const minutes = Number(formData.get("prepMinutes"));
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > FOOD_LIMITS.maxPrepMinutes) return { errors: { prepMinutes: `Enter the minutes from 5 to ${FOOD_LIMITS.maxPrepMinutes}.` } };
    moved = await acceptOrder(deps, order, minutes, "company");
  } else if (step === "rejected") {
    const reason = FOOD_REJECTIONS.find((r) => r === formData.get("reason"));
    if (!reason) return { errors: { reason: "Choose why it can't be taken." } };
    moved = await rejectOrder(deps, order, reason, note, "company");
  } else if (step === "ready") {
    moved = await readyOrder(deps, order, "company");
  } else {
    moved = await cancelOrder(deps, order, "company", note);
  }
  if (!moved.ok) return { message: "This order changed meanwhile. Reload the page." };
  await recordStaffChange(context, `Moved food order ${foodOrderReference(order)} to ${step}`);
  refresh();
  return { ok: true, message: "Saved. The customer was told in the app." };
}
