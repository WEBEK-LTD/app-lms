import type { BuildConfig } from "../build-config/types";
import type { App, DeliverySettings, StoreListing } from "../data/types";
import { checkGoogleServiceInfoPlist, checkGoogleServicesJson } from "../store-files";

/**
 * 104.6 A delivery company's second app, for its couriers only ("Where
 * couriers work: in a second app in your name"): the same app's code built
 * with the courier's screens only (`role` "courier" in the build config),
 * under its own package name and bundle ID, next to the customers' app.
 * Its builds are the app's builds with `variant` "courier". 105.2 A ride
 * company's is its drivers' app: `role` "driver", `.driver`, "<app> Driver".
 */

/** Whether the app's couriers have jobs, so a courier app can be made: delivery companies, (105.1.6) food delivery ones and (105.2) ride companies, whose couriers are drivers. */
export function hasCourierJobs(app: Pick<App, "appType">): boolean {
  return app.appType === "delivery" || app.appType === "food" || app.appType === "rides";
}

/** Who the second app is for: 105.2 a ride company's drivers, else couriers. */
export type SecondAppRole = "courier" | "driver";
export const secondAppRoleOf = (app: Partial<Pick<App, "appType">>): SecondAppRole => (app.appType === "rides" ? "driver" : "courier");

/** The courier app's Android package and iOS bundle ID: the app's own with `.courier` (105.2 `.driver`). */
export const courierPackageOf = (androidPackage: string, role: SecondAppRole = "courier") => `${androidPackage}.${role}`;
export const courierBundleIdOf = (iosBundleId: string, role: SecondAppRole = "courier") => `${iosBundleId}.${role}`;

/** The most the stores take for an app's name, as the build config allows it. */
const NAME_MAX = 30;
const SHORT_MAX = 12;

type SecondApp = Pick<App, "appName"> & Partial<Pick<App, "appType">>;

/** The courier app's name: the company's own, else "<app name> Courier" (105.2 "Driver") within the stores' limit. */
export function courierAppNameOf(app: SecondApp, settings: Pick<DeliverySettings, "courierAppName">): string {
  const own = settings.courierAppName?.trim();
  if (own) return own.slice(0, NAME_MAX);
  const suffix = secondAppRoleOf(app) === "driver" ? " Driver" : " Courier";
  return `${(app.appName ?? "").trim().slice(0, NAME_MAX - suffix.length)}${suffix}`.trim();
}

/** Whether the company's google-services.json has the courier app too (one Firebase project, both apps). */
export function firebaseHasCourierApp(googleServicesJson: string, androidPackage: string, role: SecondAppRole = "courier"): boolean {
  return checkGoogleServicesJson(googleServicesJson, courierPackageOf(androidPackage, role)) === null;
}

/** Why the courier iPhone app's GoogleService-Info.plist can't be used, or null. */
export function courierPlistProblem(plist: string, iosBundleId: string, role: SecondAppRole = "courier"): string | null {
  return checkGoogleServiceInfoPlist(plist, courierBundleIdOf(iosBundleId, role));
}

/**
 * The courier app's build config from the customers' app's: the courier
 * (105.2 driver) role, its own package, bundle ID and name; Firebase only for the apps the
 * company added to its Firebase project (else couriers get no pushes on
 * that platform); no links, which open the customers' app.
 */
export function courierBuildConfig(
  base: BuildConfig,
  app: SecondApp,
  settings: Pick<DeliverySettings, "courierAppName" | "courierFirebaseIosAssetId">,
  firebase: { android: boolean; iosConfigUrl: string | null },
): BuildConfig {
  const name = courierAppNameOf(app, settings);
  const role = secondAppRoleOf(app);
  const { links: _links, firebase: baseFirebase, huawei: _huawei, ...rest } = base;
  void _links;
  void _huawei;
  const nextFirebase: NonNullable<BuildConfig["firebase"]> = {};
  if (firebase.android && baseFirebase?.android_config_url) nextFirebase.android_config_url = baseFirebase.android_config_url;
  if (firebase.iosConfigUrl) nextFirebase.ios_config_url = firebase.iosConfigUrl;
  return {
    ...rest,
    role,
    app_name: name,
    short_name: name.slice(0, SHORT_MAX).trim(),
    android_package: courierPackageOf(base.android_package, role),
    ios_bundle_id: courierBundleIdOf(base.ios_bundle_id, role),
    ...(Object.keys(nextFirebase).length ? { firebase: nextFirebase } : {}),
  };
}

/**
 * The courier app's store listing: its name, what it is for (the company's
 * couriers only, as Apple asks of an Unlisted app), the company's support
 * address and privacy policy; no screenshots of the customers' app.
 */
export function courierListing(listing: StoreListing, app: SecondApp, settings: Pick<DeliverySettings, "courierAppName">): StoreListing {
  const name = courierAppNameOf(app, settings);
  const company = (app.appName ?? "").trim() || name;
  if (secondAppRoleOf(app) === "driver") {
    return {
      storeTitle: name,
      shortDescription: `For ${company}'s drivers: ride offers, pickups and earnings.`.slice(0, 80),
      fullDescription: [
        `${name} is the app for ${company}'s drivers.`,
        "Drivers sign in with the mobile number the company added for them and go online to get ride offers. They accept or decline each one, get directions to the pickup, start the ride with the rider's code and end it at the drop-off, see the cash to collect, and follow what they made. Their position is shared only while they are online and the app is open.",
        `Only ${company}'s drivers can use it. Riders ask for and follow their rides in the ${company} app.`,
      ].join("\n\n"),
      supportEmail: listing.supportEmail,
      privacyUrl: listing.privacyUrl,
      phoneScreenshots: [],
      iphoneScreenshots: [],
    };
  }
  return {
    storeTitle: name,
    shortDescription: `For ${company}'s couriers: jobs, pickups and deliveries.`.slice(0, 80),
    fullDescription: [
      `${name} is the app for ${company}'s couriers.`,
      "Couriers sign in with the mobile number the company added for them, go on duty, see their jobs and the waiting ones, and move each parcel on: picked up, on the way, delivered. They see the cash to collect, call the customer and get directions, and share their position only while a parcel is on the way.",
      `Only ${company}'s couriers can use it. Customers send and follow their parcels in the ${company} app.`,
    ].join("\n\n"),
    supportEmail: listing.supportEmail,
    privacyUrl: listing.privacyUrl,
    phoneScreenshots: [],
    iphoneScreenshots: [],
  };
}
