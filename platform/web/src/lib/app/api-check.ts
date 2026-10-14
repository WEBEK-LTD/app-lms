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
  /** 19 `errors` probes phone sign-in, `email_errors` and `password_errors` the email endpoints. */
  id: "reachable" | "config" | "app_type" | "home" | "errors" | "email_errors" | "password_errors";
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
  // 19 How people sign in: phone, email or both.
  const signIn = readSignIn(auth);
  if (!signIn.ok) problems.push(...signIn.problems);
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
  const resolve = options.resolve ?? defaultResolve;
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
