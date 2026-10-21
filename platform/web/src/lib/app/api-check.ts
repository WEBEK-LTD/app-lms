import { ENGINES, type EngineInfo } from "./kinds";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { AppType, SignInMethod } from "../data/types";

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

function isPrivateV4(a: number, b: number, c: number): boolean {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    // 69 IETF protocol assignments and the benchmarking range (sometimes used inside networks).
    (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** 69 The eight 16-bit groups of an IPv6 address (a dotted IPv4 tail included), or null. */
function ipv6Groups(address: string): number[] | null {
  let text = address.toLowerCase().replace(/%.*$/, "");
  const last = text.lastIndexOf(":");
  const tail = text.slice(last + 1);
  if (tail.includes(".")) {
    if (isIP(tail) !== 4) return null;
    const [a = 0, b = 0, c = 0, d = 0] = tail.split(".").map(Number);
    text = `${text.slice(0, last + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - rest.length : 0;
  if (fill < 0) return null;
  const groups = [...head, ...Array<string>(fill).fill("0"), ...rest].map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? Number.parseInt(g, 16) : Number.NaN));
  return groups.length === 8 && !groups.some(Number.isNaN) ? groups : null;
}

/**
 * Loopback, private, link-local and other addresses the platform must never call.
 * 69 IPv6 is read group by group, so an IPv4 address written inside one (mapped,
 * compatible, NAT64, 6to4, in hex or dotted form) is checked as that IPv4 address.
 */
export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a = 0, b = 0, c = 0] = address.split(".").map(Number);
    return isPrivateV4(a, b, c);
  }
  if (version !== 6) return false;
  const g = ipv6Groups(address);
  if (!g) return true;
  const v4 = (high: number, low: number) => isPrivateV4(high >> 8, high & 0xff, low >> 8);
  const zeros = (from: number, to: number) => g.slice(from, to).every((x) => x === 0);
  // ::, ::1 and IPv4-compatible (::a.b.c.d); ::ffff:a.b.c.d (mapped) and ::ffff:0:a.b.c.d (translated).
  if (zeros(0, 6)) return g[6] === 0 || v4(g[6]!, g[7]!);
  if (zeros(0, 5) && g[5] === 0xffff) return v4(g[6]!, g[7]!);
  if (zeros(0, 4) && g[4] === 0xffff && g[5] === 0) return v4(g[6]!, g[7]!);
  // NAT64 (64:ff9b::/96, and the local-use 64:ff9b:1::/48).
  if (g[0] === 0x64 && g[1] === 0xff9b) return zeros(2, 6) ? v4(g[6]!, g[7]!) : true;
  // 6to4 (2002::/16) carries an IPv4 address in its next 32 bits.
  if (g[0] === 0x2002) return v4(g[1]!, g[2]!);
  // Teredo (2001::/32) tunnels to an IPv4 address hidden in the rest.
  if (g[0] === 0x2001 && g[1] === 0) return true;
  // Discard-only (100::/64), unique local (fc00::/7), link-local (fe80::/10), site-local (fec0::/10), multicast (ff00::/8).
  if (g[0] === 0x100 && zeros(1, 4)) return true;
  return (g[0]! & 0xfe00) === 0xfc00 || (g[0]! & 0xffc0) === 0xfe80 || (g[0]! & 0xffc0) === 0xfec0 || (g[0]! & 0xff00) === 0xff00;
}

/**
 * 69 Why a host must not be called: it doesn't resolve, or it points (also)
 * to a private address. Null when every address it has is public.
 */
export async function privateHostProblem(host: string, resolve: Resolve = resolveHost): Promise<"unresolved" | "private" | null> {
  let addresses: string[];
  try {
    addresses = await resolve(host.replace(/^\[|\]$/g, ""));
  } catch {
    return "unresolved";
  }
  if (addresses.length === 0) return "unresolved";
  return addresses.some(isPrivateAddress) ? "private" : null;
}

/** The addresses a host name points to (an IP address stands for itself). 24 Also checks the owner's email server. */
export async function resolveHost(host: string): Promise<string[]> {
  if (isIP(host)) return [host];
  const records = await lookup(host, { all: true });
  return records.map((r) => r.address);
}

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
  const fetcher = options.fetcher ?? fetch;
  const resolve = options.resolve ?? resolveHost;
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
  const fetcher = options.fetcher ?? fetch;
  const resolve = options.resolve ?? resolveHost;
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
