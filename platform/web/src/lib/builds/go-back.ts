import type { DataStore, AppPatch } from "../data/store";
import type { App, Build } from "../data/types";
import { compareVersions } from "../app/version-policy";
import { restoreLayoutVersion } from "../pages/layout";

/**
 * 89.3 Going back to an earlier build: its look and names (from the config
 * it was built with) and its store listing come back on the app, the pages
 * published then come back as the draft (to check and publish again), and
 * the build is made again from the same app code ("Rebuild as it was"), with
 * a new version as the stores need.
 */

const ASSET_ID = /\/api\/v1\/assets\/([0-9a-f-]{36})(?:[?#].*)?$/i;

/** The upload a build config's URL points to, when it's one of ours. */
export function assetIdOf(url: string | undefined): string | null {
  return url ? (ASSET_ID.exec(url)?.[1] ?? null) : null;
}

/** What a build had: the names, colours, template, font, icon and logo, and the store listing. */
export function settingsFromBuild(build: Pick<Build, "config" | "storeListing">): AppPatch {
  const config = build.config;
  const branding = config.branding;
  const patch: AppPatch = {
    appName: config.app_name || null,
    shortName: config.short_name || null,
    primaryColor: branding.primary_color,
    splashColor: branding.splash_color,
    template: branding.template,
    font: branding.font,
  };
  const icon = assetIdOf(branding.icon_url);
  const logo = assetIdOf(branding.logo_url);
  if (icon) patch.iconAssetId = icon;
  if (branding.logo_url === undefined) patch.logoAssetId = null;
  else if (logo) patch.logoAssetId = logo;
  const listing = build.storeListing;
  if (listing?.storeTitle) {
    Object.assign(patch, {
      storeTitle: listing.storeTitle,
      shortDescription: listing.shortDescription,
      fullDescription: listing.fullDescription,
      supportEmail: listing.supportEmail,
      privacyUrl: listing.privacyUrl,
    });
  }
  return patch;
}

export interface GoBackResult {
  /** The publish of Pages & look put back as the draft; null when none was kept from then. */
  pagesFrom: number | null;
  /** Uploads (icon, logo) that are gone and stay as they are now. */
  missing: ("icon" | "logo")[];
}

/** Puts the app's settings and pages back as they were for this build. */
export async function restoreFromBuild(store: DataStore, app: App, build: Build, now: Date): Promise<GoBackResult> {
  const patch = settingsFromBuild(build);
  const missing: GoBackResult["missing"] = [];
  for (const [field, name] of [["iconAssetId", "icon"], ["logoAssetId", "logo"]] as const) {
    const id = patch[field];
    if (!id) continue;
    const asset = await store.getAsset(id);
    if (!asset || asset.clientId !== app.clientId) {
      delete patch[field];
      missing.push(name);
    }
  }
  await store.updateApp(app.id, patch, now);
  // The newest publish of the pages at the time the build was made.
  const versions = await store.listLayoutVersions(app.id);
  const then = versions.filter((v) => v.publishedAt.getTime() <= build.createdAt.getTime()).sort((a, b) => b.number - a.number)[0];
  let pagesFrom: number | null = null;
  if (then) {
    const restored = await restoreLayoutVersion(store, { ...app, ...patch } as App, then.number, now);
    if (restored?.ok) pagesFrom = then.number;
  }
  return { pagesFrom, missing };
}

export interface VersionInUse {
  version: string;
  /** Phones that opened this version on the busiest of the last 7 days. */
  phones: number;
  share: number;
  /** Below the app's minimum version: these phones see Update required. */
  belowMinimum: boolean;
}

/** 89.3 The versions people use, from the app's own statistics over the last 7 days. */
export async function versionsInUse(store: Pick<DataStore, "listAnalyticsDaily">, app: Pick<App, "id" | "minVersion">, today: string): Promise<VersionInUse[]> {
  const from = new Date(`${today}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 6);
  const rows = await store.listAnalyticsDaily(app.id, from.toISOString().slice(0, 10), today, ["version"]);
  const most = new Map<string, number>();
  for (const row of rows) most.set(row.key, Math.max(most.get(row.key) ?? 0, row.value));
  const total = [...most.values()].reduce((sum, value) => sum + value, 0);
  const valid = (v: string) => /^\d+(\.\d+){0,3}$/.test(v);
  return [...most.entries()]
    .map(([version, phones]) => ({
      version,
      phones,
      share: total ? phones / total : 0,
      belowMinimum: Boolean(app.minVersion) && valid(version) && compareVersions(version, app.minVersion!) < 0,
    }))
    .sort((a, b) => (valid(a.version) && valid(b.version) ? compareVersions(b.version, a.version) : b.phones - a.phones));
}
