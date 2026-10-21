import { ENGINES, type EngineInfo } from "./kinds";
import type { AppType, SignInMethod } from "../data/types";
import { isPrivateAddress, resolveHost } from "../net/addresses";
import { pinnedFetch } from "../net/safe-fetch";

// 69, 70 The address checks moved to lib/net/addresses.ts; kept here for the code that imports them from this file.
export { isPrivateAddress, privateHostProblem, resolveHost } from "../net/addresses";

/**
 * Checks a client's own API against the parts of docs/api/openapi.yaml every
 * app needs before it can start: the config, the home screen for the app
 * type and the error shape. It is a quick sanity check, not a full contract
 * test; the developer guide lists everything the app calls.
 */

export interface ApiCheck {
  /**
   * 19 `errors` probes phone sign-in, `email_errors` and `password_errors` the email endpoints.
   * 34 When Yallapp signs people in: `no_token` (a signed-in call without a token answers 401) and `test_token` (with a test token, 200).
   */
  id: "reachable" | "config" | "app_type" | "home" | "errors" | "email_errors" | "password_errors" | "no_token" | "test_token";
  label: string;
  ok: boolean;
  detail?: string;
}

export interface ApiCheckResult {
  ok: boolean;
  checks: ApiCheck[];
  /** 19 How the API signs people in, as its /config says (when /config answered with valid sign-in settings). */
  signIn?: ApiSignIn;
}

/** 19 `Config.auth`'s sign-in settings: `methods` (missing means phone) and `email_sign_in`. */
export interface ApiSignIn {
  methods: SignInMethod[];
  emailSignIn: "code" | "password" | null;
  previewSignIn: boolean;
}

/**
 * 19 The sign-in settings in a /config's `auth`, or the problems with them:
 * `methods` only "phone" and "email" and not empty (missing means phone),
 * `email_sign_in` "code" or "password", and required when email is offered.
 */
export function readSignIn(auth: unknown): { ok: true; value: ApiSignIn } | { ok: false; problems: string[] } {
  const value = isObject(auth) ? auth : {};
  const problems: string[] = [];
  let methods: SignInMethod[] = ["phone"];
  if (value.methods !== undefined) {
    const list = value.methods;
    if (!Array.isArray(list) || list.length === 0 || !list.every((m) => m === "phone" || m === "email") || new Set(list).size !== list.length) {
      problems.push('auth.methods (a list of "phone" and/or "email")');
    } else {
      methods = list as SignInMethod[];
    }
  }
  const raw = value.email_sign_in;
  const emailSignIn = raw === "code" || raw === "password" ? raw : null;
  if (raw !== undefined && raw !== null && emailSignIn === null) problems.push('auth.email_sign_in ("code" or "password")');
  else if (methods.includes("email") && emailSignIn === null) problems.push('auth.email_sign_in ("code" or "password", needed with email)');
  if (problems.length) return { ok: false, problems };
  return { ok: true, value: { methods, emailSignIn: methods.includes("email") ? emailSignIn : null, previewSignIn: value.preview_sign_in === true } };
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
type Resolve = (host: string) => Promise<string[]>;

const TIMEOUT_MS = 8000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 34 A signed-in endpoint every API of this app type serves, for the token
 * checks when Yallapp signs people in: an Academy's courses, a Bookings app's
 * appointments, a Store's orders (only when `features.orders` is on, when the
 * config is known). Null for types without one (News).
 */
export function signedInPath(appType: AppType, features?: unknown): string | null {
  if (appType === "lms") return "/me/courses";
  if (appType === "booking") return "/me/appointments";
  if (appType === "store") return features === undefined || (isObject(features) && features.orders === true) ? "/me/orders" : null;
  return null;
}

/** What's missing from a `GET /config` response, by path. 34 When Yallapp signs people in, `auth` is Yallapp's: not checked. */
export function configProblems(config: unknown, options: { yallappSignIn?: boolean } = {}): string[] {
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
  if (!options.yallappSignIn) {
    need("auth.signup_allowed", isObject(auth) && typeof auth.signup_allowed === "boolean");
    need("auth.signup_fields", isObject(auth) && Array.isArray(auth.signup_fields));
    need("auth.default_country_code", isObject(auth) && typeof auth.default_country_code === "string");
    // 19 How people sign in: phone, email or both.
    const signIn = readSignIn(auth);
    if (!signIn.ok) problems.push(...signIn.problems);
  }
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

/**
 * A list (`{ items: [...] }`) from a client's own API, read the way the app
 * reads it: https only, never a private address, no redirects, 8 seconds at
 * most. An empty list when anything goes wrong.
 */
export async function readApiList(
  baseUrl: string,
  path: string,
  options: { fetcher?: Fetch; resolve?: Resolve } = {},
): Promise<Record<string, unknown>[]> {
  const resolve = options.resolve ?? resolveHost;
  // 70 The connection goes to the address checked here (lib/net/safe-fetch.ts).
  const fetcher = pinnedFetch(options.fetcher, resolve);
  const base = baseUrl.trim().replace(/\/+$/, "");
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" || url.search || url.hash) return [];
    const addresses = await resolve(url.hostname);
    if (addresses.length === 0 || addresses.some(isPrivateAddress)) return [];
    const { status, body } = await getJson(fetcher, `${base}${path}`);
    const items = status === 200 && isObject(body) ? body.items : null;
    return Array.isArray(items) ? items.filter(isObject) : [];
  } catch {
    return [];
  }
}

/** What /config must have for the app's engine (lib/app/kinds.ts). */
function typeCheckOk(rule: EngineInfo["configCheck"], config: Record<string, unknown>): boolean {
  const within = rule.in === "features" ? config.features : config;
  if (!isObject(within)) return false;
  const value = within[rule.key];
  return rule.type === "string" ? typeof value === "string" : isObject(value);
}

export async function checkApi(
  baseUrl: string,
  appType: AppType,
  options: {
    fetcher?: Fetch;
    resolve?: Resolve;
    /**
     * 34 Yallapp signs people in: the API serves no sign-in endpoints, and a
     * signed-in call answers 401 without a token and 200 with `token` (a test
     * token of the store review account; that check is left out without one).
     */
    yallappSignIn?: { token: string | null } | null;
  } = {},
): Promise<ApiCheckResult> {
  const resolve = options.resolve ?? resolveHost;
  // 70 The connection goes to the address checked here (lib/net/safe-fetch.ts).
  const fetcher = pinnedFetch(options.fetcher, resolve);
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

  const yallapp = options.yallappSignIn ?? null;
  const problems = config.status === 200 ? configProblems(config.body, { yallappSignIn: Boolean(yallapp) }) : [`HTTP ${config.status}`];
  checks.push({
    id: "config",
    label: "GET /config matches the contract",
    ok: problems.length === 0,
    detail: problems.length ? `Missing or wrong: ${problems.slice(0, 6).join(", ")}` : undefined,
  });

  const body = isObject(config.body) ? config.body : {};
  const engine = ENGINES[appType];
  const rule = engine.configCheck;
  const typeOk = typeCheckOk(rule, body);
  checks.push({ id: "app_type", label: rule.label, ok: typeOk, detail: typeOk ? undefined : rule.fix });

  try {
    const home = await getJson(fetcher, `${base}${engine.homePath}`);
    const ok = home.status === 200 && isObject(home.body) && Array.isArray(home.body.sections);
    checks.push({
      id: "home",
      label: `GET ${engine.homePath} returns sections`,
      ok,
      detail: ok ? undefined : `HTTP ${home.status}${home.body === undefined ? ", not JSON" : ""}`,
    });
  } catch {
    checks.push({ id: "home", label: `GET ${engine.homePath} returns sections`, ok: false, detail: "No answer." });
  }

  // 34 Yallapp signs people in: the API checks Yallapp's tokens instead of serving sign-in.
  if (yallapp) {
    await checkTokens(fetcher, base, signedInPath(appType, body.features), yallapp.token, checks);
    return done();
  }

  // 19 The sign-in endpoints the API offers (phone when /config doesn't say), each with an empty body.
  const signIn = readSignIn(body.auth);
  const offered: ApiSignIn = signIn.ok ? signIn.value : { methods: ["phone"], emailSignIn: null, previewSignIn: false };
  const probes: { id: ApiCheck["id"]; path: string }[] = [];
  if (offered.methods.includes("phone")) probes.push({ id: "errors", path: "/auth/otp/request" });
  if (offered.methods.includes("email") && offered.emailSignIn === "code") probes.push({ id: "email_errors", path: "/auth/email/request" });
  if (offered.methods.includes("email") && offered.emailSignIn === "password") probes.push({ id: "password_errors", path: "/auth/password" });
  for (const probe of probes) {
    const label = probes.length === 1 ? "Errors use the contract's shape" : `POST ${probe.path} errors use the contract's shape`;
    try {
      const error = await getJson(fetcher, `${base}${probe.path}`, {
        method: "POST",
        body: "{}",
        headers: { "content-type": "application/json" },
      });
      // 19 A sign-in endpoint that isn't there (404, 405) fails, even with the error shape.
      const missing = error.status === 404 || error.status === 405;
      const ok =
        !missing &&
        error.status >= 400 &&
        error.status < 500 &&
        isObject(error.body) &&
        typeof error.body.code === "string" &&
        typeof error.body.message === "string";
      const detail = missing
        ? `POST ${probe.path} answered ${error.status}. Serve it, or don't offer this sign-in in /config.`
        : `POST ${probe.path} with {} should answer 400 with \`code\` and \`message\`.`;
      checks.push({ id: probe.id, label, ok, detail: ok ? undefined : detail });
    } catch {
      checks.push({ id: probe.id, label, ok: false, detail: "No answer." });
    }
  }
  if (config.status === 200 && signIn.ok) return { ...done(), signIn: signIn.value };
  return done();
}

/** 34 A signed-in call answers 401 without a token, and 200 with the test token. */
async function checkTokens(fetcher: Fetch, base: string, path: string | null, token: string | null, checks: ApiCheck[]): Promise<void> {
  if (!path) return;
  const noTokenLabel = `GET ${path} without a token answers 401`;
  try {
    const answer = await getJson(fetcher, `${base}${path}`);
    const ok = answer.status === 401;
    checks.push({ id: "no_token", label: noTokenLabel, ok, detail: ok ? undefined : `It answered ${answer.status}. Answer 401 when the token is missing, expired or not Yallapp's.` });
  } catch {
    checks.push({ id: "no_token", label: noTokenLabel, ok: false, detail: "No answer." });
  }
  if (!token) return;
  const label = `GET ${path} with a test token from Yallapp answers 200`;
  try {
    const answer = await getJson(fetcher, `${base}${path}`, { headers: { authorization: `Bearer ${token}` } });
    const ok = answer.status === 200;
    checks.push({
      id: "test_token",
      label,
      ok,
      detail: ok ? undefined : `It answered ${answer.status}. Check the token's signature with the app's public keys, and its iss, aud and exp (see the developer guide).`,
    });
  } catch {
    checks.push({ id: "test_token", label, ok: false, detail: "No answer." });
  }
}
