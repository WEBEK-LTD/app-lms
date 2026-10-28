import type { AppType, AppVertical } from "../data/types";
import type { Action, ItemSource, StudioNode, StudioPage } from "../pages/types";
import { newNodeId } from "./elements";

/**
 * 103R Ready sections (dropped onto a page whole) and page templates (a
 * whole page to start from), in the editor's left panel. Their texts are
 * the owner's to change; `w` gives them in the language being edited.
 */

export type SectionWord =
  | "heroTitle"
  | "heroText"
  | "heroButton"
  | "offerKicker"
  | "offerTitle"
  | "cta"
  | "featureFast"
  | "featureFastText"
  | "featureSafe"
  | "featureSafeText"
  | "featureSupport"
  | "featureSupportText"
  | "reviewText"
  | "reviewName"
  | "contactTitle"
  | "contactText"
  | "formTitle"
  | "formName"
  | "formPhone"
  | "formMessage"
  | "statsOne"
  | "statsTwo"
  | "statsThree"
  | "listTitle"
  // 103R.7 Words of the templates made for each project type.
  | "ctaLearn"
  | "ctaBook"
  | "ctaDonate"
  | "ctaEvents"
  | "ctaListings"
  | "ctaRead"
  | "sendTitle"
  | "sendText"
  | "sendButton"
  | "trackButton"
  | "stepsTitle"
  | "stepOne"
  | "stepTwo"
  | "stepThree"
  // 105.1.6 Food delivery from many restaurants.
  | "foodTitle"
  | "foodText"
  | "foodButton"
  | "foodOrders"
  | "foodStepOne"
  | "foodStepTwo"
  | "foodStepThree"
  | "ctaFood"
  // 105.2 Ride hailing.
  | "rideTitle"
  | "rideText"
  | "rideButton"
  | "rideMyRides"
  | "rideStepOne"
  | "rideStepTwo"
  | "rideStepThree"
  | "ctaRide";

export interface SectionContext {
  brand: string;
  /** The app's main list, for products, courses, services and the rest. */
  source: ItemSource | null;
  w: (word: SectionWord) => string;
  newId?: () => string;
  /** 103R.7 What the main buttons say and open, as a template for the project type sets them. */
  button?: { word: SectionWord; action: Action | null };
  /** 105.1.6 The three steps' words, as a template for the project type sets them. */
  steps?: readonly [SectionWord, SectionWord, SectionWord];
}

/** 103R.7 The project types a section or template is made for; none: every type. */
export interface Fits {
  types?: readonly AppType[];
  verticals?: readonly AppVertical[];
}

export interface SectionInfo {
  id: string;
  icon: string;
  make: (ctx: SectionContext) => StudioNode;
  fits?: Fits;
  /** Shown only to projects with categories to list. */
  needsCategories?: boolean;
}

/** The project's type and vertical (`App.appType`, `App.vertical`). */
export interface ProjectKind {
  type: AppType;
  vertical: AppVertical | null;
}

const screen = (name: NonNullable<Action["screen"]>): Action => ({ type: "screen", screen: name });

const pad = (v: number, h: number) => ({ top: v, end: h, bottom: v, start: h });

function text(ctx: SectionContext, value: string, extra: Partial<StudioNode> = {}): StudioNode {
  return { id: (ctx.newId ?? newNodeId)(), type: "text", text: value, ...extra };
}

export const SECTIONS: readonly SectionInfo[] = [
  {
    id: "hero",
    icon: "web_asset",
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "column",
      name: ctx.w("heroTitle"),
      gap: 10,
      padding: pad(22, 18),
      margin: pad(12, 10),
      radius: 18,
      background: ctx.brand,
      color: "#FFFFFF",
      children: [
        text(ctx, ctx.w("heroTitle"), { font: { size: 24, weight: 800, line_height: 1.25 } }),
        text(ctx, ctx.w("heroText"), { font: { size: 14 }, opacity: 0.9 }),
        {
          id: (ctx.newId ?? newNodeId)(),
          type: "button",
          text: ctx.w(ctx.button?.word ?? "heroButton"),
          width: "hug",
          height: 42,
          radius: 12,
          background: "#FFFFFF",
          color: ctx.brand,
          font: { weight: 800, size: 14 },
          padding: pad(0, 18),
          action: ctx.button?.action ?? null,
        },
      ],
    }),
  },
  {
    id: "offer",
    icon: "view_carousel",
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "stack",
      name: ctx.w("offerKicker"),
      height: 150,
      radius: 18,
      margin: pad(12, 10),
      background: "#E8B04B",
      children: [
        {
          id: (ctx.newId ?? newNodeId)(),
          type: "column",
          align: "end",
          padding: pad(14, 14),
          color: "#14361F",
          children: [text(ctx, ctx.w("offerKicker"), { font: { size: 12, weight: 700 } }), text(ctx, ctx.w("offerTitle"), { font: { size: 20, weight: 800, line_height: 1.3 } })],
        },
      ],
    }),
  },
  {
    id: "categories",
    icon: "label",
    needsCategories: true,
    make: (ctx) => ({ id: (ctx.newId ?? newNodeId)(), type: "categories", source: ctx.source ?? undefined, padding: pad(8, 10) }),
  },
  {
    id: "products",
    icon: "grid_view",
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "column",
      name: ctx.w("listTitle"),
      gap: 8,
      padding: pad(6, 10),
      children: [
        text(ctx, ctx.w("listTitle"), { font: { size: 17, weight: 800 } }),
        { id: (ctx.newId ?? newNodeId)(), type: "items", source: ctx.source ?? undefined, layout: "grid", columns: 2, gap: 10, query: { limit: 4, category_id: null, featured: false, sort: "newest", ids: [] } },
      ],
    }),
  },
  {
    id: "cta",
    icon: "smart_button",
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "button",
      text: ctx.w(ctx.button?.word ?? "cta"),
      action: ctx.button?.action ?? null,
      width: "fill",
      height: 46,
      radius: 14,
      background: ctx.brand,
      color: "#FFFFFF",
      font: { weight: 800, size: 15 },
      text_align: "center",
      icon: "arrow_back",
      margin: pad(10, 18),
      shadow: "medium",
      motion: { press: "shrink" },
    }),
  },
  {
    id: "features",
    icon: "view_column",
    make: (ctx) => {
      const feature = (icon: string, title: SectionWord, body: SectionWord): StudioNode => ({
        id: (ctx.newId ?? newNodeId)(),
        type: "column",
        width: "fill",
        gap: 4,
        padding: pad(12, 10),
        radius: 14,
        background: "#FFFFFF",
        dark_background: "#22203A",
        shadow: "light",
        cross: "center",
        text_align: "center",
        children: [
          { id: (ctx.newId ?? newNodeId)(), type: "icon", icon, icon_size: 26, color: ctx.brand },
          text(ctx, ctx.w(title), { font: { size: 13, weight: 800 }, text_align: "center" }),
          text(ctx, ctx.w(body), { font: { size: 11 }, opacity: 0.75, text_align: "center" }),
        ],
      });
      return {
        id: (ctx.newId ?? newNodeId)(),
        type: "row",
        gap: 8,
        padding: pad(8, 10),
        children: [feature("bolt", "featureFast", "featureFastText"), feature("verified_user", "featureSafe", "featureSafeText"), feature("support_agent", "featureSupport", "featureSupportText")],
      };
    },
  },
  {
    id: "stats",
    icon: "monitoring",
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "row",
      align: "around",
      padding: pad(14, 10),
      margin: pad(8, 10),
      radius: 16,
      background: "#0E0D24",
      color: "#F4EFE6",
      children: (["statsOne", "statsTwo", "statsThree"] as const).map((w) => text(ctx, ctx.w(w), { font: { size: 13, weight: 700 }, text_align: "center" })),
    }),
  },
  {
    id: "review",
    icon: "star",
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "column",
      gap: 6,
      padding: pad(14, 14),
      margin: pad(8, 10),
      radius: 16,
      background: "#FFFFFF",
      dark_background: "#22203A",
      shadow: "light",
      children: [
        { id: (ctx.newId ?? newNodeId)(), type: "ratings", rating: 5, text: "" },
        text(ctx, ctx.w("reviewText"), { font: { size: 14, italic: true } }),
        text(ctx, ctx.w("reviewName"), { font: { size: 12, weight: 700 }, opacity: 0.75 }),
      ],
    }),
  },
  {
    id: "contact",
    icon: "map",
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "column",
      gap: 8,
      padding: pad(8, 10),
      children: [
        text(ctx, ctx.w("contactTitle"), { font: { size: 17, weight: 800 } }),
        text(ctx, ctx.w("contactText"), { font: { size: 13 }, opacity: 0.8 }),
        { id: (ctx.newId ?? newNodeId)(), type: "map", map: { lat: 30.0444, lng: 31.2357 }, height: 170, radius: 14 },
      ],
    }),
  },
  {
    id: "form",
    icon: "list_alt",
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "column",
      gap: 8,
      padding: pad(8, 14),
      children: [
        text(ctx, ctx.w("formTitle"), { font: { size: 17, weight: 800 } }),
        {
          id: (ctx.newId ?? newNodeId)(),
          type: "form",
          form: {
            send_to: "email",
            submit_label: null,
            success_text: null,
            fields: [
              { id: "name", kind: "text", label: ctx.w("formName"), required: true, options: null },
              { id: "phone", kind: "phone", label: ctx.w("formPhone"), required: true, options: null },
              { id: "message", kind: "long_text", label: ctx.w("formMessage"), required: false, options: null },
            ],
          },
        },
      ],
    }),
  },
  {
    id: "search",
    icon: "search",
    make: (ctx) => ({ id: (ctx.newId ?? newNodeId)(), type: "search", text: "", radius: 12, margin: pad(8, 10), background: "#FFFFFF", dark_background: "#22203A" }),
  },
  {
    // 103R.7 How it works, in three numbered steps.
    id: "steps",
    icon: "route",
    make: (ctx) => {
      const step = (n: number, word: SectionWord): StudioNode => ({
        id: (ctx.newId ?? newNodeId)(),
        type: "row",
        gap: 10,
        cross: "center",
        children: [
          {
            id: (ctx.newId ?? newNodeId)(),
            type: "text",
            text: String(n),
            width: 30,
            height: 30,
            radius: 15,
            background: ctx.brand,
            color: "#FFFFFF",
            text_align: "center",
            font: { size: 14, weight: 800, line_height: 2.1 },
          },
          text(ctx, ctx.w(word), { font: { size: 14, weight: 600 }, width: "fill" }),
        ],
      });
      return {
        id: (ctx.newId ?? newNodeId)(),
        type: "column",
        name: ctx.w("stepsTitle"),
        gap: 10,
        padding: pad(14, 14),
        margin: pad(8, 10),
        radius: 16,
        background: "#FFFFFF",
        dark_background: "#22203A",
        shadow: "light",
        children: [text(ctx, ctx.w("stepsTitle"), { font: { size: 17, weight: 800 } }), ...(ctx.steps ?? (["stepOne", "stepTwo", "stepThree"] as const)).map((word, i) => step(i + 1, word))],
      };
    },
  },
  {
    // 104 A delivery company's welcome: send a parcel, or follow one.
    id: "send",
    icon: "local_shipping",
    fits: { types: ["delivery"] },
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "column",
      name: ctx.w("sendTitle"),
      gap: 10,
      padding: pad(22, 18),
      margin: pad(12, 10),
      radius: 18,
      background: ctx.brand,
      color: "#FFFFFF",
      children: [
        { id: (ctx.newId ?? newNodeId)(), type: "icon", icon: "local_shipping", icon_size: 34, color: "#FFFFFF" },
        text(ctx, ctx.w("sendTitle"), { font: { size: 24, weight: 800, line_height: 1.25 } }),
        text(ctx, ctx.w("sendText"), { font: { size: 14 }, opacity: 0.9 }),
        {
          id: (ctx.newId ?? newNodeId)(),
          type: "row",
          gap: 8,
          children: [
            {
              id: (ctx.newId ?? newNodeId)(),
              type: "button",
              text: ctx.w("sendButton"),
              width: "hug",
              height: 42,
              radius: 12,
              background: "#FFFFFF",
              color: ctx.brand,
              font: { weight: 800, size: 14 },
              padding: pad(0, 18),
              action: screen("send_parcel"),
              motion: { press: "shrink" },
            },
            {
              id: (ctx.newId ?? newNodeId)(),
              type: "button",
              text: ctx.w("trackButton"),
              width: "hug",
              height: 42,
              radius: 12,
              border: { width: 1.5, color: "#FFFFFF" },
              color: "#FFFFFF",
              font: { weight: 700, size: 14 },
              padding: pad(0, 16),
              action: screen("shipments"),
            },
          ],
        },
      ],
    }),
  },
  {
    // 105.1.6 A food delivery company's welcome: order from the restaurants near you, or follow an order.
    id: "food",
    icon: "delivery_dining",
    fits: { types: ["food"] },
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "column",
      name: ctx.w("foodTitle"),
      gap: 10,
      padding: pad(22, 18),
      margin: pad(12, 10),
      radius: 18,
      background: ctx.brand,
      color: "#FFFFFF",
      children: [
        { id: (ctx.newId ?? newNodeId)(), type: "icon", icon: "restaurant", icon_size: 34, color: "#FFFFFF" },
        text(ctx, ctx.w("foodTitle"), { font: { size: 24, weight: 800, line_height: 1.25 } }),
        text(ctx, ctx.w("foodText"), { font: { size: 14 }, opacity: 0.9 }),
        {
          id: (ctx.newId ?? newNodeId)(),
          type: "row",
          gap: 8,
          children: [
            {
              id: (ctx.newId ?? newNodeId)(),
              type: "button",
              text: ctx.w("foodButton"),
              width: "hug",
              height: 42,
              radius: 12,
              background: "#FFFFFF",
              color: ctx.brand,
              font: { weight: 800, size: 14 },
              padding: pad(0, 18),
              action: screen("restaurants"),
              motion: { press: "shrink" },
            },
            {
              id: (ctx.newId ?? newNodeId)(),
              type: "button",
              text: ctx.w("foodOrders"),
              width: "hug",
              height: 42,
              radius: 12,
              border: { width: 1.5, color: "#FFFFFF" },
              color: "#FFFFFF",
              font: { weight: 700, size: 14 },
              padding: pad(0, 16),
              action: screen("food_orders"),
            },
          ],
        },
      ],
    }),
  },
  {
    // 105.2 A ride company's welcome: ask for a ride, or see my rides.
    id: "ride",
    icon: "local_taxi",
    fits: { types: ["rides"] },
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "column",
      name: ctx.w("rideTitle"),
      gap: 10,
      padding: pad(22, 18),
      margin: pad(12, 10),
      radius: 18,
      background: ctx.brand,
      color: "#FFFFFF",
      children: [
        { id: (ctx.newId ?? newNodeId)(), type: "icon", icon: "local_taxi", icon_size: 34, color: "#FFFFFF" },
        text(ctx, ctx.w("rideTitle"), { font: { size: 24, weight: 800, line_height: 1.25 } }),
        text(ctx, ctx.w("rideText"), { font: { size: 14 }, opacity: 0.9 }),
        {
          id: (ctx.newId ?? newNodeId)(),
          type: "row",
          gap: 8,
          children: [
            {
              id: (ctx.newId ?? newNodeId)(),
              type: "button",
              text: ctx.w("rideButton"),
              width: "hug",
              height: 42,
              radius: 12,
              background: "#FFFFFF",
              color: ctx.brand,
              font: { weight: 800, size: 14 },
              padding: pad(0, 18),
              action: screen("ride"),
              motion: { press: "shrink" },
            },
            {
              id: (ctx.newId ?? newNodeId)(),
              type: "button",
              text: ctx.w("rideMyRides"),
              width: "hug",
              height: 42,
              radius: 12,
              border: { width: 1.5, color: "#FFFFFF" },
              color: "#FFFFFF",
              font: { weight: 700, size: 14 },
              padding: pad(0, 16),
              action: screen("my_rides"),
            },
          ],
        },
      ],
    }),
  },
];

/** 103R.7 Whether a section or template is made for this project (or for every project). */
export function fitsKind(fits: Fits | undefined, kind: ProjectKind | null): boolean {
  if (!fits || !kind) return !fits;
  if (fits.types && !fits.types.includes(kind.type)) return false;
  if (fits.verticals && (kind.vertical === null || !fits.verticals.includes(kind.vertical))) return false;
  return true;
}

/** The ready sections for a project: its type's own first, then the general ones; no categories where it has none. */
export function sectionsFor(kind: ProjectKind | null, options: { categories?: boolean } = {}): SectionInfo[] {
  const shown = SECTIONS.filter((s) => options.categories !== false || !s.needsCategories);
  return [...shown.filter((s) => s.fits && fitsKind(s.fits, kind)), ...shown.filter((s) => !s.fits)];
}

export interface TemplateInfo {
  id: string;
  icon: string;
  make: (ctx: SectionContext) => StudioPage;
  fits?: Fits;
}

function pageOf(ctx: SectionContext, sections: string[], header: StudioPage["header"]): StudioPage {
  return {
    header,
    body: { id: (ctx.newId ?? newNodeId)(), type: "column", gap: 4, padding: { bottom: 16 }, children: sections.map((id) => SECTIONS.find((s) => s.id === id)!.make(ctx)) },
  };
}

/** A template for one kind of project: its sections, with its main buttons saying and opening `button`. */
function typed(id: string, icon: string, fits: Fits, sections: string[], header: StudioPage["header"], button?: SectionContext["button"], steps?: SectionContext["steps"]): TemplateInfo {
  return { id, icon, fits, make: (ctx) => pageOf({ ...ctx, ...(button ? { button } : {}), ...(steps ? { steps } : {}) }, sections, header) };
}

// 105.1.6 Food delivery: the main buttons open the restaurants; the steps say how an order reaches the door.
const FOOD: Fits = { types: ["food"] };
const FOOD_BUTTON: SectionContext["button"] = { word: "ctaFood", action: screen("restaurants") };
const FOOD_STEPS: SectionContext["steps"] = ["foodStepOne", "foodStepTwo", "foodStepThree"];

// 105.2 Ride hailing: the main buttons ask for a ride; the steps say how a ride comes.
const RIDES: Fits = { types: ["rides"] };
const RIDE_BUTTON: SectionContext["button"] = { word: "ctaRide", action: screen("ride") };
const RIDE_STEPS: SectionContext["steps"] = ["rideStepOne", "rideStepTwo", "rideStepThree"];

const SHOP_HEADER: StudioPage["header"] = { type: "logo_actions", buttons: ["menu", "notifications", "cart", "account"] };

export const TEMPLATES: readonly TemplateInfo[] = [
  // 103R.7 Each project type's own templates come first in the lists.
  typed("shop", "storefront", { types: ["store"] }, ["offer", "categories", "products", "cta"], SHOP_HEADER, { word: "cta", action: screen("cart") }),
  typed("menu", "restaurant_menu", { types: ["store"], verticals: ["restaurant"] }, ["hero", "categories", "products", "cta"], SHOP_HEADER, { word: "cta", action: screen("cart") }),
  typed("courses", "school", { types: ["lms"] }, ["hero", "stats", "products", "review"], { type: "logo_actions", buttons: ["menu", "notifications", "account"] }, { word: "ctaLearn", action: screen("courses") }),
  typed("services", "event_available", { types: ["booking"] }, ["hero", "features", "products", "review"], { type: "logo_center", buttons: ["menu", "notifications"] }, { word: "ctaBook", action: screen("services") }),
  typed("listings", "home_work", { types: ["real_estate"] }, ["search", "hero", "products", "contact"], { type: "logo_actions", buttons: ["menu", "notifications", "account"] }, { word: "ctaListings", action: screen("favorites") }),
  typed("news", "newspaper", { types: ["news"] }, ["search", "categories", "products"], { type: "logo_center", buttons: ["menu", "notifications"] }, { word: "ctaRead", action: screen("articles") }),
  typed("events", "confirmation_number", { types: ["events"] }, ["hero", "products", "cta"], { type: "logo_actions", buttons: ["menu", "notifications", "account"] }, { word: "ctaEvents", action: screen("events") }),
  typed("charity", "volunteer_activism", { types: ["donations"] }, ["hero", "stats", "products", "review"], { type: "logo_center", buttons: ["menu", "notifications"] }, { word: "ctaDonate", action: screen("campaigns") }),
  typed("delivery", "local_shipping", { types: ["delivery"] }, ["send", "steps", "products", "contact"], { type: "logo_actions", buttons: ["menu", "notifications", "account"] }),
  // 105.1.6 Three ready-made designs for a food delivery company.
  typed("food", "delivery_dining", FOOD, ["food", "products", "steps", "cta"], { type: "logo_actions", buttons: ["menu", "notifications", "account"] }, FOOD_BUTTON, FOOD_STEPS),
  typed("food_offers", "local_offer", FOOD, ["offer", "products", "review", "cta"], { type: "logo_center", buttons: ["menu", "notifications"] }, FOOD_BUTTON),
  typed("food_brand", "restaurant", FOOD, ["hero", "stats", "products", "steps", "contact"], { type: "transparent", buttons: ["menu", "account"] }, FOOD_BUTTON, FOOD_STEPS),
  // 105.2 Three ready-made designs for a ride company.
  typed("ride", "local_taxi", RIDES, ["ride", "products", "steps", "cta"], { type: "logo_actions", buttons: ["menu", "notifications", "account"] }, RIDE_BUTTON, RIDE_STEPS),
  typed("ride_offers", "local_offer", RIDES, ["offer", "products", "review", "cta"], { type: "logo_center", buttons: ["menu", "notifications"] }, RIDE_BUTTON),
  typed("ride_brand", "directions_car", RIDES, ["hero", "stats", "features", "steps", "contact"], { type: "transparent", buttons: ["menu", "account"] }, RIDE_BUTTON, RIDE_STEPS),
  // For every project.
  { id: "brand", icon: "auto_awesome", make: (ctx) => pageOf(ctx, ["hero", "stats", "features", "review", "contact"], { type: "transparent", buttons: ["menu", "account"] }) },
  { id: "contact", icon: "call", make: (ctx) => pageOf(ctx, ["contact", "form"], { type: "title_search", buttons: [] }) },
  { id: "blank", icon: "note_add", make: (ctx) => ({ header: { type: "logo_actions", buttons: ["notifications", "account"] }, body: { id: (ctx.newId ?? newNodeId)(), type: "column", gap: 8, children: [] } }) },
];

/**
 * 103R.7 The templates for a project: its type's own first, then the ones
 * for every project. A restaurant gets its menu, not the shop's.
 */
export function templatesFor(kind: ProjectKind | null): TemplateInfo[] {
  const own = TEMPLATES.filter((tpl) => tpl.fits && fitsKind(tpl.fits, kind));
  const best = own.some((tpl) => tpl.fits?.verticals) ? own.filter((tpl) => tpl.fits?.verticals) : own;
  return [...best, ...TEMPLATES.filter((tpl) => !tpl.fits)];
}
