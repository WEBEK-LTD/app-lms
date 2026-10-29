"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { encryptionKey } from "@/lib/env";
import { formValues, type FormState } from "@/lib/forms";
import { serviceAccountOf } from "@/lib/hosted/notify";
import { checkLiveDatabase, liveDatabase, LiveError } from "@/lib/taxi/live";
import { checkMap, regionOf, type MapCheck } from "@/lib/taxi/maps";
import { googleKeyOf, isTaxiApp, parseTaxiForm, sealGoogleKey, taxiSettingsOf, type TaxiFormValues } from "@/lib/taxi/settings";
import type { TeamPermission } from "@/lib/team/permissions";

/**
 * 105.9 The Maps & live page of live taxi apps: the company's map (its
 * Google key, or its OpenStreetMap servers) and its Firebase Realtime
 * Database, each with a test.
 */

async function requireTaxiApp(permission: TeamPermission): Promise<ClientContext & { app: App }> {
  const context = await clientFor(permission);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || !isTaxiApp(context.app)) redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function refresh() {
  for (const path of ["/dashboard/taxi", "/dashboard/taxi/settings"]) revalidatePath(path, "layout");
}

export async function saveTaxiSettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireTaxiApp("settings");
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const settings = deliverySettingsOf(await store.getDeliverySettings(app.id));
  const saved = taxiSettingsOf(settings);
  const parsed = parseTaxiForm(values as TaxiFormValues, saved);
  // The key is never echoed back.
  const { googleKey: _typed, ...shown } = values;
  if (!parsed.ok) return { errors: parsed.errors, values: shown };
  const googleKeyEncrypted = parsed.googleKey ? sealGoogleKey(app, parsed.googleKey, encryptionKey()) : saved.googleKeyEncrypted;
  await store.saveDeliverySettings(
    app.id,
    {
      ...settings,
      // A new key needs a new tiles session.
      taxi: { ...parsed.value, googleKeyEncrypted, googleSession: parsed.googleKey ? null : saved.googleSession },
    },
    now,
  );
  await recordStaffChange(context, `Saved the taxi map (${parsed.value.provider === "google" ? "Google Maps" : "OpenStreetMap"}) and live settings`);
  refresh();
  return { ok: true, message: "Saved. The app shows it the next time it opens.", values: shown };
}

export async function removeGoogleKeyAction(): Promise<void> {
  const context = await requireTaxiApp("settings");
  const store = await getStore();
  const settings = deliverySettingsOf(await store.getDeliverySettings(context.app.id));
  await store.saveDeliverySettings(context.app.id, { ...settings, taxi: { ...taxiSettingsOf(settings), googleKeyEncrypted: null, googleSession: null } }, new Date());
  await recordStaffChange(context, "Removed the Google Maps key");
  refresh();
}

export interface MapTestState {
  checks?: MapCheck[];
  message?: string;
}

/** Tries the saved map: its tiles, search and routes. */
export async function testTaxiMapAction(): Promise<MapTestState> {
  const { app } = await requireTaxiApp("settings");
  const settings = deliverySettingsOf(await (await getStore()).getDeliverySettings(app.id));
  const taxi = taxiSettingsOf(settings);
  if (taxi.provider === "osm" && !taxi.tilesUrl) return { message: "Save your tile server's address first." };
  const googleKey = taxi.provider === "google" ? googleKeyOf(app, taxi, encryptionKey()) : null;
  return { checks: await checkMap({ settings: taxi, googleKey, language: "en" }, { region: regionOf(settings.currency) }) };
}

/** Writes to the saved database with the app's service account, reads it back and removes it. */
export async function testLiveDatabaseAction(): Promise<FormState> {
  const { app } = await requireTaxiApp("settings");
  const taxi = taxiSettingsOf(deliverySettingsOf(await (await getStore()).getDeliverySettings(app.id)));
  if (!taxi.databaseUrl) return { ok: false, message: "Save your database's address first." };
  const account = serviceAccountOf(app, encryptionKey());
  if (!account) return { ok: false, message: "Add your app's Firebase service account first, on the App notifications page: the database must be in the same Firebase project." };
  try {
    await checkLiveDatabase(liveDatabase(app, taxi, account)!, new Date());
    return { ok: true, message: "Connected: Yallapp wrote to the database, read it back and removed it." };
  } catch (e) {
    return { ok: false, message: e instanceof LiveError ? e.message : "The database didn't answer. Check its address." };
  }
}
