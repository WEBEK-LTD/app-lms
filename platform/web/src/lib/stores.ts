/**
 * 41 The app stores Yallapp publishes to (Phases 13, 14, 35, 36 and 42): every
 * plan builds the Android app for Google Play, Samsung Galaxy Store, Huawei
 * AppGallery and Xiaomi GetApps; plans with the iOS app add the App Store.
 * Plans with "We publish for you" upload every build to each of them; the
 * others publish by hand with our guides. No marks here (client code imports
 * the plans): they are in lib/brands.ts.
 */

export const APP_STORES = ["google_play", "app_store", "galaxy_store", "appgallery", "getapps"] as const;
export type AppStore = (typeof APP_STORES)[number];

export interface StoreFacts {
  id: AppStore;
  /** The full name, also the accessible name of its mark. */
  name: string;
  /** "Google Play", "App Store", "Galaxy Store", "AppGallery", "GetApps": next to a mark, or in tight places. */
  short: string;
  /** The Android stores take the same app; the App Store the iOS one. */
  platform: "android" | "ios";
  /** The publishing guide in the documentation, when there is one. */
  docs?: string;
}

export const STORE_FACTS: Record<AppStore, StoreFacts> = {
  google_play: { id: "google_play", name: "Google Play", short: "Google Play", platform: "android", docs: "/docs/google-play" },
  app_store: { id: "app_store", name: "Apple App Store", short: "App Store", platform: "ios", docs: "/docs/app-store" },
  galaxy_store: { id: "galaxy_store", name: "Samsung Galaxy Store", short: "Galaxy Store", platform: "android", docs: "/docs/galaxy-store" },
  appgallery: { id: "appgallery", name: "Huawei AppGallery", short: "AppGallery", platform: "android", docs: "/docs/huawei-appgallery" },
  // 42 Uploads to Xiaomi GetApps, on the same terms as Galaxy Store and AppGallery.
  getapps: { id: "getapps", name: "Xiaomi GetApps", short: "GetApps", platform: "android", docs: "/docs/xiaomi-getapps" },
};

/** The five stores in a sentence. */
export const ALL_STORES_TEXT = "Google Play, the App Store, Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps";
/** The four Android stores in a sentence. */
export const ANDROID_STORES_TEXT = "Google Play, Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps";
/** The Android stores beside Google Play in a sentence. */
export const MORE_ANDROID_STORES_TEXT = "Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps";

/** The stores an app on a plan with (or without) the iOS app can be on. */
export function storesFor(ios: boolean): AppStore[] {
  return APP_STORES.filter((id) => ios || STORE_FACTS[id].platform === "android");
}
