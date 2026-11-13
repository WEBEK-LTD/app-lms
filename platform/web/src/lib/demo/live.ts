/**
 * 128.9 The real demo app in the phone on /start/<demo> (components in
 * src/app/start/live-phone.tsx): when it loads, and when it is ready to take
 * the screenshot's place. No imports, so the page's script stays small.
 */

/** The phone the app preview runs in, in CSS pixels: the size the screenshots are taken at (1080 × 2340 at 3×). */
export const LIVE_PHONE = { width: 360, height: 780 } as const;

/** What the browser tells about itself, for when the live app loads. */
export interface LiveDevice {
  /** A wide screen (768 CSS pixels or more) with a mouse or trackpad. */
  desktop: boolean;
  /** The visitor asked for less data (Save-Data), or the connection is 2G. */
  saveData: boolean;
  /** prefers-reduced-motion: reduce. */
  reducedMotion: boolean;
}

/**
 * When the live app loads: by itself once the phone is in view on a
 * desktop ("view"), or only when the visitor taps "Try it live" ("tap"): on
 * a phone (the app preview is ~10 MB), when data is saved, and when the
 * visitor asked for less motion (nothing starts moving by itself).
 */
export function liveStart(device: LiveDevice): "view" | "tap" {
  return device.desktop && !device.saveData && !device.reducedMotion ? "view" : "tap";
}

/** A resource the app preview fetched (PerformanceResourceTiming, the fields read). */
export interface FetchedResource {
  name: string;
  responseEnd: number;
}

/**
 * Whether the app preview has its pages: the hosted API's
 * `/api/app/<id>/pages` answered. The app draws its first page right after,
 * so the screenshot can give way to it then (never to a blank or loading app).
 */
export function previewHasPages(resources: readonly FetchedResource[], appId: string): boolean {
  const path = `/api/app/${appId}/pages`;
  return resources.some((r) => {
    try {
      return new URL(r.name, "http://x").pathname === path && r.responseEnd > 0;
    } catch {
      return false;
    }
  });
}
