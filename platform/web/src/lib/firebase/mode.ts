import type { App, DeliverySettings, FirebaseAppPlatform, FirebaseAppVariant } from "../data/types";
import { courierBundleIdOf, courierPackageOf, hasCourierJobs, hasSecondApp, secondAppRoleOf } from "../delivery/courier-app";
import { hasVendorApp, vendorPackageOf } from "../market/vendor-app";
import { hasStaffApp, staffAppKindOf, staffPackageOf } from "../school/staff-app";

/**
 * 136 "Yallapp sets up notifications" (`App.pushSetup` "yallapp"): instead of
 * the client's own Firebase project, Yallapp registers the app's Android and
 * iOS apps (and its bundle's second apps) in one of its own Firebase
 * projects, saves their files where the client's would be, and sends the
 * pushes without a key (lib/firebase/register.ts, lib/hosted/notify.ts).
 * Phase 1: apps on the hosted API (their own content or a connected
 * platform); 136.45 WordPress sites once chosen with a plugin that relays
 * (Phase 3); apps on their own API keep their own Firebase.
 */

/**
 * Whether the app can use Yallapp's Firebase: it's on the hosted API, so the
 * platform sends its pushes; or (136.45) it's on WordPress and its owner chose
 * Yallapp's Firebase while the site's plugin relays (`pushRelayAt`), so the
 * site hands its pushes to the platform (POST /api/v1/push/send). A new app's
 * default "yallapp" never moves a WordPress site by itself.
 */
export function yallappFirebaseFits(app: Pick<App, "backend"> & Partial<Pick<App, "pushRelayAt">>): boolean {
  return app.backend === "hosted" || (app.backend === "wordpress" && Boolean(app.pushRelayAt));
}

/** Whether the app is in Yallapp's Firebase: chosen, and on the hosted API (or a WordPress site that relays). */
export function usesYallappFirebase(app: Pick<App, "backend"> & Partial<Pick<App, "pushSetup" | "pushRelayAt">>): boolean {
  return app.pushSetup === "yallapp" && yallappFirebaseFits(app);
}

export interface WantedFirebaseApp {
  variant: FirebaseAppVariant;
  platform: FirebaseAppPlatform;
  /** The package name or bundle ID. */
  identifier: string;
}

type BundleApp = Pick<App, "appType" | "vertical" | "staffApp" | "androidPackage" | "iosBundleId">;

/**
 * The apps to register, as the builds name them: the customers' app on
 * Android and iOS; the couriers' or drivers' app (`.courier`, `.driver`) on
 * both; the vendors' (`.vendor`) and the staff's (`.staff`) apps on Android,
 * as their builds have no iPhone Firebase file yet. Nothing for a platform
 * whose package name or bundle ID isn't set.
 */
export function wantedFirebaseApps(app: BundleApp, settings: Pick<DeliverySettings, "courierApp" | "marketApp"> | null): WantedFirebaseApp[] {
  const out: WantedFirebaseApp[] = [];
  const pkg = app.androidPackage?.trim() || null;
  const bundle = app.iosBundleId?.trim() || null;
  if (pkg) out.push({ variant: "customer", platform: "android", identifier: pkg });
  if (bundle) out.push({ variant: "customer", platform: "ios", identifier: bundle });
  if (settings && hasSecondApp(app, settings)) {
    const role = secondAppRoleOf(app);
    if (pkg) out.push({ variant: role, platform: "android", identifier: courierPackageOf(pkg, role) });
    if (bundle) out.push({ variant: role, platform: "ios", identifier: courierBundleIdOf(bundle, role) });
  }
  if (pkg && settings && hasVendorApp(app, settings)) out.push({ variant: "vendor", platform: "android", identifier: vendorPackageOf(pkg) });
  if (pkg && hasStaffApp(app)) out.push({ variant: "staff", platform: "android", identifier: staffPackageOf(pkg) });
  return out;
}

/** Whether the app's bundle may have a second app, so its delivery settings are read. */
export function mayHaveSecondApps(app: Pick<App, "appType">): boolean {
  return hasCourierJobs(app) || app.appType === "food";
}

/**
 * The places an app may take in a project, whatever it has now: its two
 * apps, and two for each second app its kind can have (couriers or drivers,
 * vendors, staff), so the apps it adds later fit in the same project.
 */
export function firebaseSlotsFor(app: Pick<App, "appType" | "vertical">): number {
  let slots = 2;
  if (hasCourierJobs(app)) slots += 2;
  if (app.appType === "food") slots += 2;
  if (staffAppKindOf(app)) slots += 2;
  return slots;
}
