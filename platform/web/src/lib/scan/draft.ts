import { RULES, type AppFont } from "../build-config/types";
import type { AppType, AppVertical } from "../data/types";
import { applyDesign, designsFor, type Design } from "../pages/designs";
import { LANGUAGE_CODES, LAYOUT_LIMITS, type AppDefaultsSetting, type LayoutBlock, type LayoutContent, type LayoutPage, type LayoutTab, type QuickLink } from "../pages/types";
import type { SiteMenuItem, SiteScan } from "./site-scan";

/**
 * 81.3 One step to a draft app: what a site scan (81.1) proposes, made into
 * an app's details and its Pages & look draft. The app gets the site's name,
 * colours and font, the first ready-made design for its kind (33) and the
 * site's main menu: an entry the design already has a screen for (Courses,
 * Shop, Menu…) is left to that screen; each other one becomes a page showing
 * that page of the website, a tab while the app has room for one, otherwise
 * a link on the home page. Nothing is published; the owner edits it all.
 */

export interface SiteDraft {
  appType: AppType;
  vertical: AppVertical | null;
  design: Design | null;
  /** The app's own details (its Branding step), from the site. */
  details: {
    appName: string;
    shortName: string;
    primaryColor: string;
    splashColor: string;
    font: AppFont;
    template: Design["look"]["template"] | null;
    siteUrl: string;
  };
  layout: LayoutContent;
  /** The menu entries made into pages, by page address. */
  menuPages: string[];
}

/** A menu entry's subject: its icon, and the words that name it on menus and tabs (English, Turkish, Arabic). */
const TOPICS: { words: RegExp; icon: string }[] = [
  { words: /course|class|lesson|academy|kurs|ders|eğitim|egitim|دورات|كورس|دروس/i, icon: "school" },
  { words: /shop|store|product|collection|catalog|mağaza|magaza|ürün|urun|متجر|منتجات|تسوق/i, icon: "storefront" },
  { words: /\bmenu\b|menü|منيو|قائمة الطعام/i, icon: "restaurant_menu" },
  { words: /blog|news|article|haber|yazı|makale|أخبار|مدونة|مقالات/i, icon: "newspaper" },
  { words: /event|ticket|etkinlik|bilet|فعاليات|تذاكر/i, icon: "event" },
  { words: /book|appointment|reserv|randevu|rezervasyon|حجز|موعد/i, icon: "calendar_month" },
  { words: /service|hizmet|خدمات/i, icon: "support_agent" },
  { words: /donat|bağış|bagis|تبرع/i, icon: "volunteer_activism" },
  { words: /contact|iletişim|iletisim|اتصل|تواصل/i, icon: "call" },
  { words: /about|story|who we are|hakkımızda|hakkimizda|من نحن/i, icon: "info" },
  { words: /faq|help|support|sss|yardım|الأسئلة|مساعدة/i, icon: "help" },
  { words: /gallery|photo|galeri|معرض|صور/i, icon: "photo_camera" },
  { words: /location|branch|find us|şube|sube|فروع|موقعنا/i, icon: "location_on" },
  { words: /team|staff|doctor|ekip|kadro|فريق|أطباء/i, icon: "groups" },
  { words: /offer|deal|sale|kampanya|indirim|عروض/i, icon: "local_offer" },
];

function topicOf(label: string, url: string): { words: RegExp; icon: string } | null {
  const path = decodeURIComponent(new URL(url).pathname).replace(/[-_/]+/g, " ");
  return TOPICS.find((t) => t.words.test(label)) ?? TOPICS.find((t) => t.words.test(path)) ?? null;
}

/** Whether the design already has a tab for this subject (its own screen, with the real data). */
function covered(item: SiteMenuItem, tabs: LayoutTab[]): boolean {
  const topic = topicOf(item.label, item.url);
  if (!topic) return false;
  return tabs.some((t) => t.icon === topic.icon || topic.words.test(t.label));
}

/** A page address from the entry's label ("About us" → "site-about-us"); one made of its place when it has no Latin letters. */
function slugFor(label: string, index: number, taken: Set<string>): string {
  const ascii = label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");
  let slug = `site-${ascii || `page-${index + 1}`}`;
  for (let n = 2; taken.has(slug); n++) slug = `site-${ascii || "page"}-${n}`;
  taken.add(slug);
  return slug;
}

/** The app's name from the site's, or from its address ("cedar-academy.com" → "Cedar Academy"). */
export function draftName(scan: Pick<SiteScan, "name" | "url">): string {
  const fromHost = new URL(scan.url).hostname
    .replace(/^www\./, "")
    .split(".")[0]!
    .split(/[-_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return (scan.name?.trim() || fromHost).slice(0, RULES.appNameMax).trim();
}

/** The name under the icon: the whole name when it fits, else its first word, cut to fit. */
export function draftShortName(name: string): string {
  if (name.length <= RULES.shortNameMax) return name;
  return (name.split(/\s+/)[0] ?? name).slice(0, RULES.shortNameMax);
}

export function draftFromScan(scan: SiteScan, defaults: AppDefaultsSetting, now: Date): SiteDraft {
  const appType = scan.appType;
  const vertical = scan.vertical;
  const design = designsFor({ appType, vertical })[0] ?? null;
  const appName = draftName(scan);
  const site = new URL(scan.url);
  const siteUrl = `${site.origin}/`;
  // The site's language leads when the app speaks it; the default ones stay too.
  const languages =
    scan.language && (LANGUAGE_CODES as readonly string[]).includes(scan.language)
      ? { default: scan.language, available: [...new Set([scan.language, ...defaults.languages.available])] }
      : structuredClone(defaults.languages);
  const appearance = { ...defaults.appearance, secondary_color: null };
  const base: LayoutContent = design
    ? applyDesign(design, { appName, facts: { website: site.protocol === "https:" ? siteUrl : null, email: null, whatsapp: null }, current: { appearance, languages }, now })
    : { appearance, languages, tabs: [], pages: [] };
  const layout: LayoutContent = { ...base, appearance: { ...base.appearance, font: scan.fonts.appFont, secondary_color: scan.colors.accent?.toUpperCase() ?? base.appearance.secondary_color } };

  // The menu: pages that show the website's own, in the app.
  const taken = new Set(layout.pages.map((p) => p.slug));
  const room = LAYOUT_LIMITS.maxPages - layout.pages.length;
  const entries = scan.menu.filter((item) => item.url.startsWith("https://") && !covered(item, layout.tabs)).slice(0, Math.max(0, room));
  const pages: (LayoutPage & { icon: string })[] = entries.map((item, i) => {
    const slug = slugFor(item.label, i, taken);
    const embed: LayoutBlock = { id: "site-page", type: "embed", visibility: "everyone", title: null, url: item.url, height: null };
    return { slug, title: item.label.slice(0, 60), show_title: true, updated_at: now.toISOString(), blocks: [embed], icon: topicOf(item.label, item.url)?.icon ?? "explore" };
  });
  const tabs = [...layout.tabs];
  const linked: QuickLink[] = [];
  for (const page of pages) {
    // A tab before Account while the app has room for one; a link on the home page otherwise.
    if (tabs.length < LAYOUT_LIMITS.maxTabs && page.title.length <= 20 && !tabs.some((t) => t.id === page.slug)) {
      const at = tabs.findIndex((t) => t.id === "account");
      tabs.splice(at === -1 ? tabs.length : at, 0, { id: page.slug, label: page.title, icon: page.icon, target: { type: "page", page_slug: page.slug } });
    } else if (linked.length < LAYOUT_LIMITS.maxLinks) {
      linked.push({ icon: page.icon, label: page.title.slice(0, 24), action: { type: "page", page_slug: page.slug } });
    }
  }
  const home = layout.pages.find((p) => p.slug === "home") ?? layout.pages[0];
  if (home && linked.length) {
    const block: LayoutBlock = { id: "site-links", type: "quick_links", visibility: "everyone", title: null, style: "grid", links: linked };
    home.blocks.splice(Math.min(1, home.blocks.length), 0, block);
  }

  return {
    appType,
    vertical,
    design,
    details: {
      appName,
      shortName: draftShortName(appName),
      primaryColor: (scan.colors.primary ?? "#0E0D24").toUpperCase(),
      splashColor: (scan.colors.background ?? "#FFFFFF").toUpperCase(),
      font: scan.fonts.appFont,
      template: design?.look.template ?? null,
      siteUrl,
    },
    layout: { ...layout, tabs, pages: [...layout.pages, ...pages.map(({ icon: _icon, ...page }) => (void _icon, page))] },
    menuPages: pages.map((p) => p.slug),
  };
}
