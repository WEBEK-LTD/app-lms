"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App, Restaurant } from "@/lib/data/types";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import {
  createProduct,
  deleteAisle,
  deleteDepartment,
  deleteProduct,
  formFields,
  orderShelves,
  saveAisle,
  saveDepartment,
  sellsProducts,
  undoCatalogChange,
  undoStockMove,
  updateProduct,
  type CatalogScope,
} from "@/lib/market/catalog-edit";
import { marketCurrency } from "@/lib/market/settings";

/**
 * 115.24 The owner's dashboard edits any place's catalog (a grocery's or a
 * shop's products, departments and aisles), sees what each place changed in
 * its own and undoes it; stock goes through the stock-moves ledger. Each
 * change is in the team's audit log too.
 */

async function ownerScope(restaurantId: number): Promise<{ context: ClientContext & { app: App }; scope: CatalogScope; vendor: Restaurant }> {
  const context = await clientFor("catalog");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "restaurants") redirect("/dashboard");
  const store = await getStore();
  const vendor = await store.getRestaurant(context.app.id, restaurantId);
  if (!vendor || !sellsProducts(vendor)) redirect("/dashboard/restaurants");
  const currency = marketCurrency(deliverySettingsOf(await store.getDeliverySettings(context.app.id)));
  const who = context.member ?? context.staff ?? context.user;
  return { context: context as ClientContext & { app: App }, vendor, scope: { store, appId: context.app.id, vendor, currency, who: { by: "owner", byName: who.name || who.email } } };
}

const page = (vendor: Restaurant, extra = "") => `/dashboard/restaurants/${vendor.id}/catalog${extra ? `?${extra}` : ""}`;
const firstError = (errors: Partial<Record<string, string>>) => Object.values(errors).find(Boolean) ?? "Check the fields.";

function done(vendor: Restaurant, extra = ""): never {
  revalidatePath(`/dashboard/restaurants/${vendor.id}`, "layout");
  redirect(page(vendor, extra));
}

export async function ownerSaveProductAction(restaurantId: number, formData: FormData): Promise<void> {
  const { context, scope, vendor } = await ownerScope(restaurantId);
  const id = Number(formData.get("id")) || null;
  const now = new Date();
  const saved = id === null ? await createProduct(scope, formFields(formData), now) : await updateProduct(scope, id, formFields(formData), now);
  if (!saved) done(vendor);
  if (!saved.ok) done(vendor, `edit=${id ?? "new"}&error=${encodeURIComponent(firstError(saved.errors))}`);
  await recordStaffChange(context, `${id === null ? "Added" : "Edited"} the product ${saved.value.name} of ${vendor.name}`);
  done(vendor, `edit=${saved.value.id}&saved=1`);
}

export async function ownerDeleteProductAction(restaurantId: number, formData: FormData): Promise<void> {
  const { context, scope, vendor } = await ownerScope(restaurantId);
  const id = Number(formData.get("id"));
  const p = await scope.store.getMarketProduct(scope.appId, id);
  if (await deleteProduct(scope, id, new Date())) await recordStaffChange(context, `Deleted the product ${p?.name ?? id} of ${vendor.name}`);
  done(vendor);
}

export async function ownerSaveShelfAction(restaurantId: number, formData: FormData): Promise<void> {
  const { context, scope, vendor } = await ownerScope(restaurantId);
  const id = Number(formData.get("id")) || null;
  const now = new Date();
  const saved = formData.get("kind") === "aisle" ? await saveAisle(scope, { id, departmentId: Number(formData.get("department_id")), name: formData.get("name") }, now) : await saveDepartment(scope, { id, name: formData.get("name") }, now);
  if (saved.ok) await recordStaffChange(context, `Saved the ${formData.get("kind") === "aisle" ? "aisle" : "department"} ${saved.value.name} of ${vendor.name}`);
  done(vendor, `view=shelves${saved.ok ? "" : `&error=${encodeURIComponent(firstError(saved.errors))}`}`);
}

export async function ownerDeleteShelfAction(restaurantId: number, formData: FormData): Promise<void> {
  const { context, scope, vendor } = await ownerScope(restaurantId);
  const id = Number(formData.get("id"));
  const gone = formData.get("kind") === "aisle" ? await deleteAisle(scope, id, new Date()) : await deleteDepartment(scope, id, new Date());
  if (gone) await recordStaffChange(context, `Deleted a ${formData.get("kind") === "aisle" ? "aisle" : "department"} of ${vendor.name}`);
  done(vendor, "view=shelves");
}

export async function ownerOrderShelfAction(restaurantId: number, formData: FormData): Promise<void> {
  const { scope, vendor } = await ownerScope(restaurantId);
  const kind = formData.get("kind") === "aisle" ? ({ kind: "aisle", departmentId: Number(formData.get("department_id")) } as const) : ({ kind: "department" } as const);
  const ids = String(formData.get("ids") ?? "");
  const order = ids ? ids.split(",").map(Number) : { id: Number(formData.get("id")), move: formData.get("move") === "up" ? ("up" as const) : ("down" as const) };
  await orderShelves(scope, kind, order, new Date());
  done(vendor, "view=shelves");
}

/** Undoes one of the place's changes (D10). */
export async function ownerUndoChangeAction(restaurantId: number, formData: FormData): Promise<void> {
  const { context, scope, vendor } = await ownerScope(restaurantId);
  const undone = await undoCatalogChange(scope, Number(formData.get("change")), new Date());
  if (undone.ok) await recordStaffChange(context, `Undid a change of ${vendor.name} to its products`);
  done(vendor, undone.ok ? "undone=1" : `error=${encodeURIComponent(undone.error)}`);
}

/** Undoes a hand change of a product's stock. */
export async function ownerUndoStockAction(restaurantId: number, formData: FormData): Promise<void> {
  const { context, scope, vendor } = await ownerScope(restaurantId);
  const move = await scope.store.getMarketStockMove(scope.appId, Number(formData.get("move")));
  const undone = move ? await undoStockMove(scope, move.id, new Date()) : { ok: false as const, error: "This change isn't there any more." };
  if (undone.ok) await recordStaffChange(context, `Undid a stock change of ${vendor.name}`);
  done(vendor, `edit=${move?.productId ?? ""}${undone.ok ? "&saved=1" : `&error=${encodeURIComponent(undone.error)}`}`);
}
