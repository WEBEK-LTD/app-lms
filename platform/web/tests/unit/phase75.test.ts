import { describe, expect, it } from "vitest";
import { activationEmail, licensePageName } from "@/lib/app/label";
import { newApp } from "@/lib/app/setup";
import type { App } from "@/lib/data/types";
import { EMAIL_TEMPLATES } from "@/lib/email/templates";
import { localizedDefault } from "@/lib/email/templates-lang";
import { parseSignInCodeRequest, sendSignInCode } from "@/lib/license/sign-in-codes";
import { activateLicense, checkLicense, parseSiteInfo, type SiteInfo } from "@/lib/license/service";
import { pluginLayout } from "@/lib/pages/plugin";
import { NOW, setupClient } from "./helpers";
import { expectPlatformContract } from "./platform-contract";

// 75 Only an app on WordPress (or waiting for the site our team sets up) uses its license key on a site.

const SITE = "https://academy.test";

function site(licenseKey: string, url = SITE): SiteInfo {
  const parsed = parseSiteInfo({ license_key: licenseKey, site_url: url, plugin_version: "0.4.7" });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.result));
  return parsed.value;
}

async function withApp(backend: App["backend"]) {
  const setup = await setupClient();
  const app: App = { ...newApp(setup.client.id, SITE, NOW), backend };
  await setup.store.createApp(app);
  return { ...setup, app, licenseKey: setup.licenseKey! };
}

describe("75 the license key works on a site only for WordPress apps", () => {
  it("refuses to activate the key of an app on the hosted API or its own API", async () => {
    for (const backend of ["hosted", "custom_api"] as const) {
      const { store, licenseKey, client, app } = await withApp(backend);
      const result = await activateLicense(store, site(licenseKey), NOW);
      expect(result).toMatchObject({ status: 403, body: { code: "license_not_for_site" } });
      expect(JSON.stringify(result)).toContain("choose WordPress");
      expectPlatformContract("POST", "/licenses/activate", result);
      const license = (await store.getLicenseForApp(client.id, app.id))!;
      expect(await store.getActivation(license.id)).toBeNull();
    }
  });

  it("activates the key of an app on WordPress or waiting for its WordPress site", async () => {
    for (const backend of ["wordpress", "setup_requested"] as const) {
      const { store, licenseKey } = await withApp(backend);
      const result = await activateLicense(store, site(licenseKey), NOW);
      expect(result.status).toBe(200);
      expectPlatformContract("POST", "/licenses/activate", result);
    }
  });

  it("stops a site activated before the app left WordPress: check, layout and sign-in codes", async () => {
    const { store, licenseKey, app } = await withApp("wordpress");
    expect((await activateLicense(store, site(licenseKey), NOW)).status).toBe(200);
    await store.updateApp(app.id, { backend: "hosted" }, NOW);

    const checked = await checkLicense(store, site(licenseKey), NOW);
    expect(checked).toMatchObject({ status: 200, body: { status: "invalid" } });
    expect(JSON.stringify(checked)).toContain("doesn't run on a WordPress site");
    expectPlatformContract("POST", "/licenses/check", checked);

    expect(await pluginLayout(store, site(licenseKey), null, NOW)).toMatchObject({ status: 403, body: { code: "license_inactive" } });

    const request = parseSignInCodeRequest({ license_key: licenseKey, site_url: SITE, plugin_version: "0.4.7", phone: "+905321234567", code: "482913" });
    if (!request.ok) throw new Error("bad request");
    const codes = await sendSignInCode(store, request.value, { sender: null, secret: "s", now: NOW });
    expect(codes).toMatchObject({ status: 403, body: { code: "license_inactive" } });
    expectPlatformContract("POST", "/sign-in-codes/send", codes);

    // Back on WordPress, the same site works again.
    await store.updateApp(app.id, { backend: "wordpress" }, NOW);
    expect(await checkLicense(store, site(licenseKey), NOW)).toMatchObject({ status: 200, body: { status: "active" } });
  });
});

describe("75 the dashboard and emails keep the key to WordPress apps", () => {
  it("names the page Plan and sends the activation email without the key", () => {
    expect(licensePageName({ backend: "wordpress" })).toBe("License & plugin");
    expect(licensePageName({ backend: "setup_requested" })).toBe("License & plugin");
    expect(licensePageName({ backend: "hosted" })).toBe("Plan");
    expect(licensePageName({ backend: "custom_api" })).toBe("Plan");
    expect(activationEmail({ backend: "wordpress" })).toBe("account_activated");
    expect(activationEmail(null)).toBe("account_activated");
    expect(activationEmail({ backend: "hosted" })).toBe("app_activated");
    expect(activationEmail({ backend: "custom_api" })).toBe("app_activated");
  });

  it("writes the no-key activation email in English, Arabic and Turkish without the key or the plugin", () => {
    const template = EMAIL_TEMPLATES.find((t) => t.key === "app_activated")!;
    expect(template.placeholders.map((p) => p.name)).not.toContain("license_key");
    const texts = [template, localizedDefault("app_activated", "ar")!, localizedDefault("app_activated", "tr")!];
    for (const text of texts) {
      expect(text.body).not.toContain("{{license_key}}");
      expect(text.body).not.toMatch(/WordPress|plugin|إضافة|eklenti/i);
      expect(text.body).toContain("{{dashboard_url}}");
      expect(text.body).toContain("{{payment_line}}");
    }
  });
});
