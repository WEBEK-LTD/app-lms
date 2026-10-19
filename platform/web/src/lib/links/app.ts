import type { App, AppLinkTarget } from "../data/types";
import { crashReportUrl, siteLinkBase, yallappLinkBase } from "./table";

/** 48 A path the plugin reports for Android's intent filters (`SiteInfo.link_paths`): folders of plain characters, ending with "/". */
export const LINK_PATH = /^\/([A-Za-z0-9._~%-]+\/)+$/;
export const MAX_LINK_PATHS = 20;

/** 46 What an app's link files need, from the app. */
export function appLinkTargetOf(app: App): AppLinkTarget {
  return {
    id: app.id,
    androidPackage: app.androidPackage,
    iosBundleId: app.iosBundleId,
    playSigningSha256: app.playSigningSha256 ?? null,
    androidUploadSha256: app.androidUploadSha256 ?? null,
    appleTeamId: app.appleTeamId ?? null,
  };
}

/** 46 The build config's `links` (docs/build-config.schema.json): only when the platform is on https, as phones need. */
export function buildConfigLinks(
  app: App,
  platformUrl: string,
): { app_id: string; yallapp_base_url: string; site_base_url?: string; site_paths?: string[]; crash_report_url: string } | null {
  if (!/^https:\/\//.test(platformUrl)) return null;
  const site = app.backend === "wordpress" ? siteLinkBase(app.siteUrl) : null;
  // 48 The site's own pages that open the app on Android, as its plugin last reported them.
  const paths = site ? (app.hostedSettings?.sitePaths ?? []).filter((p) => LINK_PATH.test(p)).slice(0, MAX_LINK_PATHS) : [];
  return {
    app_id: app.id,
    yallapp_base_url: yallappLinkBase(platformUrl, app.id),
    ...(site ? { site_base_url: site } : {}),
    ...(paths.length ? { site_paths: paths } : {}),
    crash_report_url: crashReportUrl(platformUrl, app.id),
  };
}
