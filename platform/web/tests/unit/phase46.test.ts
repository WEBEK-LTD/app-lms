import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildConfigFor, newApp } from "@/lib/app/setup";
import { validateBuildConfig } from "@/lib/build-config/validate";
import { applyPipelineStatus, pipelineStatusSchema, saveSigningFacts } from "@/lib/builds/pipeline";
import { crashFreeShare, mergeCrash, parseCrashBatch, screenPattern, scrubCrashText, trimStack } from "@/lib/crashes/report";
import { CRASH_RATE_LIMITS, receiveCrashReports, stabilityOf } from "@/lib/crashes/service";
import type { MemoryStore } from "@/lib/data/memory";
import type { Activation, App, AppLinkTarget, CrashReportInput } from "@/lib/data/types";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { LogSender } from "@/lib/hosted/otp-sender";
import { checkLicense, parseSiteInfo } from "@/lib/license/service";
import { buildConfigLinks } from "@/lib/links/app";
import { appleAssociationProblem, assetLinksProblem, checkAppLinks } from "@/lib/links/check";
import { linkItem, storeLinks, wordpressTarget, LINKS_PLUGIN_VERSION } from "@/lib/links/fallback";
import { appleAssociationResponse, assetLinksResponse, forgetLinkTargets } from "@/lib/links/files";
import { LINK_ID_PATTERNS, LINK_KINDS, appRouteFor, linkFor, parseLinkPath, siteLinkBase, yallappLinkBase } from "@/lib/links/table";
import {
  licenseAppLinks,
  normalizeFingerprint,
  normalizeTeamId,
  platformAppleAssociation,
  platformAssetLinks,
} from "@/lib/links/well-known";
import { expectContract } from "./contract";
import { expectPlatformContract } from "./platform-contract";
import { NOW, setupClient } from "./helpers";

const SHARED = JSON.parse(readFileSync(path.join(__dirname, "../../../../docs/api/app-links.json"), "utf8")) as {
  yallapp_path: string;
  site_path: string;
  kinds: { kind: string; route: string; id: string; app_types: string[] }[];
  id_patterns: Record<string, string>;
  examples: { link: string; app_type: string; route: string | null }[];
};

const PLAY = "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5";
const UPLOAD = "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99";
const APP_ID = "00000000-0000-0000-0000-000000000000";

afterEach(() => {
  vi.unstubAllEnvs();
  forgetLinkTargets();
});

/** A WordPress academy with its license, as the plugin's site sees it. */
async function academy(patch: Partial<App> = {}) {
  const { store, licenseKey, client } = await setupClient({ plan: "pro" });
  const app: App = {
    ...newApp(client.id, "https://academy.test", NOW, "lms"),
    appName: "Ada Academy",
    androidPackage: "com.ada.academy",
    iosBundleId: "com.ada.academy",
    ...patch,
  };
  await store.createApp(app);
  return { store: store as MemoryStore, app, licenseKey: licenseKey!, client };
}

describe("46 the link table", () => {
  it("is docs/api/app-links.json, kind by kind", () => {
    expect(LINK_KINDS.map((k) => ({ kind: k.kind, route: k.route, id: k.id, app_types: k.appTypes }))).toEqual(SHARED.kinds);
    for (const [shape, pattern] of Object.entries(SHARED.id_patterns)) expect(LINK_ID_PATTERNS[shape as "number"].source).toBe(pattern);
    expect(SHARED.yallapp_path).toBe("/a/{app_id}/");
    expect(SHARED.site_path).toBe("/a/");
  });

  it("maps every example link to its screen, and nothing else", () => {
    for (const example of SHARED.examples) {
      const url = new URL(example.link);
      const sitePath = url.host === "yallapp.com.tr" ? "" : "";
      const parsed = parseLinkPath(url.pathname, sitePath);
      const route = parsed ? appRouteFor(parsed.kind, parsed.id, example.app_type as App["appType"]) : null;
      expect(route, example.link).toBe(example.route);
    }
  });

  it("goes both ways: a shared link opens the screen it was made for", () => {
    const base = yallappLinkBase("https://yallapp.com.tr", APP_ID);
    expect(base).toBe(`https://yallapp.com.tr/a/${APP_ID}`);
    for (const row of LINK_KINDS) {
      const id = row.id === "number" ? "42" : row.id === "text" ? "summer_news-1" : "offers";
      for (const link of [linkFor(base, row.kind, id), linkFor("https://academy.test/a", row.kind, id)]) {
        const parsed = parseLinkPath(new URL(link).pathname);
        expect(parsed?.kind).toBe(row.kind);
        expect(parsed?.id).toBe(id);
        expect(appRouteFor(row.kind, id, row.appTypes[0]!)).toBe(row.route.replace("{id}", id));
      }
    }
    expect(parseLinkPath(`/a/${APP_ID}/course/12`)?.appId).toBe(APP_ID);
    // A site in a folder keeps its path in front of /a/.
    expect(siteLinkBase("https://example.com/learn/")).toBe("https://example.com/learn/a");
    expect(parseLinkPath("/learn/a/course/7", "/learn")).toEqual({ appId: null, kind: "course", id: "7" });
    expect(parseLinkPath("/a/course/7", "/learn")).toBeNull();
    expect(siteLinkBase("http://academy.test")).toBeNull();
    expect(appRouteFor("course", "12", "store")).toBeNull();
    expect(parseLinkPath("/a/course/-1")).toBeNull();
    expect(parseLinkPath("/a/page/Home")).toBeNull();
  });
});

describe("46 fingerprints and Team IDs", () => {
  it("reads a SHA-256 fingerprint the way Play Console and keytool show it", () => {
    expect(normalizeFingerprint(PLAY)).toEqual({ ok: true, value: PLAY });
    expect(normalizeFingerprint(PLAY.toLowerCase().replaceAll(":", ""))).toEqual({ ok: true, value: PLAY });
    expect(normalizeFingerprint(`SHA256: ${PLAY}`)).toEqual({ ok: true, value: PLAY });
    expect(normalizeFingerprint(` ${PLAY.replaceAll(":", " ")} `)).toEqual({ ok: true, value: PLAY });
  });

  it("refuses SHA-1, short and foreign values with words that say why", () => {
    const sha1 = normalizeFingerprint("DA:39:A3:EE:5E:6B:4B:0D:32:55:BF:EF:95:60:18:90:AF:D8:07:09");
    expect(sha1.ok).toBe(false);
    expect(!sha1.ok && sha1.message).toContain("SHA-1");
    expect(normalizeFingerprint("14:6D:E9").ok).toBe(false);
    expect(normalizeFingerprint(`${PLAY}:ZZ`).ok).toBe(false);
  });

  it("checks Team IDs", () => {
    expect(normalizeTeamId(" a1b2c3d4e5 ")).toEqual({ ok: true, value: "A1B2C3D4E5" });
    expect(normalizeTeamId("A1B2C3").ok).toBe(false);
    expect(normalizeTeamId("A1B2C3D4E5F").ok).toBe(false);
  });
});

describe("46 the link files", () => {
  const targets: AppLinkTarget[] = [
    { id: APP_ID, androidPackage: "com.ada.academy", iosBundleId: "com.ada.academy", playSigningSha256: PLAY, androidUploadSha256: UPLOAD, appleTeamId: "A1B2C3D4E5" },
    { id: "11111111-1111-1111-1111-111111111111", androidPackage: "com.rose.shop", iosBundleId: null, playSigningSha256: null, androidUploadSha256: UPLOAD, appleTeamId: null },
    { id: "22222222-2222-2222-2222-222222222222", androidPackage: "com.new.app", iosBundleId: "com.new.app", playSigningSha256: null, androidUploadSha256: null, appleTeamId: null },
  ];

  it("lists each Android app with its fingerprints, signing key first", () => {
    expect(platformAssetLinks(targets)).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: { namespace: "android_app", package_name: "com.ada.academy", sha256_cert_fingerprints: [PLAY, UPLOAD] },
      },
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: { namespace: "android_app", package_name: "com.rose.shop", sha256_cert_fingerprints: [UPLOAD] },
      },
    ]);
  });

  it("opens each iPhone app for its own /a/<app_id>/ only", () => {
    expect(platformAppleAssociation(targets)).toEqual({
      applinks: { details: [{ appIDs: ["A1B2C3D4E5.com.ada.academy"], components: [{ "/": `/a/${APP_ID}/*` }] }] },
    });
  });

  it("gives the plugin what its own files say, or null before anything is known", () => {
    expect(licenseAppLinks(targets[0]!)).toEqual({
      android: { package_name: "com.ada.academy", sha256_cert_fingerprints: [PLAY, UPLOAD] },
      ios: { app_ids: ["A1B2C3D4E5.com.ada.academy"] },
    });
    expect(licenseAppLinks(targets[1]!)).toEqual({ android: { package_name: "com.rose.shop", sha256_cert_fingerprints: [UPLOAD] }, ios: null });
    expect(licenseAppLinks(targets[2]!)).toBeNull();
  });

  it("serves them as JSON at the platform's root, from every app in the store", async () => {
    const { store } = await academy({ playSigningSha256: PLAY, androidUploadSha256: UPLOAD, appleTeamId: "A1B2C3D4E5" });
    const android = await assetLinksResponse(store);
    expect(android.headers.get("content-type")).toBe("application/json");
    const statements = (await android.json()) as { target: { package_name: string } }[];
    expect(statements.map((s) => s.target.package_name)).toEqual(["com.ada.academy"]);
    const apple = (await (await appleAssociationResponse(store)).json()) as { applinks: { details: { appIDs: string[] }[] } };
    expect(apple.applinks.details[0]!.appIDs).toEqual(["A1B2C3D4E5.com.ada.academy"]);
  });
});

describe("46 the license status, build config and hosted config", () => {
  it("sends the site its link files and the owner's switches", async () => {
    const { store, licenseKey } = await academy({ playSigningSha256: PLAY, appleTeamId: "A1B2C3D4E5", reviewPrompt: false });
    const site = parseSiteInfo({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.4.2" });
    if (!site.ok) throw new Error("site");
    const { activateLicense } = await import("@/lib/license/service");
    await activateLicense(store, site.value, NOW);
    const result = await checkLicense(store, site.value, NOW);
    expect(result.status).toBe(200);
    const body = (result as unknown as { body: Record<string, unknown> }).body;
    expect(body.app_links).toEqual({
      android: { package_name: "com.ada.academy", sha256_cert_fingerprints: [PLAY] },
      ios: { app_ids: ["A1B2C3D4E5.com.ada.academy"] },
    });
    expect(body.review_prompt).toBe(false);
    expect(body.crash_reports).toBe(true);
    expectPlatformContract("POST", "/licenses/check", result);
  });

  it("puts the link hosts in the build config only on https", async () => {
    const { app, client } = await academy();
    vi.stubEnv("APP_URL", "https://yallapp.com.tr");
    const config = buildConfigFor({ ...app, appName: "Ada", shortName: "Ada" }, client, { name: "1.0.0", code: 1 }, (id) => `https://yallapp.com.tr/a/${id}`);
    expect(config.links).toEqual({
      app_id: app.id,
      yallapp_base_url: `https://yallapp.com.tr/a/${app.id}`,
      site_base_url: "https://academy.test/a",
      crash_report_url: `https://yallapp.com.tr/api/app/${app.id}/crashes`,
    });
    expect(validateBuildConfig(config).ok).toBe(true);
    expect(buildConfigLinks(app, "http://localhost:3000")).toBeNull();
    expect(buildConfigLinks({ ...app, backend: "hosted" }, "https://yallapp.com.tr")?.site_base_url).toBeUndefined();
  });

  it("tells a hosted app where its links are, and the switches", async () => {
    const { store, client } = await setupClient();
    const app: App = { ...newApp(client.id, null, NOW, "events"), backend: "hosted", appName: "City Events", websiteDoneAt: NOW, crashReports: false };
    await store.createApp(app);
    const context: HostedContext = {
      store,
      app,
      active: true,
      now: NOW,
      ip: "203.0.113.9",
      secret: "test-hosted-secret",
      sender: new LogSender(),
      push: false,
      assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
      platformUrl: "https://yallapp.test",
    };
    const result = await handleHosted(context, { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "ios", app_version: "1.0.0" }), body: undefined, token: null, headers: new Headers() });
    expectContract("GET", "/config", result);
    const body = (result as { body: { app: Record<string, unknown>; links: { share_base_url: string } } }).body;
    expect(body.links.share_base_url).toBe(`https://yallapp.test/a/${app.id}`);
    expect(body.app.review_prompt).toBe(true);
    expect(body.app.crash_reports).toBe(false);
  });

  it("keeps what a build reports about signing, and only real changes", async () => {
    const { store, app } = await academy();
    expect(pipelineStatusSchema.safeParse({ signing: { android_upload_sha256: "aa:bb" } }).success).toBe(false);
    const parsed = pipelineStatusSchema.parse({ signing: { android_upload_sha256: UPLOAD, apple_team_id: "A1B2C3D4E5" } });
    expect(await saveSigningFacts(store, app.id, parsed.signing, NOW)).toBe(true);
    expect(await saveSigningFacts(store, app.id, parsed.signing, NOW)).toBe(false);
    const saved = (await store.getAppById(app.id))!;
    expect(saved.androidUploadSha256).toBe(UPLOAD);
    expect(saved.appleTeamId).toBe("A1B2C3D4E5");
    expect(typeof applyPipelineStatus).toBe("function");
  });
});

describe("46 Check links", () => {
  const assetLinks = [
    { relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: "com.ada.academy", sha256_cert_fingerprints: [PLAY] } },
  ];
  const association = { applinks: { details: [{ appIDs: ["A1B2C3D4E5.com.ada.academy"], components: [{ "/": "/a/*" }] }] } };

  it("reads the files like the phones do", () => {
    expect(assetLinksProblem(assetLinks, "com.ada.academy", [PLAY])).toBeNull();
    expect(assetLinksProblem(assetLinks, "com.ada.academy", [PLAY, UPLOAD])).toContain("missing a fingerprint");
    expect(assetLinksProblem(assetLinks, "com.other", [PLAY])).toContain("com.other");
    expect(assetLinksProblem({}, "com.ada.academy", [PLAY])).toContain("list");
    expect(appleAssociationProblem(association, "A1B2C3D4E5.com.ada.academy", "/a/")).toBeNull();
    expect(appleAssociationProblem(association, "A1B2C3D4E5.com.ada.academy", "/learn/a/")).toContain("/learn/a/*");
    expect(appleAssociationProblem(association, "ZZZZZZZZZZ.com.ada.academy", "/a/")).toContain("doesn't name");
    expect(appleAssociationProblem({ applinks: { details: [{ appID: "A1B2C3D4E5.com.ada.academy", paths: ["/a/*"] }] } }, "A1B2C3D4E5.com.ada.academy", "/a/")).toBeNull();
  });

  it("fetches a WordPress site's two files, never from a private address, and says what's wrong", async () => {
    const { app } = await academy({ playSigningSha256: PLAY, appleTeamId: "A1B2C3D4E5" });
    const fetched: string[] = [];
    const ok = await checkAppLinks(app, {
      ios: true,
      now: NOW,
      resolve: async () => ["203.0.113.20"],
      fetcher: async (url, init) => {
        fetched.push(url);
        expect(init?.redirect).toBe("manual");
        const body = url.endsWith("assetlinks.json") ? assetLinks : association;
        return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
      },
    });
    expect(fetched).toEqual(["https://academy.test/.well-known/assetlinks.json", "https://academy.test/.well-known/apple-app-site-association"]);
    expect(ok.checks.find((c) => c.id === "upload_key")?.ok).toBe(false);
    expect(ok.checks.filter((c) => c.id.startsWith("site_")).every((c) => c.ok)).toBe(true);

    const redirected = await checkAppLinks(app, {
      ios: true,
      now: NOW,
      resolve: async () => ["203.0.113.20"],
      fetcher: async (url) =>
        url.endsWith("assetlinks.json") ? new Response(null, { status: 301, headers: { location: "https://www.academy.test/" } }) : new Response("<html>", { status: 200, headers: { "content-type": "text/html" } }),
    });
    expect(redirected.ok).toBe(false);
    expect(redirected.checks.find((c) => c.id === "site_android")?.detail).toContain("redirects");
    expect(redirected.checks.find((c) => c.id === "site_ios")?.detail).toContain("not as JSON");

    const local = await checkAppLinks(app, { ios: false, now: NOW, resolve: async () => ["127.0.0.1"], fetcher: async () => new Response("[]") });
    expect(local.checks.find((c) => c.id === "site_android")?.detail).toContain("private network");
    expect(local.checks.some((c) => c.id === "team_id" || c.id === "site_ios")).toBe(false);
  });

  it("only checks the signing facts for an app without WordPress", async () => {
    const { app } = await academy({ backend: "hosted", androidUploadSha256: UPLOAD });
    const fetcher = vi.fn();
    const result = await checkAppLinks(app, { ios: true, now: NOW, fetcher });
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.checks.map((c) => [c.id, c.ok])).toEqual([
      ["play_signing", false],
      ["upload_key", true],
      ["team_id", false],
    ]);
  });
});

function report(overrides: Record<string, unknown> = {}) {
  return {
    fingerprint: "0123456789abcdef0123",
    error: "RangeError: Invalid value: Not in inclusive range 0..2: 3",
    stack: "#0 List.[] (dart:core-patch/growable_array.dart)\n#1 CourseScreen.build (package:yallapp/modules/lms/course_screen.dart:120:7)",
    app_version: "1.4.0",
    build_number: 14,
    platform: "android",
    os_version: "14",
    device: "phone",
    screen: "/course/12?tab=lessons",
    at: NOW.toISOString(),
    ...overrides,
  };
}

describe("46 crash reports", () => {
  it("scrubs anything personal or secret", () => {
    const text = scrubCrashText(
      "Failed for ada@academy.test +90 532 123 45 67 at https://user:pw@academy.test/wp-json/yallapp/v1/me?token=abc#x with Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI3In0.c2lnbmF0dXJl code=123456",
    );
    expect(text).not.toContain("ada@academy.test");
    expect(text).not.toContain("532 123");
    expect(text).not.toContain("token=abc");
    expect(text).not.toContain("user:pw");
    expect(text).not.toContain("eyJhbGci");
    expect(text).not.toContain("123456");
    expect(text).toContain("https://academy.test/wp-json/yallapp/v1/me");
    expect(screenPattern("/course/12?tab=lessons")).toBe("/course/:id");
    // A frame's path stays readable.
    expect(trimStack("#0 ProductScreen.build (package:yallapp/modules/store/screens/product_screen.dart:42:7)")).toContain(
      "package:yallapp/modules/store/screens/product_screen.dart:42:7",
    );
    expect(screenPattern("/article/abcdefghijklmnopqrstuv")).toBe("/article/:id");
  });

  it("checks a batch against the contract and keeps phones' clocks honest", () => {
    const parsed = parseCrashBatch({ reports: [report({ at: "2030-01-01T00:00:00Z" })], sessions: 5, crashed_sessions: 9 }, NOW);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.batch.crashed).toBe(5);
    expect(parsed.batch.reports[0]).toMatchObject({ version: "1.4.0 (14)", os: "Android 14", screen: "/course/:id", at: NOW });
    expect(parseCrashBatch({ reports: [report({ fingerprint: "XYZ" })] }, NOW).ok).toBe(false);
    expect(parseCrashBatch({ reports: [report({ platform: "web" })] }, NOW).ok).toBe(false);
    expect(parseCrashBatch({ reports: Array.from({ length: 11 }, () => report()) }, NOW).ok).toBe(false);
    expect(parseCrashBatch({ reports: [], sessions: -1 }, NOW).ok).toBe(false);
  });

  it("groups by fingerprint with counts, first and last seen, versions and platforms", () => {
    const input = (at: Date, version: string, platform: "android" | "ios" = "android"): CrashReportInput => ({
      fingerprint: "0123456789abcdef",
      title: "StateError: Bad state",
      stack: "#0",
      library: null,
      screen: null,
      fatal: false,
      platform,
      version,
      os: null,
      at,
    });
    let issue = mergeCrash(null, APP_ID, input(NOW, "1.0.0 (1)"));
    issue = mergeCrash(issue, APP_ID, input(new Date(NOW.getTime() + 1000), "1.1.0 (2)", "ios"));
    issue = mergeCrash(issue, APP_ID, input(new Date(NOW.getTime() - 1000), "1.0.0 (1)"));
    expect(issue).toMatchObject({ count: 3, versions: ["1.0.0 (1)", "1.1.0 (2)"], platforms: ["android", "ios"], status: "open" });
    expect(issue.firstSeenAt.getTime()).toBe(NOW.getTime() - 1000);
    expect(issue.lastSeenAt.getTime()).toBe(NOW.getTime() + 1000);
    const resolved = { ...issue, status: "resolved" as const, resolvedAt: new Date(NOW.getTime() + 5000) };
    expect(mergeCrash(resolved, APP_ID, input(NOW, "1.1.0 (2)")).status).toBe("resolved");
    expect(mergeCrash(resolved, APP_ID, input(new Date(NOW.getTime() + 9000), "1.2.0 (3)")).status).toBe("open");
    expect(crashFreeShare({ sessions: 1000, crashed: 3 })).toBe(99.7);
    expect(crashFreeShare({ sessions: 0, crashed: 0 })).toBeNull();
  });

  it("stores reports grouped, counts sessions, and the owner sees the share and the top problems", async () => {
    const { store, app } = await academy();
    const batch = JSON.stringify({ reports: [report(), report({ fingerprint: "fedcba9876543210" })], sessions: 40, crashed_sessions: 2 });
    expect(await receiveCrashReports(store, app, batch, "203.0.113.1", NOW)).toEqual({ status: 204 });
    expect(await receiveCrashReports(store, app, JSON.stringify({ reports: [report()], sessions: 10, crashed_sessions: 1 }), "203.0.113.2", NOW)).toEqual({ status: 204 });
    const issues = await store.listCrashIssues({ appId: app.id, limit: 10 });
    expect(issues).toHaveLength(2);
    expect(issues.find((i) => i.fingerprint === "0123456789abcdef0123")?.count).toBe(2);
    const stability = await stabilityOf(store, app.id, NOW);
    expect(stability).toMatchObject({ crashFree: 94, sessions: 50, open: 2 });
    expect(stability.top[0]!.fingerprint).toBe("0123456789abcdef0123");
    await store.setCrashIssueStatus(stability.top[0]!.id, "resolved", NOW);
    expect((await stabilityOf(store, app.id, NOW)).open).toBe(1);
  });

  it("refuses what isn't a batch, takes and drops reports when the owner turned them off", async () => {
    const { store, app } = await academy({ crashReports: false });
    expect((await receiveCrashReports(store, app, "{", "203.0.113.1", NOW)).status).toBe(400);
    expect((await receiveCrashReports(store, app, "x".repeat(200_000), "203.0.113.1", NOW)).status).toBe(413);
    expect(await receiveCrashReports(store, app, JSON.stringify({ reports: [report()], sessions: 1 }), "203.0.113.1", NOW)).toEqual({ status: 204 });
    expect(await store.listCrashIssues({ appId: app.id, limit: 10 })).toHaveLength(0);
  });

  it("is rate limited per address and per app", async () => {
    const { store, app } = await academy();
    const body = JSON.stringify({ reports: [report()] });
    for (let i = 0; i < CRASH_RATE_LIMITS.ip.limit; i += 1) expect((await receiveCrashReports(store, app, body, "203.0.113.7", NOW)).status).toBe(204);
    const limited = await receiveCrashReports(store, app, body, "203.0.113.7", NOW);
    expect(limited.status).toBe(429);
    expect(limited.status === 429 && limited.body.retry_after_seconds).toBeGreaterThan(0);
    expect((await receiveCrashReports(store, app, body, "203.0.113.8", NOW)).status).toBe(204);
  });
});

describe("46 the link page without the app", () => {
  const activation = (pluginVersion: string): Activation =>
    ({ licenseId: "l", siteUrl: "academy.test", siteUrlRaw: "https://academy.test/", pluginVersion, wpVersion: null, lms: null, activatedAt: NOW, lastCheckedAt: NOW }) as Activation;

  it("sends a WordPress app's link on to the site once its plugin answers it", async () => {
    const { app } = await academy();
    expect(wordpressTarget(app, activation(LINKS_PLUGIN_VERSION), "course", "12")).toBe("https://academy.test/a/course/12");
    expect(wordpressTarget(app, activation("0.4.1"), "course", "12")).toBeNull();
    expect(wordpressTarget(app, null, "course", "12")).toBeNull();
    expect(wordpressTarget({ ...app, backend: "hosted" }, activation("9.0.0"), "course", "12")).toBeNull();
  });

  it("shows only visible items, and links to the stores", async () => {
    const { store, app } = await academy({ backend: "hosted" });
    const withCourses: App = {
      ...app,
      courseSetup: {
        currency: "TRY",
        categories: [],
        nextId: 3,
        courses: [
          { id: 1, title: "Open course", active: true, imageAssetId: null } as never,
          { id: 2, title: "Hidden course", active: false, imageAssetId: null } as never,
        ],
      },
    };
    expect((await linkItem(store, withCourses, "course", "1"))?.title).toBe("Open course");
    expect(await linkItem(store, withCourses, "course", "2")).toBeNull();
    expect(await linkItem(store, withCourses, "event", "1")).toBeNull();
    expect(storeLinks(app, null)).toEqual({ googlePlay: "https://play.google.com/store/apps/details?id=com.ada.academy", appStore: null });
  });
});
