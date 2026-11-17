/**
 * 136 The files Firebase gives for a client's apps in Yallapp's projects,
 * made into the files the builds take (the same assets as a client's own:
 * `App.firebaseAndroidAssetId`, `firebaseIosAssetId` and the second app's
 * `DeliverySettings.courierFirebaseIosAssetId`).
 *
 * A project holds many clients' apps, and Firebase may put all of a
 * project's Android apps in each google-services.json: the file kept lists
 * only this client's packages (the customers' app and its bundle's second
 * apps), whatever Firebase gave, so no client's file names another's app.
 */

interface GoogleServicesClient {
  client_info?: { android_client_info?: { package_name?: string } };
  [key: string]: unknown;
}

interface GoogleServices {
  project_info?: unknown;
  client?: GoogleServicesClient[];
  configuration_version?: unknown;
  [key: string]: unknown;
}

const packageOf = (client: GoogleServicesClient) => client.client_info?.android_client_info?.package_name ?? null;

/**
 * One google-services.json for the client's packages, from the files
 * Firebase gave for each of its Android apps (the customers' first). Null
 * when none of them is a google-services.json with one of the packages.
 */
export function mergeGoogleServices(files: readonly string[], packages: readonly string[]): string | null {
  const wanted = new Set(packages);
  let base: GoogleServices | null = null;
  const clients = new Map<string, GoogleServicesClient>();
  for (const text of files) {
    let parsed: GoogleServices;
    try {
      parsed = JSON.parse(text) as GoogleServices;
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.client)) continue;
    base ??= parsed;
    for (const client of parsed.client) {
      const pkg = client && typeof client === "object" ? packageOf(client) : null;
      if (pkg && wanted.has(pkg) && !clients.has(pkg)) clients.set(pkg, client);
    }
  }
  if (!base || clients.size === 0) return null;
  // The clients in the order of the packages: the customers' app first.
  const ordered = packages.map((pkg) => clients.get(pkg)).filter((c): c is GoogleServicesClient => Boolean(c));
  return `${JSON.stringify({ ...base, client: ordered }, null, 2)}\n`;
}

/** The same file's text either way (spaces and line ends aside), so an unchanged file isn't saved again. */
export function sameFile(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return false;
  const tidy = (text: string) => text.replace(/\r\n/g, "\n").trim();
  return tidy(a) === tidy(b);
}
