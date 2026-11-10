import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newApp, queueBuild } from "@/lib/app/setup";
import { validateBuildConfig } from "@/lib/build-config/validate";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_HOSTED_SETTINGS, type App, type StoreListing } from "@/lib/data/types";
import { deliver, pushAudienceOf } from "@/lib/delivery/notify";
import type { PushTarget, ServiceAccount } from "@/lib/hosted/push";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { PLAN_INFO, planSettingOf, type PlanFeature } from "@/lib/plans";
import {
  firebaseHasStaffApp,
  hasStaffApp,
  staffAppKindOf,
  staffAppNameOf,
  staffAppOnPlan,
  staffAppPlaceOf,
  staffBundleIdOf,
  staffListing,
  staffPackageOf,
  staffPushAudience,
} from "@/lib/school/staff-app";
import { borrowerAudience } from "@/lib/school/tell";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { expectContract } from "./contract";
import { days, licenseOf, NOW, setupClient } from "./helpers";

const assetUrl = (id: string) => `https://yallapp.com.tr/api/v1/assets/${id}`;
const ACCOUNT = { project_id: "nakhla", client_email: "push@nakhla.test", private_key: "key" } as ServiceAccount;

function schoolApp(clientId: string, staffApp: App["staffApp"] = "bundle"): App {
  return {
    ...newApp(clientId, "https://nakhla.test", NOW, "school"),
    section: "studio",
    staffApp,
    backend: "hosted",
    connector: { kind: "school" },
    websiteDoneAt: NOW,
    appName: "Nakhla School",
    shortName: "Nakhla",
    iconAssetId: "7f1d2c4e-1111-4222-8333-944455556666",
    brandingDoneAt: NOW,
    androidPackage: "com.nakhla.app",
    iosBundleId: "com.nakhla.app",
    storeTitle: "Nakhla School",
    shortDescription: "The school day in your pocket.",
    fullDescription: "Nakhla School brings the timetable, homework, grades, attendance and the bus to every family's phone.",
    supportEmail: "help@nakhla.test",
    privacyUrl: "https://nakhla.test/privacy",
    listingDoneAt: NOW,
    publishingDoneAt: NOW,
  };
}

const googleServices = (...packages: string[]) =>
  JSON.stringify({
    project_info: { project_id: "nakhla", project_number: "123" },
    client: packages.map((p) => ({ client_info: { mobilesdk_app_id: `1:123:android:${p}`, android_client_info: { package_name: p } }, api_key: [{ current_key: "k" }] })),
  });

async function setup(staffApp: App["staffApp"], withSchool = true) {
  const s = await setupClient({ plan: "studio_3", activeUntil: days(60) });
  const store = s.store;
  const features = PLAN_INFO.studio_3.features.filter((f) => f !== "school");
  await store.setPlatformSetting("plans", { studio_3: { ...planSettingOf(PLAN_INFO.studio_3), offered: true, features: withSchool ? [...features, "school"] : features } }, "test", NOW);
  clearPlatformSettingsCache();
  const client = (await store.getClientById(s.client.id))!;
  const app = schoolApp(client.id, staffApp);
  await store.createApp(app);
  const license = await licenseOf(store, client.id);
  return { store, client, app, license };
}

describe("116 the staff app's names and where staff work", () => {
  it("is the app's own name with Staff, its package and bundle ID with .staff", () => {
    expect(staffPackageOf("com.nakhla.app")).toBe("com.nakhla.app.staff");
    expect(staffBundleIdOf("com.nakhla.app")).toBe("com.nakhla.app.staff");
    expect(staffAppNameOf({ appName: "Nakhla School" })).toBe("Nakhla School Staff");
    const long = staffAppNameOf({ appName: "A very long school name for sure, indeed" });
    expect(long.length).toBeLessThanOrEqual(30);
    expect(long.endsWith(" Staff")).toBe(true);
    expect(firebaseHasStaffApp(googleServices("com.nakhla.app", "com.nakhla.app.staff"), "com.nakhla.app")).toBe(true);
    expect(firebaseHasStaffApp(googleServices("com.nakhla.app"), "com.nakhla.app")).toBe(false);
  });

  it("is for schools (universities too) and academies with many teachers, in the bundle for new projects and the main app for those made before", () => {
    expect(staffAppKindOf({ appType: "school", vertical: null })).toBe("school");
    expect(staffAppKindOf({ appType: "lms", vertical: "instructors" })).toBe("academy");
    expect(staffAppKindOf({ appType: "lms", vertical: null })).toBeNull();
    expect(staffAppKindOf({ appType: "food", vertical: "marketplace" })).toBeNull();
    // Every new project starts with the staff app.
    expect(newApp("c", null, NOW, "school").staffApp).toBe("bundle");
    expect(hasStaffApp(newApp("c", null, NOW, "school"))).toBe(true);
    expect(hasStaffApp(newApp("c", null, NOW, "lms", "instructors"))).toBe(true);
    expect(hasStaffApp(newApp("c", null, NOW, "store"))).toBe(false);
    // A project made before has none saved: its staff stay in the main app until the owner switches.
    expect(staffAppPlaceOf({ staffApp: null })).toBe("same");
    expect(staffAppPlaceOf({})).toBe("same");
    expect(hasStaffApp({ appType: "school", vertical: null, staffApp: null })).toBe(false);
    expect(hasStaffApp({ appType: "school", vertical: null, staffApp: "same" })).toBe(false);
    // On the plan with the kind.
    const plan = (features: PlanFeature[]) => ({ features });
    expect(staffAppOnPlan({ appType: "school", vertical: null }, plan(["school"]))).toBe(true);
    expect(staffAppOnPlan({ appType: "school", vertical: null }, plan(["instructors"]))).toBe(false);
    expect(staffAppOnPlan({ appType: "lms", vertical: "instructors" }, plan(["instructors"]))).toBe(true);
    expect(staffAppOnPlan({ appType: "lms", vertical: "instructors" }, null)).toBe(false);
  });

  it("is listed for the staff only, without the main app's screenshots", () => {
    const listing: StoreListing = { storeTitle: "Nakhla School", shortDescription: "…", fullDescription: "…", supportEmail: "help@nakhla.test", privacyUrl: "https://nakhla.test/privacy", phoneScreenshots: ["a"], iphoneScreenshots: ["b"] };
    const school = staffListing(listing, { appName: "Nakhla School", appType: "school", vertical: null });
    expect(school).toMatchObject({ storeTitle: "Nakhla School Staff", supportEmail: "help@nakhla.test", phoneScreenshots: [], iphoneScreenshots: [] });
    expect(school.shortDescription.length).toBeLessThanOrEqual(80);
    expect(school.fullDescription).toContain("Only Nakhla School's staff can use it.");
    const academy = staffListing(listing, { appName: "Rawaq Academy", appType: "lms", vertical: "instructors" });
    expect(academy.shortDescription.length).toBeLessThanOrEqual(80);
    expect(academy.fullDescription).toContain("Only Rawaq Academy's teachers can use it.");
  });
});

describe("116 building the staff app", () => {
  beforeEach(() => vi.stubEnv("APP_URL", "https://yallapp.com.tr"));
  afterEach(() => vi.unstubAllEnvs());

  it("builds the staff's screens under their own package, next to the main app", async () => {
    const { store, client, app, license } = await setup("bundle");
    const queued = await queueBuild(store, { client, app, license, versionName: "1.0.0", variant: "staff" }, NOW, assetUrl);
    if (!queued.ok) throw new Error(`not queued: ${queued.reason}`);
    expect(queued.build.variant).toBe("staff");
    expect(queued.build.config).toMatchObject({ role: "staff", app_type: "school", app_name: "Nakhla School Staff", android_package: "com.nakhla.app.staff", ios_bundle_id: "com.nakhla.app.staff" });
    expect(queued.build.config.links).toBeUndefined();
    expect(validateBuildConfig(queued.build.config).ok).toBe(true);
    expect(queued.build.storeListing).toMatchObject({ storeTitle: "Nakhla School Staff", phoneScreenshots: [] });
    expect((await store.listBuildsByApp(app.id, 10, "staff")).map((b) => b.id)).toEqual([queued.build.id]);
    expect(await store.listBuildsByApp(app.id, 10)).toEqual([]);
  });

  it("isn't built while the staff work in the main app, nor without schools on the plan", async () => {
    const before = await setup(null);
    expect(await queueBuild(before.store, { ...before, versionName: "1.0.0", variant: "staff" }, NOW, assetUrl)).toMatchObject({ ok: false, reason: "staff_app_off" });
    const same = await setup("same");
    expect(await queueBuild(same.store, { ...same, versionName: "1.0.0", variant: "staff" }, NOW, assetUrl)).toMatchObject({ ok: false, reason: "staff_app_off" });
    const off = await setup("bundle", false);
    expect(await queueBuild(off.store, { ...off, versionName: "1.0.0", variant: "staff" }, NOW, assetUrl)).toMatchObject({ ok: false, reason: "staff_app_off" });
  });
});

describe("116 the staff's pushes go to the staff app", () => {
  it("knows whose app each push is for", () => {
    const bundle = { appType: "school", vertical: null, staffApp: "bundle" } as const;
    const same = { appType: "school", vertical: null, staffApp: "same" } as const;
    for (const type of ["school_staff", "school_leave", "school_report", "uni_advisee"]) {
      expect(pushAudienceOf(type, bundle)).toBe("second");
      expect(pushAudienceOf(type, same)).toBe("customers");
    }
    expect(pushAudienceOf("teacher_question", { appType: "lms", vertical: "instructors", staffApp: "bundle" })).toBe("second");
    for (const type of ["school_absence", "school_homework", "school_grade", "school_bus", "school_report_shared"]) expect(pushAudienceOf(type, bundle)).toBe("customers");
    expect(staffPushAudience(same)).toBe("customers");
    // A teacher's library loans go to the staff app; a student's to the family's.
    expect(borrowerAudience(bundle, { role: "teacher" })).toBe("second");
    expect(borrowerAudience(bundle, { role: "staff" })).toBe("second");
    expect(borrowerAudience(bundle, { role: "student" })).toBe("customers");
    expect(borrowerAudience(same, { role: "teacher" })).toBe("customers");
  });

  it("keeps the staff app's role and sends each app its own pushes; apps built before get them all", async () => {
    const store = new MemoryStore();
    const app: App = { ...schoolApp("client-1"), hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, defaultCountryCode: "+20" } };
    await store.createApp(app);
    const sender = new LogSender();
    let now = NOW;
    const call = async (method: string, route: string, options: { body?: unknown; token?: string | null; query?: Record<string, string> } = {}) => {
      const context: HostedContext = { store, app: (await store.getAppById(app.id))!, active: true, now, ip: "203.0.113.9", country: "EG", secret: "test-hosted-secret", sender, push: false, assetUrl, platformUrl: "https://yallapp.test", plan: { ...PLAN_INFO.pro, features: [...PLAN_INFO.pro.features, "school"] }, connector: null };
      const result = await handleHosted(context, { method, path: route.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null });
      expectContract(method, route, result);
      return result;
    };
    // The app reads where its staff work.
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { school: { staff_app: string } };
    expect(config.school.staff_app).toBe("bundle");

    const signIn = async (install: string) => {
      now = new Date(now.getTime() + 10 * 60_000);
      const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone: "1005556666" } });
      const requestId = (requested.body as { request_id: string }).request_id;
      const device = { id: install, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
      const verified = (await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get("+201005556666")!, device } })).body as { signup_token?: string; access_token?: string };
      if (verified.access_token) return verified.access_token;
      return ((await call("POST", "/auth/register", { body: { signup_token: verified.signup_token, name: "Mona", device } })).body as { access_token: string }).access_token;
    };
    // A teacher who is a parent there too: the main app and the staff app.
    const main = await signIn("install-main");
    expect((await call("PUT", "/me/push-token", { token: main, body: { token: "push-main", role: "customer" } })).status).toBe(204);
    const staff = await signIn("install-staff");
    expect((await call("PUT", "/me/push-token", { token: staff, body: { token: "push-staff", role: "staff" } })).status).toBe(204);
    // 115.16 The vendor app's role is one too.
    expect((await call("PUT", "/me/push-token", { token: staff, body: { token: "push-staff", role: "vendor" } })).status).toBe(204);
    expect((await call("PUT", "/me/push-token", { token: staff, body: { token: "push-staff", role: "staff" } })).status).toBe(204);
    const user = (await store.getHostedUserByPhone(app.id, "+201005556666"))!;
    const [first] = await store.listHostedDevices(app.id, user.id);
    await store.createHostedDevice({ ...first!, id: "device-before", deviceId: "install-before", pushToken: "push-before", appRole: null });

    const sent: string[][] = [];
    const deps = {
      store,
      app,
      account: ACCOUNT,
      now: NOW,
      send: async (_: ServiceAccount, targets: PushTarget[]) => {
        sent.push(targets.map((t) => (typeof t === "string" ? t : t.token)).sort());
        return { sent: targets.length, invalidTokens: [] };
      },
    };
    const words = { title: "Leave approved", body: "Your leave was approved." };
    await deliver(deps, user.id, words, { type: "school_leave" }, false);
    await deliver(deps, user.id, words, { type: "school_absence", student_id: "1" }, false);
    // While the staff work in the main app, theirs go there.
    await deliver({ ...deps, app: { ...app, staffApp: "same" } }, user.id, words, { type: "school_leave" }, false);
    expect(sent).toEqual([
      ["push-before", "push-staff"],
      ["push-before", "push-main"],
      ["push-before", "push-main"],
    ]);
  });
});
