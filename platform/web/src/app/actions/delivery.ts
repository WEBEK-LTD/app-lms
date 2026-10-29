"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { SHIPMENT_STATUSES } from "@/lib/data/types";
import { courierPlistProblem } from "@/lib/delivery/courier-app";
import { assignShipment, moveShipment } from "@/lib/delivery/flow";
import { courierMayHave, reviewUserId } from "@/lib/delivery/review";
import { parseCourierForm, parseDeliverySettings, parseServiceForm } from "@/lib/delivery/forms";
import { COMPANY_STEPS, shipmentReference } from "@/lib/delivery/service";
import { DELIVERY_LIMITS, deliverySettingsOf } from "@/lib/delivery/settings";
import { appPlan } from "@/lib/entitlements";
import { formValues, type FormState } from "@/lib/forms";
import { hostedSettings } from "@/lib/hosted/service";
import { hostedSignInMethods } from "@/lib/hosted/sign-in-methods";
import { imageType } from "@/lib/images";
import { hasFeature } from "@/lib/plans";
import type { TeamPermission } from "@/lib/team/permissions";
import { askAfterOwnEntry } from "@/lib/samples/lists";

/**
 * 104 The Shipments, Couriers and Delivery settings pages of delivery apps:
 * the company's prices and choices, its services, its couriers, and giving
 * a shipment to a courier or moving it on. Payment keys are saved with the
 * shop's actions (app/actions/catalog.ts).
 */

const SERVICE_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
/** 104.6 A GoogleService-Info.plist is a few kilobytes. */
const FIREBASE_FILE_MAX_BYTES = 64 * 1024;

async function requireDeliveryApp(permission: TeamPermission): Promise<ClientContext & { app: App }> {
  const context = await clientFor(permission);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  // 105.1 Food delivery companies have couriers and delivery settings too.
  if (!context.app || (context.app.connector?.kind !== "deliveries" && context.app.connector?.kind !== "restaurants")) redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function refresh() {
  revalidatePath("/dashboard/shipments", "layout");
  revalidatePath("/dashboard/couriers", "layout");
  revalidatePath("/dashboard/delivery", "layout");
}

// Delivery settings

export async function saveDeliverySettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireDeliveryApp("settings");
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const saved = deliverySettingsOf(await store.getDeliverySettings(app.id));
  const now = new Date();
  const plan = await appPlan(store, context.license, now);
  const parsed = parseDeliverySettings(values, saved, hasFeature(plan, "courier_app"), app.connector?.kind === "restaurants");
  if (!parsed.ok) return { errors: parsed.errors, values };
  // 104.6 The courier iPhone app's Firebase file, checked against its bundle ID.
  const plist = formData.get("courierFirebaseIos");
  if (plist && typeof plist !== "string" && plist.size > 0) {
    if (!app.iosBundleId) return { errors: { courierFirebaseIos: "Add your app's bundle ID in Publishing first." }, values };
    if (plist.size > FIREBASE_FILE_MAX_BYTES) return { errors: { courierFirebaseIos: "This file is too large for a GoogleService-Info.plist." }, values };
    const data = Buffer.from(await plist.arrayBuffer());
    const problem = courierPlistProblem(data.toString("utf8"), app.iosBundleId);
    if (problem) return { errors: { courierFirebaseIos: problem }, values };
    const assetId = newId();
    const blobKey = `assets/${context.client.id}/${assetId}.plist`;
    await getBlobStore().put(blobKey, data, "application/xml");
    await store.createAsset({ id: assetId, clientId: context.client.id, kind: "firebase_ios", blobKey, contentType: "application/xml", size: data.length, createdAt: now });
    parsed.value.courierFirebaseIosAssetId = assetId;
  }
  await store.saveDeliverySettings(app.id, parsed.value, now);
  await recordStaffChange(context, `Saved the delivery settings (${parsed.value.pricing} pricing, ${parsed.value.tracking} tracking)`);
  refresh();
  return { ok: true, message: "Saved. The app shows it the next time it opens.", values };
}

// Services

async function servicePicture(context: ClientContext, file: File | null, now: Date): Promise<{ assetId: string | null } | { error: string }> {
  if (!file || file.size === 0) return { assetId: null };
  if (file.size > SERVICE_IMAGE_MAX_BYTES) return { error: "The picture can be up to 3 MB." };
  const data = Buffer.from(await file.arrayBuffer());
  const type = imageType(data);
  if (!type) return { error: "Pictures must be PNG or JPEG files." };
  const assetId = newId();
  const blobKey = `assets/${context.client.id}/${assetId}.${type.extension}`;
  await getBlobStore().put(blobKey, data, type.contentType);
  await (await getStore()).createAsset({ id: assetId, clientId: context.client.id, kind: "product_image", blobKey, contentType: type.contentType, size: data.length, createdAt: now });
  return { assetId };
}

export async function saveDeliveryServiceAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireDeliveryApp("settings");
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const existing = id !== null && Number.isSafeInteger(id) ? await store.getDeliveryService(app.id, id) : null;
  if (id !== null && !existing) return { message: "This service doesn't exist anymore." };
  const parsed = parseServiceForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const services = await store.listDeliveryServices(app.id);
  if (!existing && services.length >= DELIVERY_LIMITS.services) return { message: `You can have up to ${DELIVERY_LIMITS.services} services.`, values };
  const file = formData.get("image");
  const picture = await servicePicture(context, typeof file === "string" ? null : file, now);
  if ("error" in picture) return { errors: { image: picture.error }, values };
  const removeImage = formData.get("removeImage") === "on";
  const imageAssetId = picture.assetId ?? (removeImage ? null : (existing?.imageAssetId ?? null));
  if (existing) {
    // 110.2 A sample service saved here is the owner's from now on.
    await store.updateDeliveryService(app.id, existing.id, { ...parsed.value, imageAssetId, sample: false }, now);
  } else {
    const position = services.reduce((max, s) => Math.max(max, s.position), 0) + 1;
    await store.createDeliveryService({ appId: app.id, ...parsed.value, imageAssetId, position }, now);
  }
  await recordStaffChange(context, `${existing ? "Edited" : "Added"} the delivery service "${parsed.value.name}"`);
  refresh();
  // 110.2 Their first own service next to the samples: the list asks whether to remove them.
  const ask = existing ? null : await askAfterOwnEntry(store, app.id, "delivery_services");
  if (ask) redirect(ask);
  return { ok: true, message: existing ? "Saved." : "Added. Customers choose it when they send a parcel.", values: existing ? values : {} };
}

export async function deleteDeliveryServiceAction(formData: FormData): Promise<void> {
  const context = await requireDeliveryApp("settings");
  const store = await getStore();
  const id = Number(formData.get("id"));
  const service = Number.isSafeInteger(id) ? await store.getDeliveryService(context.app.id, id) : null;
  if (!service) return;
  await store.deleteDeliveryService(context.app.id, service.id);
  await recordStaffChange(context, `Deleted the delivery service "${service.name}"`);
  refresh();
}

export async function moveDeliveryServiceAction(formData: FormData): Promise<void> {
  const context = await requireDeliveryApp("settings");
  const store = await getStore();
  const id = Number(formData.get("id"));
  const step = formData.get("step") === "up" ? -1 : 1;
  const services = await store.listDeliveryServices(context.app.id);
  const i = services.findIndex((s) => s.id === id);
  const j = i + step;
  if (i < 0 || j < 0 || j >= services.length) return;
  const order = [...services];
  [order[i], order[j]] = [order[j]!, order[i]!];
  const now = new Date();
  for (const [position, service] of order.entries()) {
    if (service.position !== position + 1) await store.updateDeliveryService(context.app.id, service.id, { position: position + 1 }, now);
  }
  refresh();
}

// Couriers

/** Apps whose people sign in by email only: couriers are added by email. */
function signsInByEmailOnly(app: App): boolean {
  const methods = hostedSignInMethods(app);
  return methods.length === 1 && methods[0] === "email";
}

export async function addCourierAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireDeliveryApp("orders");
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const parsed = parseCourierForm(values, hostedSettings(app).defaultCountryCode, signsInByEmailOnly(app));
  if (!parsed.ok) return { errors: parsed.errors, values };
  if ((await store.listCouriers(app.id)).length >= DELIVERY_LIMITS.couriers) return { message: `You can have up to ${DELIVERY_LIMITS.couriers} couriers.`, values };
  const created = await store.createCourier({ appId: app.id, ...parsed.value, active: true }, new Date());
  if (!created.ok) return { errors: { phone: "You already have a courier with this number or email." }, values };
  await recordStaffChange(context, `Added the courier ${parsed.value.name}`);
  refresh();
  return { ok: true, message: "Added. They sign in to the app with this number and see their jobs.", values: {} };
}

export async function updateCourierAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireDeliveryApp("orders");
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const id = Number(formData.get("id"));
  const courier = Number.isSafeInteger(id) ? await store.getCourier(app.id, id) : null;
  if (!courier) return { message: "This courier doesn't exist anymore." };
  const parsed = parseCourierForm(values, hostedSettings(app).defaultCountryCode, signsInByEmailOnly(app));
  if (!parsed.ok) return { errors: parsed.errors, values };
  const saved = await store.updateCourier(app.id, courier.id, parsed.value, new Date());
  if (!saved.ok) return { errors: { phone: "You already have a courier with this number or email." }, values };
  await recordStaffChange(context, `Edited the courier ${parsed.value.name}`);
  refresh();
  return { ok: true, message: "Saved.", values };
}

export async function setCourierActiveAction(formData: FormData): Promise<void> {
  const context = await requireDeliveryApp("orders");
  const store = await getStore();
  const id = Number(formData.get("id"));
  const courier = Number.isSafeInteger(id) ? await store.getCourier(context.app.id, id) : null;
  if (!courier) return;
  const active = formData.get("active") === "true";
  await store.updateCourier(context.app.id, courier.id, active ? { active } : { active, onDuty: false }, new Date());
  await recordStaffChange(context, `${active ? "Resumed" : "Paused"} the courier ${courier.name}`);
  refresh();
}

export async function deleteCourierAction(formData: FormData): Promise<void> {
  const context = await requireDeliveryApp("orders");
  const store = await getStore();
  const id = Number(formData.get("id"));
  const courier = Number.isSafeInteger(id) ? await store.getCourier(context.app.id, id) : null;
  if (!courier) return;
  await store.deleteCourier(context.app.id, courier.id, new Date());
  await recordStaffChange(context, `Deleted the courier ${courier.name}`);
  refresh();
}

// Shipments

export async function assignShipmentAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireDeliveryApp("orders");
  const { app } = context;
  const store = await getStore();
  const id = Number(formData.get("id"));
  const shipment = Number.isSafeInteger(id) ? await store.getShipment(app.id, id) : null;
  if (!shipment) return { message: "This shipment doesn't exist anymore." };
  const courierId = Number(formData.get("courierId"));
  const courier = Number.isSafeInteger(courierId) ? await store.getCourier(app.id, courierId) : null;
  if (!courier || !courier.active) return { errors: { courierId: "Choose one of your active couriers." } };
  if (shipment.status !== "pending" && shipment.status !== "assigned") return { message: "Only a shipment waiting for a courier, or not picked up yet, can be given to a courier." };
  // 104.7 The store review account's parcels go to the review courier only, and it gets no others.
  if (!courierMayHave(app, courier, shipment, await reviewUserId(store, app))) return { errors: { courierId: "The store review courier only gets the store review account's parcels." } };
  const moved = await assignShipment({ store, app, now: new Date() }, shipment, courier, "company");
  if (!moved.ok) return { message: "This shipment changed meanwhile. Reload the page." };
  await recordStaffChange(context, `Gave shipment ${shipmentReference(shipment)} to ${courier.name}`);
  refresh();
  return { ok: true, message: `Given to ${courier.name}. They were told in the app.` };
}

export async function moveShipmentAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireDeliveryApp("orders");
  const { app } = context;
  const store = await getStore();
  const id = Number(formData.get("id"));
  const shipment = Number.isSafeInteger(id) ? await store.getShipment(app.id, id) : null;
  if (!shipment) return { message: "This shipment doesn't exist anymore." };
  const status = SHIPMENT_STATUSES.find((s) => s === formData.get("status"));
  if (!status || !(COMPANY_STEPS[shipment.status] ?? []).includes(status)) return { message: "This shipment can't move to that stage now." };
  const note = String(formData.get("note") ?? "").replace(/\s+/g, " ").trim().slice(0, 300) || null;
  const moved = await moveShipment({ store, app, now: new Date() }, shipment, status, "company", note);
  if (!moved.ok) return { message: "This shipment changed meanwhile. Reload the page." };
  await recordStaffChange(context, `Moved shipment ${shipmentReference(shipment)} to ${status}`);
  refresh();
  return { ok: true, message: "Saved. The customer was told in the app." };
}
