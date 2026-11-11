import type { App } from "../data/types";
import { yallappSignsIn } from "../hosted/sign-in-methods";
import { ICON_NAME } from "../pages/icons";

/**
 * 118.3 Yallapp Studio: the sign-in screen's look and the account menu, as
 * the owner designs them on Studio › Sign-in & account. Kept in the app's
 * hosted settings and served in `Config.screens`; the app shows them at its
 * next start, with no new build. Texts are per language (the app's
 * languages); the app picks its language's, else its own words.
 */

export const SIGN_IN_STYLES = ["classic", "photo", "card", "minimal"] as const;
export type SignInStyle = (typeof SIGN_IN_STYLES)[number];

/** Per language code (en, ar, tr, …): the owner's words. */
export type ScreenTexts = Record<string, string>;

export interface SignInLook {
  style: SignInStyle;
  /** The photo of `photo` and `card` (a Media or https address). */
  image_url: string | null;
  /** Instead of "Welcome", and the line under it. */
  title: ScreenTexts;
  subtitle: ScreenTexts;
  show_logo: boolean;
}

/**
 * 118.3 The account menu's entries the app knows, in its own order. An app
 * shows those that belong to it (its type, its features); a key the app
 * doesn't know is skipped.
 */
export const ACCOUNT_ITEMS = [
  "orders",
  "points",
  "certificates",
  "memberships",
  "quiz_results",
  "live_classes",
  "learning_paths",
  "achievements",
  "wishlist",
  "downloads",
  "my_courses",
  "restaurant",
  "teachers",
  "teacher",
  "teach",
  "shipments",
  "food_orders",
  "rides",
  "chat",
  "notifications",
  "settings",
  "help",
  "privacy",
  "terms",
] as const;
export type AccountItemKey = (typeof ACCOUNT_ITEMS)[number];

/** 118.3 Always shown: Settings has "Delete account", and the stores ask for the privacy policy and the terms. Sign out is always last. */
export const REQUIRED_ACCOUNT_ITEMS: readonly AccountItemKey[] = ["settings", "privacy", "terms"];

export interface AccountMenuEntry {
  /** One of [ACCOUNT_ITEMS], or `link`: the owner's own entry. */
  key: AccountItemKey | "link";
  hidden: boolean;
  /** The owner's name for it, per language; empty: the app's own. */
  label: ScreenTexts;
  /** A Material Symbols name; null: the app's own. */
  icon: string | null;
  /** `link`: an https address, or a Studio page of the app. */
  url?: string | null;
  page_slug?: string | null;
}

/** 118.3 The menu's top: the name and photo, a card in the app's colour, a cover with shortcuts, quick tiles, or a dark page with a membership card. */
export const ACCOUNT_HEADERS = ["plain", "card", "cover", "tiles", "night"] as const;
export type AccountHeader = (typeof ACCOUNT_HEADERS)[number];

export interface AccountMenu {
  header: AccountHeader;
  /** `night`: the membership card's colour (#RRGGBB); null: gold. */
  accent?: string | null;
  /** In the order shown. Entries the app knows that aren't here follow, in its own order. */
  items: AccountMenuEntry[];
}

export interface StudioScreens {
  sign_in?: SignInLook | null;
  account_menu?: AccountMenu | null;
}

export const SCREEN_LIMITS = { title: 60, subtitle: 140, label: 40, links: 8 } as const;

const LANGUAGE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** An https address (the Media library's included), or null. */
function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost") ? url.toString() : null;
  } catch {
    return null;
  }
}

function texts(value: unknown, max: number, problems: string[], what: string): ScreenTexts {
  const out: ScreenTexts = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [lang, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!LANGUAGE.test(lang) || typeof raw !== "string") continue;
    const text = raw.trim();
    if (!text) continue;
    if ([...text].length > max) {
      problems.push(`${what} can have up to ${max} characters.`);
      continue;
    }
    out[lang] = text;
  }
  return out;
}

/**
 * 118.3 The owner's design as saved, checked: unknown entries dropped, the
 * required entries never hidden, each kind of entry once, links with an
 * address. `problems` lists what to fix (English; the dashboard translates).
 */
export function parseStudioScreens(input: unknown): { screens: StudioScreens; problems: string[] } {
  const problems: string[] = [];
  const v = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const screens: StudioScreens = {};

  const s = v.sign_in && typeof v.sign_in === "object" ? (v.sign_in as Record<string, unknown>) : null;
  if (s) {
    const style = (SIGN_IN_STYLES as readonly string[]).includes(String(s.style)) ? (s.style as SignInStyle) : "classic";
    const image = httpsUrl(s.image_url);
    if (s.image_url && !image) problems.push("The photo's address isn't one the app can open.");
    if ((style === "photo" || style === "card") && !image) problems.push("Choose a photo for this look.");
    screens.sign_in = {
      style,
      image_url: style === "photo" || style === "card" ? image : null,
      title: texts(s.title, SCREEN_LIMITS.title, problems, "The welcome"),
      subtitle: texts(s.subtitle, SCREEN_LIMITS.subtitle, problems, "The line under the welcome"),
      show_logo: s.show_logo !== false,
    };
  }

  const m = v.account_menu && typeof v.account_menu === "object" ? (v.account_menu as Record<string, unknown>) : null;
  if (m) {
    const header = (ACCOUNT_HEADERS as readonly string[]).includes(String(m.header)) ? (m.header as AccountHeader) : "plain";
    const seen = new Set<string>();
    const items: AccountMenuEntry[] = [];
    let links = 0;
    for (const raw of Array.isArray(m.items) ? m.items : []) {
      if (!raw || typeof raw !== "object") continue;
      const e = raw as Record<string, unknown>;
      const key = String(e.key);
      const builtIn = (ACCOUNT_ITEMS as readonly string[]).includes(key);
      if (!builtIn && key !== "link") continue;
      if (builtIn && seen.has(key)) continue;
      const icon = typeof e.icon === "string" && ICON_NAME.test(e.icon) ? e.icon : null;
      const label = texts(e.label, SCREEN_LIMITS.label, problems, "A name in the menu");
      if (key === "link") {
        links += 1;
        if (links > SCREEN_LIMITS.links) {
          problems.push(`Keep at most ${SCREEN_LIMITS.links} of your own entries.`);
          continue;
        }
        const url = httpsUrl(e.url);
        const slug = typeof e.page_slug === "string" && SLUG.test(e.page_slug) ? e.page_slug : null;
        if (!url && !slug) {
          problems.push("Give each of your own entries an https address or one of your pages.");
          continue;
        }
        if (!Object.keys(label).length) {
          problems.push("Give each of your own entries a name.");
          continue;
        }
        items.push({ key: "link", hidden: e.hidden === true, label, icon: icon ?? "link", ...(slug ? { page_slug: slug } : { url }) });
        continue;
      }
      seen.add(key);
      const required = (REQUIRED_ACCOUNT_ITEMS as readonly string[]).includes(key);
      items.push({ key: key as AccountItemKey, hidden: required ? false : e.hidden === true, label, icon });
    }
    const accent = typeof m.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(m.accent) ? m.accent.toUpperCase() : null;
    screens.account_menu = { header, ...(header === "night" && accent ? { accent } : {}), items };
  }
  return { screens, problems: [...new Set(problems)] };
}

/**
 * 118.3 Whether the app gets Studio's screens: a Studio project on the hosted
 * API, or on its own API that Yallapp signs people in to (the app reads them
 * from Yallapp's `/config` with the sign-in rules). Another own API sends
 * `Config.screens` itself.
 */
export function studioScreensOn(app: Pick<App, "section" | "backend"> & { hostedSettings?: App["hostedSettings"] }): boolean {
  return app.section === "studio" && (app.backend === "hosted" || yallappSignsIn(app));
}

/** 118.3 `Config.screens`, or nothing when the owner hasn't designed them. */
export function screensConfig(app: Pick<App, "section" | "backend"> & { hostedSettings?: App["hostedSettings"] }): { screens?: StudioScreens } {
  const saved = app.hostedSettings?.studioScreens;
  if (!saved || !studioScreensOn(app)) return {};
  const screens: StudioScreens = {};
  if (saved.sign_in) screens.sign_in = saved.sign_in;
  if (saved.account_menu) screens.account_menu = saved.account_menu;
  return Object.keys(screens).length ? { screens } : {};
}
