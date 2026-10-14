import { createHash } from "node:crypto";
import { BOOKING_STATUS_LABELS } from "../../bookings/setup";
import { addDays, isDate, isTimeZone, localToUtc, utcToLocal } from "../../bookings/time";
import type { BookingStatus, HostedUser } from "../../data/types";
import { descriptionHtml } from "./catalog";
import { error, intParam } from "./common";
import { registerPlatform, type PlatformConnector, type PlatformDefinition } from "./platforms";
import { ConnectorError, type ConnectorRequest, type ConnectorResult } from "./types";

/**
 * SimplyBook.me for Bookings apps, through its JSON-RPC 2.0 API
 * (positional params). Services, providers and free times come from the
 * company public service (`https://<host>/`, headers X-Company-Login and
 * X-Token from getToken with the public API key). Bookings go through the
 * company administration service (`https://<host>/admin`, X-User-Token from
 * getUserToken with an API user key), so the anti-fraud captcha of the public
 * `book` doesn't block bookings made by the server, and so the customer's own
 * bookings can be listed and cancelled without the secret key.
 *
 * The customer is the SimplyBook client with exactly the phone number they
 * signed in with (found with getClientList, created with addClient). Service,
 * provider, category, client and booking IDs are SimplyBook's numeric IDs.
 * Dates and times on SimplyBook are in the company's time zone; the app gets
 * UTC instants with the local date and time.
 *
 * Limits: common SimplyBook servers allow 5 requests a second, 2 at a time
 * and 5,000 a day, so requests are queued per company, tokens are kept for
 * 50 minutes (they last an hour), the catalog for 5 minutes and free times
 * for a minute.
 */

type Fetch = typeof fetch;

export const SIMPLYBOOK_DEFAULT_HOST = "user-api.simplybook.me";
const TOKEN_MS = 50 * 60_000;
const CATALOG_MS = 5 * 60_000;
const MATRIX_MS = 60_000;
const CLIENT_MS = 10 * 60_000;
const TIMEOUT_MS = 10_000;

// The app's booking rules. Unverified: SimplyBook keeps its own limits (how
// far ahead, how soon, cancellation) in company settings that the documented
// API doesn't expose, so these are defaults. SimplyBook's start time matrix
// already applies the company's own limits, so the app only offers times
// SimplyBook allows.
/** How far ahead the app offers times. */
const MAX_DAYS_AHEAD = 60;
/** SimplyBook's matrix leaves out times that are too soon; the connector only drops times already past. */
const MIN_MINUTES_AHEAD = 0;
/** Customers can cancel in the app up to a day before. */
const CANCEL_BEFORE_MINUTES = 24 * 60;

/** JSON-RPC error codes that mean the account or its keys don't work, not that a booking failed. */
const ACCOUNT_ERRORS = new Set([-33001, -33002, -33003, -33004, -33005, -32001, -32600, -32601]);
/** Errors about the company or its keys, which no other method avoids. */
const KEY_ERRORS = new Set([-33001, -33002, -33003, -33004, -33005, -32600]);
const NOT_FOUND = -32080;
const FEATURE_OFF = -32001;

export interface SimplyBookSettings {
  companyLogin: string;
  /** The public API key (Custom Features > API > Settings). */
  apiKey: string;
  /** An admin user, or the user made for the API. */
  userLogin: string;
  /** That user's API user key or password. */
  userKey: string;
  /** "user-api.simplybook.me", or the API host of another SimplyBook domain. */
  apiHost: string;
}

export interface SimplyBookOptions {
  /** Requests a second per company (SimplyBook allows 5 on common servers). */
  perSecond?: number;
  /** Requests at the same time per company (SimplyBook allows 2). */
  parallel?: number;
}

// Typed values

/** The company login from what a client typed ("mycompany", "https://mycompany.simplybook.me/v2/"). */
export function normalizeCompanyLogin(value: string): string | null {
  let login = value.trim().toLowerCase().replace(/^https?:\/\//, "").split(/[/?#]/)[0] ?? "";
  const site = /^([a-z0-9][a-z0-9_-]*)\.(?:[a-z0-9-]+\.)?simplybook\.[a-z]{2,10}$/.exec(login);
  if (site) login = site[1]!;
  if (login === "www" || login.startsWith("user-api")) return null;
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(login) ? login : null;
}

/**
 * The API host from what a client typed; the default when it's empty. Only
 * SimplyBook's own domains are accepted, so the keys never go elsewhere.
 */
export function normalizeApiHost(value: string): string | null {
  const host = value.trim().toLowerCase().replace(/^https?:\/\//, "").split(/[/?#]/)[0] ?? "";
  if (!host) return SIMPLYBOOK_DEFAULT_HOST;
  return /^(?:[a-z0-9-]+\.)*simplybook\.[a-z]{2,10}$/.test(host) ? host : null;
}

// Client

/** An error SimplyBook answered with: a JSON-RPC error code, or an HTTP status. */
export class SimplyBookError extends ConnectorError {
  constructor(
    message: string,
    readonly code: number | null,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = "SimplyBookError";
  }
}

const isApiError = (e: unknown, code?: number): e is SimplyBookError =>
  e instanceof SimplyBookError && e.code !== null && (code === undefined || e.code === code);

/** Whether a token has expired or was refused. Unverified: SimplyBook documents no code for an expired token; -32600 is "Access denied". */
function isAuthError(e: unknown): boolean {
  if (!(e instanceof SimplyBookError)) return false;
  return e.status === 401 || e.status === 403 || e.code === -32600 || /token/i.test(e.message);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** At most `perSecond` request starts in any second and `parallel` requests at once. */
class Limiter {
  private starts: number[] = [];
  private running = 0;
  private waiting: (() => void)[] = [];

  constructor(
    private readonly perSecond: number,
    private readonly parallel: number,
  ) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.running--;
      this.waiting.shift()?.();
    }
  }

  private async acquire(): Promise<void> {
    for (;;) {
      if (this.running >= this.parallel) {
        await new Promise<void>((resolve) => this.waiting.push(resolve));
        continue;
      }
      const now = Date.now();
      this.starts = this.starts.filter((t) => now - t < 1000);
      if (this.starts.length < this.perSecond) {
        this.running++;
        this.starts.push(now);
        return;
      }
      await sleep(1000 - (now - this.starts[0]!));
    }
  }
}

const limiters = new Map<string, Limiter>();
const tokens = new Map<string, { at: number; token: Promise<string> }>();
const cache = new Map<string, { until: number; value: Promise<unknown> }>();
const queues = new Map<string, Promise<unknown>>();

const sha = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 16);

type Endpoint = "public" | "admin";

export class SimplyBookClient {
  private readonly limiter: Limiter;
  private nextId = 0;

  constructor(
    private readonly settings: SimplyBookSettings,
    private readonly fetcher: Fetch = fetch,
    options: SimplyBookOptions = {},
  ) {
    const perSecond = options.perSecond ?? 5;
    const parallel = options.parallel ?? 2;
    const key = `${settings.apiHost}|${settings.companyLogin}|${perSecond}|${parallel}`;
    let limiter = limiters.get(key);
    if (!limiter) {
      limiter = new Limiter(perSecond, parallel);
      limiters.set(key, limiter);
    }
    this.limiter = limiter;
  }

  private post(path: "" | "login" | "admin", method: string, params: unknown[], headers: Record<string, string>): Promise<unknown> {
    return this.limiter.run(async () => {
      let response: Response;
      try {
        response = await this.fetcher(`https://${this.settings.apiHost}/${path}`, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json", ...headers },
          body: JSON.stringify({ jsonrpc: "2.0", method, params, id: ++this.nextId }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        throw new ConnectorError("SimplyBook didn't answer.");
      }
      const body = (await response.json().catch(() => null)) as { result?: unknown; error?: { code?: unknown; message?: unknown } } | null;
      if (body?.error) {
        const code = Number(body.error.code);
        throw new SimplyBookError(
          typeof body.error.message === "string" && body.error.message ? body.error.message : "SimplyBook answered with an error.",
          Number.isFinite(code) ? code : null,
          response.status,
        );
      }
      if (!response.ok) throw new SimplyBookError(`SimplyBook answered HTTP ${response.status}.`, null, response.status);
      if (!body || !("result" in body)) throw new ConnectorError("SimplyBook sent no data.");
      return body.result;
    });
  }

  private tokenKey(service: Endpoint): string {
    const { apiHost, companyLogin, apiKey, userLogin, userKey } = this.settings;
    return service === "public" ? `${apiHost}|${companyLogin}|public|${sha(apiKey)}` : `${apiHost}|${companyLogin}|admin|${userLogin}|${sha(userKey)}`;
  }

  /** A token from the login service, shared while it's fresh; `stale` is one that was just refused. */
  token(service: Endpoint, stale?: Promise<string>): Promise<string> {
    const key = this.tokenKey(service);
    const hit = tokens.get(key);
    if (hit && Date.now() - hit.at < TOKEN_MS && hit.token !== stale) return hit.token;
    const { companyLogin, apiKey, userLogin, userKey } = this.settings;
    const token = (async () => {
      const result =
        service === "public"
          ? await this.post("login", "getToken", [companyLogin, apiKey], {})
          : await this.post("login", "getUserToken", [companyLogin, userLogin, userKey], {});
      if (typeof result !== "string" || !result) throw new ConnectorError("SimplyBook sent no token.");
      return result;
    })();
    tokens.set(key, { at: Date.now(), token });
    token.catch(() => {
      if (tokens.get(key)?.token === token) tokens.delete(key);
    });
    return token;
  }

  /** Calls a method of the public or the admin service; renews the token once when it's refused. */
  async call<T = unknown>(service: Endpoint, method: string, params: unknown[] = []): Promise<T> {
    const send = async (token: string) =>
      (await this.post(service === "public" ? "" : "admin", method, params, {
        "X-Company-Login": this.settings.companyLogin,
        [service === "public" ? "X-Token" : "X-User-Token"]: token,
      })) as T;
    const token = this.token(service);
    try {
      return await send(await token);
    } catch (e) {
      if (!isAuthError(e)) throw e;
      return send(await this.token(service, token));
    }
  }
}

// Reading SimplyBook's values (types vary: numbers often come as strings)

type Raw = Record<string, unknown>;

/** The items of a result that is an array or an object keyed by ID. */
function itemsOf(value: unknown): Raw[] {
  const list = Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];
  return list.filter((v): v is Raw => Boolean(v) && typeof v === "object");
}

function idOf(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.trim()) : typeof value === "number" ? value : Number.NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");

/** true, false, or null when SimplyBook didn't say. */
function flag(value: unknown): boolean | null {
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  return null;
}

const position = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

/** "2026-10-19 09:30:00" into its date and "HH:MM". */
function localParts(value: unknown): { date: string; time: string } | null {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/.exec(text(value));
  return m && isDate(m[1]!) ? { date: m[1]!, time: `${m[2]}:${m[3]}` } : null;
}

/** A local date and time plus minutes, on the wall clock. */
function addMinutes(date: string, time: string, minutes: number): { date: string; time: string } {
  const [h, m] = time.split(":").map(Number) as [number, number];
  const total = h * 60 + m + minutes;
  const day = Math.floor(total / 1440);
  const rest = total - day * 1440;
  return { date: addDays(date, day), time: `${String(Math.floor(rest / 60)).padStart(2, "0")}:${String(rest % 60).padStart(2, "0")}` };
}

function stripTags(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** SimplyBook descriptions are often HTML from its editor: keep it without scripts and handlers; plain text becomes paragraphs. */
function descriptionOf(value: string): string {
  if (!/<\/?[a-z][^>]*>/i.test(value)) return descriptionHtml(value);
  return value
    .replace(/<(script|style|iframe|object|embed|form)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|input|link|meta)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"')
    .trim();
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** The phone number's digits; "+90 532 123 45 67" is "905321234567". */
const digitsOf = (phone: string) => phone.replace(/\D/g, "");

/**
 * Whether a phone number saved on SimplyBook is exactly the customer's
 * (E.164) number, written with or without the country code: "+90 532 123 45 67",
 * "0090...", "0532 123 45 67" (trunk 0) or "532 123 45 67" all match +905321234567.
 * Unverified: how SimplyBook stores the numbers clients type.
 */
export function samePhone(saved: string, e164: string): boolean {
  const user = digitsOf(e164);
  let digits = digitsOf(saved);
  if (!digits || !user) return false;
  if (digits === user) return true;
  if (digits.startsWith("00") && digits.slice(2) === user) return true;
  if (saved.trim().startsWith("+")) return false;
  if (digits.startsWith("0")) digits = digits.slice(1);
  const countryDigits = user.length - digits.length;
  return digits.length >= 7 && countryDigits >= 1 && countryDigits <= 3 && user.endsWith(digits);
}

// The catalog

interface Company {
  name: string;
  timezone: string;
  currency: string;
}

interface Provider {
  id: number;
  name: string;
  title: string | null;
  imageUrl: string | null;
  position: number;
}

interface Service {
  id: number;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  currency: string;
  imageUrl: string | null;
  categoryId: number | null;
  /** Providers who perform it, in the providers' order, with their own duration when it differs. */
  providers: Map<number, number | null>;
  position: number;
  /** Visible, public, active and someone performs it. */
  bookable: boolean;
}

interface Catalog {
  company: Company;
  /** Every service SimplyBook listed (bookable ones are marked), for appointments of hidden ones. */
  services: Service[];
  providers: Provider[];
  categories: { id: number; name: string; position: number }[];
}

interface Booking {
  id: number;
  serviceId: number | null;
  serviceName: string | null;
  providerId: number | null;
  providerName: string | null;
  clientId: number | null;
  start: { date: string; time: string };
  end: { date: string; time: string } | null;
  /** The is_confirm(ed) flag. Unverified: SimplyBook sets it to 0 when a booking is cancelled. */
  confirmed: boolean | null;
  /** With the Approve Booking feature. Unverified values: new, approved, canceled. */
  approveStatus: string | null;
  comment: string | null;
  price: number | null;
  currency: string | null;
}

/** A booking from getBookings (start_date, event, unit) or getBookingDetails / book (start_date_time, event_name, unit_name). */
function readBooking(raw: unknown): Booking | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Raw;
  const id = idOf(b.id);
  const start = localParts(b.start_date_time ?? b.start_date);
  if (id === null || !start) return null;
  // price is an amount, or { amount, currency, ... } in booking details.
  const price = b.price && typeof b.price === "object" ? (b.price as Raw) : null;
  const rawAmount = price ? price.amount : b.price;
  const amount = rawAmount === null || rawAmount === undefined || rawAmount === "" ? Number.NaN : Number(rawAmount);
  return {
    id,
    serviceId: idOf(b.event_id),
    serviceName: text(b.event_name ?? b.event) || null,
    providerId: idOf(b.unit_id),
    providerName: text(b.unit_name ?? b.unit) || null,
    clientId: idOf(b.client_id),
    start,
    end: localParts(b.end_date_time ?? b.end_date),
    confirmed: flag(b.is_confirm ?? b.is_confirmed),
    approveStatus: text(b.approve_status).toLowerCase() || null,
    comment: text(b.comment) || null,
    price: Number.isFinite(amount) && amount >= 0 ? amount : null,
    currency: text(price?.currency ?? b.currency) || null,
  };
}

function statusOf(b: Booking, end: Date, now: Date, cancelled?: boolean): BookingStatus {
  const approve = b.approveStatus ?? "";
  if (cancelled === true || /cancel/.test(approve)) return "cancelled";
  if (/reject|declin/.test(approve)) return "rejected";
  // A list fetched with booking_type non_cancelled says it isn't cancelled; otherwise the flag does.
  if (cancelled === undefined && b.confirmed === false) return "cancelled";
  if (/new|pending|wait/.test(approve)) return "pending";
  return end < now ? "completed" : "approved";
}

const ACTIVE: BookingStatus[] = ["approved", "pending"];

const slotTaken = () => error(409, "slot_taken", "This time was just taken. Please choose another one.");
const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
const unavailable = () => error(503, "shop_unavailable", "The booking system can't be reached right now. Please try again in a moment.");

export class SimplyBookConnector implements PlatformConnector {
  readonly client: SimplyBookClient;
  private readonly key: string;

  constructor(
    private readonly settings: SimplyBookSettings,
    fetcher: Fetch = fetch,
    options: SimplyBookOptions = {},
  ) {
    this.client = new SimplyBookClient(settings, fetcher, options);
    this.key = `${settings.apiHost}|${settings.companyLogin}`;
  }

  private cached<T>(name: string, ms: number, load: () => Promise<T>): Promise<T> {
    const key = `${this.key}|${name}`;
    const hit = cache.get(key);
    if (hit && Date.now() < hit.until) return hit.value as Promise<T>;
    const value = load();
    cache.set(key, { until: Date.now() + ms, value });
    value.catch(() => {
      if (cache.get(key)?.value === value) cache.delete(key);
    });
    return value;
  }

  private forget(prefix: string): void {
    for (const key of cache.keys()) if (key.startsWith(`${this.key}|${prefix}`)) cache.delete(key);
  }

  /** Runs bookings of one company one after another (SimplyBook advises against parallel `book` calls). */
  private serial<T>(task: () => Promise<T>): Promise<T> {
    const run = (queues.get(this.key) ?? Promise.resolve()).catch(() => undefined).then(task);
    queues.set(this.key, run.catch(() => undefined));
    return run;
  }

  /** Checks the company login, both keys and the API user; returns the company's name. */
  async check(): Promise<string> {
    try {
      const info = await this.client.call<Raw>("public", "getCompanyInfo");
      await this.client.token("admin");
      return text(info?.name) || this.settings.companyLogin;
    } catch (e) {
      if (!isApiError(e)) throw e;
      const messages: Record<number, string> = {
        [-33001]: "SimplyBook.me doesn't know this company login.",
        [-33002]: "SimplyBook.me didn't accept the API key. Check it, and that the API feature is on.",
        [-33003]: "SimplyBook.me didn't accept the API user login and key.",
        [-33004]: "This SimplyBook.me user is blocked.",
        [-33005]: "SimplyBook.me doesn't allow API access while the HIPAA feature is on.",
        [-32001]: "Turn on the API feature in SimplyBook.me's Custom Features.",
      };
      throw new ConnectorError(messages[e.code!] ?? e.message);
    }
  }

  // Catalog

  /** The image URL of a service or provider. Unverified: picture_path is a path on the main SimplyBook domain, or a full URL. */
  private imageUrl(raw: Raw): string | null {
    const path = text(raw.picture_path);
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith("//")) return `https:${path}`;
    if (path.startsWith("/")) return `https://${this.settings.apiHost.replace(/^user-api(?:-v2)?\./, "")}${path}`;
    return null;
  }

  private catalog(): Promise<Catalog> {
    return this.cached("catalog", CATALOG_MS, async () => {
      const [info, events, units, categories] = await Promise.all([
        this.client.call<Raw>("public", "getCompanyInfo"),
        this.client.call("public", "getEventList", [true, true]),
        this.client.call("public", "getUnitList", [true, true]),
        // The Service Categories feature may be off (-32001).
        this.client.call("public", "getCategoriesList", [true]).catch((e: unknown) => {
          if (isApiError(e, FEATURE_OFF)) return [];
          throw e;
        }),
      ]);
      const providers: Provider[] = itemsOf(units)
        .filter((u) => flag(u.is_active) !== false && flag(u.is_visible) !== false && idOf(u.id) !== null)
        .map((u) => {
          const about = stripTags(text(u.description)).split("\n")[0]?.trim() ?? "";
          return {
            id: idOf(u.id)!,
            name: text(u.name) || "Staff",
            title: about ? about.slice(0, 120) : null,
            imageUrl: this.imageUrl(u),
            position: position(u.position),
          };
        })
        .sort((a, b) => a.position - b.position);
      const eventList = itemsOf(events);
      // Unverified: getCompanyInfo has no documented currency; the services carry theirs.
      const currency = (text(info?.currency) || eventList.map((e) => text(e.currency)).find(Boolean) || "USD").toUpperCase();
      const timezone = text(info?.timezone);
      const services: Service[] = eventList
        .filter((e) => idOf(e.id) !== null)
        .map((e) => {
          // unit_map lists the providers who perform the service (with their own duration or null); without it, everyone does.
          const map = e.unit_map && typeof e.unit_map === "object" && !Array.isArray(e.unit_map) ? (e.unit_map as Raw) : null;
          const allowed = map && Object.keys(map).length > 0 ? map : null;
          const performers = new Map<number, number | null>();
          for (const p of providers) {
            if (allowed && !(String(p.id) in allowed)) continue;
            const special = allowed ? Number(allowed[String(p.id)]) : Number.NaN;
            performers.set(p.id, allowed && allowed[String(p.id)] !== null && Number.isInteger(special) && special > 0 ? special : null);
          }
          const duration = Number(e.duration);
          const price = Number(e.price);
          const categoryIds = Array.isArray(e.categories) ? e.categories.map(idOf).filter((id): id is number => id !== null) : [];
          return {
            id: idOf(e.id)!,
            name: text(e.name) || "Service",
            description: text(e.description),
            durationMinutes: Number.isInteger(duration) && duration > 0 ? duration : 30,
            price: Number.isFinite(price) && price > 0 ? price : 0,
            currency: (text(e.currency) || currency).toUpperCase(),
            imageUrl: this.imageUrl(e),
            categoryId: categoryIds[0] ?? null,
            providers: performers,
            position: position(e.position),
            bookable: flag(e.is_public) !== false && flag(e.is_active) !== false && flag(e.is_visible) !== false && performers.size > 0,
          };
        })
        .sort((a, b) => a.position - b.position);
      return {
        company: {
          name: text(info?.name) || this.settings.companyLogin,
          // Unverified: getCompanyInfo's timezone is an IANA name; UTC when it isn't one.
          timezone: timezone && isTimeZone(timezone) ? timezone : "UTC",
          currency,
        },
        services,
        providers,
        categories: itemsOf(categories)
          .filter((c) => idOf(c.id) !== null && flag(c.is_visible) !== false)
          .map((c) => ({ id: idOf(c.id)!, name: text(c.name) || "Category", position: position(c.position) }))
          .sort((a, b) => a.position - b.position),
      };
    });
  }

  private bookable(c: Catalog): Service[] {
    return c.services.filter((s) => s.bookable);
  }

  private service(c: Catalog, id: number): Service | null {
    return Number.isSafeInteger(id) ? (this.bookable(c).find((s) => s.id === id) ?? null) : null;
  }

  async config() {
    const c = await this.catalog();
    return {
      bookings: {
        plugin: "simplybook",
        plugin_version: "1",
        timezone: c.company.timezone,
        currency: c.company.currency,
        staff_choice: this.bookable(c).some((s) => s.providers.size > 1),
        notes: true,
        max_days_ahead: MAX_DAYS_AHEAD,
        min_minutes_ahead: MIN_MINUTES_AHEAD,
        cancel_before_minutes: CANCEL_BEFORE_MINUTES,
      },
    };
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const route = `${request.method} /${request.path.join("/")}`;
    try {
      switch (route) {
        case "GET /bookings/home":
          return { status: 200, body: { sections: await this.home(request) } };
        case "GET /bookings/categories":
          return { status: 200, body: { items: this.categories(await this.catalog()) } };
        case "GET /bookings/services":
          return this.services(await this.catalog(), request.query);
        case "GET /bookings/availability":
          return await this.availability(request);
        case "POST /bookings/appointments":
          return await this.book(request);
        case "GET /me/appointments":
          return await this.appointments(request);
      }
      const [first, second, third, fourth] = request.path;
      if (request.method === "GET" && first === "bookings" && second === "services" && third && request.path.length === 3) {
        const c = await this.catalog();
        const service = this.service(c, Number(third));
        return service ? { status: 200, body: this.detail(c, service) } : error(404, "not_found", "Service not found.");
      }
      if (first === "me" && second === "appointments" && third) {
        const id = Number(third);
        if (request.method === "GET" && request.path.length === 3) return await this.appointment(request, id);
        if (request.method === "POST" && fourth === "cancel" && request.path.length === 4) return await this.cancel(request, id);
      }
    } catch (e) {
      if (e instanceof ConnectorError) return unavailable();
      throw e;
    }
    return null;
  }

  // Mapping

  private price(amount: number, currency: string) {
    return { amount: amount.toFixed(2), currency, formatted: formatMoney(amount, currency), free: amount === 0 };
  }

  private summary(s: Service) {
    return {
      id: s.id,
      name: s.name,
      image_url: s.imageUrl,
      duration_minutes: s.durationMinutes,
      price: this.price(s.price, s.currency),
      category_id: s.categoryId,
      color: null,
    };
  }

  private person(p: Provider) {
    return { id: p.id, name: p.name, image_url: p.imageUrl, title: p.title, price: null };
  }

  private detail(c: Catalog, s: Service) {
    return {
      ...this.summary(s),
      description_html: descriptionOf(s.description),
      staff: c.providers.filter((p) => s.providers.has(p.id)).map((p) => this.person(p)),
    };
  }

  private categories(c: Catalog) {
    const services = this.bookable(c);
    return c.categories
      .map((cat) => ({ id: cat.id, name: cat.name, count: services.filter((s) => s.categoryId === cat.id).length, image_url: null }))
      .filter((cat) => cat.count > 0);
  }

  private canCancel(status: BookingStatus, start: Date, now: Date): boolean {
    return ACTIVE.includes(status) && start.getTime() - now.getTime() >= CANCEL_BEFORE_MINUTES * 60_000;
  }

  /** A booking's start and end instants (SimplyBook's times are local to the company). */
  private instants(c: Catalog, b: Booking): { start: Date; end: Date } {
    const tz = c.company.timezone;
    const service = b.serviceId !== null ? c.services.find((s) => s.id === b.serviceId) : undefined;
    const start = localToUtc(b.start.date, b.start.time, tz);
    const duration = (b.providerId !== null ? service?.providers.get(b.providerId) : null) ?? service?.durationMinutes ?? 30;
    return { start, end: b.end ? localToUtc(b.end.date, b.end.time, tz) : new Date(start.getTime() + duration * 60_000) };
  }

  private appointmentJson(c: Catalog, b: Booking, now: Date, cancelled?: boolean) {
    const service = b.serviceId !== null ? c.services.find((s) => s.id === b.serviceId) : undefined;
    const provider = b.providerId !== null ? c.providers.find((p) => p.id === b.providerId) : undefined;
    const { start, end } = this.instants(c, b);
    const status = statusOf(b, end, now, cancelled);
    const local = utcToLocal(start, c.company.timezone);
    return {
      id: b.id,
      status,
      status_label: BOOKING_STATUS_LABELS[status],
      service: { id: b.serviceId ?? 0, name: b.serviceName ?? service?.name ?? "Appointment", image_url: service?.imageUrl ?? null },
      staff: provider
        ? this.person(provider)
        : b.providerId !== null && b.providerName
          ? { id: b.providerId, name: b.providerName, image_url: null, title: null, price: null }
          : null,
      start: start.toISOString(),
      end: end.toISOString(),
      local_date: local.date,
      local_time: local.time,
      price: this.price(b.price ?? service?.price ?? 0, (b.currency ?? service?.currency ?? c.company.currency).toUpperCase()),
      notes: b.comment,
      location: null,
      can_cancel: this.canCancel(status, start, now),
    };
  }

  // Catalog endpoints

  private async home(request: ConnectorRequest) {
    const c = await this.catalog();
    const sections: Record<string, unknown>[] = [];
    if (request.user) {
      try {
        const [next] = await this.userBookings(c, request.user, "upcoming", request.now);
        if (next) sections.push({ type: "next_appointment", title: "Your next appointment", appointment: this.appointmentJson(c, next.booking, request.now, false) });
      } catch (e) {
        // The rest of the home screen doesn't need the admin access.
        if (!(e instanceof ConnectorError)) throw e;
      }
    }
    const categories = this.categories(c);
    if (categories.length) sections.push({ type: "categories", title: "Categories", categories });
    const services = this.bookable(c);
    if (services.length) sections.push({ type: "services", title: "Services", services: services.slice(0, 20).map((s) => this.summary(s)) });
    const staff = c.providers.filter((p) => services.some((s) => s.providers.has(p.id)));
    if (staff.length > 1) sections.push({ type: "staff", title: "Our team", staff: staff.map((p) => this.person(p)) });
    return sections;
  }

  private services(c: Catalog, query: URLSearchParams): ConnectorResult {
    const page = intParam(query, "page", 1, 10_000);
    const perPage = intParam(query, "per_page", 20, 100);
    const search = (query.get("search") ?? "").trim().toLowerCase();
    const category = Number(query.get("category") ?? 0);
    const all = this.bookable(c)
      .filter((s) => !search || s.name.toLowerCase().includes(search))
      .filter((s) => !category || s.categoryId === category);
    const items = all.slice((page - 1) * perPage, page * perPage).map((s) => this.summary(s));
    return { status: 200, body: { page, per_page: perPage, total: all.length, total_pages: Math.max(1, Math.ceil(all.length / perPage)), items } };
  }

  // Availability

  /** getStartTimeMatrix: free start times ("HH:MM") by local date, for one provider or anyone (null). */
  private matrix(serviceId: number, providerId: number | null, from: string, to: string, fresh: boolean): Promise<Map<string, string[]>> {
    const load = async () => {
      const result = await this.client.call("public", "getStartTimeMatrix", [from, to, serviceId, providerId, 1]);
      return timesByDate(result);
    };
    return fresh ? load() : this.cached(`times|${serviceId}|${providerId ?? "any"}|${from}|${to}`, MATRIX_MS, load);
  }

  /** Free start times of each provider of a service, to say who is free at each time. */
  private providerTimes(service: Service, from: string, to: string, fresh: boolean): Promise<Map<number, Map<string, string[]>>> {
    const load = async () => {
      const out = new Map<number, Map<string, string[]>>();
      try {
        // One request for every provider. Unverified: null (anyone) is accepted for the provider.
        const result = await this.client.call("public", "getCartesianStartTimeMatrix", [from, to, service.id, null, 1]);
        for (const item of itemsOf(result)) {
          const id = idOf(item.provider_id ?? item.unit_id);
          if (id !== null && service.providers.has(id)) out.set(id, timesByDate(item.timeslots));
        }
        return out;
      } catch (e) {
        if (!isApiError(e) || KEY_ERRORS.has(e.code!)) throw e;
      }
      // Without the cartesian matrix: one matrix per provider (queued by the rate limit).
      for (const id of service.providers.keys()) out.set(id, await this.matrix(service.id, id, from, to, fresh));
      return out;
    };
    return fresh ? load() : this.cached(`staff|${service.id}|${from}|${to}`, MATRIX_MS, load);
  }

  /** Free times by local date: each time with the providers free then. */
  private async freeTimes(service: Service, providerId: number | null, from: string, to: string, fresh = false): Promise<Map<string, Map<string, number[]>>> {
    const providers = [...service.providers.keys()];
    const [times, perProvider] = await Promise.all([
      this.matrix(service.id, providerId, from, to, fresh),
      providerId === null && providers.length > 1 ? this.providerTimes(service, from, to, fresh) : Promise.resolve(null),
    ]);
    const out = new Map<string, Map<string, number[]>>();
    for (const [date, list] of times) {
      const day = new Map<string, number[]>();
      for (const time of list) {
        const staff =
          providerId !== null ? [providerId] : perProvider ? providers.filter((id) => perProvider.get(id)?.get(date)?.includes(time)) : providers;
        day.set(time, staff);
      }
      out.set(date, day);
    }
    return out;
  }

  private async availability(request: ConnectorRequest): Promise<ConnectorResult> {
    const { query, now } = request;
    const c = await this.catalog();
    const service = this.service(c, Number(query.get("service")));
    if (!service) return error(404, "not_found", "Service not found.");
    const staffParam = query.get("staff");
    const providerId = staffParam ? Number(staffParam) : null;
    if (providerId !== null && !service.providers.has(providerId)) return error(400, "invalid_request", "This staff member doesn't provide this service.");
    const from = query.get("from") ?? "";
    if (!isDate(from)) return error(400, "invalid_request", "Choose a valid date.");
    const days = Math.min(31, Math.max(1, Number.parseInt(query.get("days") ?? "7", 10) || 7));
    const tz = c.company.timezone;
    const dates = Array.from({ length: days }, (_, i) => addDays(from, i));
    // Only the days customers can book are asked for: the matrix is slow on long ranges.
    const today = utcToLocal(now, tz).date;
    const open = dates.filter((d) => d >= today && d <= addDays(today, MAX_DAYS_AHEAD));
    const free = open.length ? await this.freeTimes(service, providerId, open[0]!, open.at(-1)!) : new Map<string, Map<string, number[]>>();
    const earliest = now.getTime() + MIN_MINUTES_AHEAD * 60_000;
    const duration = (providerId !== null ? service.providers.get(providerId) : null) ?? service.durationMinutes;
    return {
      status: 200,
      body: {
        timezone: tz,
        days: dates.map((date) => ({
          date,
          slots: [...(free.get(date) ?? new Map<string, number[]>())]
            .map(([time, staff]) => ({ start: localToUtc(date, time, tz), time, staff }))
            .filter((s) => s.start.getTime() > earliest)
            .map((s) => ({
              start: s.start.toISOString(),
              end: new Date(s.start.getTime() + duration * 60_000).toISOString(),
              local_time: s.time,
              staff_ids: s.staff,
            })),
        })),
      },
    };
  }

  // Customers

  /** Whether the company requires an e-mail address for clients (require_fields "email" or "email_phone"). */
  private requiresEmail(): Promise<boolean> {
    return this.cached("require_fields", CATALOG_MS, async () => {
      try {
        return /email/i.test(text(await this.client.call("admin", "getCompanyParam", ["require_fields"])));
      } catch (e) {
        if (isApiError(e) && !KEY_ERRORS.has(e.code!)) return false;
        throw e;
      }
    });
  }

  /**
   * The SimplyBook clients with exactly the customer's phone number. The
   * search uses the last ten digits, which match the number however it was
   * typed on SimplyBook (with or without the country code); samePhone keeps
   * exact matches only.
   */
  private clientIds(user: HostedUser): Promise<number[]> {
    // 18 An account without a phone (email sign-in) matches no client.
    if (!user.phone) return Promise.resolve([]);
    const phone = user.phone;
    const digits = digitsOf(phone);
    return this.cached(`client|${digits}`, CLIENT_MS, async () => {
      const result = await this.client.call("admin", "getClientList", [digits.slice(-10), 50]);
      return itemsOf(result)
        .filter((c) => samePhone(text(c.phone), phone))
        .map((c) => idOf(c.id))
        .filter((id): id is number => id !== null)
        .sort((a, b) => a - b)
        .slice(0, 3);
    });
  }

  /**
   * The customer's client ID, created when there's none. The e-mail address
   * is sent when the customer gave one; when the company requires one and
   * they didn't, a stable address made from their phone number is used
   * (`<digits>@phone.yallapp.invalid`: the .invalid domain never receives mail).
   */
  private async clientFor(user: HostedUser): Promise<number> {
    const [existing] = await this.clientIds(user);
    if (existing !== undefined) return existing;
    const phone = user.phone ?? "";
    const email = user.email ?? ((await this.requiresEmail()) ? `${digitsOf(phone) || user.id}@phone.yallapp.invalid` : "");
    const id = idOf(await this.client.call("admin", "addClient", [{ name: user.name, email, phone }]));
    if (id === null) throw new ConnectorError("SimplyBook sent no client.");
    if (phone) cache.set(`${this.key}|client|${digitsOf(phone)}`, { until: Date.now() + CLIENT_MS, value: Promise.resolve([id]) });
    return id;
  }

  /**
   * The customer's bookings: upcoming ones (not cancelled, starting from now)
   * soonest first, or the rest newest first. Cancelled ones come from their
   * own list (booking_type "cancelled"), so their status doesn't depend on a field.
   */
  private async userBookings(c: Catalog, user: HostedUser, scope: "upcoming" | "past", now: Date): Promise<{ booking: Booking; cancelled: boolean }[]> {
    const ids = await this.clientIds(user);
    const today = utcToLocal(now, c.company.timezone).date;
    const lists: Promise<{ booking: Booking; cancelled: boolean }[]>[] = [];
    const list = (clientId: number, filter: Raw, cancelled: boolean) =>
      this.client.call("admin", "getBookings", [{ client_id: clientId, ...filter }]).then((result) =>
        itemsOf(result)
          .map(readBooking)
          // The filter must have worked: never show someone else's booking.
          .filter((b): b is Booking => b !== null && b.clientId === clientId)
          .map((booking) => ({ booking, cancelled })),
      );
    for (const id of ids) {
      if (scope === "upcoming") {
        lists.push(list(id, { date_from: addDays(today, -1), booking_type: "non_cancelled", order: "date_start_asc" }, false));
      } else {
        lists.push(list(id, { booking_type: "non_cancelled", order: "date_start" }, false));
        lists.push(list(id, { booking_type: "cancelled", order: "date_start" }, true));
      }
    }
    const seen = new Set<number>();
    return (await Promise.all(lists))
      .flat()
      .filter(({ booking }) => !seen.has(booking.id) && seen.add(booking.id))
      .map((item) => {
        const { start, end } = this.instants(c, item.booking);
        return { ...item, at: start, status: statusOf(item.booking, end, now, item.cancelled) };
      })
      .filter(({ status, at }) => {
        const upcoming = ACTIVE.includes(status) && at >= now;
        return scope === "upcoming" ? upcoming : !upcoming;
      })
      .sort((a, b) => (scope === "upcoming" ? a.at.getTime() - b.at.getTime() : b.at.getTime() - a.at.getTime()) || a.booking.id - b.booking.id)
      .map(({ booking, cancelled }) => ({ booking, cancelled }));
  }

  // Appointments

  private async book(request: ConnectorRequest): Promise<ConnectorResult> {
    const user = request.user;
    if (!user) return signIn();
    const platform = request.query.get("platform");
    if (platform !== "android" && platform !== "ios") return error(400, "invalid_request", "Unknown platform.");
    const body = (request.body ?? {}) as Record<string, unknown>;
    const c = await this.catalog();
    const service = this.service(c, Number(body.service_id));
    if (!service) return error(400, "invalid_request", "This service can't be booked.");
    const providerId = body.staff_id === null || body.staff_id === undefined ? null : Number(body.staff_id);
    if (providerId !== null && !service.providers.has(providerId)) return error(400, "invalid_request", "This staff member doesn't provide this service.");
    const start = typeof body.start === "string" ? new Date(body.start) : new Date(Number.NaN);
    if (Number.isNaN(start.getTime())) return error(400, "invalid_request", "Choose a time.");
    const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 1000) : null;
    const tz = c.company.timezone;
    const local = utcToLocal(start, tz);
    // Only whole-minute times SimplyBook offers, not past ones.
    if (localToUtc(local.date, local.time, tz).getTime() !== start.getTime() || start.getTime() <= request.now.getTime() + MIN_MINUTES_AHEAD * 60_000) {
      return slotTaken();
    }

    return this.serial(async () => {
      // The time must be free now, for the provider asked for or for someone.
      const free = await this.freeTimes(service, providerId, local.date, local.date, true);
      const staff = free.get(local.date)?.get(local.time);
      if (!staff) return slotTaken();
      let unit = providerId ?? staff[0] ?? null;
      if (unit === null) {
        const units = await this.client.call("public", "getAvailableUnits", [service.id, `${local.date} ${local.time}:00`, 1]);
        unit = (Array.isArray(units) ? units : []).map(idOf).find((id): id is number => id !== null && service.providers.has(id)) ?? null;
      }
      if (unit === null) return slotTaken();
      const clientId = await this.clientFor(user);
      const end = addMinutes(local.date, local.time, service.providers.get(unit) ?? service.durationMinutes);
      let result: unknown;
      try {
        // The admin signature: (eventId, unitId, clientId, startDate, startTime, endDate, endTime, clientTimeOffset, additional, count, batchId, recurringData).
        result = await this.client.call("admin", "book", [service.id, unit, clientId, local.date, `${local.time}:00`, end.date, `${end.time}:00`, 0, {}, 1, null, null]);
      } catch (e) {
        // Unverified: SimplyBook documents no code for a time that was taken; any booking error that isn't about the account counts as one.
        if (isApiError(e) && !ACCOUNT_ERRORS.has(e.code!)) {
          this.forget("times|");
          this.forget("staff|");
          return slotTaken();
        }
        throw e;
      }
      this.forget("times|");
      this.forget("staff|");
      const answer = (result && typeof result === "object" ? result : {}) as Raw;
      // Unverified: the admin book answers like the public one, { require_confirm, bookings: [...] }.
      const made = readBooking(itemsOf(answer.bookings)[0] ?? answer);
      if (!made) throw new ConnectorError("SimplyBook sent no booking.");
      if (notes) {
        // Unverified: the admin service's setBookingComment; the booking stands without the note.
        await this.client.call("admin", "setBookingComment", [made.id, notes]).catch(() => undefined);
      }
      const booking: Booking = {
        ...made,
        serviceId: service.id,
        serviceName: made.serviceName ?? service.name,
        providerId: unit,
        clientId,
        start: { date: local.date, time: local.time },
        end: made.end ?? end,
        confirmed: true,
        approveStatus: flag(answer.require_confirm) === true ? "new" : made.approveStatus,
        comment: notes,
      };
      return { status: 201, body: this.appointmentJson(c, booking, request.now) };
    });
  }

  private async appointments(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const status = request.query.get("status") ?? "upcoming";
    if (status !== "upcoming" && status !== "past") return error(400, "invalid_request", "Unknown status.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 100);
    const c = await this.catalog();
    const all = await this.userBookings(c, request.user, status, request.now);
    return {
      status: 200,
      body: {
        page,
        per_page: perPage,
        total: all.length,
        total_pages: Math.max(1, Math.ceil(all.length / perPage)),
        items: all.slice((page - 1) * perPage, page * perPage).map((b) => this.appointmentJson(c, b.booking, request.now, b.cancelled)),
      },
    };
  }

  /** One of the customer's own bookings (its client is theirs), or null. */
  private async own(request: ConnectorRequest, id: number): Promise<Booking | null> {
    if (!request.user || !Number.isSafeInteger(id) || id < 1) return null;
    const ids = await this.clientIds(request.user);
    if (ids.length === 0) return null;
    let raw: unknown;
    try {
      raw = await this.client.call("admin", "getBookingDetails", [id]);
    } catch (e) {
      if (isApiError(e, NOT_FOUND)) return null;
      throw e;
    }
    const booking = readBooking(raw);
    return booking && booking.id === id && booking.clientId !== null && ids.includes(booking.clientId) ? booking : null;
  }

  private async appointment(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const booking = await this.own(request, id);
    if (!booking) return error(404, "not_found", "Appointment not found.");
    return { status: 200, body: this.appointmentJson(await this.catalog(), booking, request.now) };
  }

  private async cancel(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const booking = await this.own(request, id);
    if (!booking) return error(404, "not_found", "Appointment not found.");
    const c = await this.catalog();
    if (!this.appointmentJson(c, booking, request.now).can_cancel) {
      return error(409, "too_late", "This appointment can no longer be cancelled in the app. Please contact us.");
    }
    try {
      const done = await this.client.call("admin", "cancelBooking", [id]);
      if (flag(done) === false) throw new ConnectorError("SimplyBook didn't cancel the booking.");
    } catch (e) {
      if (isApiError(e, NOT_FOUND)) return error(404, "not_found", "Appointment not found.");
      throw e;
    }
    this.forget("times|");
    this.forget("staff|");
    return { status: 200, body: this.appointmentJson(c, booking, request.now, true) };
  }
}

/** A matrix result { "2026-10-19": ["09:00:00", ...] } as "HH:MM" times by date. */
function timesByDate(value: unknown): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [date, times] of Object.entries(value as Raw)) {
    if (!isDate(date)) continue;
    const list = (Array.isArray(times) ? times : times && typeof times === "object" ? Object.values(times) : [])
      .map((t) => /^(\d{2}):(\d{2})/.exec(text(t)))
      .filter((m): m is RegExpExecArray => m !== null && Number(m[1]) < 24 && Number(m[2]) < 60)
      .map((m) => `${m[1]}:${m[2]}`);
    out.set(date, [...new Set(list)].sort());
  }
  return out;
}

/** Clears tokens, caches and rate limits (tests). */
export function clearSimplyBookCache(): void {
  tokens.clear();
  cache.clear();
  limiters.clear();
  queues.clear();
}

export const SIMPLYBOOK_PLATFORM: PlatformDefinition = {
  id: "simplybook",
  name: "SimplyBook.me",
  appType: "booking",
  summary: "Your services, team and free times from SimplyBook.me; customers book, see and cancel their appointments in the app.",
  fields: [
    {
      name: "companyLogin",
      label: "Company login",
      hint: "The company login you sign in to SimplyBook.me with. It's also the first part of your booking site's address: mycompany in mycompany.simplybook.me.",
      secret: false,
      placeholder: "mycompany",
    },
    {
      name: "apiKey",
      label: "API key",
      hint: "In SimplyBook.me, open Custom Features and turn on API (a paid feature). Then open its Settings (Settings > Integrations > API in the new admin) and copy the API key.",
      secret: true,
    },
    {
      name: "userLogin",
      label: "API user login",
      hint: "The login of an admin user of your company, or of the user you added for the API. Bookings from the app are made with this user's access.",
      secret: false,
      placeholder: "admin@example.com",
    },
    {
      name: "userKey",
      label: "API user key or password",
      hint: "Best: create an API user key for that user in the API feature's Settings, under API user keys, and paste it here. That user's password works too.",
      secret: true,
    },
    {
      name: "apiHost",
      label: "API host",
      hint: "Leave empty unless your account is on another SimplyBook domain than simplybook.me. Then enter its API host, for example user-api.simplybook.it.",
      secret: false,
      placeholder: SIMPLYBOOK_DEFAULT_HOST,
      optional: true,
    },
  ],
  normalize(values) {
    const errors: Record<string, string> = {};
    const companyLogin = normalizeCompanyLogin(values.companyLogin ?? "");
    if (!companyLogin) errors.companyLogin = "Enter your company login, for example mycompany.";
    const apiKey = (values.apiKey ?? "").trim();
    if (!apiKey) errors.apiKey = "Enter your API key.";
    const userLogin = (values.userLogin ?? "").trim();
    if (!userLogin) errors.userLogin = "Enter the API user login.";
    const userKey = (values.userKey ?? "").trim();
    if (!userKey) errors.userKey = "Enter the API user key or password.";
    const typedHost = (values.apiHost ?? "").trim();
    const apiHost = normalizeApiHost(typedHost);
    if (!apiHost) errors.apiHost = "Enter a SimplyBook API host, for example user-api.simplybook.it, or leave it empty.";
    if (Object.keys(errors).length > 0) return { errors };
    return { values: { ...values, companyLogin: companyLogin!, apiKey, userLogin, userKey, apiHost: typedHost ? apiHost! : "" } };
  },
  create(values, deps) {
    return new SimplyBookConnector(
      {
        companyLogin: values.companyLogin ?? "",
        apiKey: values.apiKey ?? "",
        userLogin: values.userLogin ?? "",
        userKey: values.userKey ?? "",
        apiHost: normalizeApiHost(values.apiHost ?? "") ?? SIMPLYBOOK_DEFAULT_HOST,
      },
      deps.fetcher,
    );
  },
};

registerPlatform(SIMPLYBOOK_PLATFORM);
