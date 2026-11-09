import type { BuildConfig } from "../build-config/types";
import type { App, DeliverySettings, StoreListing } from "../data/types";
import { checkGoogleServicesJson } from "../store-files";
import { marketSettingsOf } from "./settings";

/**
 * 115.16 A marketplace's vendor app: the app's places (restaurants, shops,
 * supermarkets) take their orders in an app of their own, next to the
 * customers' app and the couriers' app, when the owner chose it in Studio ›
 * Marketplace settings (`vendorApp` "bundle"). The same app's code built with
 * the vendor's screens only (`role` "vendor" in the build config), under its
 * own package name and bundle ID. Its builds are the app's builds with
 * `variant` "vendor". With `vendorApp` "same", the places' staff use a
 * vendor tab in the customers' app instead and no third app is built.
 */

type VendorApp = Pick<App, "appName" | "appType">;

/** Whether the app builds a vendor app: a food app grown into a marketplace whose owner put the vendors in an app of their own. */
export function hasVendorApp(app: Pick<App, "appType">, settings: Pick<DeliverySettings, "marketApp">): boolean {
  return app.appType === "food" && marketSettingsOf(settings).vendorApp === "bundle";
}

/** The vendor app's Android package and iOS bundle ID: the app's own with `.vendor`. */
export const vendorPackageOf = (androidPackage: string) => `${androidPackage}.vendor`;
export const vendorBundleIdOf = (iosBundleId: string) => `${iosBundleId}.vendor`;

const NAME_MAX = 30;
const SHORT_MAX = 12;

/** The vendor app's name: "<app name> Partner", within the stores' limit. */
export function vendorAppNameOf(app: Pick<App, "appName">): string {
  const suffix = " Partner";
  return `${(app.appName ?? "").trim().slice(0, NAME_MAX - suffix.length)}${suffix}`.trim();
}

/** Whether the app's google-services.json has the vendor app too (one Firebase project for every app of the bundle). */
export function firebaseHasVendorApp(googleServicesJson: string, androidPackage: string): boolean {
  return checkGoogleServicesJson(googleServicesJson, vendorPackageOf(androidPackage)) === null;
}

/**
 * The vendor app's build config from the customers' app's: the vendor role,
 * its own package, bundle ID and name; Android Firebase only when the owner
 * added the vendor app to the Firebase project (else new orders still ring
 * while the app is open, without pushes); no iPhone Firebase file yet; no
 * links, which open the customers' app.
 */
export function vendorBuildConfig(base: BuildConfig, app: VendorApp, firebase: { android: boolean }): BuildConfig {
  const name = vendorAppNameOf(app);
  const { links: _links, firebase: baseFirebase, huawei: _huawei, ...rest } = base;
  void _links;
  void _huawei;
  const nextFirebase: NonNullable<BuildConfig["firebase"]> = {};
  if (firebase.android && baseFirebase?.android_config_url) nextFirebase.android_config_url = baseFirebase.android_config_url;
  return {
    ...rest,
    role: "vendor",
    app_name: name,
    short_name: name.slice(0, SHORT_MAX).trim(),
    android_package: vendorPackageOf(base.android_package),
    ios_bundle_id: vendorBundleIdOf(base.ios_bundle_id),
    ...(Object.keys(nextFirebase).length ? { firebase: nextFirebase } : {}),
  };
}

/** The vendor app's store listing: for the marketplace's places only, as Apple asks of an Unlisted app; no screenshots of the customers' app. */
export function vendorListing(listing: StoreListing, app: VendorApp): StoreListing {
  const name = vendorAppNameOf(app);
  const company = (app.appName ?? "").trim() || name;
  return {
    storeTitle: name,
    shortDescription: `For ${company}'s restaurants and shops: orders and stock.`.slice(0, 80),
    fullDescription: [
      `${name} is the app for the restaurants and shops on ${company}.`,
      "Their staff sign in with the mobile number the place added for them, hear each new order, accept it with the time it needs or turn it down, pick a supermarket's items line by line, mark it ready and hand it over. They switch items in and out of stock, go busy for a while, and read their monthly statements and the complaints the app's support shared with them.",
      `Only ${company}'s places can use it. Customers order in the ${company} app, and the app's support answers them.`,
    ].join("\n\n"),
    supportEmail: listing.supportEmail,
    privacyUrl: listing.privacyUrl,
    phoneScreenshots: [],
    iphoneScreenshots: [],
  };
}
