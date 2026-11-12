import type { AppType, AppVertical } from "../data/types";
import type { Action, ItemSource, LayoutBlock, StudioMarket, StudioNode, StudioPage } from "../pages/types";
import type { StudioDemoId } from "../demo/constants";
import { ACADEMY_PROJECT, academyHome, type TemplateProject } from "./academy";
import { DEMO_HOME_TEMPLATES, DEMO_ICONS, demoTemplateId, marketHome, studioDemoOf, studioTextOf, translating } from "./demo-templates";
import { newNodeId } from "./elements";
import { SLIDER_SECTIONS, STORE_SECTIONS } from "./store-sections";

/**
 * 103R Ready sections (dropped onto a page whole) and page templates (a
 * whole page to start from), in the editor's left panel. Their texts are
 * the owner's to change; `w` gives them in the language being edited.
 */

export type SectionWord =
  | "heroTitle"
  | "tabBlog"
  | "acHeadline"
  | "acContinue"
  | "acStreakAndLive"
  | "acForYou"
  | "acSeeAll"
  | "acTabExplore"
  | "acTabMine"
  | "acHeroTitle"
  | "acHeroButton"
  | "seeAll"
  | "uniTitle"
  | "uniText"
  | "uniButton"
  | "uniUpdates"
  | "uniStepOne"
  | "uniStepTwo"
  | "uniStepThree"
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
  | "ctaRide"
  // 105.3 Academies with many teachers.
  | "teachersTitle"
  | "teachersText"
  | "teachersButton"
  | "teachersCourses"
  | "teachersStepOne"
  | "teachersStepTwo"
  | "teachersStepThree"
  | "ctaTeachers"
  | "schoolTitle"
  | "schoolText"
  | "schoolButton"
  | "schoolUpdates"
  | "schoolStepOne"
  | "schoolStepTwo"
  | "schoolStepThree"
  | "ctaSchool"
  // 107.3 Questions and answers, and an offer counting down.
  | "faqTitle"
  | "faqOneQ"
  | "faqOneA"
  | "faqTwoQ"
  | "faqTwoA"
  | "faqThreeQ"
  | "faqThreeA"
  | "saleTitle"
  | "saleText"
  | "saleEnded"
  // 112.4 A store's sections and the sliders.
  | "slideNewTitle"
  | "slideNewText"
  | "slideOfferTitle"
  | "slideOfferText"
  | "bannerOne"
  | "bannerOneText"
  | "bannerTwo"
  | "bannerTwoText"
  | "bannerThree"
  | "bannerThreeText"
  | "flashKicker"
  | "flashTitle"
  | "flashEnded"
  | "categoriesTitle"
  | "newTitle"
  | "bestTitle"
  | "onSaleTitle"
  | "dealTitle"
  | "lookTitle"
  | "lookText"
  | "brandsTitle"
  | "trustShip"
  | "trustShipText"
  | "trustReturn"
  | "trustReturnText"
  | "trustPay"
  | "trustPayText"
  | "trustHelp"
  | "trustHelpText"
  | "couponKicker"
  | "couponTitle"
  | "recentTitle"
  // 115.14 The marketplace's sections.
  | "mSearch"
  | "mKinds"
  | "mOffers"
  | "mOffersText"
  | "mCuisines"
  | "mDepartments"
  | "mClub"
  | "mNear"
  | "mRated"
  | "mFast"
  | "mFastText"
  | "mGrocery"
  | "mFree"
  | "mReorder"
  | "mHungry"
  | "mFastNear"
  | "mFastNearText"
  | "mMood"
  | "mClubFree"
  | "mClubFreeText"
  | "mShops"
  | "mShopsText"
  | "mAll"
  // 120 The Studio demos' pages after the home: their tabs' names and a word over each screen.
  | "tabHome"
  | "tabSend"
  | "tabShipments"
  | "tabRestaurants"
  | "tabMyOrders"
  | "tabOrders"
  | "tabSearch"
  | "tabClub"
  | "tabRide"
  | "tabMyRides"
  | "tabSchool"
  | "tabCourses"
  | "tabMyCourses"
  | "tabAccount"
  | "tipSend"
  | "tipShipments"
  | "tipRestaurants"
  | "tipFoodOrders"
  | "tipMyRides"
  | "tipSchool"
  | "tipCourses"
  | "tipMyCourses";

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
  /** 112.4 One of Yallapp's pictures (public/design-pictures) at the platform's address; missing, none. */
  picture?: (file: string) => string | null;
  /** 112.4 The first entries of the app's main list (a look's spots open them). */
  entries?: readonly { id: string }[];
  /** The app's name, for a demo's template that writes it. */
  app?: string;
  /** The language `w` writes in (the dashboard's): a demo's template writes its own texts in it, with the others as translations. */
  lang?: "en" | "ar" | "tr";
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

/** 115.14 A marketplace section: a `market` element with its own title and text, for marketplace projects. */
const MARKETPLACE: Fits = { types: ["food"], verticals: ["marketplace"] };
function marketSection(
  id: string,
  icon: string,
  section: StudioMarket["section"],
  title: SectionWord | null,
  textWord: SectionWord | null = null,
  extra: { market?: Omit<StudioMarket, "section">; top?: number } = {},
): SectionInfo {
  return {
    id,
    icon,
    fits: MARKETPLACE,
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "market",
      market: { section, ...(extra.market ?? {}) },
      ...(title ? { title: ctx.w(title) } : {}),
      ...(textWord ? { text: ctx.w(textWord) } : {}),
      margin: pad(extra.top ?? 10, 0),
    }),
  };
}

/** 105.4 A school's welcome in its words: a button to the school and one to what's new. */
/**
 * 124.7 A school's news, which never has pictures: each entry a card of
 * words (its date on a chip, its title and a line or two of it) instead of
 * a picture tile, under "What's new".
 */
function schoolNewsList(ctx: SectionContext): StudioNode {
  const id = () => (ctx.newId ?? newNodeId)();
  return {
    id: id(),
    type: "column",
    name: ctx.w("schoolUpdates"),
    gap: 8,
    padding: pad(6, 10),
    children: [
      text(ctx, ctx.w("schoolUpdates"), { font: { size: 17, weight: 800 } }),
      {
        id: id(),
        type: "items",
        source: "school_news",
        layout: "list",
        gap: 10,
        query: { limit: 4, category_id: null, featured: false, sort: "newest", ids: [] },
        card: {
          id: id(),
          type: "column",
          gap: 6,
          padding: pad(14, 14),
          radius: 16,
          background: "#FFFFFF",
          dark_background: "#22203A",
          shadow: "light",
          children: [
            { id: id(), type: "row", children: [{ id: id(), type: "text", bind: "badge", font: { size: 11, weight: 800 }, padding: pad(3, 9), radius: 9, background: ctx.brand, color: "#FFFFFF" }] },
            { id: id(), type: "text", bind: "title", max_lines: 2, font: { size: 15, weight: 700 } },
            { id: id(), type: "text", bind: "subtitle", max_lines: 2, font: { size: 13 }, opacity: 0.75 },
          ],
        },
      },
    ],
  };
}

function schoolWelcome(ctx: SectionContext, words: { title: SectionWord; text: SectionWord; button: SectionWord; updates: SectionWord }, icon: string): StudioNode {
  return {
    id: (ctx.newId ?? newNodeId)(),
    type: "column",
    name: ctx.w(words.title),
    gap: 10,
    padding: pad(22, 18),
    margin: pad(12, 10),
    radius: 18,
    background: ctx.brand,
    color: "#FFFFFF",
    children: [
      { id: (ctx.newId ?? newNodeId)(), type: "icon", icon, icon_size: 34, color: "#FFFFFF" },
      text(ctx, ctx.w(words.title), { font: { size: 24, weight: 800, line_height: 1.25 } }),
      text(ctx, ctx.w(words.text), { font: { size: 14 }, opacity: 0.9 }),
      {
        id: (ctx.newId ?? newNodeId)(),
        type: "row",
        gap: 8,
        children: [
          {
            id: (ctx.newId ?? newNodeId)(),
            type: "button",
            text: ctx.w(words.button),
            width: "hug",
            height: 42,
            radius: 12,
            background: "#FFFFFF",
            color: ctx.brand,
            font: { weight: 800, size: 14 },
            padding: pad(0, 18),
            action: screen("school"),
            motion: { press: "shrink" },
          },
          // As before the welcome was shared (the border as the other sections draw it).
          {
            id: (ctx.newId ?? newNodeId)(),
            type: "button",
            text: ctx.w(words.updates),
            width: "hug",
            height: 42,
            radius: 12,
            border: { width: 1.5, color: "#FFFFFF" },
            color: "#FFFFFF",
            font: { weight: 700, size: 14 },
            padding: pad(0, 16),
            action: screen("notifications"),
          } as StudioNode,
        ],
      },
    ],
  };
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
          // 124.6 As tall as the offer, so its words sit at its foot in the app too.
          height: 150,
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
    make: (ctx) => (ctx.source === "school_news" ? schoolNewsList(ctx) : {
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
    // 107.3 Questions people ask, each answer opening under its question.
    id: "faq",
    icon: "unfold_more",
    make: (ctx) => {
      const id = () => (ctx.newId ?? newNodeId)();
      const qa = (q: SectionWord, a: SectionWord): StudioNode => ({ id: id(), type: "column", title: ctx.w(q), padding: { top: 0, end: 0, bottom: 8, start: 0 }, children: [text(ctx, ctx.w(a), { font: { size: 14 }, opacity: 0.85 })] });
      return {
        id: id(),
        type: "column",
        gap: 6,
        padding: pad(8, 14),
        children: [
          text(ctx, ctx.w("faqTitle"), { font: { size: 17, weight: 800 } }),
          { id: id(), type: "accordion", gap: 4, children: [qa("faqOneQ", "faqOneA"), qa("faqTwoQ", "faqTwoA"), qa("faqThreeQ", "faqThreeA")] },
        ],
      };
    },
  },
  {
    // 107.3 An offer counting down to its end, a week from when it's added.
    id: "sale",
    icon: "timer",
    make: (ctx) => {
      const ends = new Date(Date.now() + 7 * 86_400_000);
      ends.setUTCMinutes(0, 0, 0);
      return {
        id: (ctx.newId ?? newNodeId)(),
        type: "column",
        gap: 10,
        padding: pad(16, 16),
        margin: pad(8, 10),
        radius: 18,
        background: ctx.brand,
        color: "#FFFFFF",
        children: [
          text(ctx, ctx.w("saleTitle"), { font: { size: 20, weight: 800 }, text_align: "center" }),
          text(ctx, ctx.w("saleText"), { font: { size: 13 }, opacity: 0.9, text_align: "center" }),
          { id: (ctx.newId ?? newNodeId)(), type: "countdown", ends_at: ends.toISOString(), text: ctx.w("saleEnded"), text_align: "center" },
        ],
      };
    },
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
  // 115.14 The marketplace's sections: one `market` element each, drawn by the app from the marketplace's data.
  marketSection("m_address", "location_on", "address", null, "mSearch", { top: 8 }),
  marketSection("m_kinds", "category", "kinds", "mKinds"),
  marketSection("m_offers", "local_offer", "offers", "mOffers", "mOffersText", { market: { style: "spotlight" } }),
  marketSection("m_cuisines", "restaurant_menu", "cuisines", "mCuisines"),
  marketSection("m_departments", "grocery", "cuisines", "mDepartments", null, { market: { kind: "grocery" } }),
  marketSection("m_club", "workspace_premium", "club", "mClub"),
  marketSection("m_near", "near_me", "vendors", "mNear", null, { market: { sort: "nearest" } }),
  marketSection("m_rated", "star", "vendors", "mRated", null, { market: { sort: "rating", style: "tiles" } }),
  marketSection("m_fast", "bolt", "vendors", "mFast", "mFastText", { market: { sort: "fastest", style: "list", limit: 6 } }),
  marketSection("m_grocery", "shopping_cart", "vendors", "mGrocery", null, { market: { kind: "grocery", style: "spotlight" } }),
  marketSection("m_free", "two_wheeler", "vendors", "mFree", null, { market: { free_delivery: true } }),
  marketSection("m_reorder", "refresh", "reorder", "mReorder"),
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
  {
    // 105.3 An academy's welcome: meet its teachers, or browse the courses.
    id: "teachers",
    icon: "groups",
    fits: { types: ["lms"], verticals: ["instructors"] },
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "column",
      name: ctx.w("teachersTitle"),
      gap: 10,
      padding: pad(22, 18),
      margin: pad(12, 10),
      radius: 18,
      background: ctx.brand,
      color: "#FFFFFF",
      children: [
        { id: (ctx.newId ?? newNodeId)(), type: "icon", icon: "groups", icon_size: 34, color: "#FFFFFF" },
        text(ctx, ctx.w("teachersTitle"), { font: { size: 24, weight: 800, line_height: 1.25 } }),
        text(ctx, ctx.w("teachersText"), { font: { size: 14 }, opacity: 0.9 }),
        {
          id: (ctx.newId ?? newNodeId)(),
          type: "row",
          gap: 8,
          children: [
            {
              id: (ctx.newId ?? newNodeId)(),
              type: "button",
              text: ctx.w("teachersButton"),
              width: "hug",
              height: 42,
              radius: 12,
              background: "#FFFFFF",
              color: ctx.brand,
              font: { weight: 800, size: 14 },
              padding: pad(0, 18),
              action: screen("teachers"),
              motion: { press: "shrink" },
            },
            {
              id: (ctx.newId ?? newNodeId)(),
              type: "button",
              text: ctx.w("teachersCourses"),
              width: "hug",
              height: 42,
              radius: 12,
              border: { width: 1.5, color: "#FFFFFF" },
              color: "#FFFFFF",
              font: { weight: 700, size: 14 },
              padding: pad(0, 16),
              action: screen("courses"),
            },
          ],
        },
      ],
    }),
  },
  {
    // 105.4 A school's welcome: the school (timetable, homework, grades), or what's new.
    id: "school",
    icon: "school",
    fits: { types: ["school"] },
    make: (ctx) => schoolWelcome(ctx, { title: "schoolTitle", text: "schoolText", button: "schoolButton", updates: "schoolUpdates" }, "school"),
  },
  // A school in university mode: the same welcome in a university's words.
  {
    id: "university",
    icon: "apartment",
    fits: { types: ["school"] },
    make: (ctx) => schoolWelcome(ctx, { title: "uniTitle", text: "uniText", button: "uniButton", updates: "uniUpdates" }, "apartment"),
  },
  // 112.4 A store's own sections, then the sliders.
  ...STORE_SECTIONS,
  ...SLIDER_SECTIONS,
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
  /** Templates = demos: the Studio demo whose first page this is (lib/studio/demo-templates.ts), shown first for its kind. */
  demo?: StudioDemoId;
  /** Shown as the recommended start. */
  recommended?: boolean;
  /** 123 What the template sets for the whole project besides its home: its bar, tabs, screens and colours (lib/studio/academy.ts). */
  project?: TemplateProject;
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

// 105.3 Academies with many teachers: the main buttons open the teachers; the steps say how students learn from them.
const TEACHERS: Fits = { types: ["lms"], verticals: ["instructors"] };
const TEACHERS_BUTTON: SectionContext["button"] = { word: "ctaTeachers", action: screen("teachers") };
const TEACHERS_STEPS: SectionContext["steps"] = ["teachersStepOne", "teachersStepTwo", "teachersStepThree"];

// 105.4 Schools: the main buttons open the school; the steps say how a family follows it.
const SCHOOL: Fits = { types: ["school"] };
const SCHOOL_BUTTON: SectionContext["button"] = { word: "ctaSchool", action: screen("school") };
const SCHOOL_STEPS: SectionContext["steps"] = ["schoolStepOne", "schoolStepTwo", "schoolStepThree"];

const STORE: Fits = { types: ["store"] };
const SHOP_HEADER: StudioPage["header"] = { type: "logo_actions", buttons: ["menu", "notifications", "cart", "account"] };

/**
 * Templates = demos: a Studio demo's home, made from its kind's own designed
 * page (lib/studio/demo-templates.ts DEMO_HOME_TEMPLATES; Zad's the approved
 * marketplace home), with its texts in Studio's other languages too. The
 * demo app adds how to sign in after its first element (`afterFirst`).
 */
export function demoStudioPage(id: StudioDemoId, ctx: SectionContext, afterFirst: readonly LayoutBlock[] = []): StudioPage {
  const { ctx: words, translate } = translating(ctx);
  const own = DEMO_HOME_TEMPLATES[id];
  const page = own === "market_home" ? marketHome(words) : TEMPLATES.find((t) => t.id === own)!.make(words);
  const notes = afterFirst.map((b) => studioTextOf(ctx, b)).filter((n): n is StudioNode => n !== null);
  const [first, ...rest] = translate(page.body).children ?? [];
  return { ...page, body: { ...page.body, children: first ? [first, ...notes, ...rest] : notes } };
}

/** Each Studio demo's home as a template, offered first and recommended for its kind. */
const DEMO_TEMPLATES: readonly TemplateInfo[] = (Object.keys(DEMO_ICONS) as (keyof typeof DEMO_ICONS)[]).map((id) => ({
  id: demoTemplateId(id),
  icon: DEMO_ICONS[id],
  demo: id,
  recommended: true,
  make: (ctx: SectionContext) => demoStudioPage(id, ctx),
}));

export const TEMPLATES: readonly TemplateInfo[] = [
  // Templates = demos: each Studio demo's home, offered first for its kind.
  ...DEMO_TEMPLATES,
  // 103R.7 Each project type's own templates come first in the lists.
  // 112.4 Three for a store: a full shop, one for offers and one for looks and brands.
  typed("shop", "storefront", STORE, ["search", "hero_slider", "category_circles", "flash_sale", "new_arrivals", "coupon", "best_sellers", "brands", "trust", "recent"], SHOP_HEADER, { word: "cta", action: screen("cart") }),
  typed("shop_deals", "local_offer", STORE, ["banner_slider", "flash_sale", "deal", "category_pictures", "on_sale", "coupon", "trust"], SHOP_HEADER, { word: "cta", action: screen("cart") }),
  typed("shop_looks", "checkroom", STORE, ["peek_slider", "new_arrivals", "shop_look", "brands", "split_slider", "best_sellers", "recent"], { type: "logo_center", buttons: ["menu", "search", "cart"] }, { word: "cta", action: screen("cart") }),
  typed("menu", "restaurant_menu", { types: ["store"], verticals: ["restaurant"] }, ["hero", "categories", "products", "cta"], SHOP_HEADER, { word: "cta", action: screen("cart") }),
  // 123 The premium academy: the whole project, its home, bar, tabs, screens and colours.
  {
    id: "academy_premium",
    icon: "workspace_premium",
    fits: { types: ["lms"] },
    recommended: true,
    project: ACADEMY_PROJECT,
    make: (ctx: SectionContext) => {
      const { ctx: words, translate } = translating(ctx);
      const page = academyHome(words);
      return { ...page, body: translate(page.body) };
    },
  },
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
  // 105.3 Three ready-made designs for an academy with many teachers.
  typed("teachers", "groups", TEACHERS, ["teachers", "products", "steps", "cta"], { type: "logo_actions", buttons: ["menu", "notifications", "account"] }, TEACHERS_BUTTON, TEACHERS_STEPS),
  typed("teachers_offers", "local_offer", TEACHERS, ["offer", "products", "review", "cta"], { type: "logo_center", buttons: ["menu", "notifications"] }, { word: "ctaLearn", action: screen("courses") }),
  typed("teachers_brand", "school", TEACHERS, ["hero", "stats", "features", "steps", "contact"], { type: "transparent", buttons: ["menu", "account"] }, TEACHERS_BUTTON, TEACHERS_STEPS),
  // 105.4 Three ready-made designs for a school.
  typed("school", "school", SCHOOL, ["school", "products", "steps", "cta"], { type: "logo_actions", buttons: ["menu", "notifications", "account"] }, SCHOOL_BUTTON, SCHOOL_STEPS),
  typed("school_news", "campaign", SCHOOL, ["hero", "products", "review", "contact"], { type: "logo_center", buttons: ["menu", "notifications"] }, SCHOOL_BUTTON),
  typed("school_brand", "workspace_premium", SCHOOL, ["hero", "stats", "features", "steps", "contact"], { type: "transparent", buttons: ["menu", "account"] }, SCHOOL_BUTTON, SCHOOL_STEPS),
  // A university's own: its welcome, its news and how students follow it.
  typed("university", "apartment", SCHOOL, ["university", "products", "steps", "contact"], { type: "logo_actions", buttons: ["menu", "notifications", "account"] }, SCHOOL_BUTTON, ["uniStepOne", "uniStepTwo", "uniStepThree"]),
  // 115.14 Three ready-made designs for a marketplace: the search on top, the kinds, offers, the club and the places.
  typed("market", "storefront", MARKETPLACE, ["m_address", "m_kinds", "m_offers", "m_cuisines", "m_club", "m_near", "m_rated", "m_fast", "m_departments", "m_reorder"], { type: "logo_actions", buttons: ["menu", "notifications", "account"] }),
  typed("market_offers", "local_offer", MARKETPLACE, ["m_address", "m_offers", "m_free", "m_club", "m_kinds", "m_rated", "m_reorder"], { type: "logo_center", buttons: ["menu", "notifications"] }),
  typed("market_grocery", "shopping_cart", MARKETPLACE, ["m_address", "m_kinds", "m_grocery", "m_departments", "m_fast", "m_offers", "m_reorder"], { type: "title_search", buttons: ["notifications", "account"] }),
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
  // Templates = demos: the kind's demo first, recommended; then its own templates as before.
  const demo = studioDemoOf(kind);
  const others = TEMPLATES.filter((tpl) => !tpl.demo);
  const own = others.filter((tpl) => tpl.fits && fitsKind(tpl.fits, kind));
  const best = own.some((tpl) => tpl.fits?.verticals) ? own.filter((tpl) => tpl.fits?.verticals) : own;
  return [...TEMPLATES.filter((tpl) => tpl.demo && tpl.demo === demo), ...best, ...others.filter((tpl) => !tpl.fits)];
}
