import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { AppType } from "../data/types";

/**
 * Checks a client's own API against the parts of docs/api/openapi.yaml every
 * app needs before it can start: the config, the home screen for the app
 * type and the error shape. It is a quick sanity check, not a full contract
 * test; the developer guide lists everything the app calls.
 */

export interface ApiCheck {
  id: "reachable" | "config" | "app_type" | "home" | "errors";
  label: string;
  ok: boolean;
  detail?: string;
}

export interface ApiCheckResult {
  ok: boolean;
  checks: ApiCheck[];
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
type Resolve = (host: string) => Promise<string[]>;

const TIMEOUT_MS = 8000;

/** Loopback, private, link-local and other addresses the platform must never call. */
export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a = 0, b = 0] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v6 = address.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe8") || v6.startsWith("fe9") || v6.startsWith("fea") || v6.startsWith("feb");
}

async function defaultResolve(host: string): Promise<string[]> {
  if (isIP(host)) return [host];
  const records = await lookup(host, { all: true });
  return records.map((r) => r.address);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** What's missing from a `GET /config` response, by path. */
export function configProblems(config: unknown): string[] {
  if (!isObject(config)) return ["the response isn't a JSON object"];
  const problems: string[] = [];
  const need = (path: string, ok: boolean) => {
    if (!ok) problems.push(path);
  };
  const site = config.site;
  need("site.name", isObject(site) && typeof site.name === "string");
  need("site.url", isObject(site) && typeof site.url === "string");
  need("branding.primary_color", isObject(config.branding) && typeof config.branding.primary_color === "string");
  const features = config.features;
  need("features", isObject(features));
  const auth = config.auth;
  need("auth.signup_allowed", isObject(auth) && typeof auth.signup_allowed === "boolean");
  need("auth.signup_fields", isObject(auth) && Array.isArray(auth.signup_fields));
  need("auth.default_country_code", isObject(auth) && typeof auth.default_country_code === "string");
  need("purchases", isObject(config.purchases));
  need("content", isObject(config.content));
  const app = config.app;
  need("app.update_required", isObject(app) && typeof app.update_required === "boolean");
  need("app.maintenance", isObject(app) && typeof app.maintenance === "boolean");
  return problems;
}

async function getJson(fetcher: Fetch, url: string, init?: RequestInit): Promise<{ status: number; body: unknown }> {
  const response = await fetcher(url, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json", ...(init?.headers ?? {}) },
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  return { status: response.status, body };
}

const HOME_PATH: Record<AppType, string> = { lms: "/home", store: "/store/home", booking: "/bookings/home" };

/** What /config must have for each app type. */
const TYPE_CHECK: Record<AppType, { label: string; fix: string; ok: (config: Record<string, unknown>) => boolean }> = {
  lms: {
    label: "Config names the LMS",
    fix: "Set `features.lms`.",
    ok: (c) => isObject(c.features) && typeof c.features.lms === "string",
  },
  store: { label: "Config has the store settings", fix: "Add `store` to /config.", ok: (c) => isObject(c.store) },
  booking: { label: "Config has the bookings settings", fix: "Add `bookings` to /config.", ok: (c) => isObject(c.bookings) },
};

export async function checkApi(
  baseUrl: string,
  appType: AppType,
  options: { fetcher?: Fetch; resolve?: Resolve } = {},
): Promise<ApiCheckResult> {
  const fetcher = options.fetcher ?? fetch;
  const resolve = options.resolve ?? defaultResolve;
  const base = baseUrl.trim().replace(/\/+$/, "");
  const checks: ApiCheck[] = [];
  const done = (): ApiCheckResult => ({ ok: checks.every((c) => c.ok), checks });

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    checks.push({ id: "reachable", label: "The address is valid", ok: false, detail: "Enter a full https address." });
    return done();
  }
  if (url.protocol !== "https:" || url.search || url.hash) {
    checks.push({ id: "reachable", label: "The address is valid", ok: false, detail: "Use https, without ? or #." });
    return done();
  }
  try {
    const addresses = await resolve(url.hostname);
    if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
      checks.push({ id: "reachable", label: "Your API answers", ok: false, detail: "This address points to a private network." });
      return done();
    }
  } catch {
    checks.push({ id: "reachable", label: "Your API answers", ok: false, detail: "We couldn't find this host." });
    return done();
  }

  let config: { status: number; body: unknown };
  try {
    config = await getJson(fetcher, `${base}/config?platform=android&app_version=1.0.0`);
  } catch {
    checks.push({ id: "reachable", label: "Your API answers", ok: false, detail: "No answer within 8 seconds, or it redirected." });
    return done();
  }
  checks.push({ id: "reachable", label: "Your API answers", ok: true });

  const problems = config.status === 200 ? configProblems(config.body) : [`HTTP ${config.status}`];
  checks.push({
    id: "config",
    label: "GET /config matches the contract",
    ok: problems.length === 0,
    detail: problems.length ? `Missing or wrong: ${problems.slice(0, 6).join(", ")}` : undefined,
  });

  const body = isObject(config.body) ? config.body : {};
  const rule = TYPE_CHECK[appType];
  const typeOk = rule.ok(body);
  checks.push({ id: "app_type", label: rule.label, ok: typeOk, detail: typeOk ? undefined : rule.fix });

  try {
    const home = await getJson(fetcher, `${base}${HOME_PATH[appType]}`);
    const ok = home.status === 200 && isObject(home.body) && Array.isArray(home.body.sections);
    checks.push({
      id: "home",
      label: `GET ${HOME_PATH[appType]} returns sections`,
      ok,
      detail: ok ? undefined : `HTTP ${home.status}${home.body === undefined ? ", not JSON" : ""}`,
    });
  } catch {
    checks.push({ id: "home", label: `GET ${HOME_PATH[appType]} returns sections`, ok: false, detail: "No answer." });
  }

  try {
    const error = await getJson(fetcher, `${base}/auth/otp/request`, {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    });
    const ok =
      error.status >= 400 &&
      error.status < 500 &&
      isObject(error.body) &&
      typeof error.body.code === "string" &&
      typeof error.body.message === "string";
    checks.push({
      id: "errors",
      label: "Errors use the contract's shape",
      ok,
      detail: ok ? undefined : "POST /auth/otp/request with {} should answer 400 with `code` and `message`.",
    });
  } catch {
    checks.push({ id: "errors", label: "Errors use the contract's shape", ok: false, detail: "No answer." });
  }
  return done();
}
