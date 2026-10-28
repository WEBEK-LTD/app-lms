import type { BuildConfig } from "../build-config/types";
import type { App, DeliverySettings, StoreListing } from "../data/types";
import { checkGoogleServiceInfoPlist, checkGoogleServicesJson } from "../store-files";

/**
 * 104.6 A delivery company's second app, for its couriers only ("Where
 * couriers work: in a second app in your name"): the same app's code built
 * with the courier's screens only (`role` "courier" in the build config),
 * under its own package name and bundle ID, next to the customers' app.
 * Its builds are the app's builds with `variant` "courier".
 */

/** The courier app's Android package and iOS bundle ID: the app's own with `.courier`. */
export const courierPackageOf = (androidPackage: string) => `${androidPackage}.courier`;
export const courierBundleIdOf = (iosBundleId: string) => `${iosBundleId}.courier`;

/** The most the stores take for an app's name, as the build config allows it. */
const NAME_MAX = 30;
const SHORT_MAX = 12;

/** The courier app's name: the company's own, else "<app name> Courier" within the stores' limit. */
export function courierAppNameOf(app: Pick<App, "appName">, settings: Pick<DeliverySettings, "courierAppName">): string {
  const own = settings.courierAppName?.trim();
  if (own) return own.slice(0, NAME_MAX);
  const suffix = " Courier";
  return `${(app.appName ?? "").trim().slice(0, NAME_MAX - suffix.length)}${suffix}`.trim();
}

/** Whether the company's google-services.json has the courier app too (one Firebase project, both apps). */
export function firebaseHasCourierApp(googleServicesJson: string, androidPackage: string): boolean {
  return checkGoogleServicesJson(googleServicesJson, courierPackageOf(androidPackage)) === null;
}

/** Why the courier iPhone app's GoogleService-Info.plist can't be used, or null. */
export function courierPlistProblem(plist: string, iosBundleId: string): string | null {
  return checkGoogleServiceInfoPlist(plist, courierBundleIdOf(iosBundleId));
}

/**
 * The courier app's build config from the customers' app's: the courier
 * role, its own package, bundle ID and name; Firebase only for the apps the
 * company added to its Firebase project (else couriers get no pushes on
 * that platform); no links, which open the customers' app.
 */
export function courierBuildConfig(
  base: BuildConfig,
  app: Pick<App, "appName">,
  settings: Pick<DeliverySettings, "courierAppName" | "courierFirebaseIosAssetId">,
  firebase: { android: boolean; iosConfigUrl: string | null },
): BuildConfig {
  const name = courierAppNameOf(app, settings);
  const { links: _links, firebase: baseFirebase, huawei: _huawei, ...rest } = base;
  void _links;
  void _huawei;
  const nextFirebase: NonNullable<BuildConfig["firebase"]> = {};
  if (firebase.android && baseFirebase?.android_config_url) nextFirebase.android_config_url = baseFirebase.android_config_url;
  if (firebase.iosConfigUrl) nextFirebase.ios_config_url = firebase.iosConfigUrl;
  return {
    ...rest,
    role: "courier",
    app_name: name,
    short_name: name.slice(0, SHORT_MAX).trim(),
    android_package: courierPackageOf(base.android_package),
    ios_bundle_id: courierBundleIdOf(base.ios_bundle_id),
    ...(Object.keys(nextFirebase).length ? { firebase: nextFirebase } : {}),
  };
}

/**
 * The courier app's store listing: its name, what it is for (the company's
 * couriers only, as Apple asks of an Unlisted app), the company's support
 * address and privacy policy; no screenshots of the customers' app.
 */
export function courierListing(listing: StoreListing, app: Pick<App, "appName">, settings: Pick<DeliverySettings, "courierAppName">): StoreListing {
  const name = courierAppNameOf(app, settings);
  const company = (app.appName ?? "").trim() || name;
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
