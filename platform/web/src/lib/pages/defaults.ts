import { ENGINES, isAppType, kindOf } from "../app/kinds";
import type { App, AppVertical } from "../data/types";
import { lookFont, withLook } from "../fonts/look";
import type { Appearance, AppDefaultsSetting, LayoutBlock, LayoutContent, LayoutTab } from "./types";

/** Used until the team sets defaults for new apps in the admin (11.9). */
export const BUILT_IN_APP_DEFAULTS: AppDefaultsSetting = {
  appearance: {
    template: "classic",
    theme_mode: "system",
    user_can_change_mode: true,
    font: "Bricolage Grotesque",
    corners: "soft",
    cards: "outlined",
  },
  languages: { default: "en", available: ["en"] },
};

/**
 * The look an app starts with: the admin's defaults, with the template and
 * font the client picked in the Branding step once they've done it, so the
 * look matches their build.
 */
export function defaultAppearance(app: Pick<App, "template" | "font" | "brandingDoneAt">, defaults: AppDefaultsSetting): Appearance {
  const appearance: Appearance = { ...defaults.appearance, secondary_color: null };
  if (app.brandingDoneAt) {
    appearance.template = app.template;
    // 97.1 Any free font: the bundled one to show until it's on the phone, and the font itself.
    const font = lookFont(app.font);
    if (font) return withLook(appearance, font);
  }
  return appearance;
}

let counter = 0;
/** A short ID for a new block or tab. */
export function newBlockId(prefix = "b"): string {
  counter = (counter + 1) % 1296;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36).padStart(2, "0")}${Math.floor(Math.random() * 1296).toString(36)}`;
}

function welcome(name: string): LayoutBlock {
  return { id: "welcome", type: "text", visibility: "everyone", title: null, html: `<h2>Welcome to ${escape(name)}</h2>` };
}

function escape(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

const tab =(id: string, label: string, icon: string, target: LayoutTab["target"]): LayoutTab => ({ id, label, icon, target });

/** A sensible first layout for the app's type: a home page and the usual tabs. */
export function defaultLayout(
  app: Pick<App, "appType" | "backend" | "appName" | "template" | "font" | "brandingDoneAt"> & { vertical?: AppVertical | null },
  defaults: AppDefaultsSetting,
  now: Date,
): LayoutContent {
  const name = app.appName ?? "our app";
  const updated = now.toISOString();
  const home = (blocks: LayoutBlock[]) => [{ slug: "home", title: "Home", show_title: false, updated_at: updated, blocks }];
  const base = {
    appearance: defaultAppearance(app, defaults),
    languages: { default: defaults.languages.default, available: [...defaults.languages.available] },
  };
  const homeTab = tab("home", "Home", "home", { type: "page", page_slug: "home" });
  const accountTab = tab("account", "Account", "person", { type: "screen", screen: "account" });
  // 20 The engine's usual tabs and home blocks (lib/app/kinds.ts); an unknown type gets Home and Account.
  const engine = isAppType(app.appType) ? ENGINES[app.appType].pages : null;
  // 21 The kind's own tab names ("Visits" in a clinic's app); 27 or its own tabs (a gym's Classes and Membership).
  const kind = isAppType(app.appType) ? kindOf({ appType: app.appType, vertical: app.vertical ?? null }) : null;
  const names = kind?.wording?.tabs ?? {};
  const icons = kind?.wording?.tabIcons ?? {};
  const tabs = structuredClone(kind?.tabs ?? engine?.tabs ?? []).map((t) => ({
    ...t,
    ...(names[t.id] ? { label: names[t.id]! } : {}),
    ...(icons[t.id] ? { icon: icons[t.id]! } : {}),
  }));
  // 38 A café's search box says "Search the menu", not "Search products".
  const placeholders = kind?.wording?.searchPlaceholders ?? {};
  const blocks = structuredClone(engine?.home ?? []).map((b) => (b.type === "search" && placeholders[b.id] ? { ...b, placeholder: placeholders[b.id]! } : b));
  return {
    ...base,
    tabs: [homeTab, ...tabs, accountTab],
    pages: home([welcome(name), ...blocks]),
  };
}
