import type { AppType, AppVertical } from "../data/types";

/** TypeScript view of docs/build-config.schema.json (schema_version 1). */

export const APP_FONTS = [
  "Bricolage Grotesque",
  "Plus Jakarta Sans",
  "Outfit",
  "Manrope",
  "DM Sans",
  "Lexend",
] as const;
export type AppFont = (typeof APP_FONTS)[number];

export const APP_TEMPLATES = ["classic", "bold", "minimal"] as const;

export interface BuildConfig {
  schema_version: 1;
  client_id?: string;
  /** The engine: the module the build includes (lib/app/kinds.ts). */
  app_type: AppType;
  /** 20 The kind of business; left out when the app has none. */
  vertical?: AppVertical;
  /** Only for apps whose content isn't served by the WordPress plugin. */
  api_base_url?: string;
  app_name: string;
  short_name: string;
  site_url: string;
  android_package: string;
  ios_bundle_id: string;
  version_name: string;
  version_code: number;
  branding: {
    primary_color: string;
    splash_color: string;
    template: (typeof APP_TEMPLATES)[number];
    font: AppFont;
    icon_url?: string;
    logo_url?: string;
  };
  firebase?: {
    android_config_url?: string;
    ios_config_url?: string;
  };
  /** 36 Huawei Push Kit (agconnect-services.json), for phones without Google Play services. */
  huawei?: {
    agconnect_config_url?: string;
  };
}

/** Field rules, kept identical to the patterns in the schema. */
export const RULES = {
  appNameMax: 30,
  shortNameMax: 12,
  androidPackage: /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/,
  iosBundleId: /^[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z][A-Za-z0-9-]*)+$/,
  versionName: /^\d+\.\d+\.\d+$/,
  color: /^#[0-9A-Fa-f]{6}$/,
  httpsUrl: /^https:\/\//,
} as const;
