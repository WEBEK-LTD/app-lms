import { isPrivateAddress, resolveHost } from "../app/api-check";
import { pinnedFetch } from "../net/safe-fetch";
import type { App, LinksCheckItem, LinksCheckSnapshot } from "../data/types";
import { appleAppId, fingerprintsOf } from "./well-known";
import { siteLinkBase } from "./table";

/**
 * 46 "Check links" on the dashboard: whether phones will open the app's links
 * in the app. Yallapp's link domain serves its files from what the app has
 * (so those checks read the app); a WordPress site's files are fetched from
 * the site, the way Android and Apple fetch them: https, at the domain's
 * root, no redirect, JSON. Never a private address, 8 seconds, 256 kB.
 */

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
type Resolve = (host: string) => Promise<string[]>;

const TIMEOUT_MS = 8000;
const MAX_BYTES = 256 * 1024;

export class LinkFileError extends Error {}

async function readLimited(response: Response): Promise<string> {
  const length = Number(response.headers.get("content-length") ?? "");
  if (Number.isFinite(length) && length > MAX_BYTES) throw new LinkFileError("The file is larger than 256 kB.");
  const text = await response.text();
  if (text.length > MAX_BYTES) throw new LinkFileError("The file is larger than 256 kB.");
  return text;
}

/** Fetches one link file as the phones do; throws LinkFileError with words for the owner. */
export async function fetchLinkFile(url: string, options: { fetcher?: Fetch; resolve?: Resolve } = {}): Promise<unknown> {
  const parsed = new URL(url);
  let addresses: string[];
  const resolve = options.resolve ?? resolveHost;
  try {
    addresses = await resolve(parsed.hostname);
  } catch {
    throw new LinkFileError("We couldn't find this site.");
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) throw new LinkFileError("This address points to a private network.");
  let response: Response;
  try {
    // 70 Connects only to an address checked like the one above (lib/net/safe-fetch.ts).
    response = await pinnedFetch(options.fetcher, resolve)(url, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: "application/json" } });
  } catch {
    throw new LinkFileError("No answer within 8 seconds.");
  }
  if (response.status >= 300 && response.status < 400) throw new LinkFileError("It redirects to another address. Phones don't follow redirects for this file.");
  if (response.status === 404) throw new LinkFileError("Not found (404). Update the Yallapp plugin on the site, and make sure the server passes /.well-known to WordPress.");
  if (response.status !== 200) throw new LinkFileError(`The site answered with an error (${response.status}).`);
  const type = response.headers.get("content-type") ?? "";
  if (!/json/i.test(type)) throw new LinkFileError(`It's served as "${type || "no type"}", not as JSON.`);
  const text = await readLimited(response);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new LinkFileError("It isn't valid JSON.");
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** What's wrong with an assetlinks.json for this package and these fingerprints, or null. */
export function assetLinksProblem(body: unknown, packageName: string, fingerprints: string[]): string | null {
  if (!Array.isArray(body)) return "It isn't a list of statements.";
  const statement = body.find(
    (s) =>
      isObject(s) &&
      Array.isArray(s.relation) &&
      s.relation.includes("delegate_permission/common.handle_all_urls") &&
      isObject(s.target) &&
      s.target.namespace === "android_app" &&
      s.target.package_name === packageName,
  ) as { target: { sha256_cert_fingerprints?: unknown } } | undefined;
  if (!statement) return `It doesn't name the app's package, ${packageName}.`;
  const listed = Array.isArray(statement.target.sha256_cert_fingerprints) ? statement.target.sha256_cert_fingerprints.map((f) => String(f).toUpperCase()) : [];
  const missing = fingerprints.filter((f) => !listed.includes(f));
  if (missing.length) return `It's missing ${missing.length === 1 ? "a fingerprint" : `${missing.length} fingerprints`}: the site hasn't checked its license since the last change. Use "Check now" in the plugin's settings.`;
  return null;
}

/** Whether an apple-app-site-association lets this app open `<path>*`, or what's wrong. */
export function appleAssociationProblem(body: unknown, appId: string, path: string): string | null {
  if (!isObject(body) || !isObject(body.applinks) || !Array.isArray(body.applinks.details)) return "It has no applinks details.";
  const details = body.applinks.details.filter(
    (d) => isObject(d) && ((Array.isArray(d.appIDs) && d.appIDs.includes(appId)) || d.appID === appId),
  ) as Record<string, unknown>[];
  if (!details.length) return `It doesn't name the app, ${appId}.`;
  const wanted = `${path}*`;
  const covers = details.some(
    (d) =>
      (Array.isArray(d.components) && d.components.some((c) => isObject(c) && c["/"] === wanted && c.exclude !== true)) ||
      (Array.isArray(d.paths) && d.paths.includes(wanted)),
  );
  return covers ? null : `It doesn't open ${wanted} in the app.`;
}

export interface LinksCheckOptions {
  fetcher?: Fetch;
  resolve?: Resolve;
  /** The app's plan builds the iOS app. */
  ios: boolean;
  now: Date;
}

/** Runs every check for an app: its signing facts, then a WordPress site's two files. */
export async function checkAppLinks(app: App, options: LinksCheckOptions): Promise<LinksCheckSnapshot> {
  const checks: LinksCheckItem[] = [];
  const target = {
    id: app.id,
    androidPackage: app.androidPackage,
    iosBundleId: app.iosBundleId,
    playSigningSha256: app.playSigningSha256 ?? null,
    androidUploadSha256: app.androidUploadSha256 ?? null,
    appleTeamId: app.appleTeamId ?? null,
  };
  checks.push({
    id: "play_signing",
    label: "Google Play's signing key fingerprint",
    ok: Boolean(app.playSigningSha256),
    detail: app.playSigningSha256 ? undefined : "Add it below. Without it, the app from Google Play opens links in the browser.",
  });
  checks.push({
    id: "upload_key",
    label: "Your upload key's fingerprint",
    ok: Boolean(app.androidUploadSha256),
    detail: app.androidUploadSha256 ? undefined : "It's added with your next build.",
  });
  const appleId = appleAppId(target);
  if (options.ios) {
    checks.push({
      id: "team_id",
      label: "Apple Team ID",
      ok: appleId !== null,
      detail: appleId ? undefined : app.iosBundleId ? "Add it below, or it's added with your next iOS build." : "Add the iOS bundle ID in App setup › Store listing.",
    });
  }

  const base = app.backend === "wordpress" ? siteLinkBase(app.siteUrl) : null;
  if (app.backend === "wordpress") {
    if (!base) {
      checks.push({ id: "site", label: "Your website's address", ok: false, detail: "Links on your website need an https address." });
    } else {
      const site = new URL(base);
      const root = `https://${site.host}`;
      const sitePath = site.pathname.replace(/\/a$/, "");
      if (sitePath) {
        checks.push({
          id: "site_root",
          label: "Your website is at the root of its domain",
          ok: false,
          detail: `WordPress is in ${sitePath}, so it can't serve files at ${root}/.well-known. Links on Yallapp's domain still work.`,
        });
      }
      const fingerprints = fingerprintsOf(target);
      if (app.androidPackage && fingerprints.length) {
        checks.push(await fileCheck("site_android", `${root}/.well-known/assetlinks.json`, options, (body) => assetLinksProblem(body, app.androidPackage!, fingerprints)));
      }
      if (options.ios && appleId) {
        checks.push(
          await fileCheck("site_ios", `${root}/.well-known/apple-app-site-association`, options, (body) => appleAssociationProblem(body, appleId, `${sitePath}/a/`)),
        );
      }
    }
  }
  return { at: options.now.toISOString(), ok: checks.every((c) => c.ok), checks };
}

async function fileCheck(id: string, url: string, options: LinksCheckOptions, problem: (body: unknown) => string | null): Promise<LinksCheckItem> {
  const label = url.replace(/^https:\/\//, "");
  try {
    const found = problem(await fetchLinkFile(url, options));
    return found ? { id, label, ok: false, detail: found } : { id, label, ok: true };
  } catch (error) {
    return { id, label, ok: false, detail: error instanceof LinkFileError ? error.message : "We couldn't read it." };
  }
}
