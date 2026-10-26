import { hostedOnly } from "../app/kinds";
import { buildConfigFor, SETUP_STEPS, STEP_LABEL, stepStatus, type SetupStep } from "../app/setup";
import type { BuildConfig } from "../build-config/types";
import { APP_FONTS } from "../build-config/types";
import type { App } from "../data/types";
import { hostedApiUrl } from "../hosted/urls";
import { yallappSignsIn } from "../hosted/sign-in-methods";
import type { Plan, PlanInfo } from "../plans";
import type { PreviewGrant } from "./token";

/**
 * 17 What the app preview reads at start-up (`GET /api/preview/{token}/config`,
 * docs/api/platform.yaml): the app's build config as a build would get it
 * (`buildConfigFor`, docs/build-config.schema.json) from its current setup,
 * also when the setup isn't complete. Values the setup doesn't have yet are
 * filled with placeholders, listed in `preview.placeholders`. Firebase files
 * are left out: the preview has no push notifications.
 */

/** Where the preview gets the app's content. */
export type PreviewContentSource = "wordpress" | "custom_api" | "hosted" | "none";

export interface PreviewConfig {
  config: BuildConfig;
  preview: {
    app_id: string;
    expires_at: string;
    content_source: PreviewContentSource;
    /** Why there's no content yet (`content_source` none), so the preview says what to do; null otherwise. */
    waiting_for: PreviewWaitingFor | null;
    /** The preview shows the Pages & look draft (hosted API only); otherwise the published pages. */
    draft: boolean;
    /** Sent by the app as `X-Yallapp-Preview` to the hosted API (34: also for Yallapp's sign-in of an own API app); null otherwise. */
    api_token: string | null;
    /** Build config fields filled with placeholders because the setup doesn't have them yet. */
    placeholders: string[];
    /** Setup steps that aren't complete yet. */
    missing_steps: { step: SetupStep; label: string }[];
  };
}

export const PLACEHOLDER = {
  appName: "Your app",
  androidPackage: "com.example.preview",
  iosBundleId: "com.example.preview",
} as const;

export function previewContentSource(app: App, pluginConnected: boolean): PreviewContentSource {
  if (app.backend === "hosted") return "hosted";
  // Real estate apps only run on the hosted API.
  if (hostedOnly(app.appType)) return "none";
  // Until the Website step chose it, a website's address (given at sign-up, or read by
  // "Start from your website") isn't a content source: the preview never reads a site
  // that may not have the Yallapp plugin, which the browser can't reach.
  if (!app.websiteDoneAt) return "none";
  if (app.backend === "custom_api") return app.apiBaseUrl ? "custom_api" : "none";
  // A WordPress site, once the Yallapp plugin on it has activated the app's license.
  if (app.backend === "wordpress") return app.siteUrl && pluginConnected ? "wordpress" : "none";
  // "setup_requested": our team is still setting up the site.
  return "none";
}

/** What the preview waits for while it has no content: the Website step, the plugin on the site, or our team's setup. */
export type PreviewWaitingFor = "website" | "plugin" | "setup";

export function previewWaitingFor(app: App, pluginConnected: boolean): PreviewWaitingFor | null {
  if (previewContentSource(app, pluginConnected) !== "none" || hostedOnly(app.appType)) return null;
  if (app.backend === "setup_requested") return "setup";
  return app.websiteDoneAt && app.backend === "wordpress" && app.siteUrl ? "plugin" : "website";
}

/** Whether the preview can show the draft pages: only the hosted API serves them. */
export function draftPreviewSupported(app: App): boolean {
  return app.backend === "hosted";
}

/** The setup steps the app still needs, in order. */
export function missingSteps(app: App, plan: Plan | null, plans?: Record<Plan, PlanInfo>): { step: SetupStep; label: string }[] {
  const status = stepStatus(app, plan, plans);
  return SETUP_STEPS.filter((step) => !status[step]).map((step) => ({ step, label: STEP_LABEL[step] }));
}

export function previewConfigFor(
  app: App,
  grant: PreviewGrant,
  options: {
    token: string;
    platformUrl: string;
    assetUrl: (assetId: string) => string;
    plan: Plan | null;
    plans?: Record<Plan, PlanInfo>;
    /** The Yallapp plugin on the app's WordPress site has activated its license (`wordpressPluginConnected`). */
    pluginConnected: boolean;
  },
): PreviewConfig {
  const built = buildConfigFor(app, { id: app.clientId }, { name: "1.0.0", code: 1 }, options.assetUrl);
  const placeholders: string[] = [];
  const fill = <K extends keyof BuildConfig>(key: K, value: BuildConfig[K]) => {
    placeholders.push(key);
    built[key] = value;
  };
  if (!built.app_name.trim()) fill("app_name", PLACEHOLDER.appName);
  if (!built.short_name.trim()) {
    placeholders.push("short_name");
    built.short_name = built.app_name.slice(0, 12).trim() || "App";
  }
  if (!built.android_package) fill("android_package", PLACEHOLDER.androidPackage);
  if (!built.ios_bundle_id) fill("ios_bundle_id", PLACEHOLDER.iosBundleId);
  const source = previewContentSource(app, options.pluginConnected);
  if (source === "none" || !built.site_url) {
    // No content yet: the app shows how to connect it. The site is the platform, so the address is valid.
    if (!built.site_url) placeholders.push("site_url");
    built.site_url = options.platformUrl;
    delete built.api_base_url;
    delete built.auth_base_url;
  }
  if (source === "hosted") built.api_base_url = hostedApiUrl(options.platformUrl, app.id);
  // 34 Yallapp signs people in to an app on its own API: sign-in goes to the hosted API of this platform.
  const yallappAuth = source === "custom_api" && yallappSignsIn(app);
  if (yallappAuth) built.auth_base_url = hostedApiUrl(options.platformUrl, app.id);
  if (!(APP_FONTS as readonly string[]).includes(built.branding.font)) {
    placeholders.push("branding.font");
    built.branding.font = APP_FONTS[0];
  }
  if (!built.branding.icon_url) placeholders.push("branding.icon_url");
  // No push in the preview: the Firebase files stay out.
  delete built.firebase;
  // 44 The preview never sends usage statistics.
  delete built.analytics;
  const draft = grant.draft && draftPreviewSupported(app);
  return {
    config: built,
    preview: {
      app_id: app.id,
      expires_at: grant.expiresAt.toISOString(),
      content_source: source,
      waiting_for: previewWaitingFor(app, options.pluginConnected),
      draft,
      // 34 Also for Yallapp's sign-in of an app on its own API: sent only to the hosted API, never to the client's.
      api_token: source === "hosted" || yallappAuth ? options.token : null,
      placeholders,
      missing_steps: missingSteps(app, options.plan, options.plans),
    },
  };
}

