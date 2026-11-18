import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { newApp, queueBuild } from "@/lib/app/setup";
import { runAppReleaseBuilds } from "@/lib/builds/app-release";
import { runAutoBuilds } from "@/lib/builds/auto";
import { adminFailureDetail, clientSeesFailureLog, FAILURE_TEXT, failureExplanation, isIphoneFailure, noMacRunner } from "@/lib/builds/failures";
import { notifyBuildFinished, readyNote } from "@/lib/builds/notify";
import { applyPipelineStatus, pipelineStatusSchema } from "@/lib/builds/pipeline";
import { failureReason, iphoneOnlyAgain } from "@/lib/builds/view";
import type { App, Build, TeamAlert } from "@/lib/data/types";
import { FAILURE_CODES } from "@/lib/data/types";
import { knownTranslator } from "@/i18n/dashboard";
import { alertNoMac, NO_MAC_ALERT, runWatch } from "@/lib/watch/watch";
import { days, licenseOf, NOW, setupClient } from "./helpers";

/**
 * 151 An iPhone build GitHub had no Mac for (the owner, 18 November): the iOS
 * job waited in the queue and GitHub cancelled it before any step ran. Not a
 * build failure: the client is told, without technical words, that it's a
 * temporary problem on our side and can try again with iPhone only; the team
 * gets one alert per build with the technical cause. Nothing retries it.
 */

const ROOT = path.join(__dirname, "../../../..");
const assetUrl = (id: string) => `https://yallapp.com.tr/api/v1/assets/${id}`;
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);
const APPLE = { ascKeyId: "2X9R4HXF34", ascIssuerId: "69a6de7e-0000-4000-8000-000000000000", ascPrivateKeyEncrypted: "v1.apple" };
const RUN = "https://github.com/WEBEK-LTD/app-lms/actions/runs/44155680266";

/** What report.py sends for it (build/scripts/report.py `no_mac_result`, with the Android app built). */
const NO_MAC_REPORT = {
  status: "ready",
  stages: { android: "done", upload_play: "done", ios: "failed" },
  artifacts: [{ kind: "apk", url: "https://files.yallapp.com.tr/builds/x/app.apk" }],
  message: null,
  failure: { code: "ios_no_mac_runner", stage: "ios", log: "GitHub had no macos-15 runner for the iOS job: it was cancelled after 15 minutes in the queue before any step ran (no runner assigned)." },
};

/** Words app owners don't know: never in what the client reads. */
const TECHNICAL = /github|\bmacs?\b|macos|runner|pipeline|workflow|xcode|fastlane|ios_no_mac/i;

function completeApp(clientId: string, patch: Partial<App> = {}): App {
  return {
    ...newApp(clientId, "https://flowers.test", NOW),
    websiteDoneAt: NOW,
    appName: "Kech Flora",
    shortName: "Kech",
    iconAssetId: "7f1d2c4e-1111-4222-8333-944455556666",
    brandingDoneAt: NOW,
    androidPackage: "com.kechflora.app",
    iosBundleId: "com.kechflora.app",
    storeTitle: "Kech Flora",
    shortDescription: "Flowers delivered today.",
    fullDescription: "Kech Flora brings fresh bouquets and gifts to your door, the same day or the next.",
    supportEmail: "help@flowers.test",
    privacyUrl: "https://flowers.test/privacy",
    listingDoneAt: NOW,
    publishingDoneAt: NOW,
    googlePlayKeyEncrypted: "v1.play",
    ...APPLE,
    ...patch,
  };
}

async function shop() {
  const setup = await setupClient({ plan: "growth", activeUntil: days(60) });
  const store = setup.store;
  const client = (await store.getClientById(setup.client.id))!;
  const app = completeApp(client.id);
  await store.createApp(app);
  const license = await licenseOf(store, client.id);
  return { store, client, app, license };
}

/** A build of both apps, taken by the pipeline and reported back as GitHub had no Mac for its iOS job. */
async function noMacBuild(s: Awaited<ReturnType<typeof shop>>, versionName = "1.0.0", at = NOW) {
  const queued = await queueBuild(s.store, { client: s.client, app: s.app, license: s.license, versionName }, at, assetUrl);
  if (!queued.ok) throw new Error(queued.reason);
  const building = { ...queued.build, status: "building" as const, logUrl: RUN };
  await s.store.updateBuild(building.id, { status: "building", logUrl: RUN }, at);
  const applied = await applyPipelineStatus(s.store, building, pipelineStatusSchema.parse(NO_MAC_REPORT), at);
  if (!applied.ok) throw new Error(applied.message);
  return applied.build;
}

const iphoneOnlyFailed = (patch: Partial<Build> = {}): Pick<Build, "status" | "message" | "stages" | "failure"> => ({
  status: "failed",
  message: "The iPhone app wasn't built this time because of a temporary problem on our side, not in your app. Our team has been told. Try again later with iPhone only.",
  stages: { queued: "done", android: "skipped", ios: "failed", upload_play: "skipped", upload_testflight: "pending" },
  failure: { code: "ios_no_mac_runner", stage: "ios" },
  ...patch,
});

describe("151 the reason the pipeline reports", () => {
  it("takes ios_no_mac_runner, and the platform keeps the Android app as built", async () => {
    const s = await shop();
    const build = await noMacBuild(s);
    expect(build.status).toBe("ready");
    expect(build.stages).toMatchObject({ android: "done", upload_play: "done", ios: "failed" });
    expect(build.artifacts).toHaveLength(1);
    expect(build.failure?.code).toBe("ios_no_mac_runner");
    expect(noMacRunner(build)).toBe(true);
    expect(noMacRunner({ failure: { code: "ios_signing", stage: "ios" } })).toBe(false);
    for (const code of ["ios_bundle_id_taken", "ios_certificates_full", "ios_app_missing"]) expect(pipelineStatusSchema.safeParse({ failure: { code, stage: "ios" } }).success, code).toBe(true);
  });

  it("is in docs/api/pipeline.yaml with every other code, and report.py sends the same words", () => {
    const contract = readFileSync(path.join(ROOT, "docs/api/pipeline.yaml"), "utf8");
    const line = contract.split("\n").find((l) => l.trim().startsWith("enum: [icon,"))!;
    expect(line.replace(/.*\[|\].*/g, "").split(/,\s*/)).toEqual([...FAILURE_CODES]);
    const report = readFileSync(path.join(ROOT, "build/scripts/report.py"), "utf8");
    expect(report).toContain(`NO_MAC = "${FAILURE_TEXT.ios_no_mac_runner.text}"`);
    expect(report).toContain('NO_MAC_CODE = "ios_no_mac_runner"');
  });
});

describe("151 what the client reads", () => {
  it("says it's on our side, in plain words, with iPhone only, in English, Arabic and Turkish", () => {
    const text = FAILURE_TEXT.ios_no_mac_runner.text;
    expect(text).toBe("The iPhone app wasn't built this time because of a temporary problem on our side, not in your app. Our team has been told. Try again later with iPhone only.");
    expect(failureReason(iphoneOnlyFailed())).toBe(text);
    expect(failureReason(iphoneOnlyFailed({ message: null }))).toBe(text);
    for (const lang of ["en", "ar", "tr"] as const) {
      const words = knownTranslator(lang)(text);
      if (lang !== "en") expect(words, lang).not.toBe(text);
      expect(words, lang).not.toMatch(TECHNICAL);
    }
    expect(knownTranslator("ar")(text)).toContain("آيفون بس");
    expect(knownTranslator("tr")(text)).toContain("Yalnızca iPhone");
  });

  it("never names GitHub, a Mac, a runner or the pipeline in any cause or iPhone message, in any language", () => {
    const iosMessages = [
      "No iOS app in this build: add your App Store Connect key in App setup › Publishing, on a plan with the iOS app.",
      "Your App Store Connect key can't be read. Download the .p8 file again from App Store Connect › Users and Access › Integrations, and upload it in App setup › Publishing.",
      "Your Android app is ready, but the iOS app couldn't be built. Our team has been told and will look into it.",
      "Your iOS app is ready, but the upload to TestFlight didn't work.",
      "Your iOS app is on TestFlight, but its App Store listing didn't go through. Check the texts and screenshots in App Store Connect.",
      "The iOS app couldn't be built.",
    ];
    // The scripts send exactly these words, so the dashboard knows them.
    const scripts = ["report.py", "ios.sh"].map((f) => readFileSync(path.join(ROOT, "build/scripts", f), "utf8")).join("\n");
    for (const message of iosMessages) expect(scripts, message).toContain(message);
    const withBundle = "Your iOS app is ready, but the upload to TestFlight didn't work. Create the app in App Store Connect with the bundle ID com.kechflora.app first (see the App Store guide), then start a new build.";
    expect(scripts).toContain(withBundle.replace("com.kechflora.app", "$BUNDLE_ID"));
    const texts = [...Object.values(FAILURE_TEXT).map((f) => f.text), ...iosMessages, withBundle];
    for (const lang of ["en", "ar", "tr"] as const) {
      const k = knownTranslator(lang);
      for (const text of texts) {
        const words = k(text);
        if (lang !== "en") expect(words, `${lang}: ${text}`).not.toBe(text);
        expect(words, `${lang}: ${text}`).not.toMatch(TECHNICAL);
      }
    }
    expect(knownTranslator("tr")(withBundle)).toContain("com.kechflora.app");
  });

  it("says what to fix and where for the iPhone app's usual causes", () => {
    expect(FAILURE_TEXT.ios_bundle_id_taken).toMatchObject({ link: "/dashboard/setup?step=listing" });
    expect(FAILURE_TEXT.ios_bundle_id_taken.text).toMatch(/Store listing step/);
    expect(FAILURE_TEXT.ios_certificates_full).toMatchObject({ link: "/dashboard/setup?step=publishing" });
    expect(FAILURE_TEXT.ios_app_missing.text).toMatch(/App Store Connect › Apps/);
    expect(FAILURE_TEXT.apple_key.text).toMatch(/Publishing step/);
    // The no-Mac case has nothing to fix on the client's side.
    expect(failureExplanation({ failure: { code: "ios_no_mac_runner" } })?.link).toBeNull();
  });

  it("keeps the iPhone app's build output for the admin; the Android app's stays readable", () => {
    expect(isIphoneFailure({ code: "ios_signing", stage: "ios", log: "x" })).toBe(true);
    expect(isIphoneFailure({ code: "version_used", stage: "upload_testflight" })).toBe(true);
    expect(isIphoneFailure({ code: "apple_key" })).toBe(true);
    expect(isIphoneFailure({ code: "version_used", stage: "upload_play" })).toBe(false);
    expect(clientSeesFailureLog({ failure: { code: "ios_signing", stage: "ios", log: "error: No profiles for 'com.kechflora.app'" } })).toBe(false);
    expect(clientSeesFailureLog({ failure: NO_MAC_REPORT.failure as Build["failure"] })).toBe(false);
    expect(clientSeesFailureLog({ failure: { code: "android_signing", stage: "android", log: "Keystore was tampered with" } })).toBe(true);
    expect(clientSeesFailureLog({ failure: { code: "android_signing", stage: "android" } })).toBe(false);
  });

  it("offers iPhone only on a ready build when a build can start and the app has its iPhone app; never by itself", () => {
    const ready = { status: "ready" as const, failure: { code: "ios_no_mac_runner" as const, stage: "ios" as const } };
    expect(iphoneOnlyAgain(ready, { canStart: true, iosAvailable: true })).toBe(true);
    expect(iphoneOnlyAgain(ready, { canStart: false, iosAvailable: true })).toBe(false);
    expect(iphoneOnlyAgain(ready, { canStart: true, iosAvailable: false })).toBe(false);
    // An iPhone-only build that didn't finish has Try again, which builds it alone.
    expect(iphoneOnlyAgain({ ...ready, status: "failed" }, { canStart: true, iosAvailable: true })).toBe(false);
    expect(iphoneOnlyAgain({ status: "ready", failure: { code: "ios_signing", stage: "ios" } }, { canStart: true, iosAvailable: true })).toBe(false);
    const page = readFileSync(path.join(ROOT, "platform/web/src/app/dashboard/builds/page.tsx"), "utf8");
    expect(page).toContain('<RetryBuildForm versionName={current.versionName} only="ios" iphoneOnly />');
  });

  it("puts why in the ready build's email, once, in the client's language", () => {
    const why = FAILURE_TEXT.ios_no_mac_runner.text;
    expect(readyNote({ message: null, failure: { code: "ios_no_mac_runner" } })).toBe(`${why}\n\n`);
    expect(readyNote({ message: "On Google Play.", failure: { code: "ios_no_mac_runner" } })).toBe(`On Google Play.\n\n${why}\n\n`);
    expect(readyNote({ message: why, failure: { code: "ios_no_mac_runner" } })).toBe(`${why}\n\n`);
    expect(readyNote({ message: null, failure: null })).toBe("");
    expect(readyNote({ message: null, failure: { code: "ios_no_mac_runner" } }, knownTranslator("ar"))).not.toMatch(TECHNICAL);
  });
});

describe("151 what our team sees", () => {
  it("has the technical cause in the admin: the code, GitHub, the runner", () => {
    expect(adminFailureDetail({ failure: { code: "ios_no_mac_runner", stage: "ios" } })).toMatch(/^ios_no_mac_runner \(ios\): GitHub had no macOS runner for the iOS job/);
    expect(adminFailureDetail({ failure: { code: "unknown", stage: "android" } })).toBe("unknown (android)");
    expect(adminFailureDetail({ failure: null })).toBeNull();
    for (const file of ["src/app/admin/builds/page.tsx", "src/app/admin/clients/[id]/page.tsx"]) {
      expect(readFileSync(path.join(ROOT, "platform/web", file), "utf8"), file).toContain("<BuildCause build={build} />");
    }
  });

  it("raises one alert per build, emailed once, with the run, and closes it once the iPhone app was built", async () => {
    const s = await shop();
    const build = await noMacBuild(s);
    const mailed: TeamAlert[] = [];
    const mail = async (alert: TeamAlert) => void mailed.push(alert);
    expect(await alertNoMac(s.store, build, NOW, mail)).toBe(true);
    // Seen again (a second report, the same build): counted, not sent again.
    await alertNoMac(s.store, build, minutes(1), mail);
    let open = (await s.store.listTeamAlerts({ open: true, limit: 50 })).filter((a) => a.kind === "build_no_mac");
    expect(open).toHaveLength(1);
    expect(mailed).toHaveLength(1);
    expect(open[0]).toMatchObject({ key: `${NO_MAC_ALERT}${build.id}`, link: `/admin/clients/${s.client.id}#app-${s.app.id}` });
    expect(open[0]!.title).toBe("Build Kech Flora #1: GitHub had no Mac for the iPhone app");
    expect(open[0]!.detail).toContain("ios_no_mac_runner (ios)");
    expect(open[0]!.detail).toContain(`Run: ${RUN}`);
    expect(open[0]!.detail).toContain("The Android app of this build is ready.");
    // Not for another cause.
    expect(await alertNoMac(s.store, { ...build, failure: { code: "ios_signing", stage: "ios" } }, NOW, mail)).toBe(false);

    // The watch keeps it while no later build made the iPhone app…
    await runWatch({ store: s.store, now: minutes(10), jobs: [], dispatch: true });
    expect((await s.store.listTeamAlerts({ open: true, limit: 50 })).filter((a) => a.kind === "build_no_mac")).toHaveLength(1);
    // …and closes it once the owner's iPhone only build made it.
    const again = await queueBuild(s.store, { client: s.client, app: s.app, license: s.license, versionName: "1.0.0", only: "ios" }, minutes(20), assetUrl);
    if (!again.ok) throw new Error(again.reason);
    await s.store.updateBuild(again.build.id, { status: "ready", stages: { ...again.build.stages, ios: "done" }, finishedAt: minutes(40) }, minutes(40));
    await runWatch({ store: s.store, now: minutes(45), jobs: [], dispatch: true });
    open = (await s.store.listTeamAlerts({ open: true, limit: 50 })).filter((a) => a.kind === "build_no_mac");
    expect(open).toHaveLength(0);
  });

  it("emails the client why, and not the team's build-problem email (the alert says it)", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "yallapp-no-mac-mail-"));
    process.env.YALLAPP_MAIL_DIR = dir;
    vi.stubEnv("APP_URL", "https://yallapp.com.tr");
    vi.stubEnv("SUPER_ADMIN_EMAILS", "team@yallapp.test");
    try {
      const s = await shop();
      const build = await noMacBuild(s);
      await notifyBuildFinished(s.store, build);
      const mails = await Promise.all((await readdir(dir)).map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as Record<string, string>));
      expect(mails.filter((m) => m.to === "team@yallapp.test")).toHaveLength(0);
      const toClient = mails.find((m) => m.to !== "team@yallapp.test")!;
      expect(toClient.text).toContain(FAILURE_TEXT.ios_no_mac_runner.text);
      expect(toClient.text).not.toMatch(/github|runner|macos/i);

      // A real iPhone failure still tells the team.
      await rm(dir, { recursive: true, force: true });
      await notifyBuildFinished(s.store, { ...build, failure: { code: "ios_signing", stage: "ios" } });
      const again = await Promise.all((await readdir(dir)).map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as Record<string, string>));
      expect(again.filter((m) => m.to === "team@yallapp.test")).toHaveLength(1);
    } finally {
      delete process.env.YALLAPP_MAIL_DIR;
      vi.unstubAllEnvs();
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("151 nothing builds it again by itself", () => {
  it("an automatic build after a save, and a Yallapp release, see nothing new in it", async () => {
    const s = await shop();
    await noMacBuild(s, "1.0.0", NOW);
    // The owner saves something no build changes: no automatic build makes the iPhone app again.
    await s.store.updateApp(s.app.id, { autoBuildDueAt: minutes(25) }, minutes(21));
    const run = await runAutoBuilds({ store: s.store, now: minutes(30), assetUrl, start: async () => undefined });
    expect(run).toMatchObject({ queued: 0, nothing: 1 });
    const queued: string[] = [];
    const report = await runAppReleaseBuilds({
      store: s.store,
      now: minutes(60),
      assetUrl,
      start: async () => undefined,
      queue: async ({ versionName }) => {
        queued.push(versionName);
        return { ok: true };
      },
    });
    expect(report.queued).toBe(0);
    expect(queued).toEqual([]);
    expect(await s.store.listBuildsByApp(s.app.id, 10)).toHaveLength(1);
  });
});
