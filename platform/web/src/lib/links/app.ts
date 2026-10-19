import type { App, AppLinkTarget } from "../data/types";
import { crashReportUrl, siteLinkBase, yallappLinkBase } from "./table";

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
): { app_id: string; yallapp_base_url: string; site_base_url?: string; crash_report_url: string } | null {
  if (!/^https:\/\//.test(platformUrl)) return null;
  const site = app.backend === "wordpress" ? siteLinkBase(app.siteUrl) : null;
  return {
    app_id: app.id,
    yallapp_base_url: yallappLinkBase(platformUrl, app.id),
    ...(site ? { site_base_url: site } : {}),
    crash_report_url: crashReportUrl(platformUrl, app.id),
  };
}
