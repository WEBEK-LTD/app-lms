import type { AppFirebaseApp, FirebaseAppPlatform, FirebaseAppVariant } from "../data/types";

/** 136 The variants of an app's bundle, the customers' app first. */
export const FIREBASE_VARIANTS: readonly FirebaseAppVariant[] = ["customer", "courier", "driver", "vendor", "staff"];
export const FIREBASE_PLATFORMS: readonly FirebaseAppPlatform[] = ["android", "ios"];

/** The order an app's registered apps are listed in: the customers' app first, Android before iOS. */
export function firebaseAppOrder(a: Pick<AppFirebaseApp, "variant" | "platform">, b: Pick<AppFirebaseApp, "variant" | "platform">): number {
  return FIREBASE_VARIANTS.indexOf(a.variant) - FIREBASE_VARIANTS.indexOf(b.variant) || FIREBASE_PLATFORMS.indexOf(a.platform) - FIREBASE_PLATFORMS.indexOf(b.platform);
}
