import type { App } from "../data/types";

/**
 * 136.41 How the app's pushes are sent, as the plugin reads it in
 * `LicenseStatus.push` (docs/api/platform.yaml): "yallapp" through Yallapp's
 * Firebase, so the site relays them (`POST /push/send`); "own" with the
 * client's own Firebase from the site, as before (the default).
 */
export type PushSetup = "yallapp" | "own";

/**
 * 136.41 The app's push mode. TODO(136 phase 1): read `app.pushSetup` directly
 * once Phase 1's `apps.push_setup` column is merged; until then every app is
 * "own", so no site relays.
 */
export function pushSetupOf(app: App | null | undefined): PushSetup {
  const setup = (app as (App & { pushSetup?: string | null }) | null | undefined)?.pushSetup;
  return setup === "yallapp" ? "yallapp" : "own";
}
