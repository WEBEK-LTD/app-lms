import { appOpensScreen, sortFor } from "../pages/sources";
import type { Action, ItemSource, ScreenName, StudioEntry, StudioHeader, StudioHeaderButton, StudioHeaderStyle, StudioHeaderType, StudioNode, StudioPage, StudioStory, TabBarStyle, Translations } from "../pages/types";
import { appWord, type AppWord } from "./app-words";
import { newNodeId } from "./elements";
import { yallappPhoto } from "./photo-food";
import type { ProjectKind, SectionContext } from "./sections";

/**
 * 130.30–130.39 Studio's whole designs, premium (the owner, 14 November:
 * "Whole designs for your project (whatever the project): the templates
 * must ALL be premium"). Each of the six looks (warm, fresh, evening,
 * ocean, classic, rose: the ids projects already saved) is a complete look
 * for every kind of project: a home composed of the premium library's
 * elements (a photo cover, a hero slider with its story lines, stories,
 * a bento, glass cards, a gallery, a ticker, testimonials, the kind's live
 * card), its own colours by day and a designed night (never inverted), a
 * premium header on every page, a floating bar (a pill, the dock or glass)
 * and the system screens' premium look. The photos are the platform's own
 * free ones (CC0 or public domain, credited beside them under public/), the
 * words the app's (lib/studio/app-words.ts: Modern Standard Arabic), the
 * facts the owner's: a quote, a promise or a step that would be made up is
 * the owner's [brackets], no number, price or rating is invented, and the
 * live cards read the person's own order, ride, parcel, course or child,
 * hidden when there is none.
 */

export const PREMIUM_DESIGN_IDS = ["warm", "fresh", "evening", "ocean", "classic", "rose"] as const;
export type PremiumDesignId = (typeof PREMIUM_DESIGN_IDS)[number];

/** A look's colours by day and by night (designed for the night, not inverted). */
export interface PremiumPalette {
  /** The main colour (buttons, highlights) and its night form. */
  brand: string;
  darkBrand: string;
  /** The second colour (rings, gradients, kickers). */
  accent: string;
  /** Deep surfaces in the brand (the brand header, a gradient's dark end) by night. */
  deep: string;
  page: string;
  darkPage: string;
  surface: string;
  darkSurface: string;
  ink: string;
  darkInk: string;
  muted: string;
  darkMuted: string;
  line: string;
  darkLine: string;
  /** The shade over photos. */
  shade: string;
}

export const PREMIUM_PALETTES: Record<PremiumDesignId, PremiumPalette> = {
  // Golden hour: terracotta and amber on cream; by night, espresso.
  warm: { brand: "#C2410C", darkBrand: "#FB8B4B", accent: "#F59E0B", deep: "#3A1A0B", page: "#FFF7ED", darkPage: "#17100B", surface: "#FFFFFF", darkSurface: "#251A13", ink: "#2B1A10", darkInk: "#FBEFE6", muted: "#7A5F4E", darkMuted: "#C9AE9C", line: "#F1E2D3", darkLine: "#3A2A20", shade: "#1A0D05" },
  // Garden: leaf green and lime on mint; by night, a deep forest.
  fresh: { brand: "#15803D", darkBrand: "#4ADE80", accent: "#84CC16", deep: "#0E3B22", page: "#F3FAF4", darkPage: "#0A1610", surface: "#FFFFFF", darkSurface: "#11241A", ink: "#10291A", darkInk: "#E6F5EA", muted: "#557263", darkMuted: "#9DBBA8", line: "#DCEFE1", darkLine: "#1F3A2A", shade: "#06140C" },
  // After dark: violet and gold; by night, an ink sky.
  evening: { brand: "#6D28D9", darkBrand: "#A78BFA", accent: "#F5C451", deep: "#241552", page: "#F6F3FF", darkPage: "#0C0A1D", surface: "#FFFFFF", darkSurface: "#18132F", ink: "#1C1238", darkInk: "#EEEAFE", muted: "#6B6390", darkMuted: "#A9A1D0", line: "#E6E0FA", darkLine: "#2C2550", shade: "#0B0720" },
  // Clear water: sea blue and aqua; by night, the deep sea.
  ocean: { brand: "#0369A1", darkBrand: "#38BDF8", accent: "#22D3EE", deep: "#0A3350", page: "#F0F8FF", darkPage: "#06131D", surface: "#FFFFFF", darkSurface: "#0D2232", ink: "#0B2537", darkInk: "#E3F2FB", muted: "#4F6B80", darkMuted: "#93B3C8", line: "#D8EAF5", darkLine: "#1A3549", shade: "#021019" },
  // Editorial: ink and gold on paper; by night, gold on ink.
  classic: { brand: "#0E0D24", darkBrand: "#E3C77A", accent: "#C8A24A", deep: "#1B1A2E", page: "#FBF8F2", darkPage: "#0F0E17", surface: "#FFFFFF", darkSurface: "#1B1A26", ink: "#0E0D24", darkInk: "#F4EFE6", muted: "#6A6658", darkMuted: "#B4AE9E", line: "#E7DFCF", darkLine: "#2D2B3A", shade: "#07060F" },
  // Bloom: rose and coral on blush; by night, plum.
  rose: { brand: "#BE185D", darkBrand: "#F472B6", accent: "#FB7185", deep: "#4A1030", page: "#FFF5F7", darkPage: "#1A0B13", surface: "#FFFFFF", darkSurface: "#29121F", ink: "#3B0A24", darkInk: "#FCE7EF", muted: "#8A5A70", darkMuted: "#D4A5BA", line: "#F8DCE6", darkLine: "#45213A", shade: "#1F0612" },
};

/** Each look's floating bar: a pill, the dock or glass, in its own colours by day and by night. */
export const PREMIUM_BARS: Record<PremiumDesignId, TabBarStyle> = {
  warm: { design: "float", background: "#2B1A10", dark_background: "#F6E7DA", active: "#E8622A", dark_active: "#C2410C", inactive: "#E9D6C6", dark_inactive: "#6B5446", radius: 24, margin: 14, labels: "active" },
  fresh: { design: "glass", background: "#FFFFFF", dark_background: "#11241A", active: "#15803D", dark_active: "#4ADE80", inactive: "#557263", dark_inactive: "#9DBBA8", radius: 26, margin: 12, labels: "always" },
  evening: { design: "dock", background: "#1C1238", dark_background: "#241C48", active: "#F5C451", dark_active: "#F5C451", inactive: "#B9B0E0", dark_inactive: "#8E86B8", margin: 14 },
  ocean: { design: "glass", background: "#FFFFFF", dark_background: "#0D2232", active: "#0369A1", dark_active: "#38BDF8", inactive: "#4F6B80", dark_inactive: "#93B3C8", radius: 28, margin: 12, labels: "active" },
  classic: { design: "dock", background: "#0E0D24", dark_background: "#F4EFE6", active: "#C8A24A", dark_active: "#0E0D24", inactive: "#B4AE9E", dark_inactive: "#6A6658", margin: 14 },
  rose: { design: "float", background: "#FFFFFF", dark_background: "#29121F", active: "#BE185D", dark_active: "#F472B6", inactive: "#8A5A70", dark_inactive: "#D4A5BA", radius: 24, margin: 14, labels: "active" },
};

/** Each look's home header (its other pages take the look's page header, THEME_CHROME). */
export const PREMIUM_HOME_HEADERS: Record<PremiumDesignId, StudioHeaderStyle> = { warm: "photo", fresh: "large", evening: "glass", ocean: "search", classic: "large", rose: "brand" };

export function isPremiumDesign(id: string): id is PremiumDesignId {
  return (PREMIUM_DESIGN_IDS as readonly string[]).includes(id);
}

// ——— Each kind's photos, words, links and live card ———

type Pack = "Ac" | "In" | "St" | "Re" | "Bo" | "Cl" | "Fi" | "Se" | "Es" | "Ne" | "Ev" | "Ch" | "De" | "Fo" | "Ma" | "Ri" | "Ta" | "Sc" | "Tr" | "Ge";
type Field = "Kicker" | "Headline" | "Line" | "Cta" | "S1" | "S2" | "S3" | "S4" | "List" | "Ticker";
type Live = "learning" | "school" | "food_order" | "market_order" | "shipment" | "ride" | "recent";

interface KindPack {
  pack: Pack;
  /** The cover, then a photo for each of the four stories and tiles: the platform's own, CC0 or public domain (public/stories, demo-photos, demo-screens, travel-photos). */
  photos: readonly [string, string, string, string, string];
  /** The main button's screen, the first the app opens. */
  main: readonly ScreenName[];
  /** What each story and tile opens. */
  opens: readonly [ScreenName | null, ScreenName | null, ScreenName | null, ScreenName | null];
  icons: readonly [string, string, string, string];
  /** Words borrowed from another kind's. */
  from?: Partial<Record<Field, Pack>>;
  steps?: readonly [AppWord, AppWord, AppWord];
  live?: Live;
}

const S = "/stories";
const PACKS: Record<Pack, KindPack> = {
  Ac: { pack: "Ac", photos: ["/demo-screens/rawaq-library.jpg", `${S}/academy/academy-live.jpg`, "/stories/school/school-teacher.jpg", `${S}/multi-vendor/zad-cafe.jpg`, `${S}/academy/academy-graduation.jpg`], main: ["courses"], opens: ["courses", "my_courses", "my_courses", "my_courses"], icons: ["menu_book", "play_circle", "quiz", "workspace_premium"], live: "learning" },
  In: { pack: "In", photos: [`${S}/school/school-teacher.jpg`, `${S}/academy/academy-live.jpg`, "/demo-screens/rawaq-library.jpg", `${S}/multi-vendor/zad-cafe.jpg`, `${S}/academy/academy-graduation.jpg`], main: ["teachers", "courses"], opens: ["teachers", "courses", "my_courses", "favorites"], icons: ["groups", "menu_book", "play_circle", "favorite"], live: "learning" },
  St: { pack: "St", photos: [`${S}/delivery/delivery-shop-owner.jpg`, `${S}/multi-vendor/zad-market-aisle.jpg`, "/demo-photos/home.jpg", "/demo-photos/drinks.jpg", "/demo-photos/croissants.jpg"], main: ["search", "cart"], opens: ["search", "favorites", "search", "search"], icons: ["shopping_bag", "favorite", "redeem", "bolt"], live: "recent" },
  Re: { pack: "Re", photos: [`${S}/multi-vendor/zad-cafe.jpg`, "/demo-screens/sofra-mezze.jpg", "/demo-photos/kofta.jpg", "/demo-photos/croissants.jpg", "/demo-photos/drinks.jpg"], main: ["search", "cart"], opens: ["search", "favorites", "orders", "orders"], icons: ["restaurant_menu", "favorite", "storefront", "local_shipping"], live: "recent" },
  Bo: { pack: "Bo", photos: [`${S}/multi-vendor/zad-cafe.jpg`, `${S}/academy/academy-live.jpg`, "/travel-photos/suite.jpg", "/travel-photos/city.jpg", "/travel-photos/room.jpg"], main: ["services"], opens: ["services", "services", "appointments", "messages"], icons: ["event_available", "calendar_month", "schedule", "chat"] },
  Cl: { pack: "Cl", photos: ["/travel-photos/suite.jpg", "/travel-photos/room.jpg", "/demo-photos/mineral-water.jpg", "/demo-photos/oranges.jpg", "/demo-photos/tomatoes.jpg"], main: ["services"], opens: ["services", "services", "appointments", null], icons: ["stethoscope", "event_available", "calendar_month", "info"] },
  Fi: { pack: "Fi", photos: ["/demo-screens/safra-caldera.jpg", "/travel-photos/beach.jpg", "/demo-photos/drinks.jpg", "/demo-photos/oranges.jpg", "/demo-photos/mineral-water.jpg"], main: ["classes", "services"], opens: ["classes", "memberships", "classes", null], icons: ["fitness_center", "card_membership", "calendar_month", "emoji_events"] },
  Se: { pack: "Se", photos: [`${S}/academy/academy-live.jpg`, "/demo-photos/home.jpg", `${S}/delivery/delivery-shop-owner.jpg`, `${S}/multi-vendor/zad-cafe.jpg`, "/travel-photos/city.jpg"], main: ["services"], opens: ["services", "services", "appointments", "messages"], icons: ["category", "calendar_month", "schedule", "chat"] },
  Es: { pack: "Es", photos: ["/travel-photos/suite.jpg", "/travel-photos/room.jpg", "/travel-photos/skyline.jpg", "/travel-photos/city.jpg", "/travel-photos/oia.jpg"], main: ["favorites", "search"], opens: ["search", "favorites", "search", "messages"], icons: ["home_work", "bookmark", "location_on", "call"] },
  Ne: { pack: "Ne", photos: ["/travel-photos/city.jpg", `${S}/rides/rides-night-city.jpg`, "/travel-photos/skyline.jpg", `${S}/multi-vendor/zad-market-aisle.jpg`, "/demo-screens/nakhla-school.jpg"], main: ["articles"], opens: ["articles", "articles", "bookmarks", "search"], icons: ["newspaper", "trending_up", "bookmark", "category"] },
  Ev: { pack: "Ev", photos: [`${S}/school/school-graduation-1.jpg`, `${S}/multi-vendor/zad-cafe.jpg`, "/travel-photos/beach.jpg", `${S}/rides/rides-night-city.jpg`, `${S}/academy/academy-graduation.jpg`], main: ["events"], opens: ["events", "tickets", "favorites", "events"], icons: ["event", "confirmation_number", "bookmark", "calendar_month"] },
  Ch: { pack: "Ch", photos: [`${S}/multi-vendor/zad-market-aisle.jpg`, `${S}/delivery/delivery-boxes.jpg`, `${S}/school/school-teacher.jpg`, "/demo-photos/toast-bread.jpg", "/demo-photos/tomatoes.jpg"], main: ["campaigns"], opens: ["campaigns", "campaigns", "my_donations", "notifications"], icons: ["volunteer_activism", "favorite", "receipt_long", "campaign"] },
  De: { pack: "De", photos: [`${S}/delivery/delivery-boxes.jpg`, `${S}/delivery/delivery-shop-owner.jpg`, `${S}/rides/rides-night-city.jpg`, "/travel-photos/city.jpg", "/demo-photos/home.jpg"], main: ["send_parcel"], opens: ["send_parcel", "shipments", "send_parcel", "messages"], icons: ["send", "local_shipping", "package_2", "help"], from: {}, steps: ["stepOne", "stepTwo", "stepThree"], live: "shipment" },
  Fo: { pack: "Fo", photos: ["/demo-screens/sofra-mezze.jpg", "/demo-photos/kofta.jpg", "/demo-photos/penne-arrabbiata.jpg", "/demo-photos/croissants.jpg", "/demo-photos/drinks.jpg"], main: ["restaurants"], opens: ["restaurants", "restaurants", "restaurants", "restaurants"], icons: ["restaurant", "restaurant_menu", "storefront", "local_offer"], steps: ["foodStepOne", "foodStepTwo", "foodStepThree"], live: "food_order" },
  Ma: { pack: "Ma", photos: [`${S}/multi-vendor/zad-market-aisle.jpg`, "/demo-photos/oranges.jpg", "/demo-photos/croissants.jpg", "/demo-photos/dairy.jpg", "/demo-photos/pantry.jpg"], main: ["restaurants"], opens: ["restaurants", "restaurants", "restaurants", "restaurants"], icons: ["grocery", "storefront", "shopping_cart", "inventory_2"], live: "market_order" },
  Ri: { pack: "Ri", photos: [`${S}/rides/rides-night-city.jpg`, `${S}/rides/rides-backseat.jpg`, `${S}/rides/rides-driver.jpg`, "/travel-photos/city.jpg", "/travel-photos/skyline.jpg"], main: ["ride"], opens: ["ride", "my_rides", "ride", "messages"], icons: ["directions_car", "route", "location_on", "help"], live: "ride" },
  Ta: { pack: "Ta", photos: [`${S}/rides/rides-backseat.jpg`, `${S}/rides/rides-driver.jpg`, `${S}/rides/rides-night-city.jpg`, `${S}/rides/rides-waiting.jpg`, "/travel-photos/city.jpg"], main: ["ride"], opens: ["ride", "my_rides", "ride", "messages"], icons: ["local_taxi", "route", "location_on", "help"], from: { S1: "Ri", S2: "Ri", S3: "Ri", S4: "Ri", List: "Ri" }, steps: ["pdRiStep1", "pdRiStep2", "pdRiStep3"], live: "ride" },
  Sc: { pack: "Sc", photos: ["/demo-screens/nakhla-school.jpg", `${S}/school/school-teacher.jpg`, `${S}/school/school-graduation-1.jpg`, `${S}/academy/academy-graduation.jpg`, "/demo-screens/rawaq-library.jpg"], main: ["school"], opens: ["school", "school", "school", "school"], icons: ["newspaper", "schedule", "task_alt", "photo_library"], live: "school" },
  Tr: { pack: "Tr", photos: ["/demo-screens/safra-caldera.jpg", "/travel-photos/oia.jpg", "/travel-photos/beach.jpg", "/travel-photos/suite.jpg", "/travel-photos/skyline.jpg"], main: ["stays", "explore"], opens: ["stays", "flights", "trips", "saved"], icons: ["bed", "flight", "luggage", "bookmark"] },
  Ge: { pack: "Ge", photos: ["/travel-photos/city.jpg", `${S}/multi-vendor/zad-cafe.jpg`, "/travel-photos/skyline.jpg", "/travel-photos/beach.jpg", "/travel-photos/oia.jpg"], main: [], opens: [null, null, null, null], icons: ["info", "category", "photo_library", "call"] },
};

/** Every photo the designs use, for the gallery and the licence check (each CC0 or public domain, credited under public/). */
export const PREMIUM_DESIGN_PHOTOS: readonly string[] = [...new Set(Object.values(PACKS).flatMap((p) => p.photos))];

/** The kind's words, photos, links and live card; a project without a kind gets the general ones. */
function packOf(kind: ProjectKind | null): KindPack {
  if (!kind) return PACKS.Ge;
  switch (kind.type) {
    case "lms":
      return kind.vertical === "instructors" ? PACKS.In : PACKS.Ac;
    case "store":
      return kind.vertical === "restaurant" ? PACKS.Re : PACKS.St;
    case "booking":
      return kind.vertical === "clinic" ? PACKS.Cl : kind.vertical === "fitness" ? PACKS.Fi : kind.vertical === "services" ? PACKS.Se : PACKS.Bo;
    case "real_estate":
      return PACKS.Es;
    case "news":
      return PACKS.Ne;
    case "events":
      return PACKS.Ev;
    case "donations":
      return PACKS.Ch;
    case "delivery":
      return PACKS.De;
    case "food":
      return kind.vertical === "marketplace" ? PACKS.Ma : PACKS.Fo;
    case "rides":
      return kind.vertical === "taxi" ? PACKS.Ta : PACKS.Ri;
    case "school":
      return PACKS.Sc;
    case "travel":
      return PACKS.Tr;
    default:
      return PACKS.Ge;
  }
}

/** The pack's app word for a field (some kinds borrow another's). */
function packWord(p: KindPack, field: Field): AppWord {
  return `pd${p.from?.[field] ?? p.pack}${field}` as AppWord;
}

function packSteps(p: KindPack): readonly [AppWord, AppWord, AppWord] {
  return p.steps ?? ([`pd${p.pack}Step1`, `pd${p.pack}Step2`, `pd${p.pack}Step3`] as unknown as readonly [AppWord, AppWord, AppWord]);
}

/** The first photo of the kind (the system screens' photo look and the gallery's cover). */
export function premiumCoverPath(kind: ProjectKind | null): string {
  return packOf(kind).photos[0];
}

// ——— The parts ———

const LANGS = ["en", "ar", "tr"] as const;
type Lang = (typeof LANGS)[number];
const pad = (top: number, end: number, bottom = top, start = end) => ({ top, end, bottom, start });

/** What a design writes with: the kind, the look's colours and the app's words in the dashboard's language with the others as translations. */
interface Maker {
  ctx: SectionContext;
  kind: ProjectKind | null;
  p: KindPack;
  c: PremiumPalette;
  id: () => string;
  lang: Lang;
  /** An app word in the language written, with its translations under `field`. */
  say: (word: AppWord, field?: string) => { value: string; translations: Translations };
  photo: (i: number) => string | null;
  /** What a story or tile opens; the main button's. */
  opens: (i: number) => Action | null;
  main: Action | null;
}

function maker(ctx: SectionContext, kind: ProjectKind | null, design: PremiumDesignId): Maker {
  const p = packOf(kind);
  const lang: Lang = ctx.lang ?? "en";
  const app = ctx.app ?? "";
  const word = (l: Lang, w: AppWord) => appWord(l, w, app || appWord(l, "pdGeKicker", ""));
  const say = (w: AppWord, field = "text") => {
    const translations: Translations = {};
    for (const l of LANGS) if (l !== lang) translations[l] = { [field]: word(l, w) };
    return { value: word(lang, w), translations };
  };
  const screenAction = (screen: ScreenName | null | undefined): Action | null => {
    if (!screen) return null;
    if (kind && !appOpensScreen({ appType: kind.type, vertical: kind.vertical }, screen)) return null;
    return { type: "screen", screen };
  };
  // A project without a kind: its about and contact pages.
  const general: (Action | null)[] = [{ type: "page", page_slug: "brand" }, { type: "page", page_slug: "brand" }, { type: "page", page_slug: "brand" }, { type: "page", page_slug: "contact" }];
  const main = p.pack === "Ge" ? { type: "page" as const, page_slug: "brand" } : (p.main.map(screenAction).find(Boolean) ?? null);
  return {
    ctx,
    kind,
    p,
    c: PREMIUM_PALETTES[design],
    id: () => (ctx.newId ?? newNodeId)(),
    lang,
    say,
    photo: (i) => yallappPhoto(ctx, p.photos[i]!),
    opens: (i) => (p.pack === "Ge" ? (general[i] ?? null) : screenAction(p.opens[i])),
    main,
  };
}

/** A text node with its translations. */
function text(m: Maker, word: AppWord, look: Partial<StudioNode>): StudioNode {
  const s = m.say(word);
  return { id: m.id(), type: "text", text: s.value, translations: s.translations, ...look };
}

const inkOf = (m: Maker) => ({ color: m.c.ink, dark_color: m.c.darkInk });
const mutedOf = (m: Maker) => ({ color: m.c.muted, dark_color: m.c.darkMuted });
const surfaceOf = (m: Maker) => ({ background: m.c.surface, dark_background: m.c.darkSurface });
const rise = (delay = 0): StudioNode["motion"] => ({ enter: "slide_up", duration_ms: 520, ...(delay ? { delay_ms: delay } : {}) });

/** A section's title, with "See all" opening `action`. */
function head(m: Maker, word: AppWord, action: Action | null, look: { size?: number; top?: number; serif?: boolean } = {}): StudioNode {
  const children: StudioNode[] = [text(m, word, { width: "fill", max_lines: 1, font: { size: look.size ?? 20, weight: 800, letter_spacing: -0.3 }, ...inkOf(m) })];
  if (action) children.push(text(m, "seeAll", { font: { size: 13, weight: 700 }, color: m.c.brand, dark_color: m.c.darkBrand, action }));
  const name = m.say(word).value;
  return { id: m.id(), type: "row", name, cross: "end", gap: 10, padding: pad(look.top ?? 24, 20, 12, 20), children };
}

/** A button: filled in `background` or outlined. */
function button(m: Maker, word: AppWord, action: Action | null, look: { background?: string; darkBackground?: string; color?: string; darkColor?: string; outline?: string; height?: number; icon?: string } = {}): StudioNode {
  const s = m.say(word);
  return {
    id: m.id(),
    type: "button",
    text: s.value,
    translations: s.translations,
    width: "hug",
    height: look.height ?? 46,
    radius: (look.height ?? 46) / 2,
    background: look.outline ? null : (look.background ?? "#FFFFFF"),
    ...(look.darkBackground ? { dark_background: look.darkBackground } : {}),
    color: look.color ?? m.c.ink,
    ...(look.darkColor ? { dark_color: look.darkColor } : {}),
    ...(look.outline ? { border_color: look.outline, border_width: 1.5 } : {}),
    ...(look.icon ? { icon: look.icon, icon_position: "end" as const, icon_size: 18 } : {}),
    font: { size: 14, weight: 800 },
    padding: pad(0, 22),
    ...(action ? { action } : {}),
  };
}

/** The kind's live card: the person's own order, ride, parcel, course or child; nothing without one, or signed out. */
function liveCard(m: Maker, margin = pad(14, 16, 0, 16)): StudioNode[] {
  const { c } = m;
  const signedIn = { visibility: "signed_in" as const, margin };
  switch (m.p.live) {
    case "learning":
      return [{ id: m.id(), type: "learning", learning: { section: "continue", style: "photo" }, ...signedIn, height: 220, radius: 26, background: c.brand, dark_background: c.deep, color: "#FFFFFF" }];
    case "school":
      return [
        { id: m.id(), type: "school", school: { section: "children" }, ...signedIn },
        { id: m.id(), type: "school", school: { section: "today" }, ...signedIn, radius: 24, ...surfaceOf(m), shadow: "light" },
      ];
    case "food_order":
    case "market_order":
      return [{ id: m.id(), type: "live_status", live_status: { source: m.p.live }, ...signedIn, radius: 22, background: c.brand, dark_background: c.deep, color: "#FFFFFF", padding: pad(12, 14) }];
    case "shipment":
      return [{ id: m.id(), type: "tracking", tracking: { kind: "shipment" }, ...signedIn, radius: 22, ...surfaceOf(m), ...inkOf(m), shadow: "light", padding: pad(14, 14) }];
    case "ride":
      return [{ id: m.id(), type: "tracking", tracking: { kind: "ride", style: "driver" }, ...signedIn, image_url: yallappPhoto(m.ctx, "/stories/rides/rides-driver.jpg"), radius: 22, background: c.deep, dark_background: c.deep, color: "#FFFFFF", padding: pad(12, 12) }];
    case "recent":
      // The products this person opened lately, kept on their phone (none: nothing).
      return m.ctx.source === "products" ? items(m, "row", { recent: true, limit: 4, title: null }) : [];
    default:
      return [];
  }
}

type CardLook = "photo" | "tall" | "grid" | "row" | "editorial" | "round";

/** The app's main list in the look's cards; none when the project has no list. */
function items(m: Maker, look: CardLook, o: { title?: AppWord | null; limit?: number; recent?: boolean } = {}): StudioNode[] {
  const source = m.ctx.source;
  if (!source) return [];
  const { c } = m;
  const title = (size: number, lines = 1): StudioNode => ({ id: m.id(), type: "text", bind: "title", max_lines: lines, font: { size, weight: 800 }, ...inkOf(m) });
  const sub: StudioNode = { id: m.id(), type: "text", bind: "subtitle", max_lines: 1, font: { size: 12.5 }, ...mutedOf(m) };
  const image = (height: number, radius: number, extra: Partial<StudioNode> = {}): StudioNode => ({ id: m.id(), type: "image", bind: "image", width: "fill", height, radius, fit: "cover", ...extra });
  let card: StudioNode;
  let layout: "carousel" | "grid" | "list" = "carousel";
  let columns: number | undefined;
  switch (look) {
    case "photo":
      card = { id: m.id(), type: "column", width: 220, radius: 24, ...surfaceOf(m), shadow: "light", children: [image(146, 0), { id: m.id(), type: "column", gap: 3, padding: pad(12, 14), children: [title(15), sub] }] };
      break;
    case "tall":
      card = { id: m.id(), type: "column", width: 200, gap: 10, children: [image(250, 26), { id: m.id(), type: "column", gap: 2, padding: pad(0, 4), children: [title(16), sub] }] };
      break;
    case "round":
      card = { id: m.id(), type: "column", width: 190, gap: 10, padding: pad(10, 10), radius: 30, ...surfaceOf(m), children: [image(170, 22), { id: m.id(), type: "column", gap: 2, padding: pad(0, 6, 6, 6), children: [title(15), sub] }] };
      break;
    case "grid":
      layout = "grid";
      columns = 2;
      card = { id: m.id(), type: "column", radius: 22, ...surfaceOf(m), border_color: c.line, dark_border_color: c.darkLine, border_width: 1, children: [image(124, 0), { id: m.id(), type: "column", gap: 2, padding: pad(10, 12), children: [title(14), sub] }] };
      break;
    case "editorial":
      layout = "list";
      card = {
        id: m.id(),
        type: "row",
        gap: 14,
        cross: "center",
        padding: pad(14, 0),
        border_color: c.line,
        dark_border_color: c.darkLine,
        children: [
          { id: m.id(), type: "column", width: "fill", gap: 4, children: [title(18, 2), sub] },
          { id: m.id(), type: "image", bind: "image", width: 92, height: 92, radius: 6, fit: "cover" },
        ],
      };
      break;
    case "row":
      layout = "list";
      card = {
        id: m.id(),
        type: "row",
        gap: 12,
        cross: "center",
        radius: 20,
        padding: pad(10, 10),
        ...surfaceOf(m),
        children: [
          { id: m.id(), type: "image", bind: "image", width: 68, height: 68, radius: 16, fit: "cover" },
          { id: m.id(), type: "column", width: "fill", gap: 3, children: [title(15), sub] },
          { id: m.id(), type: "icon", icon: "chevron_right", icon_size: 22, color: c.muted, dark_color: c.darkMuted },
        ],
      };
      break;
  }
  const list: StudioNode = {
    id: m.id(),
    type: "items",
    source: source as ItemSource,
    layout,
    ...(columns ? { columns } : {}),
    gap: layout === "list" ? (look === "editorial" ? 0 : 10) : 14,
    padding: pad(0, 16, 4, 16),
    query: { limit: o.limit ?? 6, category_id: null, featured: false, sort: sortFor(source as ItemSource, "popular"), ids: [] },
    ...(o.recent ? { recent: true } : {}),
    card,
    motion: rise(),
  };
  const word = o.title === undefined ? packWord(m.p, "List") : o.title;
  return word ? [head(m, word, m.main), list] : [list];
}

/** The four stories: the kind's photos in rings, each opening its screen. */
function stories(m: Maker, ring: StudioStory["ring"] = "auto", size = 70): StudioNode {
  const slides: StudioStory[] = [1, 2, 3, 4].map((i) => {
    const s = m.say(packWord(m.p, `S${i}` as Field), "heading");
    const action = m.opens(i - 1);
    return { image_url: m.photo(i), heading: s.value, subheading: null, action, translations: s.translations, ring, ...(ring === "highlight" ? { ring_color: m.c.accent } : {}), ...(m.photo(i) ? {} : { icon: m.p.icons[i - 1], color: m.c.brand }) };
  });
  return { id: m.id(), type: "stories", interval_ms: 5000, stories: { size }, color: m.c.ink, dark_color: m.c.darkInk, padding: pad(16, 16, 6, 16), slides };
}

/** A bento of the kind's four photos (or its icons on the look's gradients), each opening its screen. */
function bento(m: Maker, o: { caption?: "plain" | "glass"; photos?: boolean; row?: number } = {}): StudioNode {
  const sizes = ["large", "small", "small", "wide"] as const;
  const grads = [
    { from: m.c.brand, to: m.c.accent, angle: 135 },
    { from: m.c.deep, to: m.c.brand, angle: 160 },
    { from: m.c.accent, to: m.c.brand, angle: 200 },
    { from: m.c.ink, to: m.c.deep, angle: 120 },
  ];
  const entries: StudioEntry[] = [1, 2, 3, 4].map((i) => {
    const s = m.say(packWord(m.p, `S${i}` as Field), "title");
    const photo = o.photos !== false ? m.photo(i) : null;
    const action = m.opens(i - 1);
    return { title: s.value, translations: s.translations, size: sizes[i - 1], icon: m.p.icons[i - 1], ...(photo ? { image_url: photo } : { gradient: grads[i - 1] }), ...(action ? { action } : {}) };
  });
  return { id: m.id(), type: "bento", columns: 2, gap: 10, radius: 24, bento: { caption: o.caption ?? "glass", row: o.row ?? 108 }, margin: pad(0, 16, 4, 16), entries, motion: rise() };
}

/** Quotes from customers: the owner's to write, in [brackets], no stars made up. */
function testimonials(m: Maker, style: "carousel" | "stacked" = "carousel"): StudioNode[] {
  const quote = (t: AppWord): StudioEntry => {
    const a = m.say(t, "text");
    const name = m.say("reviewName", "title");
    const role = m.say("pdQuoteRole", "subtitle");
    const translations: Translations = {};
    for (const l of Object.keys(a.translations)) translations[l] = { ...a.translations[l], ...name.translations[l], ...role.translations[l] };
    return { text: a.value, title: name.value, subtitle: role.value, translations };
  };
  return [
    head(m, "pdSay", null),
    {
      id: m.id(),
      type: "testimonials",
      testimonials: { style },
      gap: 12,
      radius: 24,
      ...surfaceOf(m),
      ...inkOf(m),
      padding: pad(0, 16),
      margin: pad(0, 0, 8, 0),
      entries: [quote("reviewText"), quote("pdQuoteTwo")],
      motion: rise(),
    },
  ];
}

/** The kind's ticker, a band of its three lines. */
function ticker(m: Maker, look: Partial<StudioNode> & { tilt?: number; chips?: boolean }): StudioNode {
  const s = m.say(packWord(m.p, "Ticker"));
  const { tilt, chips, ...rest } = look;
  return {
    id: m.id(),
    type: "marquee",
    text: s.value,
    translations: s.translations,
    ...(chips ? {} : { icon: "star", icon_size: 14 }),
    gap: 18,
    font: { size: 14, weight: 800 },
    padding: pad(12, 0),
    margin: pad(16, 0, 8, 0),
    marquee: { speed: 36, ...(tilt ? { tilt } : {}), ...(chips ? { chips: true } : {}) },
    ...rest,
  };
}

/** The kind's steps (the timeline of how it works). */
function steps(m: Maker, style: "vertical" | "horizontal" = "vertical"): StudioNode[] {
  const entries: StudioEntry[] = packSteps(m.p).map((w, i) => {
    const s = m.say(w, "title");
    return { title: s.value, subtitle: `0${i + 1}`, translations: s.translations };
  });
  return [head(m, "stepsTitle", null), { id: m.id(), type: "timeline", timeline: { style, mono: true }, ...inkOf(m), margin: pad(0, 20, 8, 20), entries, motion: rise() }];
}

/** A gallery of the kind's photos with their captions, each opening its screen. */
function gallery(m: Maker, layout: "masonry" | "bento" | "filmstrip", withCover = false): StudioNode[] {
  const shown = (withCover ? [0, 1, 2, 3, 4] : [1, 2, 3, 4]).filter((i) => m.photo(i));
  if (shown.length < 3) return [];
  return [
    {
      id: m.id(),
      type: "gallery",
      gallery: { layout, radius: 22, captions: true },
      caption_style: "pill",
      gap: 10,
      padding: pad(0, 16, 4, 16),
      images: shown.map((i) => {
        const s = m.say(i === 0 ? packWord(m.p, "Kicker") : packWord(m.p, `S${i}` as Field), "caption");
        const action = i === 0 ? m.main : m.opens(i - 1);
        return { image_url: m.photo(i)!, caption: s.value, translations: s.translations, ...(action ? { action } : {}) };
      }),
      motion: rise(),
    },
  ];
}

/** A badge with an app word. */
function badge(m: Maker, word: AppWord, style: "pill" | "outline" | "gradient" | "glass" | "text", look: Partial<StudioNode> = {}): StudioNode {
  const s = m.say(word);
  return { id: m.id(), type: "badge_text", text: s.value, translations: s.translations, badge: { style }, ...look };
}

/** The header of a design's page: its premium style in the look's colours by day and by night. */
export function premiumHeader(design: PremiumDesignId, type: StudioHeaderType, style: StudioHeaderStyle, extra: Partial<StudioHeader> = {}): StudioHeader {
  const c = PREMIUM_PALETTES[design];
  const colours =
    style === "brand"
      ? { background: c.brand, dark_background: c.deep, color: "#FFFFFF", dark_color: "#FFFFFF" }
      : style === "photo"
        ? { background: c.shade, dark_background: c.shade, color: "#FFFFFF", dark_color: "#FFFFFF" }
        : { background: c.page, dark_background: c.darkPage, color: c.ink, dark_color: c.darkInk };
  return { type, buttons: ["notifications", "account"], ...colours, ...extra, style };
}

/** The home's header: the app's name (else the kind's kicker) with the kind's line under it. */
function homeHeader(m: Maker, design: PremiumDesignId, type: StudioHeaderType, buttons: StudioHeaderButton[], o: { image?: boolean; subtitle?: AppWord | null } = {}): StudioHeader {
  const style = PREMIUM_HOME_HEADERS[design];
  const kicker = m.say(packWord(m.p, "Kicker"), "title");
  const sub = o.subtitle === null ? null : m.say(o.subtitle ?? packWord(m.p, "Line"), "subtitle");
  const title = m.ctx.app ? { title: m.ctx.app } : { title: kicker.value };
  const translations: Translations = {};
  for (const l of LANGS) {
    if (l === m.lang) continue;
    const t = { ...(m.ctx.app ? {} : kicker.translations[l]), ...(sub ? sub.translations[l] : {}) };
    if (Object.keys(t).length) translations[l] = t;
  }
  return premiumHeader(design, type, style, {
    ...title,
    ...(sub ? { subtitle: sub.value } : {}),
    ...(o.image && m.photo(0) ? { image_url: m.photo(0) } : {}),
    buttons,
    ...(Object.keys(translations).length ? { translations } : {}),
  });
}

/** A page in the look's colours. */
function page(m: Maker, header: StudioHeader, children: StudioNode[]): StudioPage {
  return {
    header,
    background: m.c.page,
    dark_background: m.c.darkPage,
    // The app ends the page above its floating bar itself.
    body: { id: m.id(), type: "column", padding: pad(0, 0, 28, 0), children },
  };
}

/** A photo slide: the kicker, a headline and the main button, over the photo under the look's shade. */
function slide(m: Maker, i: number, o: { height: number; radius: number; kicker: AppWord | null; title: AppWord; button: boolean; gold?: string; size?: number }): StudioNode {
  const { c } = m;
  const children: StudioNode[] = [];
  if (o.kicker) children.push(text(m, o.kicker, { color: o.gold ?? c.accent, font: { size: 12, weight: 800, letter_spacing: 1.8, uppercase: true } }));
  children.push(text(m, o.title, { color: "#FFFFFF", font: { size: o.size ?? 30, weight: 800, line_height: 1.08, letter_spacing: -0.6 } }));
  if (o.button) children.push({ ...button(m, packWord(m.p, "Cta"), m.main, { background: o.gold ?? "#FFFFFF", color: o.gold ? c.ink : c.ink, icon: "arrow_forward" }), margin: pad(8, 0, 0, 0) });
  return {
    id: m.id(),
    type: "photo_hero",
    image_url: m.photo(i),
    height: o.height,
    ...(o.radius ? { radius: o.radius } : {}),
    background: c.deep,
    scrim: { color: c.shade, from: 0.35, middle: 0.05, at: 42, to: 0.86 },
    align: "end",
    gap: 8,
    padding: pad(20, 22, o.radius ? 22 : 34, 22),
    children,
  };
}

// ——— The six homes ———

/** Golden hour: the cover photo folding into the bar, stories, the live card, a gradient card, the list in photo cards, a bento and the quotes. */
function warmHome(m: Maker, type: StudioHeaderType): StudioPage {
  const { c } = m;
  const promo: StudioNode = {
    id: m.id(),
    type: "row",
    gap: 14,
    cross: "center",
    radius: 26,
    gradient: { from: c.brand, to: c.accent, angle: 120 },
    padding: pad(18, 18),
    margin: pad(16, 16, 0, 16),
    shadow: "medium",
    ...(m.main ? { action: m.main } : {}),
    children: [
      { id: m.id(), type: "column", width: "fill", gap: 4, children: [text(m, packWord(m.p, "Headline"), { color: "#FFFFFF", font: { size: 21, weight: 800, line_height: 1.1 } })] },
      { id: m.id(), type: "row", width: 46, height: 46, radius: 23, align: "center", cross: "center", background: "#FFFFFF", children: [{ id: m.id(), type: "icon", icon: "arrow_forward", icon_size: 22, color: c.brand }] },
    ],
    motion: rise(),
  };
  return page(m, homeHeader(m, "warm", type, ["notifications", "account"], { image: true }), [
    stories(m, "auto", 70),
    ...liveCard(m),
    promo,
    ...items(m, "photo"),
    head(m, "pdExplore", null),
    bento(m, { caption: "glass" }),
    ...testimonials(m, "carousel"),
  ]);
}

/** Garden: a large title, photo cards to swipe, the kind's chips, the live card, the list in a grid, how it works and the quotes. */
function freshHome(m: Maker, type: StudioHeaderType): StudioPage {
  const { c } = m;
  const slider: StudioNode = {
    id: m.id(),
    type: "slider",
    height: 250,
    per_view: 1.12,
    gap: 12,
    autoplay: true,
    interval_ms: 5000,
    indicator: "pill",
    padding: pad(0, 0, 0, 16),
    margin: pad(6, 0, 4, 0),
    children: [
      slide(m, 0, { height: 250, radius: 28, kicker: packWord(m.p, "Kicker"), title: packWord(m.p, "Headline"), button: true, size: 26 }),
      slide(m, 1, { height: 250, radius: 28, kicker: null, title: packWord(m.p, "S1"), button: false, size: 26 }),
      slide(m, 2, { height: 250, radius: 28, kicker: null, title: packWord(m.p, "S2"), button: false, size: 26 }),
    ],
  };
  const chips: StudioNode = {
    id: m.id(),
    type: "row",
    scroll: true,
    gap: 8,
    padding: pad(14, 16, 2, 16),
    children: [1, 2, 3, 4].map((i) => badge(m, packWord(m.p, `S${i}` as Field), i === 1 ? "pill" : "outline", { icon: m.p.icons[i - 1], color: i === 1 ? "#FFFFFF" : c.brand, dark_color: i === 1 ? "#0A1610" : c.darkBrand, background: i === 1 ? c.brand : null, dark_background: i === 1 ? c.darkBrand : null, ...(m.opens(i - 1) ? { action: m.opens(i - 1) } : {}) })),
  };
  return page(m, homeHeader(m, "fresh", type, ["search", "notifications", "account"]), [slider, chips, ...liveCard(m), ...items(m, "grid", { limit: 4 }), ...steps(m), ...testimonials(m, "stacked")]);
}

/** After dark: a full-screen hero slider with its story lines in gold, a tilted ticker, the live card, tall cards, a filmstrip and the quotes. */
function eveningHome(m: Maker, type: StudioHeaderType): StudioPage {
  const { c } = m;
  const slider: StudioNode = {
    id: m.id(),
    type: "slider",
    height: 460,
    per_view: 1,
    autoplay: true,
    interval_ms: 5500,
    indicator: "progress",
    indicator_look: { at: "top", inset: 16, color: c.accent, count: "padded" },
    ken_burns: true,
    children: [
      slide(m, 0, { height: 460, radius: 0, kicker: packWord(m.p, "Kicker"), title: packWord(m.p, "Headline"), button: true, gold: c.accent, size: 34 }),
      slide(m, 1, { height: 460, radius: 0, kicker: packWord(m.p, "Kicker"), title: packWord(m.p, "S1"), button: false, gold: c.accent, size: 34 }),
      slide(m, 2, { height: 460, radius: 0, kicker: packWord(m.p, "Kicker"), title: packWord(m.p, "S2"), button: false, gold: c.accent, size: 34 }),
    ],
  };
  return page(m, homeHeader(m, "evening", type, ["search", "notifications", "account"], { subtitle: null }), [
    slider,
    ticker(m, { tilt: -2, background: c.accent, color: c.ink, dark_background: c.accent, dark_color: "#0C0A1D" }),
    ...liveCard(m),
    ...items(m, "tall"),
    head(m, "pdLook", null),
    ...gallery(m, "filmstrip"),
    ...testimonials(m, "carousel"),
  ]);
}

/** Clear water: a parallax photo with its words on glass, stories, the live card, the list in soft rows, how it works on glass over a photo and a bento. */
function oceanHome(m: Maker, type: StudioHeaderType): StudioPage {
  const { c } = m;
  const banner: StudioNode = {
    id: m.id(),
    type: "parallax_banner",
    image_url: m.photo(0),
    parallax: { speed: 0.5 },
    glass: true,
    height: 340,
    radius: 30,
    margin: pad(6, 16, 0, 16),
    background: c.deep,
    scrim: { color: c.shade, from: 0.05, to: 0.5 },
    align: "end",
    gap: 8,
    padding: pad(20, 20),
    children: [
      badge(m, packWord(m.p, "Kicker"), "glass", { icon: "star", color: "#FFFFFF", self_align: "start" }),
      text(m, packWord(m.p, "Headline"), { color: "#FFFFFF", font: { size: 27, weight: 800, line_height: 1.1, letter_spacing: -0.4 } }),
      text(m, packWord(m.p, "Line"), { color: "#FFFFFF", opacity: 0.9, font: { size: 14, line_height: 1.35 } }),
      { ...button(m, packWord(m.p, "Cta"), m.main, { background: "#FFFFFF", color: c.brand, icon: "arrow_forward" }), margin: pad(6, 0, 0, 0) },
    ],
  };
  const how: StudioNode = {
    id: m.id(),
    type: "photo_hero",
    image_url: m.photo(3),
    height: 300,
    radius: 30,
    background: c.deep,
    scrim: { color: c.shade, from: 0.1, to: 0.55 },
    align: "end",
    padding: pad(16, 16),
    margin: pad(24, 16, 0, 16),
    children: [
      {
        id: m.id(),
        type: "column",
        gap: 10,
        radius: 24,
        padding: pad(16, 16),
        surface: { glass: 18, tint: 0.2, border: { from: "#FFFFFF", to: c.accent } },
        color: "#FFFFFF",
        children: [
          text(m, "stepsTitle", { color: "#FFFFFF", font: { size: 18, weight: 800 } }),
          ...packSteps(m.p).map((w, i) => ({
            id: m.id(),
            type: "row" as const,
            gap: 10,
            cross: "center" as const,
            children: [
              { id: m.id(), type: "row" as const, width: 26, height: 26, radius: 13, align: "center" as const, cross: "center" as const, background: c.accent, dark_background: c.accent, children: [{ id: m.id(), type: "text" as const, text: `${i + 1}`, color: c.ink, font: { size: 13, weight: 800 as const } }] },
              text(m, w, { width: "fill", color: "#FFFFFF", font: { size: 14, weight: 600 } }),
            ],
          })),
        ],
      },
    ],
    motion: rise(),
  };
  return page(m, homeHeader(m, "ocean", type, ["notifications", "account"], { subtitle: null }), [banner, stories(m, "highlight", 66), ...liveCard(m), ...items(m, "row", { limit: 4 }), how, head(m, "pdExplore", null), bento(m, { caption: "plain", photos: false, row: 96 })]);
}

/** Editorial: words in the look's gradient, a photo story, a ticker of outlined words, the live card, the list as an index, the place's card and the quotes. */
function classicHome(m: Maker, type: StudioHeaderType): StudioPage {
  const { c } = m;
  const intro: StudioNode = {
    id: m.id(),
    type: "column",
    gap: 10,
    padding: pad(6, 20, 4, 20),
    children: [
      badge(m, packWord(m.p, "Headline"), "text", { font: { size: 38, weight: 800, line_height: 1.02, letter_spacing: -1 }, gradient: { from: c.brand, to: c.accent, angle: 90 } }),
      text(m, packWord(m.p, "Line"), { font: { size: 15, line_height: 1.45 }, ...mutedOf(m) }),
      { id: m.id(), type: "row", height: 1, background: c.line, dark_background: c.darkLine, margin: pad(8, 0, 0, 0), children: [] },
    ],
  };
  const story: StudioNode = { ...slide(m, 0, { height: 320, radius: 8, kicker: packWord(m.p, "S1"), title: packWord(m.p, "List"), button: true, gold: c.accent, size: 28 }), ken_burns: true, margin: pad(16, 16, 0, 16), motion: rise() };
  const kicker = m.say(packWord(m.p, "Kicker"), "title");
  const line = m.say("pdAboutLine");
  const about: StudioNode = {
    id: m.id(),
    type: "profile_card",
    title: m.ctx.app ?? kicker.value,
    text: line.value,
    translations: Object.fromEntries(LANGS.filter((l) => l !== m.lang).map((l) => [l, { ...(m.ctx.app ? {} : kicker.translations[l]), text: line.translations[l]!.text! }])),
    profile: { cover_url: m.photo(2), shape: "square" },
    radius: 10,
    gap: 12,
    ...surfaceOf(m),
    ...inkOf(m),
    border_color: c.line,
    dark_border_color: c.darkLine,
    border_width: 1,
    margin: pad(24, 16, 0, 16),
    padding: pad(0, 16, 18, 16),
    cross: "center",
    children: [
      { id: m.id(), type: "row", gap: 8, align: "center", children: [badge(m, packWord(m.p, "S2"), "outline", { color: c.ink, dark_color: c.darkInk }), badge(m, packWord(m.p, "S3"), "outline", { color: c.ink, dark_color: c.darkInk })] },
      {
        id: m.id(),
        type: "row",
        gap: 10,
        children: [
          { ...button(m, packWord(m.p, "Cta"), m.main, { background: c.brand, darkBackground: c.darkBrand, color: "#FFFFFF", darkColor: c.darkPage }), width: "fill", radius: 8 },
          { ...button(m, "formTitle", { type: "page", page_slug: "contact" }, { outline: c.ink, color: c.ink, darkColor: c.darkInk }), width: "fill", radius: 8, dark_border_color: c.darkInk },
        ],
      },
    ],
    motion: rise(),
  };
  return page(m, homeHeader(m, "classic", type, ["search", "notifications", "account"], { subtitle: packWord(m.p, "Kicker") }), [
    intro,
    story,
    ticker(m, { chips: true, background: c.page, dark_background: c.darkPage, color: c.ink, dark_color: c.darkInk, margin: pad(18, 0, 0, 0) }),
    ...liveCard(m),
    ...items(m, "editorial", { limit: 4 }),
    about,
    ...testimonials(m, "stacked"),
  ]);
}

/** Bloom: the brand's bar, stories in lit rings, words in a gradient chip, the live card, a masonry of photos, rounded cards and the quotes. */
function roseHome(m: Maker, type: StudioHeaderType): StudioPage {
  const { c } = m;
  const intro: StudioNode = {
    id: m.id(),
    type: "column",
    gap: 10,
    padding: pad(14, 20, 4, 20),
    children: [
      badge(m, packWord(m.p, "Kicker"), "gradient", { icon: "favorite", gradient: { from: c.brand, to: c.accent, angle: 90 }, self_align: "start" }),
      text(m, packWord(m.p, "Headline"), { font: { size: 32, weight: 800, line_height: 1.08, letter_spacing: -0.6 }, ...inkOf(m) }),
      text(m, packWord(m.p, "Line"), { font: { size: 15, line_height: 1.4 }, ...mutedOf(m) }),
      {
        id: m.id(),
        type: "row",
        gap: 10,
        margin: pad(6, 0, 0, 0),
        children: [
          button(m, packWord(m.p, "Cta"), m.main, { background: c.brand, darkBackground: c.darkBrand, color: "#FFFFFF", darkColor: c.darkPage, icon: "arrow_forward" }),
          { ...button(m, "pdExplore", { type: "page", page_slug: "brand" }, { outline: c.brand, color: c.brand, darkColor: c.darkBrand }), dark_border_color: c.darkBrand },
        ],
      },
    ],
    motion: rise(),
  };
  return page(m, homeHeader(m, "rose", type, ["notifications", "account"], { subtitle: null }), [
    stories(m, "highlight", 64),
    intro,
    ...liveCard(m),
    head(m, "pdLook", null),
    ...gallery(m, "masonry", true),
    ...items(m, "round"),
    ...testimonials(m, "carousel"),
  ]);
}

const HOMES: Record<PremiumDesignId, (m: Maker, type: StudioHeaderType) => StudioPage> = { warm: warmHome, fresh: freshHome, evening: eveningHome, ocean: oceanHome, classic: classicHome, rose: roseHome };

/** 130.30 A design's premium home for the project's kind. */
export function premiumHome(design: PremiumDesignId, kind: ProjectKind | null, ctx: SectionContext, type: StudioHeaderType): StudioPage {
  return HOMES[design](maker(ctx, kind, design), type);
}

/**
 * 130.31 A design's about page (its `brand` page): the place's card on the
 * kind's photo with its two buttons, why choose it (the owner's promises,
 * in brackets), a look inside and the quotes, in the look's page header.
 */
export function premiumAbout(design: PremiumDesignId, kind: ProjectKind | null, ctx: SectionContext, type: StudioHeaderType, style: StudioHeaderStyle): StudioPage {
  const m = maker(ctx, kind, design);
  const { c } = m;
  const kicker = m.say(packWord(m.p, "Kicker"), "title");
  const line = m.say("pdAboutLine");
  const card: StudioNode = {
    id: m.id(),
    type: "profile_card",
    title: ctx.app ?? kicker.value,
    text: line.value,
    translations: Object.fromEntries(LANGS.filter((l) => l !== m.lang).map((l) => [l, { ...(ctx.app ? {} : kicker.translations[l]), text: line.translations[l]!.text! }])),
    profile: { cover_url: m.photo(0), shape: "square" },
    radius: 28,
    gap: 12,
    ...surfaceOf(m),
    ...inkOf(m),
    shadow: "light",
    margin: pad(12, 16, 0, 16),
    padding: pad(0, 16, 18, 16),
    cross: "center",
    children: [
      { id: m.id(), type: "row", gap: 8, align: "center", children: [badge(m, packWord(m.p, "S1"), "gradient", { icon: m.p.icons[0], gradient: { from: c.brand, to: c.accent, angle: 90 } }), badge(m, packWord(m.p, "S2"), "outline", { color: c.brand, dark_color: c.darkBrand })] },
      {
        id: m.id(),
        type: "row",
        gap: 10,
        children: [
          { ...button(m, packWord(m.p, "Cta"), m.main, { background: c.brand, darkBackground: c.darkBrand, color: "#FFFFFF", darkColor: c.darkPage }), width: "fill", radius: 16 },
          { ...button(m, "formTitle", { type: "page", page_slug: "contact" }, { outline: c.brand, color: c.brand, darkColor: c.darkBrand }), width: "fill", radius: 16, dark_border_color: c.darkBrand },
        ],
      },
    ],
  };
  const promise = (w: AppWord, icon: string, size: StudioEntry["size"], gradient?: StudioEntry["gradient"]): StudioEntry => {
    const t = m.say(w, "title");
    const x = m.say("pdPromiseText", "text");
    const translations: Translations = {};
    for (const l of Object.keys(t.translations)) translations[l] = { ...t.translations[l], ...x.translations[l] };
    return { title: t.value, text: x.value, icon, size, translations, ...(gradient ? { gradient } : {}) };
  };
  const why: StudioNode = {
    id: m.id(),
    type: "bento",
    columns: 2,
    gap: 10,
    radius: 24,
    bento: { caption: "plain", row: 112 },
    margin: pad(0, 16, 4, 16),
    ...inkOf(m),
    entries: [promise("pdPromise1", "workspace_premium", "wide", { from: c.brand, to: c.accent, angle: 120 }), promise("pdPromise2", "favorite", "small"), promise("pdPromise3", "bolt", "small")],
    motion: rise(),
  };
  return {
    header: premiumHeader(design, type, style, { buttons: ["menu", "account"] }),
    background: c.page,
    dark_background: c.darkPage,
    body: { id: m.id(), type: "column", padding: pad(0, 0, 28, 0), children: [card, head(m, "pdWhy", null), why, head(m, "pdLook", null), ...gallery(m, "bento"), ...testimonials(m, "stacked")] },
  };
}
