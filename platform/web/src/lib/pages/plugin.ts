import type { DataStore } from "../data/store";
import { hashLicenseKey } from "../license/key";
import type { SiteInfo } from "../license/service";
import { licenseUsesSite } from "../license/site";
import { licenseState } from "../license/status";
import { effectivePlans, planOfLicense } from "../entitlements";
import { withLanguageList } from "../i18n/packs";
import { withBuiltInTexts } from "./builtin";
import { servedAppearance, shownAppearance } from "../fonts/look";
import { appDefaults } from "./layout";
import { layoutForPlan } from "./plan";
import type { Layout } from "./types";

/**
 * POST /apps/layout (docs/api/platform.yaml: getAppLayout): the published
 * layout of the app whose license is active on the plugin's site (the
 * license key names the app: each app of an account has its own).
 */

export type LayoutResult =
  | { status: 200; body: Layout; etag: string }
  | { status: 204 }
  | { status: 304 }
  | { status: 403 | 404; body: { code: string; message: string } };

/** The versions in an `If-None-Match` header, without quotes or `W/`. */
export function etagValues(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((v) => v.trim().replace(/^W\//, "").replace(/^"(.*)"$/, "$1"))
    .filter(Boolean);
}

export async function pluginLayout(store: DataStore, site: SiteInfo, ifNoneMatch: string | null, now: Date, platformUrl = "https://yallapp.com.tr"): Promise<LayoutResult> {
  const license = await store.getLicenseByHash(hashLicenseKey(site.licenseKey));
  const client = license ? await store.getClientById(license.clientId) : null;
  if (!license || !client) {
    return { status: 404, body: { code: "license_not_found", message: "This license key doesn't exist. Check it in your Yallapp dashboard." } };
  }
  const activation = licenseState(client, license, now) === "active" ? await store.getActivation(license.id) : null;
  if (!activation || activation.siteUrl !== site.siteUrl || !(await licenseUsesSite(store, license))) {
    return { status: 403, body: { code: "license_inactive", message: "This license isn't active on this site." } };
  }
  // The license's own app: each app of an account has its own key and site.
  const app = license.appId ? await store.getAppById(license.appId) : null;
  const published = app && app.clientId === client.id ? (await store.getAppLayout(app.id))?.published : null;
  if (!app || !published) return { status: 204 };
  // 13.1 The layout as the app's plan allows it (languages, sources, the full page editor).
  // 43 With Yallapp's own translations, and each language's name, direction and string pack
  // for the plugin's Config.languages; the interface strings themselves stay on the platform.
  // 97.3 The Figma look stays on the platform: the plugin gets the look shown.
  const own = await store.listOwnFonts(app.id);
  const { look_mode: _mode, figma_look: _figma, ...shown } = {
    ...published,
    appearance: shownAppearance(published, (id) => `${platformUrl}/api/v1/assets/${id}`, own.map((f) => f.family)),
  };
  void _mode;
  void _figma;
  const planned = withBuiltInTexts(layoutForPlan(shown, app, planOfLicense(await effectivePlans(store), license, now), await appDefaults(store)));
  const { strings: _strings, ...rest } = planned;
  void _strings;
  // Strings are published with the pages, so a changed pack always comes with a new version.
  // 97.1 With the files of the look's free fonts, on Yallapp.
  const layout: Layout = {
    ...rest,
    appearance: servedAppearance(rest.appearance, platformUrl, own),
    languages: withLanguageList(planned.languages, published.strings, { platformUrl, appId: app.id }),
  };
  if (etagValues(ifNoneMatch).includes(layout.version)) return { status: 304 };
  return { status: 200, body: layout, etag: layout.version };
}
