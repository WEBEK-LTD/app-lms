"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { recordStaffChange } from "@/lib/admin/audit";
import { catalogSettings } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import type { App, CatalogSettings } from "@/lib/data/types";
import type { FormState } from "@/lib/forms";
import { DEFAULT_DELIVERY, parseDeliveryForm } from "@/lib/selling/delivery";
import { parseFlashSaleForm } from "@/lib/selling/flash-sales";
import { GIFT_MESSAGE_LIMITS, moved, nextTemplateId, parseOccasionForm, parseTemplateForm, seedGiftOccasions } from "@/lib/selling/gift-messages";
import { giftsOf, parseGiftForm } from "@/lib/selling/gifts";
import { parseShippingForm } from "@/lib/selling/shipping";
import { appLanguagesOf } from "@/lib/selling/store";
import { shopZone, zoneOffsetMinutes } from "@/lib/selling/zone";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";
import { langTextOfForm, parseAddonSettings } from "@/lib/selling/addons";

/**
 * 131 Store › Delivery & offers (app/dashboard/selling): the checkout, the
 * delivery days and slots, where the shop delivers and what it costs, the
 * gifts and the card messages, and the flash sales, for every store app.
 */

async function requireStoreApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("catalog");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.appType !== "store") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function values(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string") out[key] = value;
  return out;
}

async function saveSettings(app: App, patch: Partial<CatalogSettings>): Promise<void> {
  await (await getStore()).updateApp(app.id, { catalogSettings: { ...catalogSettings(app), ...patch } }, new Date());
}

function refresh() {
  revalidatePath("/dashboard/selling", "layout");
}



/** The checkout: standard, or the gift checkout. */
export async function saveCheckoutModeAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireStoreApp();
  const mode = formData.get("checkout") === "gift" ? "gift" : "standard";
  await saveSettings(context.app, { gifts: { ...giftsOf(context.app), checkout: mode } });
  await recordStaffChange(context, mode === "gift" ? "Turned on the gift checkout" : "Turned off the gift checkout");
  refresh();
  return { ok: true, message: "Saved.", values: { checkout: mode } };
}

export async function saveDeliveryAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireStoreApp();
  const v = values(formData);
  const parsed = parseDeliveryForm(v, context.app.catalogSettings?.delivery ?? DEFAULT_DELIVERY);
  if (!parsed.ok) return { errors: parsed.errors, values: v };
  await saveSettings(context.app, { delivery: parsed.value });
  await recordStaffChange(context, "Changed the delivery days and times");
  refresh();
  return { ok: true, message: "Saved.", values: v };
}

export async function saveAreasAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireStoreApp();
  const v = values(formData);
  const parsed = parseShippingForm(v);
  if (!parsed.ok) return { errors: parsed.errors, values: v };
  await saveSettings(context.app, parsed.value);
  await recordStaffChange(context, "Changed where the shop delivers and its shipping prices");
  refresh();
  return { ok: true, message: "Saved.", values: v };
}

export async function saveGiftsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireStoreApp();
  const v = values(formData);
  const parsed = parseGiftForm({ ...v, checkout: giftsOf(context.app).checkout ?? "standard" });
  if (!parsed.ok) return { errors: parsed.errors, values: v };
  const current = giftsOf(context.app);
  await saveSettings(context.app, { gifts: { ...parsed.value, checkout: current.checkout, messagesSeeded: current.messagesSeeded } });
  await recordStaffChange(context, "Changed the gift options");
  refresh();
  return { ok: true, message: "Saved.", values: v };
}

// Card messages

/** The store's occasions, copied from Yallapp's starters the first time. */
async function occasions(app: App) {
  return seedGiftOccasions(await getStore(), app, new Date());
}

export async function addOccasionAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireStoreApp();
  const store = await getStore();
  const v = values(formData);
  const languages = (await appLanguagesOf(store, app)).available;
  const parsed = parseOccasionForm(v, languages);
  if (!parsed.ok) return { errors: parsed.errors, values: v };
  const list = await occasions(app);
  if (list.length >= GIFT_MESSAGE_LIMITS.occasions) return { message: `You can have up to ${GIFT_MESSAGE_LIMITS.occasions} occasions.`, values: v };
  const now = new Date();
  await store.createGiftOccasion({ appId: app.id, key: null, names: parsed.value.names, icon: "redeem", position: list.length, hidden: false, templates: [], createdAt: now, updatedAt: now });
  refresh();
  // The card messages reach a WordPress site with its license status: it is asked to check now.
  if (app.backend === "wordpress") refreshSitesSoon([app.id]);
  return { ok: true, message: "Saved." };
}

export async function saveOccasionAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireStoreApp();
  const store = await getStore();
  const v = values(formData);
  const id = Number(v.id);
  const parsed = parseOccasionForm(v, (await appLanguagesOf(store, app)).available);
  if (!parsed.ok) return { errors: parsed.errors, values: v };
  await occasions(app);
  await store.updateGiftOccasion(app.id, id, { names: parsed.value.names, updatedAt: new Date() });
  refresh();
  // The card messages reach a WordPress site with its license status: it is asked to check now.
  if (app.backend === "wordpress") refreshSitesSoon([app.id]);
  return { ok: true, message: "Saved.", values: v };
}

/** Moves (`move` up or down), hides, shows or deletes an occasion. */
export async function changeOccasionAction(formData: FormData): Promise<void> {
  const { app } = await requireStoreApp();
  const store = await getStore();
  const list = await occasions(app);
  const id = Number(formData.get("id"));
  const found = list.find((o) => o.id === id);
  if (!found) return;
  const what = String(formData.get("change") ?? "");
  const now = new Date();
  if (what === "up" || what === "down") {
    for (const p of moved(list, id, what === "up" ? -1 : 1)) await store.updateGiftOccasion(app.id, p.id, { position: p.position, updatedAt: now });
  } else if (what === "hide" || what === "show") {
    await store.updateGiftOccasion(app.id, id, { hidden: what === "hide", updatedAt: now });
  } else if (what === "delete") {
    await store.deleteGiftOccasion(app.id, id);
  }
  refresh();
  // The card messages reach a WordPress site with its license status: it is asked to check now.
  if (app.backend === "wordpress") refreshSitesSoon([app.id]);
}

export async function saveTemplateAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireStoreApp();
  const store = await getStore();
  const v = values(formData);
  const languages = await appLanguagesOf(store, app);
  const parsed = parseTemplateForm(v, languages.available, languages.default);
  if (!parsed.ok) return { errors: parsed.errors, values: v };
  const occasion = (await occasions(app)).find((o) => o.id === Number(v.occasionId));
  if (!occasion) return { message: "This occasion doesn't exist anymore.", values: v };
  const templates = [...occasion.templates];
  const at = templates.findIndex((t) => t.id === v.templateId);
  if (at >= 0) templates[at] = { ...templates[at]!, texts: parsed.value.texts };
  else {
    if (templates.length >= GIFT_MESSAGE_LIMITS.templates) return { message: `An occasion can have up to ${GIFT_MESSAGE_LIMITS.templates} messages.`, values: v };
    templates.push({ id: nextTemplateId(templates), texts: parsed.value.texts, hidden: false });
  }
  await store.updateGiftOccasion(app.id, occasion.id, { templates, updatedAt: new Date() });
  refresh();
  // The card messages reach a WordPress site with its license status: it is asked to check now.
  if (app.backend === "wordpress") refreshSitesSoon([app.id]);
  return { ok: true, message: "Saved.", values: at >= 0 ? v : undefined };
}

/** Moves, hides, shows or deletes one message. */
export async function changeTemplateAction(formData: FormData): Promise<void> {
  const { app } = await requireStoreApp();
  const store = await getStore();
  const occasion = (await occasions(app)).find((o) => o.id === Number(formData.get("occasionId")));
  if (!occasion) return;
  const id = String(formData.get("templateId") ?? "");
  const what = String(formData.get("change") ?? "");
  let templates = [...occasion.templates];
  const at = templates.findIndex((t) => t.id === id);
  if (at < 0) return;
  if (what === "up" || what === "down") {
    const to = at + (what === "up" ? -1 : 1);
    if (to >= 0 && to < templates.length) [templates[at], templates[to]] = [templates[to]!, templates[at]!];
  } else if (what === "hide" || what === "show") {
    templates[at] = { ...templates[at]!, hidden: what === "hide" };
  } else if (what === "delete") {
    templates = templates.filter((t) => t.id !== id);
  }
  await store.updateGiftOccasion(app.id, occasion.id, { templates, updatedAt: new Date() });
  refresh();
  // The card messages reach a WordPress site with its license status: it is asked to check now.
  if (app.backend === "wordpress") refreshSitesSoon([app.id]);
}

// Flash sales

export async function saveFlashSaleAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireStoreApp();
  const { app } = context;
  const v = values(formData);
  // The checkboxes of the shop's own products, or the numbers typed for a platform's.
  const picked = formData.getAll("product").map(String).filter(Boolean);
  if (picked.length) v.productIds = picked.join(",");
  const zone = shopZone(app);
  const parsed = parseFlashSaleForm(v, zoneOffsetMinutes(zone, new Date()));
  // 131 Its title in the app's other languages.
  const store = await getStore();
  const titles = langTextOfForm(v, "title", (await appLanguagesOf(store, app)).available);
  if (!parsed.ok || titles.error) return { errors: { ...(parsed.ok ? {} : parsed.errors), ...(titles.error ? { titles: titles.error } : {}) }, values: v };
  const sale = { ...parsed.value, titles: titles.value ?? undefined };
  const now = new Date();
  const id = Number(v.id);
  if (Number.isSafeInteger(id) && id > 0 && (await store.getFlashSale(app.id, id))) {
    await store.updateFlashSale(app.id, id, { ...sale, updatedAt: now });
  } else {
    await store.createFlashSale({ appId: app.id, ...sale, active: true, createdAt: now, updatedAt: now });
  }
  await recordStaffChange(context, `Saved the flash sale “${parsed.value.title}”`);
  refresh();
  return { ok: true, message: "Saved.", values: Number.isSafeInteger(id) && id > 0 ? v : undefined };
}

export async function changeFlashSaleAction(formData: FormData): Promise<void> {
  const { app } = await requireStoreApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const what = String(formData.get("change") ?? "");
  if (what === "delete") await store.deleteFlashSale(app.id, id);
  else if (what === "on" || what === "off") await store.updateFlashSale(app.id, id, { active: what === "on", updatedAt: new Date() });
  refresh();
}

// 131 Gift add-ons and the titles the owner words

/** A connected platform's gift add-ons: its products by ID, a category, a tag, and what they go with. */
export async function saveAddonsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireStoreApp();
  const v = values(formData);
  const parsed = parseAddonSettings(v, { categoryIds: formData.getAll("offerCategoryIds").map(String), productIds: formData.getAll("offerProductIds").map(String) });
  if (!parsed.ok) return { errors: parsed.errors, values: v };
  const empty = !parsed.value.productIds.length && parsed.value.categoryId === null && !parsed.value.tag;
  await saveSettings(context.app, { addons: empty ? null : parsed.value });
  await recordStaffChange(context, "Changed the gift add-ons");
  refresh();
  return { ok: true, message: "Saved.", values: v };
}

/** The titles of the add-ons, the card and the delivery picker, per language (empty: the app's words). */
export async function saveTitlesAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireStoreApp();
  const { app } = context;
  const v = values(formData);
  const languages = (await appLanguagesOf(await getStore(), app)).available;
  const addons = langTextOfForm(v, "addons", languages);
  const card = langTextOfForm(v, "card", languages);
  const delivery = langTextOfForm(v, "delivery", languages);
  const error = addons.error ?? card.error ?? delivery.error;
  if (error) return { errors: { titles: error }, values: v };
  const titles = { ...(addons.value ? { addons: addons.value } : {}), ...(card.value ? { card: card.value } : {}), ...(delivery.value ? { delivery: delivery.value } : {}) };
  await saveSettings(app, { titles: Object.keys(titles).length ? titles : null });
  await recordStaffChange(context, "Changed the store's section titles");
  // A WordPress site gets them with its license status.
  if (app.backend === "wordpress") refreshSitesSoon([app.id]);
  refresh();
  return { ok: true, message: "Saved.", values: v };
}
