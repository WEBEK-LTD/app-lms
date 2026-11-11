import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { DEFAULT_HOSTED_SETTINGS, type App } from "@/lib/data/types";
import { activateLicense, checkLicense, parseSiteInfo } from "@/lib/license/service";
import { studioScreensOn, type StudioScreens } from "@/lib/studio/screens";
import { NOW, setupClient } from "./helpers";
import { expectPlatformContract } from "./platform-contract";

/**
 * 121 A Yallapp Studio project on a WordPress site designs its sign-in screen
 * and account menu too: the plugin gets them with its license check
 * (`LicenseStatus.screens`) and serves them in its `/config`
 * (wp-plugin/yallapp/tests/unit/StudioScreens121Test.php).
 */
const SCREENS: StudioScreens = {
  sign_in: { style: "photo", image_url: "https://yallapp.test/m/hero.jpg", title: { en: "Welcome back" }, subtitle: {}, show_logo: true },
  account_menu: { header: "night", accent: "#D9B36C", items: [] },
};

describe("121 Studio's screens on a WordPress site", () => {
  it("are offered for a Studio project on WordPress, not for a regular app", () => {
    expect(studioScreensOn({ section: "studio", backend: "wordpress" })).toBe(true);
    expect(studioScreensOn({ section: "studio", backend: "hosted" })).toBe(true);
    expect(studioScreensOn({ section: "regular", backend: "wordpress" } as never)).toBe(false);
  });

  it("go to the plugin with the license check, against the contract", async () => {
    const { store, licenseKey, client, license } = await setupClient({ plan: "pro" });
    const site: App = { ...newApp(client.id, "https://academy.test", NOW, "lms"), appName: "Ada Academy", section: "studio" };
    await store.createApp(site);
    // The app's own plan.
    await store.updateLicense(license!.id, { appId: site.id }, NOW);
    const info = parseSiteInfo({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.4.33" });
    if (!info.ok) throw new Error("site");
    await activateLicense(store, info.value, NOW);
    const body = async () => {
      const result = await checkLicense(store, info.value, NOW);
      expectPlatformContract("POST", "/licenses/check", result);
      return (result as unknown as { body: { screens: unknown } }).body;
    };
    // None designed yet: the app's own screens.
    expect((await body()).screens).toBeNull();
    await store.updateApp(site.id, { hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, studioScreens: SCREENS } }, NOW);
    expect((await body()).screens).toEqual(SCREENS);
    // A regular app on the same site gets none, whatever is saved.
    await store.updateApp(site.id, { section: "regular" } as never, NOW);
    expect((await body()).screens).toBeNull();
  });
});
