import type { BuildConfig } from "../build-config/types";
import type { App, PushAudience, StaffAppPlace, StoreListing } from "../data/types";
import { hasFeature, type PlanInfo } from "../plans";
import { checkGoogleServicesJson } from "../store-files";

/**
 * 116 A school's (a university's) or an academy's staff app: its teachers,
 * office staff, principal and bus crews work in an app of their own, next to
 * the students' and parents' app, when the owner chose it in Studio ›
 * Settings (`App.staffApp` "bundle", every new project). The same app's code
 * built with the staff's screens only (`role` "staff" in the build config),
 * under its own package name and bundle ID, as the couriers' app (#222) and
 * the vendors' (115.16) are. Its builds are the app's builds with `variant`
 * "staff". With "same" (projects made before, until the owner switches) the
 * staff keep their tabs in the main app and no second app is built.
 */

type StaffApp = Pick<App, "appName" | "appType" | "vertical">;

/** Which staff the app has: a school's or university's (`school`), an academy's teachers (`academy`); null for other apps. */
export type StaffAppKind = "school" | "academy";

export function staffAppKindOf(app: Pick<App, "appType" | "vertical">): StaffAppKind | null {
  if (app.appType === "school") return "school";
  if (app.appType === "lms" && app.vertical === "instructors") return "academy";
  return null;
}

/** Where the app's staff work: a project made before the staff app (no choice saved) keeps them in the main app. */
export function staffAppPlaceOf(app: Pick<App, "staffApp">): StaffAppPlace {
  return app.staffApp === "bundle" ? "bundle" : "same";
}

/** Whether the app builds a staff app: a school or an academy with many teachers whose owner put the staff in an app of their own. */
export function hasStaffApp(app: Pick<App, "appType" | "vertical" | "staffApp">): boolean {
  return staffAppKindOf(app) !== null && staffAppPlaceOf(app) === "bundle";
}

/** Whether the app's plan has its kind (schools for a school or university, academies for an academy), which the staff app comes with. */
export function staffAppOnPlan(app: Pick<App, "appType" | "vertical">, plan: Pick<PlanInfo, "features"> | null | undefined): boolean {
  const kind = staffAppKindOf(app);
  return kind !== null && hasFeature(plan ?? null, kind === "school" ? "school" : "instructors");
}

/**
 * 116 Whose phones a push to the app's teachers and staff goes to: the
 * staff app's when the project has one (and the phones of apps built
 * before, which send no role), else the main app's.
 */
export function staffPushAudience(app: Pick<App, "appType" | "vertical" | "staffApp">): PushAudience {
  return hasStaffApp(app) ? "second" : "customers";
}

/** The staff app's Android package and iOS bundle ID: the app's own with `.staff`. */
export const staffPackageOf = (androidPackage: string) => `${androidPackage}.staff`;
export const staffBundleIdOf = (iosBundleId: string) => `${iosBundleId}.staff`;

const NAME_MAX = 30;
const SHORT_MAX = 12;

/** The staff app's name: "<app name> Staff", within the stores' limit. */
export function staffAppNameOf(app: Pick<App, "appName">): string {
  const suffix = " Staff";
  return `${(app.appName ?? "").trim().slice(0, NAME_MAX - suffix.length)}${suffix}`.trim();
}

/** Whether the app's google-services.json has the staff app too (one Firebase project for every app of the bundle). */
export function firebaseHasStaffApp(googleServicesJson: string, androidPackage: string): boolean {
  return checkGoogleServicesJson(googleServicesJson, staffPackageOf(androidPackage)) === null;
}

/**
 * The staff app's build config from the main app's: the staff role, its
 * own package, bundle ID and name; Android Firebase only when the owner
 * added the staff app to the Firebase project (else the staff read their
 * notifications in the app, without pushes); no iPhone Firebase file yet;
 * no links, which open the main app.
 */
export function staffBuildConfig(base: BuildConfig, app: StaffApp, firebase: { android: boolean }): BuildConfig {
  const name = staffAppNameOf(app);
  const { links: _links, firebase: baseFirebase, huawei: _huawei, ...rest } = base;
  void _links;
  void _huawei;
  const nextFirebase: NonNullable<BuildConfig["firebase"]> = {};
  if (firebase.android && baseFirebase?.android_config_url) nextFirebase.android_config_url = baseFirebase.android_config_url;
  return {
    ...rest,
    role: "staff",
    app_name: name,
    short_name: name.slice(0, SHORT_MAX).trim(),
    android_package: staffPackageOf(base.android_package),
    ios_bundle_id: staffBundleIdOf(base.ios_bundle_id),
    ...(Object.keys(nextFirebase).length ? { firebase: nextFirebase } : {}),
  };
}

/** The staff app's store listing: for the school's or academy's staff only, as Apple asks of an Unlisted app; no screenshots of the main app. */
export function staffListing(listing: StoreListing, app: StaffApp): StoreListing {
  const name = staffAppNameOf(app);
  const place = (app.appName ?? "").trim() || name;
  const academy = staffAppKindOf(app) === "academy";
  return {
    storeTitle: name,
    shortDescription: (academy ? `For ${place}'s teachers: courses, students and earnings.` : `For ${place}'s teachers and staff: classes, attendance and more.`).slice(0, 80),
    fullDescription: academy
      ? [
          `${name} is the app for ${place}'s teachers.`,
          "Teachers sign in with the mobile number the academy added for them. They make their courses and send them for review, answer their students' questions, grade assignments and follow what their courses sold.",
          `Only ${place}'s teachers can use it. Students learn in the ${place} app.`,
        ].join("\n\n")
      : [
          `${name} is the app for the teachers and staff of ${place}.`,
          "They sign in with the mobile number the school added for them. Teachers take attendance, give homework, enter grades and report cards, note behaviour, write their reports and message the families of their classes; everyone who works there checks in and out, follows the timetable, the calendar and the staff's news, asks for leave and reads their payslips, and a bus's crew runs its trips and marks the students on and off.",
          `Only ${place}'s staff can use it. Students and parents use the ${place} app.`,
        ].join("\n\n"),
    supportEmail: listing.supportEmail,
    privacyUrl: listing.privacyUrl,
    phoneScreenshots: [],
    iphoneScreenshots: [],
  };
}
