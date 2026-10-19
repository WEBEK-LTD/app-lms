import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildConfigFor, newApp } from "@/lib/app/setup";
import { validateBuildConfig } from "@/lib/build-config/validate";
import type { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { activateLicense, checkLicense, parseLinkPaths, parseSiteInfo, saveSitePaths } from "@/lib/license/service";
import { buildConfigLinks, LINK_PATH } from "@/lib/links/app";
import { expectPlatformContract } from "./platform-contract";
import { NOW, setupClient } from "./helpers";

/** 48 The site's own pages that open the app: the paths the plugin reports, kept for the next build. */

afterEach(() => vi.unstubAllEnvs());

async function academy(patch: Partial<App> = {}) {
  const { store, licenseKey, client } = await setupClient({ plan: "pro" });
  const app: App = { ...newApp(client.id, "https://academy.test", NOW, "lms"), appName: "Ada Academy", androidPackage: "com.ada.academy", iosBundleId: "com.ada.academy", ...patch };
  await store.createApp(app);
  return { store: store as MemoryStore, app, licenseKey: licenseKey!, client };
}

function site(licenseKey: string, extra: Record<string, unknown> = {}) {
  const parsed = parseSiteInfo({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.4.3", ...extra });
  if (!parsed.ok) throw new Error("site");
  return parsed.value;
}

describe("48 SiteInfo.link_paths", () => {
  it("keeps only well-formed paths, sorted, at most 20; null when the plugin sent none", () => {
    expect(parseLinkPaths(undefined)).toBeNull();
    expect(parseLinkPaths("/courses/")).toBeNull();
    expect(parseLinkPaths(["/product/", "/courses/", "/courses/", "/", "courses/", "/a b/", "/x/../", 7, `/${"x".repeat(100)}/`])).toEqual(["/courses/", "/product/"]);
    expect(parseLinkPaths(Array.from({ length: 30 }, (_, i) => `/p${String(i).padStart(2, "0")}/`))).toHaveLength(20);
    // A malformed list never fails the license check.
    expect(parseSiteInfo({ license_key: "YALL-7K2D-9QWE-4MNB", site_url: "https://academy.test", plugin_version: "0.4.3", link_paths: "nope" }).ok).toBe(true);
  });

  it("matches the contract's pattern", () => {
    const yaml = readFileSync(path.join(__dirname, "../../../../docs/api/platform.yaml"), "utf8");
    expect(yaml).toContain(`pattern: '${LINK_PATH.source.replace(/\\\//g, "/")}'`);
  });
});

describe("48 the license check keeps the site's paths for the next build", () => {
  it("saves them when they change, and only then", async () => {
    const { store, app, licenseKey } = await academy();
    await activateLicense(store, site(licenseKey, { link_paths: ["/product/", "/courses/"] }), NOW);
    expect((await store.getAppById(app.id))!.hostedSettings?.sitePaths).toEqual(["/courses/", "/product/"]);
    const update = vi.spyOn(store, "updateApp");
    const result = await checkLicense(store, site(licenseKey, { link_paths: ["/courses/", "/product/"] }), NOW);
    expectPlatformContract("POST", "/licenses/check", result);
    expect(update).not.toHaveBeenCalled();
    await checkLicense(store, site(licenseKey, { link_paths: ["/courses/"] }), NOW);
    expect((await store.getAppById(app.id))!.hostedSettings?.sitePaths).toEqual(["/courses/"]);
    // An older plugin says nothing: what was reported stays.
    await checkLicense(store, site(licenseKey), NOW);
    expect((await store.getAppById(app.id))!.hostedSettings?.sitePaths).toEqual(["/courses/"]);
  });

  it("keeps the owner's other choices", async () => {
    const { store, app } = await academy({ hostedSettings: { ...newApp("c", null, NOW, "lms").hostedSettings!, offlineDownloads: false } as App["hostedSettings"] });
    expect(await saveSitePaths(store, app, ["/courses/"], NOW)).toBe(true);
    const saved = (await store.getAppById(app.id))!.hostedSettings!;
    expect(saved.offlineDownloads).toBe(false);
    expect(saved.sitePaths).toEqual(["/courses/"]);
    expect(await saveSitePaths(store, { ...app, backend: "hosted" }, ["/x/"], NOW)).toBe(false);
  });
});

describe("48 the build config", () => {
  it("lists the site's paths with its link base, valid against the schema", async () => {
    const { app, client } = await academy();
    const withPaths: App = { ...app, appName: "Ada", shortName: "Ada", hostedSettings: { ...(app.hostedSettings ?? {}), sitePaths: ["/courses/", "/lesson/"] } as App["hostedSettings"] };
    vi.stubEnv("APP_URL", "https://yallapp.com.tr");
    const config = buildConfigFor(withPaths, client, { name: "1.0.0", code: 1 }, (id) => `https://yallapp.com.tr/a/${id}`);
    expect(config.links?.site_paths).toEqual(["/courses/", "/lesson/"]);
    expect(validateBuildConfig(config).ok).toBe(true);
    // Not on https, not without the site, nothing malformed, nothing when none were reported.
    expect(buildConfigLinks(withPaths, "http://localhost:3000")).toBeNull();
    expect(buildConfigLinks({ ...withPaths, backend: "hosted" }, "https://yallapp.com.tr")?.site_paths).toBeUndefined();
    expect(buildConfigLinks(app, "https://yallapp.com.tr")?.site_paths).toBeUndefined();
    const bad = { ...withPaths, hostedSettings: { ...withPaths.hostedSettings!, sitePaths: ["/courses/", "/a b/"] } };
    expect(buildConfigLinks(bad, "https://yallapp.com.tr")?.site_paths).toEqual(["/courses/"]);
    const invalid = { ...config, links: { ...config.links!, site_paths: ["courses"] } };
    expect(validateBuildConfig(invalid).ok).toBe(false);
  });
});
