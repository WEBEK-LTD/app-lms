import { readPngInfo } from "./png";

/**
 * Checks for files the client uploads for the stores and for push: screenshots
 * and Firebase config files. The Firebase rules mirror what the app's build
 * tool reads (mobile/tool/src/build_config_tool.dart), so a file accepted here
 * builds.
 */

export const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;
export const FIREBASE_MAX_BYTES = 64 * 1024;

export const SCREENSHOT_LIMITS = {
  /** Google Play: 2 to 8 phone screenshots. */
  phone: { min: 2, max: 8 },
  /** App Store: up to 10 iPhone 6.9" screenshots. */
  iphone: { min: 1, max: 10 },
} as const;

export type ScreenshotKind = keyof typeof SCREENSHOT_LIMITS;

/** iPhone 6.9" display sizes App Store Connect accepts, portrait and landscape. */
const IPHONE_SIZES = [
  [1320, 2868],
  [1290, 2796],
  [1260, 2736],
] as const;

export interface ImageInfo {
  width: number;
  height: number;
  contentType: "image/png" | "image/jpeg";
  hasTransparency: boolean;
}

/** Size of a baseline or progressive JPEG, read from its start-of-frame marker. */
export function readJpegInfo(data: Buffer): { width: number; height: number } | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) return null;
    const marker = data[offset + 1]!;
    // Fill bytes and markers without a length.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = data.readUInt16BE(offset + 2);
    // SOF0-SOF15, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

export function readImageInfo(data: Buffer): ImageInfo | null {
  const png = readPngInfo(data);
  if (png) return { width: png.width, height: png.height, contentType: "image/png", hasTransparency: png.hasTransparency };
  const jpeg = readJpegInfo(data);
  if (jpeg) return { ...jpeg, contentType: "image/jpeg", hasTransparency: false };
  return null;
}

/** Returns the image's content type, or the reason the store would refuse it. */
export function checkScreenshot(data: Buffer, kind: ScreenshotKind): { ok: true; contentType: ImageInfo["contentType"] } | { ok: false; error: string } {
  const image = readImageInfo(data);
  if (!image) return { ok: false, error: "Screenshots must be PNG or JPEG files." };
  if (image.hasTransparency) return { ok: false, error: "Screenshots can't have transparency. Export them with a solid background." };
  const { width, height } = image;
  if (kind === "phone") {
    const long = Math.max(width, height);
    const short = Math.min(width, height);
    if (short < 320 || long > 3840) return { ok: false, error: `Google Play needs each side between 320 and 3840 pixels. This one is ${width} × ${height}.` };
    if (long > short * 2) return { ok: false, error: `Google Play needs the long side to be at most twice the short side. This one is ${width} × ${height}.` };
  } else if (!IPHONE_SIZES.some(([a, b]) => (width === a && height === b) || (width === b && height === a))) {
    return { ok: false, error: `iPhone screenshots must be 1320 × 2868, 1290 × 2796 or 1260 × 2736 pixels. This one is ${width} × ${height}.` };
  }
  return { ok: true, contentType: image.contentType };
}

/** Checks google-services.json has the app for this Android package. */
export function checkGoogleServicesJson(source: string, androidPackage: string): string | null {
  let json: unknown;
  try {
    json = JSON.parse(source);
  } catch {
    return "This isn't a google-services.json file.";
  }
  const root = json as { project_info?: Record<string, unknown>; client?: unknown };
  const project = root.project_info;
  if (!project || typeof project.project_id !== "string" || typeof project.project_number !== "string" || !Array.isArray(root.client)) {
    return "This isn't a google-services.json file.";
  }
  const client = (root.client as Array<Record<string, unknown>>).find((entry) => {
    const info = entry?.client_info as { android_client_info?: { package_name?: unknown } } | undefined;
    return info?.android_client_info?.package_name === androidPackage;
  });
  if (!client) return `This file has no Android app for ${androidPackage}. Add an Android app with this package name in Firebase and download the file again.`;
  const appId = (client.client_info as { mobilesdk_app_id?: unknown }).mobilesdk_app_id;
  const keys = client.api_key as Array<{ current_key?: unknown }> | undefined;
  if (typeof appId !== "string" || !Array.isArray(keys) || typeof keys[0]?.current_key !== "string") {
    return "This google-services.json is incomplete. Download it again from Firebase › Project settings.";
  }
  return null;
}

function plistValue(source: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`<key>${escaped}</key>\\s*<string>([^<]*)</string>`).exec(source)?.[1] ?? null;
}

/** Checks GoogleService-Info.plist is for this iOS bundle ID. */
export function checkGoogleServiceInfoPlist(source: string, iosBundleId: string): string | null {
  if (!source.includes("<plist")) return "This isn't a GoogleService-Info.plist file.";
  for (const key of ["API_KEY", "GOOGLE_APP_ID", "GCM_SENDER_ID", "PROJECT_ID"]) {
    if (!plistValue(source, key)) return `This GoogleService-Info.plist has no ${key}. Download it again from Firebase › Project settings.`;
  }
  const bundleId = plistValue(source, "BUNDLE_ID");
  if (bundleId !== iosBundleId) {
    return `This file is for ${bundleId ?? "another app"}, not ${iosBundleId}. Add an iOS app with this bundle ID in Firebase and download the file again.`;
  }
  return null;
}
