import type { AppFont } from "../build-config/types";
import { freeFont } from "../fonts/catalog";
import type { AppType, AppVertical } from "../data/types";
import type { PlatformId } from "../hosted/connectors/platforms";
import { pinnedFetch, type Resolve } from "../net/safe-fetch";

/**
 * 81.1 Site scan: from a website's address, what an app made from it needs
 * (81.3 makes the draft): its name, logo, icon, colours, fonts (matched to
 * the app's fonts), the platform it runs on (WordPress and its plugins,
 * Shopify, Salla, Zid, Wix, ikas…) and the app type that fits. It reads the
 * home page, the web app manifest and up to two of the site's own
 * stylesheets, through the safe fetch (lib/net/safe-fetch.ts: public
 * addresses only, redirects checked), each capped in size and time. Nothing
 * is kept: the scan only proposes.
 */

export type SitePlatform =
  | "wordpress"
  | "shopify"
  | PlatformId
  | "squarespace"
  | "webflow"
  | "other";

export interface SiteScan {
  /** The address the home page was read from, after redirects. */
  url: string;
  name: string | null;
  description: string | null;
  /** The page's language (`<html lang>`), lower case, e.g. "tr", "ar"; null when not given. */
  language: string | null;
  logoUrl: string | null;
  iconUrl: string | null;
  colors: { primary: string | null; accent: string | null; background: string | null };
  fonts: { found: string[]; appFont: string };
  platform: { id: SitePlatform; name: string; plugins: string[] };
  appType: AppType;
  vertical: AppVertical | null;
  /** 81.3 The site's main menu: its own pages, in order (the draft makes them pages and tabs). */
  menu: SiteMenuItem[];
}

export interface SiteMenuItem {
  label: string;
  url: string;
}

export const MENU_MAX = 8;

export const PAGE_MAX_BYTES = 1_500_000;
export const ASSET_MAX_BYTES = 400_000;
const TIMEOUT_MS = 8_000;
const USER_AGENT = "Mozilla/5.0 (compatible; YallappSiteScan/1.0; +https://yallapp.com.tr)";

const PLATFORM_NAME: Record<SitePlatform, string> = {
  wordpress: "WordPress",
  shopify: "Shopify",
  ikas: "ikas",
  ticimax: "Ticimax",
  ideasoft: "IdeaSoft",
  teachable: "Teachable",
  thinkific: "Thinkific",
  simplybook: "SimplyBook.me",
  wix: "Wix",
  salla: "Salla",
  zid: "Zid",
  rss: "RSS",
  squarespace: "Squarespace",
  webflow: "Webflow",
  other: "Your website",
};

// Reading HTML without a parser: enough for the head's tags and inline styles.

type Attrs = Record<string, string>;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…" };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1]?.toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

function attrsOf(tag: string): Attrs {
  const out: Attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  // Skip the tag's own name.
  const body = tag.replace(/^<\s*[a-zA-Z0-9-]+/, "").replace(/\/?>$/, "");
  for (const m of body.matchAll(re)) out[m[1]!.toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  return out;
}

/** Every `<name …>` opening tag's attributes. */
export function tagsOf(html: string, name: string): Attrs[] {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((m) => attrsOf(m[0]));
}

function blocksOf(html: string, name: string, attrTest?: (attrs: Attrs) => boolean): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(new RegExp(`(<${name}\\b[^>]*>)([\\s\\S]*?)</${name}>`, "gi"))) {
    if (!attrTest || attrTest(attrsOf(m[1]!))) out.push(m[2]!);
  }
  return out;
}

const meta = (metas: Attrs[], key: string) => metas.find((m) => (m.name ?? m.property ?? m.itemprop ?? "").toLowerCase() === key)?.content?.trim() || null;

function absolute(href: string | null | undefined, base: string): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed) return null;
  // Only web addresses: data:, javascript: and any other scheme are left out by their protocol.
  try {
    const url = new URL(trimmed.startsWith("//") ? `https:${trimmed}` : trimmed, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

// Colours

/** "#abc", "#aabbcc", "rgb(…)", "r, g, b" (Shopify's variables) → "#aabbcc"; null for anything else. */
export function normalizeColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) return `#${[...m[1]!].map((c) => c + c).join("")}`;
  m = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/.exec(v);
  if (m) return `#${m[1]}`;
  m = /^(?:rgba?\()?\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)?$/.exec(v);
  if (m) {
    const parts = [m[1], m[2], m[3]].map((n) => Number(n));
    if (parts.every((n) => n <= 255)) return `#${parts.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  }
  return null;
}

function hsl(hex: string): { s: number; l: number } {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { s, l };
}

/** A colour that can carry a brand: not white, black or a grey. */
export function isBrandColor(hex: string): boolean {
  const { s, l } = hsl(hex);
  return s >= 0.25 && l >= 0.12 && l <= 0.9;
}

const BRAND_VAR = /--(?:wp--preset--color--)?(?:[a-z0-9-]*-)?(primary|brand|accent|secondary|main|theme|button|link)(?:-color)?(?:-[a-z0-9]+)?\s*:\s*([^;}]+)/gi;

/** The brand colours a stylesheet names (its custom properties), in order, then every colour it uses with how often. */
function colorsInCss(css: string): { named: { role: string; color: string }[]; counts: Map<string, number> } {
  const named: { role: string; color: string }[] = [];
  for (const m of css.matchAll(BRAND_VAR)) {
    const color = normalizeColor(m[2]!.replace(/!important/, ""));
    if (color && isBrandColor(color)) named.push({ role: m[1]!.toLowerCase(), color });
  }
  const counts = new Map<string, number>();
  // Themes that keep their palette as "r, g, b" variables (Shopify, Wix).
  for (const m of css.matchAll(/--[a-z0-9_-]+\s*:\s*(\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3})\s*[;}]/gi)) {
    const color = normalizeColor(m[1]);
    if (color && isBrandColor(color)) counts.set(color, (counts.get(color) ?? 0) + 1);
  }
  for (const m of css.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|rgba?\([^)]*\)/gi)) {
    const color = normalizeColor(m[0]);
    if (color && isBrandColor(color)) counts.set(color, (counts.get(color) ?? 0) + 1);
  }
  return { named, counts };
}

// Fonts

/** Fonts a page or stylesheet asks for: Google Fonts links, @font-face and font-family. */
function fontsIn(html: string, css: string, links: Attrs[]): string[] {
  const out: string[] = [];
  const add = (name: string) => {
    const clean = decodeEntities(name).replace(/["']/g, "").replace(/\+/g, " ").trim();
    if (clean && !/^(?:inherit|initial|var\(|-apple-system|system-ui|sans-serif|serif|monospace|blinkmacsystemfont|segoe ui|helvetica neue|arial|helvetica|apple color emoji|segoe ui emoji|cursive)$/i.test(clean) && !out.some((f) => f.toLowerCase() === clean.toLowerCase())) {
      out.push(clean);
    }
  };
  for (const link of links) {
    let href = link.href ?? "";
    if (!/fonts\.googleapis\.com\/css|fonts\.bunny\.net\/css/i.test(href)) continue;
    try {
      href = decodeURIComponent(href);
    } catch {
      // Kept as it is.
    }
    for (const m of href.matchAll(/family=([^&]+)/g)) for (const family of m[1]!.split("|")) add(family.split(":")[0]!);
  }
  for (const m of css.matchAll(/@font-face\s*{[^}]*font-family\s*:\s*([^;}]+)/gi)) add(m[1]!.split(",")[0]!);
  for (const m of css.matchAll(/(?:^|[;{\s])font-family\s*:\s*([^;}]+)/gi)) add(m[1]!.split(",")[0]!);
  // Themes' font variables: WordPress presets, Shopify's --font-body-family.
  for (const m of css.matchAll(/--(?:wp--preset--font-family--[a-z0-9-]+|font-[a-z-]*family)\s*:\s*([^;}]+)/gi)) add(m[1]!.split(",")[0]!);
  return out.slice(0, 6);
}

/** Fonts like each of the app's: the scanned site's first font picks the app's closest. */
const FONT_FAMILIES: [RegExp, AppFont][] = [
  [/^(?:outfit|poppins|montserrat|futura|urbanist|raleway|josefin|quicksand|questrial|century gothic|avenir|gotham|sora|jost|kumbh)/i, "Outfit"],
  [/^(?:manrope|inter|work sans|ibm plex sans|archivo|public sans|space grotesk|helvetica|roboto flex|figtree|geist)/i, "Manrope"],
  [/^(?:dm sans|assistant|nunito|lato|open sans|source sans|noto sans|roboto|pt sans|karla|mulish|rubik|hind|cabin|asap|barlow)/i, "DM Sans"],
  [/^(?:lexend|cairo|tajawal|almarai|ibm plex sans arabic|noto (?:kufi|naskh)|readex|changa|el messiri|harmattan|amiri)/i, "Lexend"],
  [/^(?:plus jakarta|be vietnam|red hat|onest|albert sans|instrument sans)/i, "Plus Jakarta Sans"],
  [/^(?:bricolage|playfair|merriweather|lora|georgia|libre baskerville|cormorant|dm serif|abril|oswald|bebas|anton|syne|archivo black|fraunces)/i, "Bricolage Grotesque"],
];

/** 97.1 The site's own font when it's a free one (any Google font), else the closest bundled one. */
export function appFontFor(found: string[]): string {
  for (const font of found) {
    const exact = freeFont(font);
    if (exact) return exact.family;
    const family = FONT_FAMILIES.find(([re]) => re.test(font));
    if (family) return family[1];
  }
  return "Bricolage Grotesque";
}

// The platform

const PLUGINS: [string, RegExp][] = [
  ["woocommerce", /\/wp-content\/plugins\/woocommerce\/|woocommerce-(?:page|no-js)|class="[^"]*woocommerce/i],
  ["tutor", /\/wp-content\/plugins\/tutor(?:-pro)?\//i],
  ["learndash", /\/wp-content\/plugins\/sfwd-lms\/|learndash/i],
  ["learnpress", /\/wp-content\/plugins\/learnpress\//i],
  ["lifterlms", /\/wp-content\/plugins\/lifterlms\//i],
  ["masterstudy", /\/wp-content\/plugins\/masterstudy-lms-learning-management-system\//i],
  ["sensei", /\/wp-content\/plugins\/sensei-lms\//i],
  ["masteriyo", /\/wp-content\/plugins\/learning-management-system\/|masteriyo/i],
  ["amelia", /\/wp-content\/plugins\/ameliabooking\//i],
  ["bookly", /\/wp-content\/plugins\/bookly-responsive-appointment-booking-tool\//i],
  ["latepoint", /\/wp-content\/plugins\/latepoint\//i],
  ["bookingpress", /\/wp-content\/plugins\/bookingpress-appointment-booking\//i],
  ["the-events-calendar", /\/wp-content\/plugins\/the-events-calendar\/|tribe-events/i],
  ["give", /\/wp-content\/plugins\/give\/|give-form/i],
  ["elementor", /\/wp-content\/plugins\/elementor\//i],
];

function platformOf(html: string, generator: string | null, headers: Headers | null): { id: SitePlatform; plugins: string[] } {
  const gen = (generator ?? "").toLowerCase();
  const powered = (headers?.get("x-powered-by") ?? "").toLowerCase();
  if (/cdn\.shopify\.com|shopify\.theme|shopify-digital-wallet/i.test(html) || headers?.has("x-shopid")) return { id: "shopify", plugins: [] };
  if (/cdn\.salla\.(?:network|sa)|salla\.sa\/|<salla-/i.test(html)) return { id: "salla", plugins: [] };
  if (/zid\.store|zidcdn|media\.zid\.sa|cdn\.zid\.sa/i.test(html)) return { id: "zid", plugins: [] };
  if (/cdn\.myikas\.com|ikas\.com\/|__ikas/i.test(html)) return { id: "ikas", plugins: [] };
  if (/static\.ticimax\.cloud|ticimax/i.test(html)) return { id: "ticimax", plugins: [] };
  if (/ideasoft|myideasoft\.com|ideacdn\.net/i.test(html)) return { id: "ideasoft", plugins: [] };
  if (gen.startsWith("wix") || /static\.wixstatic\.com|static\.parastorage\.com/i.test(html) || headers?.has("x-wix-request-id")) return { id: "wix", plugins: [] };
  if (/teachablecdn\.com|teachable/i.test(gen + html.slice(0, 20_000))) return { id: "teachable", plugins: [] };
  if (/thinkific/i.test(gen) || /cdn\.thinkific\.com|thinkific-assets/i.test(html)) return { id: "thinkific", plugins: [] };
  if (/simplybook\.(?:me|it|asia)/i.test(html)) return { id: "simplybook", plugins: [] };
  if (gen.startsWith("wordpress") || /\/wp-content\/|\/wp-includes\/|wp-json/i.test(html) || powered.includes("wordpress")) {
    return { id: "wordpress", plugins: PLUGINS.filter(([, re]) => re.test(html)).map(([id]) => id) };
  }
  if (gen.startsWith("squarespace") || /static1\.squarespace\.com/i.test(html)) return { id: "squarespace", plugins: [] };
  if (gen.startsWith("webflow") || /data-wf-site|website-files\.com/i.test(html)) return { id: "webflow", plugins: [] };
  return { id: "other", plugins: [] };
}

const WORDS: [RegExp, { appType: AppType; vertical: AppVertical | null }][] = [
  [/\b(?:menu|restaurant|cafe|café|kitchen|order online|takeaway|pizza|burger)\b|مطعم|منيو|قائمة الطعام|restoran|menü/i, { appType: "store", vertical: "restaurant" }],
  [/\b(?:clinic|dentist|doctor|physiotherap|appointment|book (?:an|your) appointment)\b|عيادة|طبيب|klinik|randevu/i, { appType: "booking", vertical: "clinic" }],
  [/\b(?:gym|fitness|yoga|pilates|crossfit|personal trainer|classes)\b|جيم|لياقة|spor salonu/i, { appType: "booking", vertical: "fitness" }],
  // 84.1 Service companies.
  [/\b(?:cleaning|plumb(?:er|ing)|electrician|repairs?|handyman|consult(?:ing|ancy)|agency|get a quote|our services)\b|تنظيف|صيانة|استشارات|وكالة|temizlik|tamir|danışmanlık|ajans/i, { appType: "booking", vertical: "services" }],
  [/\b(?:donate|donation|charity|foundation|non-?profit)\b|تبرع|جمعية خيرية|bağış|vakıf/i, { appType: "donations", vertical: "charity" }],
  [/\b(?:courses?|academy|lessons?|enroll|e-?learning)\b|دورات|أكاديمية|kurs|eğitim/i, { appType: "lms", vertical: null }],
  [/\b(?:events?|tickets?|conference|festival|concert)\b|فعاليات|تذاكر|etkinlik|bilet/i, { appType: "events", vertical: null }],
  [/\b(?:real estate|property|properties|apartments? for (?:sale|rent))\b|عقارات|emlak|kiralık|satılık/i, { appType: "real_estate", vertical: null }],
  [/\b(?:shop|cart|add to cart|buy now|products?)\b|متجر|سلة|sepete ekle|mağaza/i, { appType: "store", vertical: null }],
  [/\b(?:news|blog|articles?|magazine)\b|أخبار|مقالات|haber/i, { appType: "news", vertical: null }],
];

/** The app type that fits: from the platform and plugins first, else from the page's words. */
export function appTypeFor(platform: { id: SitePlatform; plugins: string[] }, text: string): { appType: AppType; vertical: AppVertical | null } {
  const has = (...ids: string[]) => ids.some((id) => platform.plugins.includes(id));
  if (has("tutor", "learndash", "learnpress", "lifterlms", "masterstudy", "sensei", "masteriyo")) return { appType: "lms", vertical: null };
  if (has("amelia", "bookly", "latepoint", "bookingpress")) {
    const word = WORDS.find(([re, kind]) => kind.appType === "booking" && re.test(text));
    return word ? word[1] : { appType: "booking", vertical: null };
  }
  if (has("the-events-calendar")) return { appType: "events", vertical: null };
  if (has("give")) return { appType: "donations", vertical: "charity" };
  if (["teachable", "thinkific"].includes(platform.id)) return { appType: "lms", vertical: null };
  if (platform.id === "simplybook") return { appType: "booking", vertical: null };
  const shop = has("woocommerce") || ["shopify", "salla", "zid", "ikas", "ticimax", "ideasoft"].includes(platform.id);
  // A restaurant's shop is still a restaurant.
  const restaurant = WORDS[0]!;
  if (shop) return restaurant[0].test(text) ? restaurant[1] : { appType: "store", vertical: null };
  for (const [re, kind] of WORDS) if (re.test(text)) return kind;
  return { appType: "news", vertical: null };
}

// The menu

/** Links the app has its own screens for, or that only make sense on the website. */
const NOT_A_PAGE = /\/(?:cart|checkout|sepet|odeme|my-?account|account|hesabim|login|log-?in|sign-?in|register|wp-login\.php|wp-admin|dashboard|search|feed|wishlist)(?:\/|$|\?)|[?&](?:lang|add-to-cart)=/i;

/**
 * 81.3 The site's main menu: the links of its main `<nav>` (one named
 * main, primary or header first, never the footer's), the site's own pages
 * only, without its home page, its cart and sign-in, or the same page twice.
 */
export function menuOf(html: string, base: string): SiteMenuItem[] {
  const navs: { attrs: string; body: string }[] = [];
  for (const m of html.matchAll(/(<nav\b[^>]*>)([\s\S]*?)<\/nav>/gi)) navs.push({ attrs: m[1]!, body: m[2]! });
  const usable = navs.filter((n) => !/footer|breadcrumb|social|pagination|language|lang-|languages|secondary/i.test(n.attrs));
  const main = usable.find((n) => /main|primary|header|site-nav|menu/i.test(n.attrs)) ?? usable[0];
  // Shopify and others without a <nav>: the header's list of links.
  const body = main?.body ?? blocksOf(html, "header")[0] ?? "";
  const host = new URL(base).hostname.replace(/^www\./, "");
  const home = new URL(base).pathname.replace(/\/+$/, "");
  const out: SiteMenuItem[] = [];
  const seen = new Set<string>();
  for (const m of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const url = absolute(attrsOf(`<a ${m[1]}>`).href, base);
    if (!url) continue;
    const target = new URL(url);
    if (target.hostname.replace(/^www\./, "") !== host) continue;
    const path = target.pathname.replace(/\/+$/, "");
    if (path === home || NOT_A_PAGE.test(`${target.pathname}${target.search}`)) continue;
    const label = decodeEntities(m[2]!.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (!label || label.length > 30) continue;
    const key = `${path}${target.search}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    target.hash = "";
    out.push({ label, url: target.toString() });
    if (out.length === MENU_MAX) break;
  }
  return out;
}

// The page

export interface ScanInput {
  url: string;
  html: string;
  headers?: Headers | null;
  /** The web app manifest, when the page links one. */
  manifest?: Record<string, unknown> | null;
  /** The site's own stylesheets, read. */
  css?: string;
}

function siteName(metas: Attrs[], html: string, manifest: Record<string, unknown> | null): string | null {
  const fromLd = (() => {
    for (const block of blocksOf(html, "script", (a) => (a.type ?? "").toLowerCase() === "application/ld+json")) {
      try {
        const data = JSON.parse(block) as unknown;
        const items = (Array.isArray(data) ? data : [data]).flatMap((d) => ((d as { "@graph"?: unknown[] })?.["@graph"] ?? [d]) as Record<string, unknown>[]);
        const org = items.find((i) => ["WebSite", "Organization", "Store", "LocalBusiness", "Restaurant"].includes(String(i?.["@type"])) && typeof i.name === "string");
        if (org) return String(org.name);
      } catch {
        // Not JSON: skipped.
      }
    }
    return null;
  })();
  const title = blocksOf(html, "title")[0];
  const fromTitle = title ? decodeEntities(title).replace(/\s+/g, " ").trim().split(/\s+[|–—\-:·•]\s+/)[0] : null;
  const name = meta(metas, "og:site_name") ?? meta(metas, "application-name") ?? (typeof manifest?.name === "string" ? manifest.name : null) ?? fromLd ?? fromTitle;
  return name ? decodeEntities(name).replace(/\s+/g, " ").trim().slice(0, 60) || null : null;
}

function logoOf(html: string, base: string): string | null {
  for (const block of blocksOf(html, "script", (a) => (a.type ?? "").toLowerCase() === "application/ld+json")) {
    const m = /"logo"\s*:\s*(?:"([^"]+)"|{[^}]*"url"\s*:\s*"([^"]+)")/.exec(block);
    const url = absolute(m?.[1] ?? m?.[2], base);
    if (url) return url;
  }
  const imgs = tagsOf(html, "img");
  const logo =
    imgs.find((i) => /\bcustom-logo\b|header__heading-logo|site-logo|navbar-brand/i.test(i.class ?? "")) ??
    imgs.find((i) => /logo/i.test(`${i.class ?? ""} ${i.id ?? ""} ${i.alt ?? ""} ${i.src ?? ""}`) && !/partner|client|payment|footer/i.test(`${i.class ?? ""} ${i.src ?? ""}`));
  return absolute(logo?.src ?? logo?.["data-src"] ?? logo?.srcset?.split(/\s+/)[0], base);
}

function iconOf(links: Attrs[], manifest: Record<string, unknown> | null, base: string, manifestUrl: string | null): string | null {
  const size = (s: string | undefined) => Math.max(0, ...((s ?? "").match(/\d+/g) ?? ["0"]).map(Number));
  const fromManifest = Array.isArray(manifest?.icons)
    ? (manifest.icons as { src?: string; sizes?: string }[]).filter((i) => i.src).sort((a, b) => size(b.sizes) - size(a.sizes))[0]
    : null;
  if (fromManifest && size(fromManifest.sizes) >= 192) return absolute(fromManifest.src, manifestUrl ?? base);
  const touch = links.filter((l) => /apple-touch-icon/i.test(l.rel ?? "")).sort((a, b) => size(b.sizes) - size(a.sizes))[0];
  if (touch) return absolute(touch.href, base);
  const icon = links.filter((l) => /(?:^|\s)icon(?:\s|$)/i.test(l.rel ?? "")).sort((a, b) => size(b.sizes) - size(a.sizes))[0];
  return absolute(icon?.href, base) ?? (fromManifest ? absolute(fromManifest.src, manifestUrl ?? base) : null);
}

/** What a page says, without reading anything more. */
export function scanPage(input: ScanInput): SiteScan {
  const { url, html } = input;
  const manifest = input.manifest ?? null;
  const metas = tagsOf(html, "meta");
  const links = tagsOf(html, "link");
  const inlineCss = blocksOf(html, "style").join("\n") + "\n" + tagsOf(html, "[a-z0-9-]+").map((a) => a.style ?? "").filter(Boolean).join(";");
  const css = `${inlineCss}\n${input.css ?? ""}`;
  const manifestHref = links.find((l) => (l.rel ?? "").toLowerCase() === "manifest")?.href ?? null;

  // Colours: the browser's theme colour, the manifest's, the stylesheets' named brand colours, then the most used.
  const { named, counts } = colorsInCss(css);
  const declared = [normalizeColor(meta(metas, "theme-color")), normalizeColor(typeof manifest?.theme_color === "string" ? manifest.theme_color : null), normalizeColor(meta(metas, "msapplication-tilecolor"))].filter(
    (c): c is string => Boolean(c && isBrandColor(c)),
  );
  const ranked = [
    ...declared,
    ...named.filter((n) => ["primary", "brand", "main", "theme", "button"].includes(n.role)).map((n) => n.color),
    ...named.map((n) => n.color),
    ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c),
  ];
  const distinct = [...new Set(ranked)];
  const background = normalizeColor(typeof manifest?.background_color === "string" ? manifest.background_color : null);

  const platform = platformOf(html, meta(metas, "generator"), input.headers ?? null);
  const text = decodeEntities(`${blocksOf(html, "title")[0] ?? ""} ${meta(metas, "description") ?? ""} ${html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/gi, " ")}`).slice(0, 60_000);
  const kind = appTypeFor(platform, text);
  const found = fontsIn(html, css, links);
  const lang = /<html\b[^>]*\blang\s*=\s*["']?([a-zA-Z-]+)/i.exec(html)?.[1]?.toLowerCase().split("-")[0] ?? null;

  return {
    url,
    name: siteName(metas, html, manifest),
    description: meta(metas, "description") ?? meta(metas, "og:description"),
    language: lang,
    logoUrl: logoOf(html, url) ?? absolute(meta(metas, "og:logo"), url),
    iconUrl: iconOf(links, manifest, url, absolute(manifestHref, url)),
    colors: { primary: distinct[0] ?? null, accent: distinct[1] ?? null, background: background && background !== "#ffffff" ? background : null },
    fonts: { found, appFont: appFontFor(found) },
    platform: { id: platform.id, name: PLATFORM_NAME[platform.id], plugins: platform.plugins },
    appType: kind.appType,
    vertical: kind.vertical,
    menu: menuOf(html, url),
  };
}

// Reading the site

export interface ScanDeps {
  fetcher?: typeof fetch;
  resolve?: Resolve;
}

export class ScanError extends Error {
  constructor(
    readonly code: "invalid_url" | "unreachable" | "not_html" | "too_large",
    message: string,
  ) {
    super(message);
    this.name = "ScanError";
  }
}

/** The body as text, up to `max` bytes (a page bigger than that is read only that far). */
async function readCapped(response: Response, max: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < max) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  const all = new Uint8Array(Math.min(size, max));
  let at = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, Math.min(chunk.byteLength, all.byteLength - at));
    all.set(part, at);
    at += part.byteLength;
    if (at >= all.byteLength) break;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(all);
}

/**
 * 81.3 A picture of the site (its logo, its icon), up to `max` bytes; null
 * when it can't be read or is bigger than that.
 */
export async function fetchSiteImage(url: string, max: number, deps: ScanDeps = {}): Promise<Buffer | null> {
  const fetcher = pinnedFetch(deps.fetcher, deps.resolve);
  try {
    const response = await fetcher(url, { headers: { accept: "image/png,image/svg+xml,image/*;q=0.8", "user-agent": USER_AGENT }, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok || Number(response.headers.get("content-length") ?? 0) > max) return null;
    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

/** The address as the client typed it: a bare domain gets https://. */
export function siteAddress(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 300) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Reads the site and scans it. Throws ScanError when the home page can't be read. */
export async function scanSite(input: string, deps: ScanDeps = {}): Promise<SiteScan> {
  const address = siteAddress(input);
  if (!address) throw new ScanError("invalid_url", "Enter your website's address, like example.com.");
  const fetcher = pinnedFetch(deps.fetcher, deps.resolve);
  const get = (url: string, accept: string) =>
    fetcher(url, { headers: { accept, "user-agent": USER_AGENT }, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
  let page: Response;
  try {
    page = await get(address, "text/html,application/xhtml+xml");
  } catch {
    throw new ScanError("unreachable", "Your website couldn't be reached. Check the address and try again.");
  }
  if (!page.ok) throw new ScanError("unreachable", `Your website answered with an error (HTTP ${page.status}).`);
  if (!/html/i.test(page.headers.get("content-type") ?? "text/html")) throw new ScanError("not_html", "This address isn't a web page.");
  const url = page.url || address;
  const html = await readCapped(page, PAGE_MAX_BYTES);

  const links = tagsOf(html, "link");
  const manifestUrl = absolute(links.find((l) => (l.rel ?? "").toLowerCase() === "manifest")?.href, url);
  const origin = new URL(url).origin;
  const sheets = links
    .filter((l) => /(?:^|\s)stylesheet(?:\s|$)/i.test(l.rel ?? ""))
    .map((l) => absolute(l.href, url))
    .filter((u): u is string => Boolean(u && new URL(u).origin === origin && !/\/wp-includes\/|\/plugins\//.test(u)))
    .slice(0, 2);
  const optional = async <T>(work: () => Promise<T>): Promise<T | null> => work().catch(() => null);
  const [manifest, ...css] = await Promise.all([
    manifestUrl
      ? optional(async () => {
          const r = await get(manifestUrl, "application/manifest+json,application/json");
          return r.ok ? (JSON.parse(await readCapped(r, ASSET_MAX_BYTES)) as Record<string, unknown>) : null;
        })
      : Promise.resolve(null),
    ...sheets.map((sheet) => optional(async () => {
      const r = await get(sheet, "text/css");
      return r.ok ? readCapped(r, ASSET_MAX_BYTES) : null;
    })),
  ]);
  return scanPage({ url, html, headers: page.headers, manifest: manifest && typeof manifest === "object" ? manifest : null, css: css.filter(Boolean).join("\n") });
}
