import type { App } from "../data/types";
import { usesYallappFirebase } from "../firebase/mode";
import { compareVersions } from "../semver";

/**
 * 136.41 How the app's pushes are sent, as the plugin reads it in
 * `LicenseStatus.push` (docs/api/platform.yaml): "yallapp" through Yallapp's
 * Firebase, so the site relays them (`POST /push/send`); "own" with the
 * client's own Firebase from the site, as before (the default).
 */
export type PushSetup = "yallapp" | "own";

/** 136.41 The app's push mode: "yallapp" when it's in Yallapp's Firebase (lib/firebase/mode.ts), else "own". */
export function pushSetupOf(app: App | null | undefined): PushSetup {
  return app && usesYallappFirebase(app) ? "yallapp" : "own";
}

/** 136.45 The first plugin that relays pushes (`LicenseStatus.push`, `POST /push/send`). */
export const RELAY_PLUGIN_VERSION = "0.4.49";

/** 136.45 Whether a site's plugin version relays pushes; an unknown version doesn't. */
export function pluginRelaysPush(version: string | null | undefined): boolean {
  return typeof version === "string" && /^\d+\.\d+\.\d+/.test(version) && compareVersions(version, RELAY_PLUGIN_VERSION) >= 0;
}
