import type { HostedUser } from "../../data/types";
import { error, intParam, verifiedEmail } from "./common";
import { registerPlatform, type PlatformConnector, type PlatformDefinition, type PlatformDeps } from "./platforms";
import { ConnectorError, type ConnectorRequest, type ConnectorResult } from "./types";

/**
 * Teachable for Course apps: a school's published courses, their sections
 * and lectures, free enrolment, lecture completion and progress, through the
 * Teachable Public API (v1) with the school owner's API key (Growth plan or
 * higher). Courses, sections and lectures keep Teachable's numeric IDs.
 *
 * Teachable knows students by e-mail only. The e-mail a student who signs
 * in by phone gives the app isn't verified, so it's never used to find a
 * Teachable account (anyone could type another student's): such a student is
 * found or created in Teachable only by the stable address
 * `u<user id>.<first 8 characters of the app ID>@students.yallapp.com.tr`
 * (a domain we control), with `src` "yallapp". 19 A student who signs in by
 * email proved their address with a code: they are the Teachable student
 * with that address (found, or created with it), so courses they bought on
 * the school's website show in the app.
 *
 * Teachable allows 100 API requests per minute per school, and lecture titles
 * need one request per lecture, so the catalog is cached for 10 minutes and
 * lecture titles are only loaded while the school has requests to spare.
 * The app doesn't sell courses: a purchase on Teachable's checkout is made
 * with whatever e-mail the buyer types and can't be matched to the app's
 * student, so paid courses are sold on the school's website only. Free
 * courses are enrolled in from the app.
 */

const API = "https://developers.teachable.com/v1";
const CACHE_MS = 10 * 60_000;
/** A student's enrolments and progress change outside the app (purchases on the school). */
const STUDENT_CACHE_MS = 60_000;
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60_000;
/** Requests kept for students' own actions: lecture titles and list details stop loading below this. */
const RATE_RESERVE = 25;
const CONCURRENCY = 4;
const MAX_PAGES = 50;
const STUDENT_DOMAIN = "students.yallapp.com.tr";

type Fetch = typeof fetch;

export interface TeachableSettings {
  /** "your-school.teachable.com" or the school's custom domain. */
  school: string;
  apiKey: string;
}

// Teachable's objects. Every field but the ID is optional: the API's schema is only partly documented.

interface TCourse {
  id: number;
  name?: string | null;
  heading?: string | null;
  description?: string | null;
  is_published?: boolean | null;
  image_url?: string | null;
}
interface TSection {
  id: number;
  name?: string | null;
  is_published?: boolean | null;
  position?: number | null;
  lectures?: { id: number; position?: number | null; is_published?: boolean | null }[] | null;
}
interface TCourseDetail extends TCourse {
  lecture_sections?: TSection[] | null;
  author_bio?: { name?: string | null; bio?: string | null; profile_image_url?: string | null; user_id?: number | null } | null;
}
interface TAttachment {
  id: number;
  name?: string | null;
  kind?: string | null;
  url?: string | null;
  text?: string | null;
  position?: number | null;
}
interface TLecture {
  id: number;
  name?: string | null;
  is_published?: boolean | null;
  position?: number | null;
  attachments?: TAttachment[] | null;
}
interface TPlan {
  id: number;
  name?: string | null;
  price?: number | null;
  currency?: string | null;
  course_id?: number | null;
  frequency?: { type?: string | null } | null;
}
interface TEnrollment {
  course_id: number;
  enrolled_at?: string | null;
  is_active_enrollment?: boolean | null;
  completed_at?: string | null;
  percent_complete?: number | null;
}
interface TUser {
  id: number;
  email?: string | null;
  courses?: TEnrollment[] | null;
}
interface TProgress {
  lecture_sections?: { lectures?: { id: number; is_completed?: boolean | null; completed_at?: string | null }[] | null }[] | null;
}
interface TVideo {
  video_asset?: { url?: string | null } | null;
  url_thumbnail?: string | null;
  media_duration?: number | null;
}

/** An HTTP error Teachable answered with. */
export class TeachableError extends ConnectorError {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TeachableError";
  }
}

/** Thrown when an optional request would use the requests kept for students' actions. */
class NoSpareRequests extends ConnectorError {}

/** Each school's requests in the last minute, and how long Teachable asked us to wait. */
const usage = new Map<string, { calls: number[]; blockedUntil: number }>();

export class TeachableClient {
  constructor(
    private readonly settings: TeachableSettings,
    private readonly fetcher: Fetch = fetch,
  ) {}

  private usage() {
    let entry = usage.get(this.settings.school);
    if (!entry) usage.set(this.settings.school, (entry = { calls: [], blockedUntil: 0 }));
    const now = Date.now();
    entry.calls = entry.calls.filter((at) => now - at < RATE_WINDOW_MS);
    return entry;
  }

  /** Requests left this minute. */
  remaining(): number {
    const entry = this.usage();
    return Date.now() < entry.blockedUntil ? 0 : RATE_LIMIT - entry.calls.length;
  }

  /** Whether an optional request (a lecture title, a list's course details) fits in this minute's budget. */
  hasSpare(): boolean {
    return this.remaining() > RATE_RESERVE;
  }

  async request<T>(
    method: "GET" | "POST",
    path: string,
    options: { query?: Record<string, string | number>; body?: unknown; optional?: boolean } = {},
  ): Promise<T | null> {
    const entry = this.usage();
    if (Date.now() < entry.blockedUntil || entry.calls.length >= RATE_LIMIT) throw new ConnectorError("Teachable's request limit was reached.");
    if (options.optional && RATE_LIMIT - entry.calls.length <= RATE_RESERVE) throw new NoSpareRequests("No spare Teachable requests this minute.");
    entry.calls.push(Date.now());
    const url = new URL(`${API}${path}`);
    for (const [name, value] of Object.entries(options.query ?? {})) url.searchParams.set(name, String(value));
    let response: Response;
    try {
      response = await this.fetcher(url.toString(), {
        method,
        headers: {
          accept: "application/json",
          apiKey: this.settings.apiKey,
          ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
        },
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ConnectorError("Teachable didn't answer.");
    }
    if (response.status === 429) {
      // Unverified: the docs show RateLimit-Reset as the seconds to wait.
      const wait = Number(response.headers.get("ratelimit-reset"));
      entry.blockedUntil = Date.now() + (Number.isFinite(wait) && wait > 0 ? Math.min(wait, 3600) : 60) * 1000;
      throw new TeachableError("Teachable's request limit was reached.", 429);
    }
    if (!response.ok) throw new TeachableError(`Teachable answered HTTP ${response.status}.`, response.status);
    if (response.status === 204) return null;
    const text = await response.text().catch(() => "");
    if (!text.trim()) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ConnectorError("Teachable sent an unreadable answer.");
    }
  }

  /**
   * Every item of a paginated list.
   * Unverified: the default and largest page sizes differ between Teachable's pages, so the
   * default is kept and the pages are followed until `meta.number_of_pages`.
   */
  async list<T>(path: string, field: string, query: Record<string, string | number> = {}): Promise<T[]> {
    const out: T[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const body = await this.request<Record<string, unknown>>("GET", path, { query: { ...query, page } });
      const items = Array.isArray(body?.[field]) ? (body[field] as T[]) : [];
      out.push(...items);
      const pages = Number((body?.meta as { number_of_pages?: unknown } | undefined)?.number_of_pages ?? 1);
      if (items.length === 0 || !Number.isFinite(pages) || page >= pages) break;
    }
    return out;
  }
}

// Caches (per app and school)

const cache = new Map<string, { at: number; value: unknown }>();
const loading = new Map<string, Promise<unknown>>();
/** Teachable user IDs of the app's students, by app, school and user. */
const students = new Map<string, number>();
/** The course of each lecture seen, by app, school and lecture. */
const lectureCourses = new Map<string, number>();

async function cached<T>(key: string, ms: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ms) return hit.value as T;
  const pending = loading.get(key);
  if (pending) return pending as Promise<T>;
  const promise = load()
    .then((value) => {
      cache.set(key, { at: Date.now(), value });
      return value;
    })
    .finally(() => loading.delete(key));
  loading.set(key, promise);
  return promise;
}

/** Clears the catalog, student and request caches (tests). */
export function clearTeachableCache(): void {
  cache.clear();
  loading.clear();
  students.clear();
  lectureCourses.clear();
  usage.clear();
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
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

// Helpers

const published = (item: { is_published?: boolean | null }) => item.is_published !== false;
const byPosition = <T extends { position?: number | null }>(items: T[]) =>
  items.map((item, i) => ({ item, i })).sort((a, b) => (a.item.position ?? a.i) - (b.item.position ?? b.i) || a.i - b.i).map((x) => x.item);

/** An absolute http(s) URL, or null. */
export function webUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim().startsWith("//") ? `https:${value.trim()}` : value.trim();
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return /\s/.test(text) ? url.href : text;
  } catch {
    return null;
  }
}

/** Escapes text for HTML text and double-quoted attributes. */
const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function isoDate(value: unknown, fallback: Date): string {
  const date = typeof value === "string" ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : fallback.toISOString();
}

const percentOf = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0;
};

/** Whether a plan is free. Unverified: `frequency.type` "free" comes from a mirror of the API's schema; a price of 0 counts too. */
const isFreePlan = (plan: TPlan) => plan.frequency?.type === "free" || plan.price === 0;

function formatPrice(cents: number, currency: string | null): string {
  const amount = cents / 100;
  if (currency) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  }
  return amount.toFixed(2);
}

// Lesson HTML

const DROP_WITH_CONTENT = /<(script|style|object|form|noscript|template|textarea|select|svg|math)\b[\s\S]*?<\/\1\s*>/gi;
const DROP_TAGS = /<\/?(script|style|object|form|noscript|template|textarea|select|svg|math|embed|meta|link|base|input|button|frame|frameset|applet)\b[^>]*>/gi;
const URL_ATTRIBUTES = new Set(["href", "src", "action", "formaction", "xlink:href", "poster", "background", "data", "srcset"]);

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16) || 32))
    .replace(/&#(\d+);?/g, (_, dec: string) => String.fromCodePoint(Number(dec) || 32))
    .replace(/&colon;/gi, ":")
    .replace(/&tab;|&newline;/gi, "");
}

function cleanAttributes(attributes: string): string {
  const out: string[] = [];
  const pattern = /([^\s"'=<>/]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
  for (const match of attributes.matchAll(pattern)) {
    const name = match[1]!.toLowerCase();
    const raw = match[2];
    const value = raw === undefined ? "" : raw.replace(/^["']|["']$/g, "");
    if (name.startsWith("on") || name === "srcdoc" || name === "formaction") continue;
    const plain = decodeEntities(value).replace(/[\s\u0000-\u001f]+/g, "").toLowerCase();
    if (URL_ATTRIBUTES.has(name) && /^(javascript|vbscript|data|file):/.test(plain)) continue;
    if (name === "style" && /expression\(|javascript:|url\(/.test(plain)) continue;
    out.push(raw === undefined ? name : `${name}="${value.replace(/"/g, "&quot;")}"`);
  }
  return out.length ? ` ${out.join(" ")}` : "";
}

/**
 * Removes what lesson HTML must not carry: scripts, styles, forms, event
 * handlers and script URLs. The app renders the HTML natively; this keeps
 * what it shows to text, media and links.
 */
export function cleanHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(DROP_WITH_CONTENT, "")
    .replace(DROP_TAGS, "")
    .replace(/<([a-z][a-z0-9-]*)(\s[^>]*?)?(\/?)>/gi, (_, name: string, attributes: string | undefined, close: string) =>
      `<${name}${attributes ? cleanAttributes(attributes) : ""}${close ? " /" : ""}>`,
    );
}

interface Embed {
  placeholder: string;
  src: string;
  provider: "youtube" | "vimeo" | "same_site" | "other";
  width: string | null;
  height: string | null;
  aspect_ratio: number | null;
  allow_fullscreen: boolean;
}

function attribute(attributes: string, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s"'>]+)`, "i").exec(attributes);
  return match ? match[1]!.replace(/^["']|["']$/g, "") : null;
}

/** Replaces each iframe with the app's placeholder and lists it in `embeds`, as the Lesson schema says. */
export function extractEmbeds(html: string, school: string): { html: string; embeds: Embed[] } {
  const embeds: Embed[] = [];
  const out = html.replace(/<iframe\b([^>]*)>(?:[\s\S]*?<\/iframe\s*>)?/gi, (_, attributes: string) => {
    const src = webUrl(decodeEntities(attribute(attributes, "src") ?? ""));
    if (!src) return "";
    const host = new URL(src).hostname.toLowerCase();
    const provider: Embed["provider"] = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/.test(host)
      ? "youtube"
      : /(^|\.)vimeo\.com$/.test(host)
        ? "vimeo"
        : host === school
          ? "same_site"
          : "other";
    const width = attribute(attributes, "width");
    const height = attribute(attributes, "height");
    const w = width && /^\d+(\.\d+)?$/.test(width) ? Number(width) : null;
    const h = height && /^\d+(\.\d+)?$/.test(height) ? Number(height) : null;
    const placeholder = `yallapp-embed-${embeds.length + 1}`;
    embeds.push({
      placeholder,
      src,
      provider,
      width,
      height,
      aspect_ratio: w && h ? Math.round((w / h) * 10_000) / 10_000 : null,
      allow_fullscreen: /(^|\s)(allowfullscreen|webkitallowfullscreen|mozallowfullscreen)(\s|=|$)/i.test(attributes) || /fullscreen/i.test(attribute(attributes, "allow") ?? ""),
    });
    return `<div data-yallapp-embed="${placeholder}"></div>`;
  });
  return { html: out, embeds };
}

// The course outline

interface Outline {
  sections: { id: number; title: string; lectures: number[] }[];
  lectures: number[];
}

function outlineOf(detail: TCourseDetail): Outline {
  // Unverified: whether unpublished sections and lectures are listed; they're left out either way.
  const sections = byPosition((detail.lecture_sections ?? []).filter(published)).map((s) => ({
    id: s.id,
    title: s.name?.trim() || "Section",
    lectures: byPosition((s.lectures ?? []).filter(published)).map((l) => l.id),
  }));
  return { sections, lectures: sections.flatMap((s) => s.lectures) };
}

type Pricing = { free: boolean; paid: TPlan | null };

/** The Lesson schema's `video`. */
interface LessonVideo {
  source: "upload";
  url: string;
  expires_at: string | null;
  embed_html: null;
  duration_seconds: number | null;
  poster_url: string | null;
}

const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
const noCourse = () => error(404, "not_found", "Course not found.");
const noLesson = () => error(404, "not_found", "Lesson not found.");

export class TeachableConnector implements PlatformConnector {
  readonly client: TeachableClient;

  constructor(
    private readonly settings: TeachableSettings,
    private readonly deps: Pick<PlatformDeps, "appId" | "store" | "fetcher">,
  ) {
    this.client = new TeachableClient(settings, deps.fetcher);
  }

  private key(name: string): string {
    return `${this.deps.appId}:${this.settings.school}:${name}`;
  }

  /**
   * Checks the API key and returns the school's name.
   * Unverified: the API has no documented school endpoint, so the school's address stands in for
   * its name, and the address can't be checked against the key.
   */
  async check(): Promise<string> {
    await this.client.request("GET", "/courses", { query: { page: 1 } });
    return this.settings.school;
  }

  async config() {
    return {
      features: {
        lms: "teachable",
        lms_version: "v1",
        pro: false,
        certificates: false,
        quizzes: false,
        wishlist: false,
        reviews: false,
        qna: false,
        orders: false,
      },
      // Paid courses are sold on the school's website only (see above), on every platform.
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
          // Teachable's API has no course categories.
          return { status: 200, body: { items: [] } };
        case "GET /courses":
          return await this.courses(request);
        case "GET /me/courses":
          return await this.myCourses(request);
        case "GET /me/wishlist":
        case "GET /me/certificates":
          return request.user ? { status: 200, body: { items: [] } } : signIn();
        case "POST /auth/checkout-link":
          return this.checkoutLink(request);
      }
      const [first, second, third] = request.path;
      if (first === "me" && second === "wishlist" && third && request.path.length === 3 && (request.method === "PUT" || request.method === "DELETE")) {
        return request.user ? error(403, "feature_disabled", "Wishlists aren't available in this app.") : signIn();
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
        if (request.method === "PUT" && third === "progress" && request.path.length === 3) return await this.saveProgress(request, id);
        if (request.method === "POST" && third === "complete" && request.path.length === 3) return await this.complete(request, id);
      }
    } catch (e) {
      if (e instanceof ConnectorError) {
        return error(503, "lms_unavailable", "The school can't be reached right now. Please try again in a moment.");
      }
      throw e;
    }
    return null;
  }

  // Catalog

  /** The school's published courses, newest first. Unverified: there's no creation date, so a higher ID counts as newer. */
  private courseList(): Promise<TCourse[]> {
    return cached(this.key("courses"), CACHE_MS, async () => {
      // Unverified: the `is_published` filter comes from a mirror of the API's schema; the flag is checked here too.
      const all = await this.client.list<TCourse>("/courses", "courses", { is_published: "true" });
      return all.filter((c) => Number.isSafeInteger(c?.id) && published(c)).sort((a, b) => b.id - a.id);
    });
  }

  private async findCourse(id: number): Promise<TCourse | null> {
    if (!Number.isSafeInteger(id) || id < 1) return null;
    return (await this.courseList()).find((c) => c.id === id) ?? null;
  }

  /** The course with its sections, lectures and author; null when Teachable doesn't know it. */
  private structure(id: number, optional = false): Promise<TCourseDetail | null> {
    const key = this.key(`course:${id}`);
    const hit = cache.get(key);
    if (optional && !(hit && Date.now() - hit.at < CACHE_MS) && !this.client.hasSpare()) return Promise.resolve(null);
    return cached(key, CACHE_MS, async () => {
      try {
        const body = await this.client.request<{ course?: TCourseDetail }>("GET", `/courses/${id}`, { optional });
        const detail = body?.course ?? null;
        if (detail) for (const lecture of outlineOf(detail).lectures) lectureCourses.set(this.key(`lecture:${lecture}`), id);
        return detail;
      } catch (e) {
        if (e instanceof TeachableError && e.status === 404) return null;
        throw e;
      }
    });
  }

  /** For lists: the course's details when they're cached or there are requests to spare, else null. */
  private async structureIfSpare(id: number): Promise<TCourseDetail | null> {
    try {
      return await this.structure(id, true);
    } catch (e) {
      if (e instanceof ConnectorError) return null;
      throw e;
    }
  }

  private plans(): Promise<TPlan[]> {
    // Unverified: the list has no documented course filter, so every plan is read and grouped here.
    return cached(this.key("plans"), CACHE_MS, async () => (await this.client.list<TPlan>("/pricing_plans", "pricing_plans")).filter((p) => p?.id));
  }

  /** A course is free with a free plan or without a paid one; otherwise its cheapest paid plan is the price. */
  private pricing(courseId: number, plans: TPlan[]): Pricing {
    const own = plans.filter((p) => p.course_id === courseId);
    const paid = own.filter((p) => !isFreePlan(p)).sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    return { free: own.some(isFreePlan) || paid.length === 0, paid: paid[0] ?? null };
  }

  private price(pricing: Pricing) {
    const plan = pricing.paid;
    if (pricing.free || !plan || typeof plan.price !== "number") return { is_free: pricing.free, amount: null, sale_amount: null, currency: null, formatted: null };
    // Unverified: `price` is taken as the currency's minor unit (8600 = 86.00).
    const currency = plan.currency?.trim().toUpperCase() || null;
    return { is_free: false, amount: (plan.price / 100).toFixed(2), sale_amount: null, currency, formatted: formatPrice(plan.price, currency) };
  }

  private summary(c: TCourse, detail: TCourseDetail | null, enrolled: Set<number>, plans: TPlan[]) {
    const author = detail?.author_bio;
    const name = author?.name?.trim();
    return {
      id: c.id,
      title: c.name?.trim() || detail?.name?.trim() || "Course",
      image_url: webUrl(c.image_url ?? detail?.image_url),
      ...(name
        ? { instructor: { id: Number.isSafeInteger(author?.user_id) ? author!.user_id! : 0, name, avatar_url: webUrl(author?.profile_image_url), bio: author?.bio?.trim() || null } }
        : {}),
      price: this.price(this.pricing(c.id, plans)),
      lesson_count: detail ? outlineOf(detail).lectures.length : 0,
      rating: null,
      rating_count: 0,
      enrolled: enrolled.has(c.id),
      wishlisted: false,
    };
  }

  private async summaries(courses: TCourse[], enrolled: Set<number>) {
    const plans = await this.plans();
    const details = await mapLimit(courses, CONCURRENCY, (c) => this.structureIfSpare(c.id));
    return courses.map((c, i) => this.summary(c, details[i] ?? null, enrolled, plans));
  }

  /** The lecture with its title and content, cached; optional loads give up when the school has no requests to spare. */
  private lecture(courseId: number, lectureId: number, optional = false): Promise<TLecture | null> {
    const key = this.key(`lecture-content:${lectureId}`);
    const hit = cache.get(key);
    if (optional && !(hit && Date.now() - hit.at < CACHE_MS) && !this.client.hasSpare()) return Promise.resolve(null);
    return cached(key, CACHE_MS, async () => {
      try {
        const body = await this.client.request<{ lecture?: TLecture }>("GET", `/courses/${courseId}/lectures/${lectureId}`, { optional });
        return body?.lecture ?? null;
      } catch (e) {
        if (e instanceof TeachableError && e.status === 404) return null;
        throw e;
      }
    });
  }

  /** Lecture titles in course order; "Lesson N" for those not loaded yet (they fill in on later visits). */
  private async titles(courseId: number, outline: Outline): Promise<Map<number, string>> {
    const lectures = await mapLimit(outline.lectures, CONCURRENCY, async (id) => {
      try {
        return await this.lecture(courseId, id, true);
      } catch (e) {
        if (e instanceof ConnectorError) return null;
        throw e;
      }
    });
    return new Map(outline.lectures.map((id, i) => [id, lectures[i]?.name?.trim() || `Lesson ${i + 1}`]));
  }

  // Students

  /**
   * The student's address in Teachable. Never an e-mail a phone account typed
   * in the app: it isn't verified. 19 An email account proved its address
   * with a code: it's the Teachable student with that address.
   */
  private emailOf(user: HostedUser): string {
    return verifiedEmail(user) ?? `u${user.id}.${this.deps.appId.slice(0, 8).toLowerCase()}@${STUDENT_DOMAIN}`;
  }

  /** The student's Teachable user ID: found by their stable address, or created with it. */
  private student(user: HostedUser): Promise<number> {
    const email = this.emailOf(user);
    const key = this.key(`student:${user.id}`);
    const known = students.get(key);
    if (known) return Promise.resolve(known);
    const pending = loading.get(key);
    if (pending) return pending as Promise<number>;
    const find = async () => {
      // Unverified: the `email` filter and the `users` list come from a mirror of the API's schema; the e-mail is compared here too.
      const found = await this.client.request<{ users?: TUser[] }>("GET", "/users", { query: { email } });
      return (found?.users ?? []).find((u) => u?.id && u.email?.trim().toLowerCase() === email)?.id ?? null;
    };
    const promise = (async () => {
      let id = await find();
      if (!id) {
        try {
          // Unverified: the answer's shape; the user is looked up again when it has no ID.
          const created = await this.client.request<{ user?: TUser; id?: number }>("POST", "/users", {
            body: { email, name: user.name?.trim() || "Student", src: "yallapp" },
          });
          id = created?.user?.id ?? created?.id ?? null;
        } catch (e) {
          // Created meanwhile (by another request): look it up below.
          if (!(e instanceof TeachableError && e.status === 422)) throw e;
        }
        id ??= await find();
      }
      if (!id) throw new ConnectorError("Teachable didn't return the student.");
      students.set(key, id);
      return id;
    })().finally(() => loading.delete(key));
    loading.set(key, promise);
    return promise;
  }

  /** The student's active enrolments by course. */
  private async enrollments(request: ConnectorRequest): Promise<Map<number, TEnrollment>> {
    if (!request.user) return new Map();
    const id = await this.student(request.user);
    const courses = await cached(this.key(`account:${id}`), STUDENT_CACHE_MS, async () => {
      const body = await this.client.request<{ user?: TUser } & Partial<TUser>>("GET", `/users/${id}`);
      return (body?.user?.courses ?? body?.courses ?? []).filter((c) => Number.isSafeInteger(c?.course_id));
    });
    return new Map(courses.filter((c) => c.is_active_enrollment !== false).map((c) => [c.course_id, c]));
  }

  private async enrolledIds(request: ConnectorRequest): Promise<Set<number>> {
    return new Set((await this.enrollments(request)).keys());
  }

  /** The lectures the student completed in the course. */
  private async completed(request: ConnectorRequest, courseId: number): Promise<Set<number>> {
    if (!request.user) return new Set();
    const id = await this.student(request.user);
    const done = await cached(this.key(`progress:${id}:${courseId}`), STUDENT_CACHE_MS, async () => {
      const out: number[] = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        let body: { course_progress?: TProgress; meta?: { number_of_pages?: number } } | null;
        try {
          body = await this.client.request("GET", `/courses/${courseId}/progress`, { query: { user_id: id, page } });
        } catch (e) {
          if (e instanceof TeachableError && e.status === 404) break;
          throw e;
        }
        // Unverified: the per-lecture fields (`is_completed`, `completed_at`) were seen in real answers but aren't documented.
        for (const section of body?.course_progress?.lecture_sections ?? []) {
          for (const lecture of section?.lectures ?? []) if (lecture?.is_completed === true || (lecture?.is_completed == null && lecture?.completed_at)) out.push(lecture.id);
        }
        // Unverified: what the progress pages split.
        const pages = Number(body?.meta?.number_of_pages ?? 1);
        if (!Number.isFinite(pages) || page >= pages) break;
      }
      return out;
    });
    return new Set(done);
  }

  private forget(name: string): void {
    cache.delete(this.key(name));
  }

  // Mapping

  private item(id: number, title: string, open: boolean, done: Set<number>) {
    return { id, type: "lesson", title, duration_minutes: null, question_count: null, preview: false, locked: !open, completed: done.has(id) };
  }

  private progressJson(courseId: number, outline: Outline, done: Set<number>) {
    const completed = outline.lectures.filter((id) => done.has(id)).length;
    const total = outline.lectures.length;
    return {
      course_id: courseId,
      completed_items: completed,
      total_items: total,
      percent: total ? Math.round((completed / total) * 100) : 0,
      course_completed: total > 0 && completed === total,
    };
  }

  /** A course of the student's: progress from Teachable's percentage, so lists cost no request per course. */
  private myCourse(summary: ReturnType<TeachableConnector["summary"]>, enrollment: TEnrollment, total: number) {
    const percent = percentOf(enrollment.percent_complete);
    const done = Boolean(enrollment.completed_at) || percent >= 100;
    return {
      course: summary,
      progress: {
        course_id: summary.id,
        completed_items: done ? total : Math.min(total, Math.round((percent * total) / 100)),
        total_items: total,
        percent: done ? 100 : percent,
        course_completed: done,
      },
      certificate_url: null,
    };
  }

  private isDone(enrollment: TEnrollment): boolean {
    return Boolean(enrollment.completed_at) || percentOf(enrollment.percent_complete) >= 100;
  }

  /** The student's courses that are still published, most recently enrolled first. */
  private async mine(request: ConnectorRequest): Promise<{ course: TCourse; enrollment: TEnrollment }[]> {
    const enrollments = await this.enrollments(request);
    if (!enrollments.size) return [];
    const courses = await this.courseList();
    const time = (e: TEnrollment) => (e.enrolled_at ? new Date(e.enrolled_at).getTime() || 0 : 0);
    return courses
      .filter((c) => enrollments.has(c.id))
      .map((course) => ({ course, enrollment: enrollments.get(course.id)! }))
      .sort((a, b) => time(b.enrollment) - time(a.enrollment));
  }

  // Endpoints

  private async home(request: ConnectorRequest) {
    const sections: Record<string, unknown>[] = [];
    const enrolled = await this.enrolledIds(request);
    const current = (await this.mine(request)).find((m) => !this.isDone(m.enrollment));
    if (current) {
      const plans = await this.plans();
      const detail = await this.structure(current.course.id);
      const outline = detail ? outlineOf(detail) : { sections: [], lectures: [] };
      const course = this.myCourse(this.summary(current.course, detail, enrolled, plans), current.enrollment, outline.lectures.length);
      const done = await this.completed(request, current.course.id);
      const index = outline.lectures.findIndex((id) => !done.has(id));
      let next: ReturnType<TeachableConnector["item"]> | null = null;
      if (index >= 0) {
        const lectureId = outline.lectures[index]!;
        const lecture = await this.lecture(current.course.id, lectureId, true).catch((e) => {
          if (e instanceof ConnectorError) return null;
          throw e;
        });
        next = this.item(lectureId, lecture?.name?.trim() || `Lesson ${index + 1}`, true, done);
      }
      sections.push({ type: "continue_learning", title: "Continue learning", course: { ...course, ...(next ? { next_item: next } : {}) } });
    }
    const latest = (await this.courseList()).slice(0, 10);
    if (latest.length) sections.push({ type: "latest_courses", title: "Latest courses", courses: await this.summaries(latest, enrolled) });
    return sections;
  }

  private async courses(request: ConnectorRequest): Promise<ConnectorResult> {
    const { query } = request;
    const page = intParam(query, "page", 1, 10_000);
    const perPage = intParam(query, "per_page", 20, 50);
    const search = (query.get("search") ?? "").trim().toLowerCase();
    const price = query.get("price") ?? "all";
    const orderby = query.get("orderby") ?? "newest";
    const enrolled = await this.enrolledIds(request);
    const plans = await this.plans();
    // Teachable has no categories: a category filter matches nothing.
    let all = query.get("category") ? [] : await this.courseList();
    all = all
      .filter((c) => !search || (c.name ?? "").toLowerCase().includes(search) || (c.heading ?? "").toLowerCase().includes(search))
      .filter((c) => price === "all" || this.pricing(c.id, plans).free === (price === "free"));
    // "popular" has no data in Teachable's API: newest first.
    if (orderby === "title") all = [...all].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    const items = await this.summaries(all.slice((page - 1) * perPage, page * perPage), enrolled);
    return { status: 200, body: { page, per_page: perPage, total: all.length, total_pages: Math.max(1, Math.ceil(all.length / perPage)), items } };
  }

  private async detail(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const course = await this.findCourse(id);
    const detail = course ? await this.structure(course.id) : null;
    if (!course || !detail) return noCourse();
    const enrolled = await this.enrolledIds(request);
    const plans = await this.plans();
    const pricing = this.pricing(course.id, plans);
    // Paid courses are sold on the school's website only: no button for them in the app.
    const action = enrolled.has(course.id) ? "continue" : pricing.free ? "enroll_free" : "none";
    // Unverified: whether `description` is HTML or text; it's cleaned as HTML.
    const description = detail.description ?? course.description ?? "";
    const descriptionHtml = /<[a-z][\s\S]*>/i.test(description)
      ? cleanHtml(description)
      : description.trim()
        ? description.trim().split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("")
        : "";
    return {
      status: 200,
      body: {
        ...this.summary(course, detail, enrolled, plans),
        description_html: descriptionHtml,
        duration_minutes: null,
        level: null,
        has_certificate: false,
        qna: false,
        categories: [],
        purchase: { action },
      },
    };
  }

  private async curriculum(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const course = await this.findCourse(id);
    const detail = course ? await this.structure(course.id) : null;
    if (!course || !detail) return noCourse();
    const outline = outlineOf(detail);
    const open = (await this.enrolledIds(request)).has(course.id);
    const done = open ? await this.completed(request, course.id) : new Set<number>();
    const titles = await this.titles(course.id, outline);
    return {
      status: 200,
      body: { topics: outline.sections.map((s) => ({ id: s.id, title: s.title, items: s.lectures.map((l) => this.item(l, titles.get(l)!, open, done)) })) },
    };
  }

  private async enroll(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const course = await this.findCourse(id);
    if (!course) return noCourse();
    if (!this.pricing(course.id, await this.plans()).free) return error(403, "purchase_required", "This course isn't free.");
    const before = (await this.enrollments(request)).get(course.id);
    if (before) return { status: 200, body: { course_id: course.id, enrolled_at: isoDate(before.enrolled_at, request.now) } };
    const studentId = await this.student(request.user);
    try {
      // Free courses only: Teachable's enrolment doesn't check payment.
      await this.client.request("POST", "/enroll", { body: { user_id: studentId, course_id: course.id } });
    } catch (e) {
      // Unverified: 422 when the student is already enrolled.
      if (!(e instanceof TeachableError && e.status === 422)) throw e;
    }
    this.forget(`account:${studentId}`);
    const after = (await this.enrollments(request)).get(course.id);
    return { status: 200, body: { course_id: course.id, enrolled_at: isoDate(after?.enrolled_at, request.now) } };
  }

  private async myCourses(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const status = request.query.get("status") ?? "in_progress";
    if (status !== "in_progress" && status !== "completed") return error(400, "invalid_request", "Unknown status.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const mine = (await this.mine(request)).filter((m) => this.isDone(m.enrollment) === (status === "completed"));
    const slice = mine.slice((page - 1) * perPage, page * perPage);
    const enrolled = await this.enrolledIds(request);
    const plans = await this.plans();
    const details = await mapLimit(slice, CONCURRENCY, (m) => this.structureIfSpare(m.course.id));
    const items = slice.map((m, i) => {
      const detail = details[i] ?? null;
      return this.myCourse(this.summary(m.course, detail, enrolled, plans), m.enrollment, detail ? outlineOf(detail).lectures.length : 0);
    });
    return { status: 200, body: { page, per_page: perPage, total: mine.length, total_pages: Math.max(1, Math.ceil(mine.length / perPage)), items } };
  }

  /** The published lecture and its course, or null. */
  private async findLecture(id: number): Promise<{ course: TCourse; outline: Outline } | null> {
    if (!Number.isSafeInteger(id) || id < 1) return null;
    const known = lectureCourses.get(this.key(`lecture:${id}`));
    const courses = await this.courseList();
    const inCourse = async (course: TCourse) => {
      const detail = await this.structure(course.id);
      const outline = detail ? outlineOf(detail) : null;
      return outline?.lectures.includes(id) ? { course, outline } : null;
    };
    const first = known ? courses.find((c) => c.id === known) : undefined;
    if (first) {
      const found = await inCourse(first);
      if (found) return found;
    }
    // Lectures not seen yet: look through the courses' outlines (one request per course, cached).
    for (const course of courses) {
      if (course.id === first?.id) continue;
      const found = await inCourse(course);
      if (found) return found;
    }
    return null;
  }

  /** The school's page of a lecture. Unverified: the URL pattern. */
  private lectureUrl(courseId: number, lectureId: number): string {
    return `https://${this.settings.school}/courses/${courseId}/lectures/${lectureId}`;
  }

  private async video(courseId: number, lectureId: number, attachmentId: number, now: Date): Promise<LessonVideo | null> {
    let body: { video?: TVideo } | null;
    try {
      // The stream URL is signed and short-lived: it's fetched for every lesson view, never cached.
      body = await this.client.request("GET", `/courses/${courseId}/lectures/${lectureId}/videos/${attachmentId}`);
    } catch (e) {
      if (e instanceof ConnectorError) return null;
      throw e;
    }
    const url = webUrl(body?.video?.video_asset?.url);
    if (!url) return null;
    // Unverified: the stream's lifetime; the `exp` of its signed token (Hotmart's `hdnts`) when there is one.
    const exp = /exp=(\d{9,11})/.exec(decodeURIComponent(url.replace(/\+/g, " ")))?.[1];
    const expires = exp ? new Date(Number(exp) * 1000) : null;
    const duration = Number(body?.video?.media_duration);
    return {
      source: "upload",
      url,
      expires_at: expires && expires.getTime() > now.getTime() ? expires.toISOString() : null,
      embed_html: null,
      duration_seconds: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
      poster_url: webUrl(body?.video?.url_thumbnail),
    };
  }

  /**
   * The lesson's HTML from the lecture's attachments, in order.
   * Unverified: the attachment kinds and which fields each uses; unknown kinds are left out.
   */
  private async content(courseId: number, lecture: TLecture, now: Date) {
    const parts: string[] = [];
    let video: LessonVideo | null = null;
    const onSchool = (text: string) => `<p><a href="${escapeHtml(this.lectureUrl(courseId, lecture.id))}">${escapeHtml(text)}</a></p>`;
    for (const attachment of byPosition((lecture.attachments ?? []).filter((a) => a && typeof a === "object"))) {
      const kind = (attachment.kind ?? "").toLowerCase();
      const name = attachment.name?.trim() || "";
      const url = webUrl(attachment.url);
      const text = typeof attachment.text === "string" ? attachment.text : "";
      if (kind === "text") {
        if (text.trim()) parts.push(text);
      } else if (kind === "image") {
        if (url) parts.push(`<p><img src="${escapeHtml(url)}" alt="${escapeHtml(name)}"></p>`);
      } else if (kind === "video") {
        const found: LessonVideo | null = !video && Number.isSafeInteger(attachment.id) ? await this.video(courseId, lecture.id, attachment.id, now) : null;
        if (found) video = found;
        else parts.push(onSchool(name ? `Watch “${name}” on the school's website` : "Watch this video on the school's website"));
      } else if (kind === "embed" || kind === "code_embed") {
        if (text.trim()) parts.push(text);
        else if (url) parts.push(`<iframe src="${escapeHtml(url)}" allowfullscreen></iframe>`);
      } else if (kind.startsWith("code")) {
        if (text.trim()) parts.push(`<pre><code>${escapeHtml(text)}</code></pre>`);
      } else if (kind === "quiz") {
        parts.push(onSchool("Take this quiz on the school's website"));
      } else if (kind === "pdf" || kind === "pdf_embed" || kind === "file" || kind === "audio") {
        if (url) parts.push(`<p><a href="${escapeHtml(url)}">${escapeHtml(name || (kind === "audio" ? "Listen to the audio" : "Open the file"))}</a></p>`);
      }
    }
    const { html, embeds } = extractEmbeds(cleanHtml(parts.join("\n")), this.settings.school);
    return { html: html.trim() ? html : null, embeds, video };
  }

  private async lesson(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const found = await this.findLecture(id);
    if (!found) return noLesson();
    const { course, outline } = found;
    // Unverified: free-preview lectures aren't in the API's lecture fields, so every lesson needs enrolment.
    if (!(await this.enrolledIds(request)).has(course.id)) return error(403, "not_enrolled", "Enroll in the course to open this lesson.");
    const lecture = await this.lecture(course.id, id);
    if (!lecture || !published(lecture)) return noLesson();
    const { html, embeds, video } = await this.content(course.id, lecture, request.now);
    const done = await this.completed(request, course.id);
    const saved = request.user
      ? (await this.deps.store.listLessonProgress({ appId: this.deps.appId, userId: request.user.id, courseId: course.id })).find((p) => p.lessonId === id)
      : undefined;
    const index = outline.lectures.indexOf(id);
    return {
      status: 200,
      body: {
        id,
        course_id: course.id,
        title: lecture.name?.trim() || `Lesson ${index + 1}`,
        render_mode: "native",
        html,
        webview_url: null,
        embeds,
        embed_height: null,
        ...(video ? { video } : {}),
        attachments: [],
        completed: done.has(id),
        position_seconds: saved?.positionSeconds ?? 0,
        previous_id: outline.lectures[index - 1] ?? null,
        next_id: outline.lectures[index + 1] ?? null,
      },
    };
  }

  /** Teachable keeps no video position: it's saved with the hosted API's lesson progress. */
  private async saveProgress(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const found = await this.findLecture(id);
    if (!found || !(await this.enrolledIds(request)).has(found.course.id)) return error(403, "not_enrolled", "Enroll in the course to save your progress.");
    const position = Number((request.body as { position_seconds?: unknown } | null)?.position_seconds);
    if (!Number.isInteger(position) || position < 0) return error(400, "invalid_request", "position_seconds must be a whole number.");
    await this.deps.store.saveLessonProgress({
      appId: this.deps.appId,
      userId: request.user.id,
      courseId: found.course.id,
      lessonId: id,
      positionSeconds: position,
      completedAt: null,
      updatedAt: request.now,
    });
    return { status: 204 };
  }

  private async complete(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const found = await this.findLecture(id);
    if (!found || !(await this.enrolledIds(request)).has(found.course.id)) return error(403, "not_enrolled", "Enroll in the course to complete lessons.");
    const studentId = await this.student(request.user);
    try {
      // Unverified: the admin endpoint's body field (`user_id`).
      await this.client.request("POST", `/courses/${found.course.id}/lectures/${id}/mark_complete`, { body: { user_id: studentId } });
    } catch (e) {
      // Unverified: an already completed lecture may be refused with 409 or 422.
      if (!(e instanceof TeachableError && (e.status === 409 || e.status === 422))) throw e;
    }
    this.forget(`progress:${studentId}:${found.course.id}`);
    this.forget(`account:${studentId}`);
    const done = await this.completed(request, found.course.id);
    done.add(id);
    return { status: 200, body: this.progressJson(found.course.id, found.outline, done) };
  }

  /**
   * The app doesn't sell Teachable courses on any platform: a purchase on Teachable's checkout
   * can't be matched to the app's student.
   */
  private checkoutLink(request: ConnectorRequest): ConnectorResult {
    if (!request.user) return signIn();
    return error(403, "purchase_not_allowed", "This course is sold on the school's website.");
  }
}

// Platform

/** Teachable's own hosts, which aren't a school's address. */
const TEACHABLE_HOSTS = new Set(["teachable.com", "www.teachable.com", "sso.teachable.com", "developers.teachable.com", "docs.teachable.com", "support.teachable.com", "checkout.teachable.com"]);

/** "your-school.teachable.com" or a custom domain from what a client typed ("https://your-school.teachable.com/admin", "your-school"). */
export function normalizeSchool(value: string): string | null {
  let host = value.trim().toLowerCase();
  host = host.replace(/^https?:\/\//, "").split(/[/?#]/)[0] ?? "";
  host = host.replace(/\.$/, "");
  if (/^[a-z0-9][a-z0-9-]*$/.test(host)) host = `${host}.teachable.com`;
  if (!/^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) return null;
  return TEACHABLE_HOSTS.has(host) ? null : host;
}

export const TEACHABLE_PLATFORM: PlatformDefinition = {
  id: "teachable",
  name: "Teachable",
  appType: "lms",
  summary: "Your Teachable school's courses, lessons and student progress.",
  fields: [
    {
      name: "school",
      label: "School address",
      hint: "The address students open your school at, for example your-school.teachable.com, or your school's own domain if it has one.",
      secret: false,
      placeholder: "your-school.teachable.com",
    },
    {
      name: "apiKey",
      label: "API key",
      hint: "In your Teachable school admin, open Settings > API and select Create API Key. Only the school owner sees this page, and it needs the Growth plan or higher.",
      secret: true,
    },
  ],
  normalize(values) {
    const errors: Record<string, string> = {};
    const school = normalizeSchool(values.school ?? "");
    if (!school) errors.school = "Enter your school's address, for example your-school.teachable.com.";
    const apiKey = (values.apiKey ?? "").trim();
    if (!apiKey || /\s/.test(apiKey) || apiKey.length > 500) errors.apiKey = "Paste the API key from Settings > API in Teachable.";
    return Object.keys(errors).length ? { errors } : { values: { ...values, school: school!, apiKey } };
  },
  create(values, deps) {
    return new TeachableConnector({ school: values.school ?? "", apiKey: values.apiKey ?? "" }, deps);
  },
};

registerPlatform(TEACHABLE_PLATFORM);
