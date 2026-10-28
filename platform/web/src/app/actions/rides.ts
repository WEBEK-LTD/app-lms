"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { App, DriverDocument } from "@/lib/data/types";
import { courierPlistProblem } from "@/lib/delivery/courier-app";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { appPlan } from "@/lib/entitlements";
import { formValues, type FormState } from "@/lib/forms";
import { hostedSettings } from "@/lib/hosted/service";
import { hostedSignInMethods } from "@/lib/hosted/sign-in-methods";
import { imageType } from "@/lib/images";
import { hasFeature } from "@/lib/plans";
import { assignRide, cancelByCompany } from "@/lib/rides/flow";
import { parseDriverForm, parseRideSettings, parseVehicleTypeForm } from "@/lib/rides/forms";
import { driverMayHave } from "@/lib/rides/review";
import { DRIVER_ACTIVE, rideReference } from "@/lib/rides/service";
import { driverOf, RIDES_LIMITS } from "@/lib/rides/settings";
import { reviewUserId } from "@/lib/delivery/review";
import type { TeamPermission } from "@/lib/team/permissions";

/**
 * 105.2 The Rides, Drivers, Vehicle types and Ride settings pages of ride
 * apps: the company's fares and choices, its drivers and their cars, giving
 * a ride to a driver or cancelling it. Payment keys are saved with the shop's
 * actions (app/actions/catalog.ts).
 */

const PICTURE_MAX_BYTES = 3 * 1024 * 1024;
const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

async function requireRidesApp(permission: TeamPermission): Promise<ClientContext & { app: App }> {
  const context = await clientFor(permission);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "rides") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function refresh() {
  for (const path of ["/dashboard/rides", "/dashboard/drivers", "/dashboard/vehicle-types", "/dashboard/ride-settings"]) revalidatePath(path, "layout");
}

/** A picture (PNG or JPEG) kept as an asset, or none. */
async function picture(context: ClientContext, file: FormDataEntryValue | null, now: Date): Promise<{ assetId: string | null } | { error: string }> {
  if (!file || typeof file === "string" || file.size === 0) return { assetId: null };
  if (file.size > PICTURE_MAX_BYTES) return { error: "The picture can be up to 3 MB." };
  const data = Buffer.from(await file.arrayBuffer());
  const type = imageType(data);
  if (!type) return { error: "Pictures must be PNG or JPEG files." };
  const assetId = newId();
  const blobKey = `assets/${context.client.id}/${assetId}.${type.extension}`;
  await getBlobStore().put(blobKey, data, type.contentType);
  await (await getStore()).createAsset({ id: assetId, clientId: context.client.id, kind: "product_image", blobKey, contentType: type.contentType, size: data.length, createdAt: now });
  return { assetId };
}

/** A driver's paper (a picture or a PDF) kept as an asset, or none. */
async function paper(context: ClientContext, file: FormDataEntryValue | null, now: Date): Promise<{ assetId: string | null } | { error: string }> {
  if (!file || typeof file === "string" || file.size === 0) return { assetId: null };
  if (file.size > DOCUMENT_MAX_BYTES) return { error: "A document can be up to 5 MB." };
  const data = Buffer.from(await file.arrayBuffer());
  const image = imageType(data);
  const pdf = data.subarray(0, 5).toString("latin1") === "%PDF-";
  if (!image && !pdf) return { error: "Documents must be PDF, PNG or JPEG files." };
  const assetId = newId();
  const extension = image ? image.extension : "pdf";
  const contentType = image ? image.contentType : "application/pdf";
  const blobKey = `assets/${context.client.id}/${assetId}.${extension}`;
  await getBlobStore().put(blobKey, data, contentType);
  await (await getStore()).createAsset({ id: assetId, clientId: context.client.id, kind: "driver_document", blobKey, contentType, size: data.length, createdAt: now });
  return { assetId };
}

// Ride settings

/** The most a GoogleService-Info.plist may weigh. */
const FIREBASE_FILE_MAX_BYTES = 64 * 1024;

export async function saveRideSettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireRidesApp("settings");
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const saved = deliverySettingsOf(await store.getDeliverySettings(app.id));
  const plan = await appPlan(store, context.license, now);
  const parsed = parseRideSettings(values, saved, hasFeature(plan, "courier_app"), hostedSettings(app).defaultCountryCode);
  if (!parsed.ok) return { errors: parsed.errors, values };
  // The drivers' iPhone app's Firebase file, checked against its bundle ID.
  const plist = formData.get("driverFirebaseIos");
  if (plist && typeof plist !== "string" && plist.size > 0) {
    if (!app.iosBundleId) return { errors: { driverFirebaseIos: "Add your app's bundle ID in Publishing first." }, values };
    if (plist.size > FIREBASE_FILE_MAX_BYTES) return { errors: { driverFirebaseIos: "This file is too large for a GoogleService-Info.plist." }, values };
    const data = Buffer.from(await plist.arrayBuffer());
    const problem = courierPlistProblem(data.toString("utf8"), app.iosBundleId, "driver");
    if (problem) return { errors: { driverFirebaseIos: problem }, values };
    const assetId = newId();
    const blobKey = `assets/${context.client.id}/${assetId}.plist`;
    await getBlobStore().put(blobKey, data, "application/xml");
    await store.createAsset({ id: assetId, clientId: context.client.id, kind: "firebase_ios", blobKey, contentType: "application/xml", size: data.length, createdAt: now });
    parsed.value.courierFirebaseIosAssetId = assetId;
  }
  await store.saveDeliverySettings(app.id, parsed.value, now);
  await recordStaffChange(context, `Saved the ride settings (${parsed.value.rides?.fareMode} fares, ${parsed.value.rides?.matching} matching)`);
  refresh();
  return { ok: true, message: "Saved. The app shows it the next time it opens.", values };
}

// Vehicle types

export async function saveVehicleTypeAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireRidesApp("settings");
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const existing = id !== null && Number.isSafeInteger(id) ? await store.getVehicleType(app.id, id) : null;
  if (id !== null && !existing) return { message: "This vehicle type doesn't exist anymore." };
  const parsed = parseVehicleTypeForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const types = await store.listVehicleTypes(app.id);
  if (!existing && types.length >= RIDES_LIMITS.vehicleTypes) return { message: `You can have up to ${RIDES_LIMITS.vehicleTypes} vehicle types.`, values };
  const image = await picture(context, formData.get("image"), now);
  if ("error" in image) return { errors: { image: image.error }, values };
  const imageAssetId = image.assetId ?? (formData.get("removeImage") === "on" ? null : (existing?.imageAssetId ?? null));
  if (existing) {
    await store.updateVehicleType(app.id, existing.id, { ...parsed.value, imageAssetId }, now);
  } else {
    const position = types.reduce((max, t) => Math.max(max, t.position), 0) + 1;
    await store.createVehicleType({ appId: app.id, ...parsed.value, imageAssetId, position }, now);
  }
  await recordStaffChange(context, `${existing ? "Edited" : "Added"} the vehicle type "${parsed.value.name}"`);
  refresh();
  return { ok: true, message: existing ? "Saved." : "Added. Riders choose it when they ask for a ride.", values: existing ? values : {} };
}

export async function deleteVehicleTypeAction(formData: FormData): Promise<void> {
  const context = await requireRidesApp("settings");
  const store = await getStore();
  const id = Number(formData.get("id"));
  const type = Number.isSafeInteger(id) ? await store.getVehicleType(context.app.id, id) : null;
  if (!type) return;
  await store.deleteVehicleType(context.app.id, type.id, new Date());
  await recordStaffChange(context, `Deleted the vehicle type "${type.name}"`);
  refresh();
}

export async function moveVehicleTypeAction(formData: FormData): Promise<void> {
  const context = await requireRidesApp("settings");
  const store = await getStore();
  const id = Number(formData.get("id"));
  const step = formData.get("step") === "up" ? -1 : 1;
  const types = await store.listVehicleTypes(context.app.id);
  const i = types.findIndex((t) => t.id === id);
  const j = i + step;
  if (i < 0 || j < 0 || j >= types.length) return;
  const order = [...types];
  [order[i], order[j]] = [order[j]!, order[i]!];
  const now = new Date();
  for (const [position, type] of order.entries()) {
    if (type.position !== position + 1) await store.updateVehicleType(context.app.id, type.id, { position: position + 1 }, now);
  }
  refresh();
}

// Drivers

function signsInByEmailOnly(app: App): boolean {
  const methods = hostedSignInMethods(app);
  return methods.length === 1 && methods[0] === "email";
}

export async function saveDriverAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireRidesApp("orders");
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const existing = id !== null && Number.isSafeInteger(id) ? await store.getCourier(app.id, id) : null;
  if (id !== null && !existing) return { message: "This driver doesn't exist anymore." };
  const types = await store.listVehicleTypes(app.id);
  const parsed = parseDriverForm(values, hostedSettings(app).defaultCountryCode, signsInByEmailOnly(app), types.map((t) => t.id));
  if (!parsed.ok) return { errors: parsed.errors, values };
  if (!existing && (await store.listCouriers(app.id)).length >= RIDES_LIMITS.drivers) return { message: `You can have up to ${RIDES_LIMITS.drivers} drivers.`, values };
  const photo = await picture(context, formData.get("photo"), now);
  if ("error" in photo) return { errors: { photo: photo.error }, values };
  const before = existing ? driverOf(existing) : driverOf({});
  // A paper added with its name; ticked ones removed.
  const documents: DriverDocument[] = before.documents.filter((d) => formData.get(`removeDocument-${d.assetId}`) !== "on");
  const newPaper = await paper(context, formData.get("document"), now);
  if ("error" in newPaper) return { errors: { document: newPaper.error }, values };
  if (newPaper.assetId) {
    const label = String(formData.get("documentLabel") ?? "").replace(/\s+/g, " ").trim().slice(0, RIDES_LIMITS.documentLabel);
    if (!label) return { errors: { documentLabel: "Name the document, like Driving licence." }, values };
    if (documents.length >= RIDES_LIMITS.documents) return { errors: { document: `A driver can have up to ${RIDES_LIMITS.documents} documents.` }, values };
    documents.push({ label, assetId: newPaper.assetId });
  }
  const { name, phone, email, vehicleTypeId, carModel, carColor, plate, commissionBp } = parsed.value;
  const driver = { ...before, photoAssetId: photo.assetId ?? (formData.get("removePhoto") === "on" ? null : before.photoAssetId), vehicleTypeId, carModel, carColor, plate, commissionBp, documents };
  const vehicle = [carColor, carModel].filter(Boolean).join(" ") || null;
  if (existing) {
    const saved = await store.updateCourier(app.id, existing.id, { name, phone, email, vehicle, driver }, now);
    if (!saved.ok) return { errors: { phone: "You already have a driver with this number or email." }, values };
  } else {
    const created = await store.createCourier({ appId: app.id, name, phone, email, vehicle, active: true, driver }, now);
    if (!created.ok) return { errors: { phone: "You already have a driver with this number or email." }, values };
  }
  await recordStaffChange(context, `${existing ? "Edited" : "Added"} the driver ${name}`);
  refresh();
  return existing ? { ok: true, message: "Saved.", values } : { ok: true, message: "Added. They sign in to the app with this number, go online and get rides.", values: {} };
}

export async function setDriverActiveAction(formData: FormData): Promise<void> {
  const context = await requireRidesApp("orders");
  const store = await getStore();
  const id = Number(formData.get("id"));
  const driver = Number.isSafeInteger(id) ? await store.getCourier(context.app.id, id) : null;
  if (!driver) return;
  const active = formData.get("active") === "true";
  await store.updateCourier(context.app.id, driver.id, active ? { active } : { active, onDuty: false, lat: null, lng: null, locatedAt: null }, new Date());
  await recordStaffChange(context, `${active ? "Approved" : "Suspended"} the driver ${driver.name}`);
  refresh();
}

export async function deleteDriverAction(formData: FormData): Promise<void> {
  const context = await requireRidesApp("orders");
  const store = await getStore();
  const id = Number(formData.get("id"));
  const driver = Number.isSafeInteger(id) ? await store.getCourier(context.app.id, id) : null;
  if (!driver) return;
  await store.deleteCourier(context.app.id, driver.id, new Date());
  await recordStaffChange(context, `Deleted the driver ${driver.name}`);
  refresh();
}

// Rides

export async function assignRideAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireRidesApp("orders");
  const { app } = context;
  const store = await getStore();
  const id = Number(formData.get("id"));
  const ride = Number.isSafeInteger(id) ? await store.getRide(app.id, id) : null;
  if (!ride) return { message: "This ride doesn't exist anymore." };
  const driverId = Number(formData.get("driverId"));
  const driver = Number.isSafeInteger(driverId) ? await store.getCourier(app.id, driverId) : null;
  if (!driver || !driver.active) return { errors: { driverId: "Choose one of your active drivers." } };
  if (!["searching", "accepted", "arrived"].includes(ride.status)) return { message: "Only a ride looking for a driver, or not started yet, can be given to a driver." };
  if (!driverMayHave(app, driver, ride, await reviewUserId(store, app))) return { errors: { driverId: "The store review driver only gets the store review account's rides." } };
  const busy = await store.listRides({ appId: app.id, driverId: driver.id, statuses: DRIVER_ACTIVE, order: "oldest", offset: 0, limit: 1 });
  if (busy.items.some((r) => r.id !== ride.id)) return { errors: { driverId: "This driver is on another ride." } };
  const moved = await assignRide({ store, app, now: new Date() }, ride, driver);
  if (!moved.ok) return { message: "This ride changed meanwhile. Reload the page." };
  await recordStaffChange(context, `Gave ride ${rideReference(ride)} to ${driver.name}`);
  refresh();
  return { ok: true, message: `Given to ${driver.name}. They and the rider were told in the app.` };
}

export async function cancelRideAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireRidesApp("orders");
  const { app } = context;
  const store = await getStore();
  const id = Number(formData.get("id"));
  const ride = Number.isSafeInteger(id) ? await store.getRide(app.id, id) : null;
  if (!ride) return { message: "This ride doesn't exist anymore." };
  const note = String(formData.get("note") ?? "").replace(/\s+/g, " ").trim().slice(0, 300) || null;
  const moved = await cancelByCompany({ store, app, now: new Date() }, ride, note);
  if (!moved.ok) return { message: "This ride can't be cancelled now." };
  await recordStaffChange(context, `Cancelled ride ${rideReference(ride)}`);
  refresh();
  return { ok: true, message: "Cancelled. The rider and the driver were told in the app." };
}
