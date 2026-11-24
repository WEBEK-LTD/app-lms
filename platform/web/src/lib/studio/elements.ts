import type { ItemSource, StudioLiveStatus, StudioNode, StudioNodeType } from "../pages/types";
// 129 Premium motion & media.
import { PREMIUM_MOTION_ELEMENTS, premiumMotionNode, type PremiumWord } from "./premium-motion";
// 129.11–129.20 Premium content, trust and commerce.
import { newPremiumNode, premiumWordEn, type PremiumText } from "./premium-content";

/**
 * 103R The editor's Elements panel (the approved design): layout elements,
 * content elements and the ones under "More", each with its icon and what a
 * new one starts as.
 */

/** 129 `premium`: Studio's premium library, one group for all of it (motion & media 129.1–129.8, content & commerce 129.11–129.20). */
/** 228 `product`: the product page's elements, bound to the product it is opened on (a shop's). */
export type ElementGroup = "layout" | "content" | "more" | "premium" | "product";

export interface ElementInfo {
  type: StudioNodeType;
  group: ElementGroup;
  /** A Material Symbols (Rounded) name. */
  icon: string;
  /** Words people search for, besides its name, in English. */
  keywords: string;
  /** 115.14 Offered only in projects of this kind (a marketplace's sections). */
  only?: "marketplace" | "academy" | "orders" | "trips" | "school" | "store";
  /**
   * 129 A premium look of an existing element offered as its own entry (a hero slider, a card carousel: the slider's
   * looks; a glass card: a column with a card style). Named `studio.el_<preset>`.
   */
  preset?: ElementPreset;
}

/** 129 The ready looks the Premium group offers: the slider's (129.1) and a layout's card style (129.18). */
/** 208 `category_menu`: the categories element drawn as the category menu (`rows`). */
export type ElementPreset = "hero_slider" | "card_carousel" | "glass_card" | "category_menu";

export const ELEMENTS: readonly ElementInfo[] = [
  { type: "row", group: "layout", icon: "view_column", keywords: "horizontal side by side flex" },
  { type: "column", group: "layout", icon: "view_agenda", keywords: "vertical stack under" },
  { type: "stack", group: "layout", icon: "layers", keywords: "layers overlay on top" },
  { type: "grid", group: "layout", icon: "grid_view", keywords: "grid columns tiles" },
  { type: "slider", group: "layout", icon: "view_carousel", keywords: "carousel slides swipe banner" },
  { type: "spacer", group: "layout", icon: "crop_free", keywords: "space gap empty" },
  // 107.3 Questions that open, and tabs.
  { type: "accordion", group: "layout", icon: "unfold_more", keywords: "accordion faq questions answers open collapse" },
  { type: "tabs", group: "layout", icon: "tab", keywords: "tabs switch sections" },
  { type: "text", group: "content", icon: "title", keywords: "text title heading paragraph" },
  { type: "image", group: "content", icon: "image", keywords: "picture photo image" },
  { type: "button", group: "content", icon: "smart_button", keywords: "button action link" },
  { type: "items", group: "content", icon: "storefront", keywords: "products list courses services data" },
  { type: "video", group: "content", icon: "play_circle", keywords: "video youtube vimeo" },
  { type: "form", group: "content", icon: "list_alt", keywords: "form contact questions" },
  { type: "map", group: "content", icon: "map", keywords: "map location place" },
  { type: "ratings", group: "content", icon: "star", keywords: "ratings stars reviews" },
  // 107.3 A countdown to an offer's end, and a list with an icon on each line.
  { type: "countdown", group: "content", icon: "timer", keywords: "countdown timer offer ends sale" },
  { type: "bullets", group: "content", icon: "list", keywords: "list bullets points features checklist" },
  // 112.4 A code people copy with one tap.
  { type: "coupon", group: "content", icon: "confirmation_number", keywords: "coupon code discount promo voucher copy offer" },
  // 115.14 One marketplace section from the marketplace's data: the address, kinds, offers, cuisines, the club, places, order again.
  // 123 The student's own cards: the course they are taking, their streak, their next live class, this week's learning.
  { type: "learning", group: "content", icon: "school", keywords: "learning continue course progress streak live class week time student", only: "academy" },
  // 128 The family's school day: the greeting with today's date, the children to switch between, today's card.
  { type: "school", group: "content", icon: "family_restroom", keywords: "school family parent child children today check in class bus greeting", only: "school" },
  { type: "market", group: "content", icon: "storefront", keywords: "marketplace vendors restaurants supermarket shops offers club cuisines address reorder", only: "marketplace" },
  // 128 The person's order on its way (food delivery and marketplaces), from the app's own data.
  { type: "live_status", group: "content", icon: "two_wheeler", keywords: "live status order on its way tracking delivery minutes progress", only: "orders" },
  // 128 A photo with a scrim and elements over it (a hero, a photo tile, a promo banner); a drawn map with markers and a sheet over it;
  // a greeting with the person's name; and, in delivery and ride apps, their shipment or ride on its way or the taxis near them.
  { type: "photo_hero", group: "layout", icon: "panorama", keywords: "hero photo picture banner cover scrim gradient tile caption promo header" },
  { type: "map_header", group: "layout", icon: "map", keywords: "map header markers taxis sheet bottom sheet cover" },
  { type: "greeting", group: "content", icon: "waving_hand", keywords: "greeting hello good morning evening name welcome" },
  { type: "tracking", group: "content", icon: "local_shipping", keywords: "tracking live status shipment parcel ride driver arriving on the way nearby taxis", only: "trips" },
  { type: "icon", group: "more", icon: "emoji_symbols", keywords: "icon symbol" },
  { type: "categories", group: "more", icon: "label", keywords: "categories chips tags filter" },
  { type: "search", group: "more", icon: "search", keywords: "search field" },
  { type: "divider", group: "more", icon: "horizontal_rule", keywords: "divider line separator" },
  // 129 Premium motion & media.
  ...PREMIUM_MOTION_ELEMENTS,
  // ——— 129.11–129.20 Premium content, trust and commerce ———
  { type: "testimonials", group: "premium", icon: "format_quote", keywords: "testimonials quotes reviews customers stars carousel trust" },
  { type: "pricing", group: "premium", icon: "sell", keywords: "pricing plans packages price monthly yearly subscription popular" },
  { type: "stats", group: "premium", icon: "monitoring", keywords: "stats numbers counters figures count up" },
  { type: "progress", group: "premium", icon: "donut_large", keywords: "progress bars rings percent goal skills" },
  { type: "timeline", group: "premium", icon: "timeline", keywords: "timeline steps history process roadmap order" },
  { type: "profile_card", group: "premium", icon: "badge", keywords: "profile person place card cover avatar team social" },
  { type: "bento", group: "premium", icon: "dashboard", keywords: "bento grid tiles features cards mosaic" },
  { type: "column", group: "premium", icon: "blur_on", keywords: "glass frosted card blur gradient border glow shadow premium", preset: "glass_card" },
  { type: "badge_text", group: "premium", icon: "new_releases", keywords: "badge chip pill tag label gradient text heading" },
  { type: "cta_bar", group: "premium", icon: "call_to_action", keywords: "call to action sticky bottom bar button floating action button fab price" },
  // ——— end 129.11–129.20 ———
  // 131 A flash sale from the shop's own: was and now prices, the share off, a live countdown and a stock bar.
  { type: "flash_sale", group: "premium", icon: "bolt", keywords: "flash sale offer deal discount countdown timer price was now percent off stock left limited", only: "store" },
  // 208 The category menu (every main category a row of cards, its sub-categories in the row) and the shop's size chart.
  { type: "categories", group: "premium", icon: "menu_open", keywords: "category menu categories sub-categories rows sliders cards all header menu drawer", only: "store", preset: "category_menu" },
  // 211 The electronics shops' parts: a product's specs, two or three products compared, the shop by a spec, trade-in and Build your PC.
  { type: "spec_table", group: "premium", icon: "table_rows", keywords: "specs specifications table features details technical electronics phone laptop", only: "store" },
  { type: "compare", group: "premium", icon: "compare_arrows", keywords: "compare comparison versus vs side by side specs products electronics phones", only: "store" },
  { type: "spec_filter", group: "premium", icon: "tune", keywords: "filter specs ram storage processor cpu gpu graphics chips shop by electronics computers", only: "store" },
  { type: "trade_in", group: "premium", icon: "currency_exchange", keywords: "trade in trade-in exchange old phone device estimate value sell swap upgrade", only: "store" },
  { type: "pc_builder", group: "premium", icon: "memory", keywords: "build your pc builder parts processor motherboard memory graphics compatibility gaming computer", only: "store" },
  { type: "size_chart", group: "premium", icon: "table_chart", keywords: "size chart guide sizes measurements bust waist hips length table clothes fashion", only: "store" },
  // 209 The size finder (the size of the shop's chart for the age chosen), shade swatches and a quiz.
  { type: "size_finder", group: "premium", icon: "straighten", keywords: "size finder age height which size fits child kids baby chart recommend", only: "store" },
  { type: "swatches", group: "premium", icon: "palette", keywords: "swatches shades colours colors shade finder foundation lipstick tones palette" },
  { type: "quiz", group: "premium", icon: "quiz", keywords: "quiz questions answers result skin type test gift finder recommend personality" },
  // 210 The shop's next delivery days and times to pick (and the assembly), kept for the checkout.
  { type: "delivery_slots", group: "premium", icon: "event_available", keywords: "delivery date day time slot book booking assembly furniture schedule appointment checkout", only: "store" },
  // 212 The listing filters, for every shop type: sizes, colours, price, brand.
  { type: "listing_filters", group: "premium", icon: "tune", keywords: "filter filters sizes colours colors price brand sort refine listing shop products", only: "store" },
  // 228 The product page's elements, each bound to the product the page is opened on.
  { type: "product_gallery", group: "product", icon: "photo_library", keywords: "product gallery photos images pager carousel thumbnails stacked", only: "store" },
  { type: "product_title", group: "product", icon: "title", keywords: "product name title heading rating stars", only: "store" },
  { type: "product_price", group: "product", icon: "sell", keywords: "product price from sale was now percent off discount", only: "store" },
  { type: "product_variants", group: "product", icon: "checkroom", keywords: "product variants options sizes colours colors shades swatches chips size grid choose", only: "store" },
  { type: "product_quantity", group: "product", icon: "add", keywords: "product quantity amount how many stepper plus minus", only: "store" },
  { type: "product_buy", group: "product", icon: "add_shopping_cart", keywords: "product add to cart buy now button sticky bar bottom checkout", only: "store" },
  { type: "product_description", group: "product", icon: "description", keywords: "product description about text details read more", only: "store" },
  { type: "product_specs", group: "product", icon: "table_rows", keywords: "product specs specifications details facts table material", only: "store" },
  { type: "product_reviews", group: "product", icon: "reviews", keywords: "product reviews ratings stars customers summary bars photos", only: "store" },
  { type: "product_related", group: "product", icon: "view_carousel", keywords: "product related you may also like complete the look similar carousel grid", only: "store" },
  { type: "product_delivery", group: "product", icon: "local_shipping", keywords: "product delivery shipping returns exchange info days secure payment", only: "store" },
];

export function elementInfo(type: StudioNodeType): ElementInfo {
  return ELEMENTS.find((e) => e.type === type && !e.preset) ?? ELEMENTS.find((e) => e.type === type) ?? ELEMENTS[0]!;
}

/** A short random ID for a new element. */
export function newNodeId(): string {
  return `n${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * A new element as it starts: sized and styled so it looks right where it is
 * dropped. `source` is the app's main list for `items` and `categories`;
 * `brand` the app's main colour.
 */
export type NewText = "text" | "button" | "search" | "ratings" | "field" | "question" | "answer" | "tab" | "ended" | "bullets" | "flash" | "sizeFinder" | "sizeButton" | "swatches" | "swatchButton" | "quiz" | "quizQuestion" | "quizAnswers" | "quizResult" | "quizResultText" | "quizButton";

export function newNode(
  type: StudioNodeType,
  options: {
    source: ItemSource | null;
    brand: string;
    text: (key: NewText) => string;
    newId?: () => string;
    now?: Date;
    /** 128 Whose orders a live status card follows: a marketplace's, else food delivery's. */ orders?: StudioLiveStatus["source"];
    /** 129 A premium look of the element (ElementInfo.preset). */
    preset?: ElementPreset;
    /** 129.1–129.8 The premium motion elements' sample words (lib/studio/premium-motion.ts); missing, English. */
    premiumWords?: (key: PremiumWord) => string;
    /** 129.11–129.20 The premium content elements' first words (lib/studio/premium-content.ts); missing, English. */
    premium?: (key: PremiumText) => string;
  },
): StudioNode {
  // 129 Premium motion & media: its looks and elements start as lib/studio/premium-motion.ts makes them.
  const motion = premiumMotionNode(type, options.preset, { brand: options.brand, newId: options.newId ?? newNodeId, words: options.premiumWords });
  if (motion) return motion;
  const id = (options.newId ?? newNodeId)();
  // 129.11–129.20 The premium elements and the glass card start as lib/studio/premium-content.ts makes them.
  const premium = newPremiumNode(type, id, { brand: options.brand, newId: options.newId ?? newNodeId, words: options.premium ?? premiumWordEn, button: options.text("button"), preset: options.preset });
  if (premium) return premium;
  const child = (title: string, text: string): StudioNode => ({
    id: (options.newId ?? newNodeId)(),
    type: "column",
    title,
    padding: { top: 4, end: 0, bottom: 8, start: 0 },
    children: [{ id: (options.newId ?? newNodeId)(), type: "text", text, font: { size: 14 } }],
  });
  switch (type) {
    case "row":
      return { id, type, gap: 8, cross: "center", padding: { top: 8, end: 8, bottom: 8, start: 8 }, children: [] };
    case "column":
      return { id, type, gap: 8, padding: { top: 8, end: 8, bottom: 8, start: 8 }, children: [] };
    case "stack":
      return { id, type, height: 160, radius: 16, background: options.brand, children: [] };
    case "grid":
      return { id, type, columns: 2, gap: 10, padding: { top: 6, end: 10, bottom: 6, start: 10 }, children: [] };
    case "slider":
      return { id, type, height: 160, per_view: 1, dots: true, children: [] };
    case "spacer":
      return { id, type, height: 24 };
    case "text":
      return { id, type, text: options.text("text"), font: { size: 16 } };
    case "image":
      return { id, type, image_url: null, height: 180, radius: 14, fit: "cover" };
    case "button":
      return {
        id,
        type,
        text: options.text("button"),
        width: "fill",
        height: 46,
        radius: 14,
        background: options.brand,
        color: "#FFFFFF",
        font: { weight: 800, size: 15 },
        text_align: "center",
        margin: { top: 10, end: 18, bottom: 0, start: 18 },
        shadow: "medium",
      };
    case "items":
      return { id, type, source: options.source ?? undefined, layout: "grid", columns: 2, query: { limit: 4, category_id: null, featured: false, sort: "newest", ids: [] }, gap: 10, padding: { top: 6, end: 10, bottom: 6, start: 10 } };
    case "categories":
      // 208 The category menu: the shop's main categories as rows of cards.
      if (options.preset === "category_menu") return { id, type, source: options.source ?? undefined, style: "rows", category_menu: { look: "lead" }, padding: { top: 6, end: 0, bottom: 6, start: 0 } };
      return { id, type, source: options.source ?? undefined, padding: { top: 6, end: 10, bottom: 6, start: 10 } };
    // 211 The electronics shops' parts, each on a card.
    case "spec_table":
    case "compare":
    case "spec_filter":
    case "trade_in":
    case "pc_builder":
      return { id, type, tech: type === "spec_filter" ? { spec: "ram" } : type === "trade_in" ? { look: "card" } : {}, radius: 20, padding: { top: 14, end: 14, bottom: 14, start: 14 }, margin: { top: 8, end: 16, bottom: 8, start: 16 }, border_color: "#E3E6EB", border_width: 1 };
    // 208 The shop's size chart, on a card.
    // 212 The listing filters, under their title.
    case "listing_filters":
      return { id, type, padding: { top: 8, end: 16, bottom: 8, start: 16 } };
    case "size_chart":
      return { id, type, radius: 18, padding: { top: 12, end: 12, bottom: 12, start: 12 }, margin: { top: 8, end: 16, bottom: 8, start: 16 }, border_color: "#E4DFD6", border_width: 1 };
    // 209 The size finder: the shop's chart by age, a button to the shop.
    case "size_finder":
      return { id, type, text: options.text("sizeFinder"), title: options.text("sizeButton"), action: { type: "screen", screen: "search" }, radius: 22, padding: { top: 16, end: 16, bottom: 16, start: 16 }, margin: { top: 10, end: 16, bottom: 10, start: 16 }, background: "#F4EEE8", color: "#2A2420" };
    // 209 Five shades from light to deep, the middle one chosen.
    case "swatches":
      return {
        id,
        type,
        text: options.text("swatches"),
        title: options.text("swatchButton"),
        action: { type: "screen", screen: "search" },
        entries: (
          [
            ["1N", "#F3D9C6"],
            ["2W", "#E3B898"],
            ["3W", "#D7A887"],
            ["4N", "#B17A5A"],
            ["5C", "#6B412D"],
          ] as const
        ).map(([title, color], i) => ({ title, color, ...(i === 2 ? { highlight: true } : {}) })),
        radius: 22,
        padding: { top: 16, end: 16, bottom: 16, start: 16 },
        margin: { top: 10, end: 16, bottom: 10, start: 16 },
      };
    // 209 One question of two answers, each its result.
    case "quiz":
      return {
        id,
        type,
        text: options.text("quiz"),
        title: options.text("quizButton"),
        quiz: { questions: [{ title: options.text("quizQuestion"), text: options.text("quizAnswers") }] },
        entries: [1, 2].map((n) => ({ title: `${options.text("quizResult")} ${n}`, text: options.text("quizResultText"), action: { type: "screen", screen: "search" } })),
        radius: 22,
        padding: { top: 16, end: 16, bottom: 16, start: 16 },
        margin: { top: 10, end: 16, bottom: 10, start: 16 },
      };
    // 210 The shop's next delivery days and times, on a card.
    case "delivery_slots":
      return { id, type, delivery_slots: { days: 5 }, radius: 18, padding: { top: 12, end: 12, bottom: 12, start: 12 }, margin: { top: 8, end: 16, bottom: 8, start: 16 } };
    // 228 The product page's elements: each starts in its first look, spaced as the app's product screen.
    case "product_gallery":
      return { id, type, aspect_ratio: 1 };
    case "product_title":
      return { id, type, font: { size: 22, weight: 800 }, margin: { top: 16, end: 16, bottom: 4, start: 16 } };
    case "product_price":
      return { id, type, font: { size: 20, weight: 800 }, margin: { top: 4, end: 16, bottom: 4, start: 16 } };
    case "product_variants":
    case "product_quantity":
    case "product_description":
    case "product_specs":
    case "product_reviews":
    case "product_delivery":
      return { id, type, margin: { top: 12, end: 16, bottom: 4, start: 16 } };
    case "product_related":
      return { id, type, margin: { top: 16, end: 0, bottom: 8, start: 0 } };
    case "product_buy":
      return { id, type, pin: "bottom", radius: 14, padding: { top: 10, end: 16, bottom: 10, start: 16 } };
    case "video":
      return { id, type, video_url: null, aspect_ratio: 16 / 9, radius: 14 };
    case "form":
      return { id, type, form: { send_to: "email", fields: [{ id: "name", kind: "text", label: options.text("field"), required: true, options: null }] }, padding: { top: 8, end: 16, bottom: 8, start: 16 } };
    case "map":
      return { id, type, map: { lat: 30.0444, lng: 31.2357 }, height: 180, radius: 14 };
    case "ratings":
      return { id, type, rating: 4.8, text: options.text("ratings") };
    case "icon":
      return { id, type, icon: "star", icon_size: 28 };
    case "search":
      return { id, type, text: options.text("search"), radius: 12, margin: { top: 8, end: 10, bottom: 8, start: 10 } };
    case "divider":
      return { id, type, height: 1, background: "#E5E0D5", margin: { top: 8, end: 10, bottom: 8, start: 10 } };
    case "accordion":
      return { id, type, gap: 8, padding: { top: 8, end: 16, bottom: 8, start: 16 }, children: [child(`${options.text("question")} 1`, options.text("answer")), child(`${options.text("question")} 2`, options.text("answer"))] };
    case "tabs":
      return { id, type, gap: 10, padding: { top: 8, end: 16, bottom: 8, start: 16 }, children: [child(`${options.text("tab")} 1`, options.text("text")), child(`${options.text("tab")} 2`, options.text("text"))] };
    case "countdown": {
      // A week from now, on the hour.
      const ends = new Date((options.now ?? new Date()).getTime() + 7 * 86_400_000);
      ends.setUTCMinutes(0, 0, 0);
      return { id, type, ends_at: ends.toISOString(), text: options.text("ended"), radius: 14, padding: { top: 12, end: 12, bottom: 12, start: 12 }, margin: { top: 8, end: 16, bottom: 8, start: 16 } };
    }
    case "bullets":
      return { id, type, text: options.text("bullets"), icon: "check_circle", icon_size: 20, gap: 8, padding: { top: 8, end: 16, bottom: 8, start: 16 } };
    case "coupon":
      return { id, type, code: "SAVE10", radius: 10, color: options.brand, margin: { top: 8, end: 16, bottom: 8, start: 16 } };
    // 131 The flash sale ending soonest, as a banner with its countdown and stock bar.
    case "flash_sale":
      return { id, type, text: options.text("flash"), flash_sale: { look: "banner" }, radius: 22, margin: { top: 10, end: 16, bottom: 10, start: 16 } };
    case "market":
      return { id, type, market: { section: "vendors" }, margin: { top: 8, end: 0, bottom: 8, start: 0 } };
    case "live_status":
      return { id, type, live_status: { source: options.orders ?? "food_order" }, radius: 18, background: options.brand, color: "#FFFFFF", padding: { top: 12, end: 14, bottom: 12, start: 14 }, margin: { top: 10, end: 16, bottom: 0, start: 16 } };
    case "school":
      return { id, type, school: { section: "today" }, radius: 22, margin: { top: 14, end: 16, bottom: 0, start: 16 } };
    case "learning":
      return { id, type, learning: { section: "continue" }, radius: 30, margin: { top: 8, end: 16, bottom: 8, start: 16 }, gradient: { from: "#141A3A", to: "#3B2A6B", angle: 140 } };
    // 128 The covers start with words over them, ready to change.
    case "photo_hero":
      return {
        id,
        type,
        image_url: null,
        height: 180,
        radius: 20,
        background: "#1F2A37",
        scrim: { color: "#000000", from: 0, middle: 0, at: 40, to: 0.7 },
        align: "end",
        padding: { top: 14, end: 14, bottom: 14, start: 14 },
        margin: { top: 8, end: 16, bottom: 8, start: 16 },
        children: [{ id: (options.newId ?? newNodeId)(), type: "text", text: options.text("text"), color: "#FFFFFF", font: { size: 18, weight: 800 } }],
      };
    case "map_header":
      return { id, type, height: 320, map_drawing: { markers: [{ x: 18, y: 30 }, { x: 78, y: 38 }, { x: 36, y: 74 }], me: true }, padding: { top: 16, end: 16, bottom: 16, start: 16 }, children: [] };
    case "greeting":
      return { id, type, font: { size: 18, weight: 700 }, margin: { top: 8, end: 16, bottom: 8, start: 16 } };
    case "tracking":
      return { id, type, tracking: { kind: "shipment" }, radius: 20, padding: { top: 14, end: 14, bottom: 14, start: 14 }, margin: { top: 8, end: 16, bottom: 8, start: 16 } };
    // 129 The premium elements are made above (premiumMotionNode, newPremiumNode).
    default:
      return { id, type };
  }
}
