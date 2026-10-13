import { createHash, createHmac } from "node:crypto";
import type { HostedUser } from "../../data/types";
import { descriptionHtml } from "./catalog";
import { error, intParam } from "./common";
import { registerPlatform, type PlatformConnector, type PlatformDefinition } from "./platforms";
import { ConnectorError, type ConnectorRequest, type ConnectorResult } from "./types";

/**
 * Thinkific for course apps, through Thinkific's Admin REST API with the
 * school's API access token. Courses are the school's published, public
 * products of type course; topics are chapters and lessons are contents,
 * all with Thinkific's own numeric IDs. The REST API has no lesson body, so
 * a lesson opens in Thinkific's course player (the content's `take_url`):
 * with the optional SSO signing secret (Thinkific Plus) it opens in the app
 * already signed in, without it as a link the student follows. Free courses
 * are enrolled in from the app. Paid courses aren't sold from the app: a
 * purchase on Thinkific's checkout can't be matched to the app's student
 * (see below), so they're bought on the school's website. Progress is the
 * enrollment's `percentage_completed`, which Thinkific's player keeps up to
 * date.
 *
 * Each app user has their own Thinkific student, linked by the external ID
 * `yallapp-<first 8 characters of the app ID>-<user ID>` (provider SSO) and
 * the address `u<user ID>.<first 8 characters of the app ID>@students.yallapp.com.tr`.
 * The e-mail a user gave the app is never used: it isn't verified (phones
 * are), so matching or creating by it would let anyone who types another
 * student's address take over their Thinkific account.
 */

export const THINKIFIC_API = "https://api.thinkific.com/api/public/v1";
// Unverified: the largest `limit` Thinkific accepts (the spec only gives the default, 25).
const PAGE_LIMIT = 100;
const MAX_PAGES = 50;
const CACHE_MS = 10 * 60_000;
const ENROLLMENTS_MS = 30_000;
const NO_STUDENT_MS = 60_000;
/** Thinkific allows 120 requests a minute per school (and 10 at once). */
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;
const PARALLEL = 4;
/** Students without an e-mail get an address under this domain, which Yallapp controls. */
export const STUDENT_EMAIL_DOMAIN = "students.yallapp.com.tr";

type Fetch = typeof fetch;

export interface ThinkificSettings {
  /** "your-school", as in your-school.thinkific.com. */
  subdomain: string;
  accessToken: string;
  /** The API access token's SSO signing secret (Thinkific Plus), or null. */
  ssoSecret: string | null;
}

// Thinkific's REST shapes (fields the connector reads; everything optional is read tolerantly).

interface Paged<T> {
  items?: T[];
  meta?: { pagination?: { next_page?: number | null; total_pages?: number | null } };
}

interface ThinkificPrice {
  id: number;
  is_primary?: boolean;
  payment_type?: string | null;
  price?: string | number | null;
  currency?: string | null;
  interval?: string | null;
  interval_count?: string | number | null;
  number_of_payments?: number | null;
}

interface ThinkificProduct {
  id: number;
  created_at?: string | null;
  productable_id?: number | null;
  productable_type?: string | null;
  name?: string | null;
  description?: string | null;
  card_image_url?: string | null;
  position?: number | null;
  status?: string | null;
  hidden?: boolean | null;
  private?: boolean | null;
  has_certificate?: boolean | null;
  /** Deprecated in favour of `product_prices`. */
  price?: string | number | null;
  product_prices?: ThinkificPrice[] | null;
}

interface ThinkificCourse {
  id: number;
  name: string;
  slug?: string | null;
  description?: string | null;
  course_card_image_url?: string | null;
  product_id?: number | null;
  instructor_id?: number | null;
  chapter_ids?: number[] | null;
}

interface ThinkificChapter {
  id: number;
  name: string;
  position?: number | null;
  content_ids?: number[] | null;
  duration_in_seconds?: number | null;
}

interface ThinkificContent {
  id: number;
  name: string;
  position?: number | null;
  chapter_id?: number | null;
  contentable_type?: string | null;
  free?: boolean | null;
  take_url?: string | null;
}

// Unverified: the instructor fields (the spec copy researched didn't list them).
interface ThinkificInstructor {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
}

interface ThinkificUser {
  id: number;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface ThinkificEnrollment {
  id: number;
  course_id: number;
  user_id?: number;
  /** 0.0 to 1.0 in the REST API. */
  percentage_completed?: number | string | null;
  completed?: boolean | null;
  expired?: boolean | null;
  activated_at?: string | null;
  started_at?: string | null;
  updated_at?: string | null;
}

/** "your-school" from what a client typed ("https://your-school.thinkific.com/manage", "your-school"), or null. */
export function normalizeSubdomain(value: string): string | null {
  let host = value.trim().toLowerCase();
  host = host.replace(/^https?:\/\//, "").split(/[/?#]/)[0] ?? "";
  host = host.replace(/\.thinkific\.com$/, "");
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(host) ? host : null;
}

// Requests

const requestTimes = new Map<string, number[]>();

/** Keeps under Thinkific's per-school rate limit instead of collecting 429s. */
function takeSlot(school: string): void {
  const now = Date.now();
  const times = (requestTimes.get(school) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (times.length >= RATE_LIMIT) throw new ConnectorError("Thinkific's rate limit was reached.");
  times.push(now);
  requestTimes.set(school, times);
}

export class ThinkificClient {
  constructor(
    private readonly subdomain: string,
    private readonly accessToken: string,
    private readonly fetcher: Fetch = fetch,
  ) {}

  /** A call; statuses in `allow` are returned instead of failing. */
  async request<T>(
    method: string,
    path: string,
    options: { query?: Record<string, string | number>; body?: unknown; allow?: number[] } = {},
  ): Promise<{ status: number; data: T | null }> {
    takeSlot(this.subdomain);
    const url = new URL(`${THINKIFIC_API}${path}`);
    for (const [name, value] of Object.entries(options.query ?? {})) url.searchParams.set(name, String(value));
    let response: Response;
    try {
      response = await this.fetcher(url.toString(), {
        method,
        headers: {
          accept: "application/json",
          // API access tokens are bearer tokens. Unverified: whether they also need
          // X-Auth-Subdomain (required with the legacy API key); sending it is harmless.
          authorization: `Bearer ${this.accessToken}`,
          "x-auth-subdomain": this.subdomain,
          ...(options.body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ConnectorError("Thinkific didn't answer.");
    }
    const data = (await response.json().catch(() => null)) as T | null;
    if (options.allow?.includes(response.status)) return { status: response.status, data };
    if (response.status === 401) throw new ConnectorError("Thinkific didn't accept the API access token.");
    if (response.status === 429) throw new ConnectorError("Thinkific's rate limit was reached.");
    if (!response.ok) throw new ConnectorError(`Thinkific answered HTTP ${response.status}.`);
    if (response.status !== 204 && (data === null || typeof data !== "object")) throw new ConnectorError("Thinkific sent an invalid answer.");
    return { status: response.status, data };
  }

  async get<T>(path: string, query: Record<string, string | number> = {}): Promise<T> {
    return (await this.request<T>("GET", path, { query })).data as T;
  }

  /** Every page of a list. */
  async all<T>(path: string, query: Record<string, string | number> = {}): Promise<T[]> {
    const out: T[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const body = await this.get<Paged<T>>(path, { ...query, page, limit: PAGE_LIMIT });
      const items = Array.isArray(body.items) ? body.items : [];
      out.push(...items);
      const pagination = body.meta?.pagination;
      const more = pagination?.next_page ? true : pagination ? false : items.length === PAGE_LIMIT;
      if (!more || items.length === 0) break;
    }
    return out;
  }
}

// Helpers

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      out[index] = await fn(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** An http(s) URL, upgraded to https (Android blocks cleartext), or null. */
function secureUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

/** Course descriptions are rich text in Thinkific; plain text is turned into paragraphs. */
function cleanHtml(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  if (!/<[a-z][^>]*>/i.test(text)) return descriptionHtml(text);
  return text.replace(/<(script|style|iframe)\b[\s\S]*?<\/\1\s*>/gi, "").replace(/<(script|style|iframe)\b[^>]*\/?>/gi, "");
}

const byPosition = <T extends { position?: number | null; id: number }>(a: T, b: T) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id;

function isoDate(value: string | null | undefined, fallback: Date): string {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : fallback.toISOString();
}

/** The share of the course done, 0 to 1. */
function completion(enrollment: ThinkificEnrollment): number {
  const value = Number(enrollment.percentage_completed);
  if (!Number.isFinite(value) || value <= 0) return 0;
  // Unverified: REST sends 0.0 to 1.0, webhooks a percent string ("24.0"); read both.
  return Math.min(1, value > 1 ? value / 100 : value);
}

function primaryPrice(product: ThinkificProduct | null): ThinkificPrice | null {
  const prices = product?.product_prices ?? [];
  return prices.find((p) => p.is_primary) ?? prices[0] ?? null;
}

/** Free only when Thinkific says so: a missing price is treated as paid, so it's never given away. */
function isFree(product: ThinkificProduct | null): boolean {
  const price = primaryPrice(product);
  if (price) return price.payment_type === "free" || (price.price !== null && price.price !== undefined && price.price !== "" && Number(price.price) === 0);
  const legacy = product?.price;
  return legacy !== null && legacy !== undefined && legacy !== "" && Number(legacy) === 0;
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function priceJson(product: ThinkificProduct | null) {
  if (isFree(product)) return { is_free: true, amount: null, sale_amount: null, currency: null, formatted: null };
  const price = primaryPrice(product);
  const value = Number(price ? price.price : product?.price);
  if (!Number.isFinite(value)) return { is_free: false, amount: null, sale_amount: null, currency: null, formatted: null };
  const currency = (price?.currency || "usd").toUpperCase();
  let formatted = formatMoney(value, currency);
  if (price?.payment_type === "subscription" && price.interval) {
    const every = Number(price.interval_count ?? 1);
    formatted += every > 1 ? ` every ${every} ${price.interval}s` : `/${price.interval}`;
  } else if (price?.payment_type === "payment-plan" && price.number_of_payments) {
    formatted = `${price.number_of_payments} × ${formatted}`;
  }
  return { is_free: false, amount: value.toFixed(2), sale_amount: null, currency, formatted };
}

/** What the student opens, by Thinkific content type. */
function contentKind(type: string | null | undefined): string {
  switch (type) {
    case "Quiz":
    case "BrilliumExam":
      return "quiz";
    case "Survey":
      return "survey";
    case "Assignment":
      return "assignment";
    case "LiveLesson":
      return "live lesson";
    default:
      return "lesson";
  }
}

function splitName(name: string): { first_name: string; last_name: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  // Thinkific requires both names; "-" stands in for a missing last name.
  return { first_name: parts[0] ?? "Student", last_name: parts.slice(1).join(" ") || "-" };
}

function signJwt(claims: Record<string, unknown>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

// The connector

interface Entry {
  course: ThinkificCourse;
  product: ThinkificProduct | null;
  /** Shown in the app's catalog: a published, public, visible course product. */
  listed: boolean;
}

interface Catalog {
  /** Every course of the school; unlisted ones are shown only to students enrolled in them. */
  courses: Map<number, Entry>;
  listed: Entry[];
  instructors: Map<number, ThinkificInstructor>;
}

interface Student {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

interface Topic {
  chapter: ThinkificChapter;
  contents: ThinkificContent[];
}

const cache = new Map<string, { at: number; ttl: number; value: Promise<unknown> }>();
const students = new Map<string, { at: number; student: Student | null }>();

const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
const noCourse = () => error(404, "not_found", "Course not found.");
const noLesson = () => error(404, "not_found", "Lesson not found.");

export class ThinkificConnector implements PlatformConnector {
  private readonly client: ThinkificClient;
  private readonly cachePrefix: string;

  constructor(
    private readonly settings: ThinkificSettings,
    private readonly appId: string,
    fetcher: Fetch = fetch,
  ) {
    this.client = new ThinkificClient(settings.subdomain, settings.accessToken, fetcher);
    // The token is part of the key, so a school's data is only served to apps holding its token.
    this.cachePrefix = `${settings.subdomain}:${createHash("sha256").update(settings.accessToken).digest("hex").slice(0, 16)}`;
  }

  private get origin(): string {
    return `https://${this.settings.subdomain}.thinkific.com`;
  }

  private cached<T>(name: string, ttl: number, load: () => Promise<T>): Promise<T> {
    const key = `${this.cachePrefix}:${name}`;
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && now - hit.at < ttl) return hit.value as Promise<T>;
    if (cache.size > 5000) for (const [k, v] of cache) if (now - v.at >= v.ttl) cache.delete(k);
    const value = load();
    cache.set(key, { at: now, ttl, value });
    value.catch(() => {
      if (cache.get(key)?.value === value) cache.delete(key);
    });
    return value;
  }

  private forget(name: string): void {
    cache.delete(`${this.cachePrefix}:${name}`);
  }

  /**
   * Checks the subdomain and token; returns the school's address. The REST
   * API has no endpoint for the school's name.
   * Unverified: whether Thinkific checks X-Auth-Subdomain against a bearer
   * token, so a mistyped subdomain may still pass here.
   */
  async check(): Promise<string> {
    await this.client.request("GET", "/products", { query: { page: 1, limit: 1 } });
    return `${this.settings.subdomain}.thinkific.com`;
  }

  async config() {
    // Loads the catalog, so a school that can't be reached answers 503 from the start.
    await this.catalog();
    return {
      features: { lms: "thinkific", lms_version: "v1", pro: false, certificates: false, quizzes: false, wishlist: false, reviews: false, qna: false, orders: false },
      // Nothing is sold from the app (see the top of this file).
      purchases: { enroll_button: false, free_enrollment: true },
    };
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const route = `${request.method} /${request.path.join("/")}`;
    try {
      switch (route) {
        case "GET /home":
          return { status: 200, body: { sections: await this.home(request) } };
        case "GET /categories":
          // Unverified: Thinkific's collections endpoint wasn't researched, so there are no categories.
          return { status: 200, body: { items: [] } };
        case "GET /courses":
          return await this.courses(request);
        case "GET /me/courses":
          return await this.myCourses(request);
        case "GET /me/wishlist":
        case "GET /me/certificates":
          return request.user ? { status: 200, body: { items: [] } } : signIn();
        case "POST /auth/checkout-link":
          return await this.checkoutLink(request);
      }
      const [first, second, third] = request.path;
      if (first === "me" && second === "wishlist" && third && request.path.length === 3) {
        return error(403, "feature_disabled", "Wishlists aren't available in this app.");
      }
      if (first === "courses" && second) {
        const id = Number(second);
        if (request.method === "GET" && request.path.length === 2) return await this.detail(request, id);
        if (request.method === "GET" && third === "curriculum" && request.path.length === 3) return await this.curriculum(request, id);
        if (request.method === "POST" && third === "enroll" && request.path.length === 3) return await this.enroll(request, id);
      }
      if (first === "lessons" && second) {
        const id = Number(second);
        if (request.method === "GET" && request.path.length === 2) return await this.lesson(request, id);
        if (request.method === "PUT" && third === "progress" && request.path.length === 3) return await this.progress(request, id);
        if (request.method === "POST" && third === "complete" && request.path.length === 3) return await this.complete(request, id);
      }
    } catch (e) {
      if (e instanceof ConnectorError) {
        // As the plugin answers when its LMS is unavailable.
        return error(503, "lms_unavailable", "Courses are not available right now. Please try again in a moment.");
      }
      throw e;
    }
    return null;
  }

  // Data

  private catalog(): Promise<Catalog> {
    return this.cached("catalog", CACHE_MS, async () => {
      const [products, courses] = await Promise.all([
        this.client.all<ThinkificProduct>("/products"),
        this.client.all<ThinkificCourse>("/courses"),
      ]);
      const productById = new Map(products.map((p) => [p.id, p]));
      const entries = new Map<number, Entry>();
      for (const course of courses) {
        const product =
          (course.product_id ? productById.get(course.product_id) : undefined) ??
          products.find((p) => p.productable_type === "Course" && p.productable_id === course.id) ??
          null;
        // Hidden products aren't on the school's course list either; private ones are enrolled in by the school only.
        const listed = Boolean(product && product.productable_type === "Course" && product.status === "published" && !product.private && !product.hidden);
        entries.set(course.id, { course, product, listed });
      }
      const listed = [...entries.values()].filter((e) => e.listed).sort((a, b) => (a.product!.position ?? 0) - (b.product!.position ?? 0) || a.course.id - b.course.id);
      const instructorIds = [...new Set(listed.map((e) => e.course.instructor_id).filter((id): id is number => typeof id === "number" && id > 0))];
      const instructors = new Map<number, ThinkificInstructor>();
      await mapLimit(instructorIds, PARALLEL, async (id) => {
        const { status, data } = await this.client.request<ThinkificInstructor>("GET", `/instructors/${id}`, { allow: [403, 404] });
        if (status === 200 && data) instructors.set(id, data);
      });
      return { courses: entries, listed, instructors };
    });
  }

  /** A course's chapters in order. */
  private chapters(courseId: number): Promise<ThinkificChapter[]> {
    return this.cached(`chapters:${courseId}`, CACHE_MS, async () => (await this.client.all<ThinkificChapter>(`/courses/${courseId}/chapters`)).sort(byPosition));
  }

  /** A course's chapters with their contents, in order. */
  private topics(courseId: number): Promise<Topic[]> {
    return this.cached(`topics:${courseId}`, CACHE_MS, async () => {
      const chapters = await this.chapters(courseId);
      return mapLimit(chapters, PARALLEL, async (chapter) => ({
        chapter,
        contents: (await this.client.all<ThinkificContent>(`/chapters/${chapter.id}/contents`)).sort(byPosition),
      }));
    });
  }

  private async lessonCounts(entries: Entry[]): Promise<Map<number, number>> {
    const counts = await mapLimit(entries, PARALLEL, async (e) => (await this.chapters(e.course.id)).reduce((sum, c) => sum + (c.content_ids?.length ?? 0), 0));
    return new Map(entries.map((e, i) => [e.course.id, counts[i]!]));
  }

  private externalId(user: HostedUser): string {
    return `yallapp-${this.appId.slice(0, 8)}-${user.id}`;
  }

  /** The student's address on Thinkific: stable, derived from the app and user, on a domain Yallapp controls. */
  private studentEmail(user: HostedUser): string {
    return `u${user.id}.${this.appId.slice(0, 8)}@${STUDENT_EMAIL_DOMAIN}`;
  }

  private toStudent(user: HostedUser, found: ThinkificUser): Student {
    const names = splitName(user.name);
    return { id: found.id, email: this.studentEmail(user), first_name: found.first_name || names.first_name, last_name: found.last_name || names.last_name };
  }

  /**
   * The user's Thinkific student, found by our external ID or our own
   * address only (never by the e-mail the user gave the app), and created
   * with them when `create` is set.
   */
  private async student(user: HostedUser, create: boolean): Promise<Student | null> {
    const key = `${this.cachePrefix}:${this.appId}:${user.id}`;
    const hit = students.get(key);
    if (hit && Date.now() - hit.at < (hit.student ? CACHE_MS : NO_STUDENT_MS) && (hit.student || !create)) return hit.student;
    let student = await this.findStudent(user);
    if (!student && create) student = await this.createStudent(user);
    if (students.size > 5000) students.clear();
    students.set(key, { at: Date.now(), student });
    return student;
  }

  private async findStudent(user: HostedUser): Promise<Student | null> {
    const own = this.studentEmail(user);
    const byId = await this.client.request<ThinkificUser>("GET", `/users/${encodeURIComponent(this.externalId(user))}`, { query: { provider: "SSO" }, allow: [404] });
    if (byId.status === 200 && byId.data?.id) return this.toStudent(user, byId.data);
    const byEmail = await this.client.get<Paged<ThinkificUser>>("/users", { "query[email]": own });
    const match = byEmail.items?.find((u) => u.email?.toLowerCase() === own);
    return match ? this.toStudent(user, match) : null;
  }

  private async createStudent(user: HostedUser): Promise<Student> {
    const { status, data } = await this.client.request<ThinkificUser>("POST", "/users", {
      body: {
        ...splitName(user.name),
        email: this.studentEmail(user),
        external_id: this.externalId(user),
        provider: "SSO",
        send_welcome_email: false,
        skip_custom_fields_validation: true,
      },
      allow: [422],
    });
    if (status !== 422 && data?.id) return this.toStudent(user, data);
    // Unverified: a 422 is how Thinkific answers an address that's already taken,
    // here by the same student created at the same moment by another request.
    const again = await this.findStudent(user);
    if (again) return again;
    throw new ConnectorError("Thinkific didn't create the student.");
  }

  /** The user's current enrollments by course, most recently active first. */
  private async enrollments(user: HostedUser | null): Promise<Map<number, ThinkificEnrollment>> {
    if (!user) return new Map();
    const student = await this.student(user, false);
    if (!student) return new Map();
    return this.cached(`enrollments:${student.id}`, ENROLLMENTS_MS, async () => {
      const rows = await this.client.all<ThinkificEnrollment>("/enrollments", { "query[user_id]": student.id });
      const current = rows
        .filter((e) => !e.expired && (e.user_id === undefined || e.user_id === student.id))
        .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
      return new Map(current.map((e) => [e.course_id, e]));
    });
  }

  private async forgetEnrollments(user: HostedUser): Promise<void> {
    const student = await this.student(user, false);
    if (student) this.forget(`enrollments:${student.id}`);
  }

  /** A course the request may see: listed, or one the student is enrolled in. */
  private async find(request: ConnectorRequest, id: number): Promise<{ entry: Entry; enrollment: ThinkificEnrollment | null } | null> {
    if (!Number.isSafeInteger(id) || id < 1) return null;
    const entry = (await this.catalog()).courses.get(id);
    if (!entry) return null;
    const enrollment = (await this.enrollments(request.user)).get(id) ?? null;
    return entry.listed || enrollment ? { entry, enrollment } : null;
  }

  /** A lesson (content) with its course, found through its chapter. */
  private async locate(request: ConnectorRequest, id: number) {
    if (!Number.isSafeInteger(id) || id < 1) return null;
    const content = await this.cached(`content:${id}`, CACHE_MS, async () => {
      const { status, data } = await this.client.request<ThinkificContent>("GET", `/contents/${id}`, { allow: [404] });
      return status === 200 ? data : null;
    });
    if (!content?.chapter_id) return null;
    const catalog = await this.catalog();
    const entry = [...catalog.courses.values()].find((e) => e.course.chapter_ids?.includes(content.chapter_id!));
    if (!entry) return null;
    const found = await this.find(request, entry.course.id);
    if (!found) return null;
    const topics = await this.topics(entry.course.id);
    const contents = topics.flatMap((t) => t.contents);
    const index = contents.findIndex((c) => c.id === id);
    if (index < 0) return null;
    return { ...found, contents, index, content: contents[index]! };
  }

  // Mapping

  private summary(catalog: Catalog, entry: Entry, enrolled: boolean, lessonCount: number) {
    const { course, product } = entry;
    const instructor = course.instructor_id ? catalog.instructors.get(course.instructor_id) : undefined;
    const instructorName = [instructor?.first_name, instructor?.last_name].filter(Boolean).join(" ").trim();
    return {
      id: course.id,
      title: course.name || product?.name || "Course",
      image_url: secureUrl(course.course_card_image_url) ?? secureUrl(product?.card_image_url),
      ...(instructor && instructorName
        ? { instructor: { id: instructor.id, name: instructorName, avatar_url: secureUrl(instructor.avatar_url), bio: instructor.bio || null } }
        : {}),
      price: priceJson(product),
      lesson_count: lessonCount,
      rating: null,
      rating_count: 0,
      enrolled,
      wishlisted: false,
    };
  }

  private async summaries(entries: Entry[], enrollments: Map<number, ThinkificEnrollment>) {
    const catalog = await this.catalog();
    const counts = await this.lessonCounts(entries);
    return entries.map((e) => this.summary(catalog, e, enrollments.has(e.course.id), counts.get(e.course.id) ?? 0));
  }

  /**
   * Course progress from the enrollment. Thinkific reports a share of the
   * course, not which lessons are done, so completed_items is that share of
   * the lessons.
   */
  private progressJson(courseId: number, total: number, enrollment: ThinkificEnrollment | null) {
    const share = enrollment ? completion(enrollment) : 0;
    const done = Boolean(enrollment && (enrollment.completed || share >= 1));
    return {
      course_id: courseId,
      completed_items: done ? total : Math.min(total, Math.round(share * total)),
      total_items: total,
      percent: done ? 100 : Math.min(100, Math.round(share * 100)),
      course_completed: done,
    };
  }

  /**
   * Every content is a "lesson" to the app: quizzes, surveys and
   * assignments all open in Thinkific's player the same way. A lesson is
   * shown completed only when the whole course is (see progressJson).
   */
  private item(content: ThinkificContent, open: boolean, completed: boolean) {
    return {
      id: content.id,
      type: "lesson",
      title: content.name,
      duration_minutes: null,
      question_count: null,
      preview: Boolean(content.free),
      locked: !open && !content.free,
      completed,
    };
  }

  private async myCourse(catalog: Catalog, entry: Entry, enrollment: ThinkificEnrollment) {
    const total = (await this.lessonCounts([entry])).get(entry.course.id) ?? 0;
    return {
      course: this.summary(catalog, entry, true, total),
      progress: this.progressJson(entry.course.id, total, enrollment),
      certificate_url: null,
    };
  }

  /** Where Thinkific's player opens a content. */
  private takeUrl(entry: Entry, content: ThinkificContent): string {
    // Unverified: the course landing page (/courses/<slug>), used only when a content has no take_url.
    return secureUrl(content.take_url) ?? `${this.origin}/courses/${encodeURIComponent(entry.course.slug ?? String(entry.course.id))}`;
  }

  /**
   * The SSO address that signs the student in and then opens `returnTo`
   * (Thinkific's custom JWT SSO, HS256 with the API access token's SSO
   * signing secret). The token is only valid for a couple of minutes.
   */
  private async ssoUrl(user: HostedUser, returnTo: string, now: Date): Promise<string | null> {
    if (!this.settings.ssoSecret) return null;
    const student = await this.student(user, true);
    if (!student) return null;
    const jwt = signJwt(
      {
        email: student.email,
        first_name: student.first_name,
        last_name: student.last_name,
        iat: Math.floor(now.getTime() / 1000),
        external_id: this.externalId(user),
      },
      this.settings.ssoSecret,
    );
    const url = new URL(`${this.origin}/api/sso/v2/sso/jwt`);
    url.searchParams.set("jwt", jwt);
    url.searchParams.set("return_to", returnTo);
    url.searchParams.set("error_url", returnTo);
    return url.toString();
  }

  // Endpoints

  private async home(request: ConnectorRequest) {
    const catalog = await this.catalog();
    const enrollments = await this.enrollments(request.user);
    const sections: Record<string, unknown>[] = [];
    for (const [courseId, enrollment] of enrollments) {
      const entry = catalog.courses.get(courseId);
      if (!entry || enrollment.completed || completion(enrollment) >= 1) continue;
      sections.push({ type: "continue_learning", title: "Continue learning", course: await this.myCourse(catalog, entry, enrollment) });
      break;
    }
    const latest = [...catalog.listed].sort((a, b) => (b.product?.created_at ?? "").localeCompare(a.product?.created_at ?? "")).slice(0, 10);
    if (latest.length) sections.push({ type: "latest_courses", title: "Latest courses", courses: await this.summaries(latest, enrollments) });
    return sections;
  }

  private async courses(request: ConnectorRequest): Promise<ConnectorResult> {
    const { query } = request;
    const page = intParam(query, "page", 1, 10_000);
    const perPage = intParam(query, "per_page", 20, 50);
    const search = (query.get("search") ?? "").trim().toLowerCase();
    const category = Number(query.get("category") ?? 0);
    const price = query.get("price") ?? "all";
    const orderby = query.get("orderby") ?? "newest";
    const catalog = await this.catalog();
    let all = catalog.listed
      .filter((e) => !search || `${e.course.name} ${e.product?.name ?? ""}`.toLowerCase().includes(search))
      // There are no categories (see GET /categories), so filtering by one finds nothing.
      .filter(() => !category)
      .filter((e) => price === "all" || (price === "free") === isFree(e.product));
    if (orderby === "title") all = [...all].sort((a, b) => a.course.name.localeCompare(b.course.name));
    // Thinkific has no popularity figure; "popular" keeps the order the school set.
    else if (orderby !== "popular") all = [...all].sort((a, b) => (b.product?.created_at ?? "").localeCompare(a.product?.created_at ?? ""));
    const items = await this.summaries(all.slice((page - 1) * perPage, page * perPage), await this.enrollments(request.user));
    return { status: 200, body: { page, per_page: perPage, total: all.length, total_pages: Math.max(1, Math.ceil(all.length / perPage)), items } };
  }

  private async detail(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const found = await this.find(request, id);
    if (!found) return noCourse();
    const { entry, enrollment } = found;
    const catalog = await this.catalog();
    const chapters = await this.chapters(id);
    const total = chapters.reduce((sum, c) => sum + (c.content_ids?.length ?? 0), 0);
    const seconds = chapters.reduce((sum, c) => sum + (c.duration_in_seconds ?? 0), 0);
    // Paid courses aren't sold from the app (see checkoutLink).
    const action = enrollment ? "continue" : entry.listed && isFree(entry.product) ? "enroll_free" : "none";
    return {
      status: 200,
      body: {
        ...this.summary(catalog, entry, Boolean(enrollment), total),
        description_html: cleanHtml(entry.course.description || entry.product?.description),
        duration_minutes: seconds > 0 ? Math.round(seconds / 60) : null,
        level: null,
        has_certificate: Boolean(entry.product?.has_certificate),
        qna: false,
        categories: [],
        purchase: { action },
      },
    };
  }

  private async curriculum(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const found = await this.find(request, id);
    if (!found) return noCourse();
    const open = Boolean(found.enrollment);
    const done = this.progressJson(id, 0, found.enrollment).course_completed;
    const topics = await this.topics(id);
    return {
      status: 200,
      body: { topics: topics.map((t) => ({ id: t.chapter.id, title: t.chapter.name, items: t.contents.map((c) => this.item(c, open, done)) })) },
    };
  }

  private async enroll(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const user = request.user;
    if (!user) return signIn();
    const found = await this.find(request, id);
    if (!found) return noCourse();
    if (found.enrollment) {
      return { status: 200, body: { course_id: id, enrolled_at: isoDate(found.enrollment.activated_at ?? found.enrollment.started_at, request.now) } };
    }
    // Thinkific enrolls whoever the admin token asks for, so only free, listed courses are enrolled in here.
    if (!found.entry.listed || !isFree(found.entry.product)) return error(403, "purchase_required", "This course isn't free.");
    const student = await this.student(user, true);
    // Without activated_at the enrollment would be a free trial.
    const { data } = await this.client.request<ThinkificEnrollment>("POST", "/enrollments", {
      body: { course_id: id, user_id: student!.id, activated_at: request.now.toISOString() },
    });
    this.forget(`enrollments:${student!.id}`);
    return { status: 200, body: { course_id: id, enrolled_at: isoDate(data?.activated_at, request.now) } };
  }

  private async myCourses(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const status = request.query.get("status") ?? "in_progress";
    if (status !== "in_progress" && status !== "completed") return error(400, "invalid_request", "Unknown status.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const catalog = await this.catalog();
    const mine: { entry: Entry; enrollment: ThinkificEnrollment }[] = [];
    for (const [courseId, enrollment] of await this.enrollments(request.user)) {
      const entry = catalog.courses.get(courseId);
      const done = Boolean(enrollment.completed || completion(enrollment) >= 1);
      if (entry && done === (status === "completed")) mine.push({ entry, enrollment });
    }
    const items = await Promise.all(mine.slice((page - 1) * perPage, page * perPage).map((m) => this.myCourse(catalog, m.entry, m.enrollment)));
    return { status: 200, body: { page, per_page: perPage, total: mine.length, total_pages: Math.max(1, Math.ceil(mine.length / perPage)), items } };
  }

  /**
   * Thinkific's REST API has no lesson body, so the lesson is a short page
   * that opens it in Thinkific's course player. With the SSO secret and a
   * signed-in student it opens in the app's web view, signed in through
   * Thinkific's SSO; otherwise the link opens the player in the browser,
   * where the student signs in to the school.
   */
  private async lesson(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const found = await this.locate(request, id);
    if (!found) return noLesson();
    const { entry, enrollment, contents, index, content } = found;
    if (!enrollment && !content.free) return error(403, "not_enrolled", "Enroll in the course to open this lesson.");
    const take = this.takeUrl(entry, content);
    const sso = request.user ? await this.ssoUrl(request.user, take, request.now) : null;
    const kind = contentKind(content.contentable_type);
    const html = `<p><strong>${escapeHtml(content.name)}</strong> opens in the school's course player.</p><p><a href="${escapeHtml(sso ?? take)}">Open the ${kind}</a></p>`;
    return {
      status: 200,
      body: {
        id: content.id,
        course_id: entry.course.id,
        title: content.name,
        render_mode: sso ? "webview" : "native",
        html,
        webview_url: sso,
        embeds: [],
        embed_height: null,
        attachments: [],
        completed: this.progressJson(entry.course.id, 0, enrollment).course_completed,
        position_seconds: 0,
        previous_id: contents[index - 1]?.id ?? null,
        next_id: contents[index + 1]?.id ?? null,
      },
    };
  }

  /** Thinkific's player keeps video positions itself; the app's position is accepted and not stored. */
  private async progress(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const found = await this.locate(request, id);
    if (!found?.enrollment) return error(403, "not_enrolled", "Enroll in the course to save your progress.");
    const position = Number((request.body as { position_seconds?: unknown } | null)?.position_seconds);
    if (!Number.isInteger(position) || position < 0) return error(400, "invalid_request", "position_seconds must be a whole number.");
    return { status: 204 };
  }

  /**
   * Thinkific can't mark a lesson complete for a student: the REST API has
   * no such endpoint, and GraphQL's markLessonComplete acts only for the
   * signed-in Thinkific user. Students complete lessons in Thinkific's
   * player, which records it, so this answers with the course progress
   * Thinkific reports now (read fresh) rather than pretending to save it.
   */
  private async complete(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const user = request.user;
    if (!user) return signIn();
    await this.forgetEnrollments(user);
    const found = await this.locate(request, id);
    if (!found?.enrollment) return error(403, "not_enrolled", "Enroll in the course to complete lessons.");
    return { status: 200, body: this.progressJson(found.entry.course.id, found.contents.length, found.enrollment) };
  }

  /**
   * Nothing is sold from the app: a purchase on Thinkific's checkout can't be
   * matched to the app's student (whoever signs in or types an address there
   * gets the course), so paid courses are bought on the school's website.
   */
  private async checkoutLink(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    return error(403, "purchase_not_allowed", "This course is sold on the school's website.");
  }
}

/** Clears cached catalogs, students and the request counts (tests). */
export function clearThinkificCache(): void {
  cache.clear();
  students.clear();
  requestTimes.clear();
}

export const THINKIFIC_PLATFORM: PlatformDefinition = {
  id: "thinkific",
  name: "Thinkific",
  appType: "lms",
  summary: "Courses, lessons and progress from your Thinkific school, with free enrollment in the app.",
  fields: [
    {
      name: "subdomain",
      label: "School subdomain",
      hint: "The first part of your school's thinkific.com address: for your-school.thinkific.com, enter your-school. It's the address your Thinkific admin opens at (your-school.thinkific.com/manage).",
      secret: false,
      placeholder: "your-school",
    },
    {
      name: "accessToken",
      label: "Access token",
      hint: "In your Thinkific admin, go to Settings > Code & analytics > API, add an API access token and copy it (Thinkific shows it only once). API access needs the Grow plan or higher.",
      secret: true,
    },
    {
      name: "ssoSecret",
      label: "SSO signing secret",
      hint: "Optional, Thinkific Plus only. Shown once next to the API access token when you create it. With it, students open lessons already signed in to your school.",
      secret: true,
      optional: true,
    },
  ],
  normalize(values) {
    const subdomain = normalizeSubdomain(values.subdomain ?? "");
    if (!subdomain) {
      return { errors: { subdomain: "Enter your school's thinkific.com address, for example your-school or your-school.thinkific.com (not a custom domain)." } };
    }
    return { values: { ...values, subdomain, accessToken: (values.accessToken ?? "").trim(), ssoSecret: (values.ssoSecret ?? "").trim() } };
  },
  create(values, deps) {
    return new ThinkificConnector(
      { subdomain: values.subdomain ?? "", accessToken: values.accessToken ?? "", ssoSecret: values.ssoSecret || null },
      deps.appId,
      deps.fetcher,
    );
  },
};

registerPlatform(THINKIFIC_PLATFORM);
