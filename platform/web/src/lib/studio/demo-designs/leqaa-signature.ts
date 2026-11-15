import type { CheckoutLook } from "../checkout-look";
import type { Action, LayoutTab, StudioEntry, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigImage, sigPhoto, sigTexts, signatureBar, signatureHeader, type SignatureInk } from "./food-signature-parts";

/**
 * 131.20–131.39 Leqaa (لقاء), the flower shop: a Studio demo of the store
 * kind and its two Signature looks, each a whole store project (its home,
 * every page after it, its tabs, its bar, its sign-in screen, its account
 * and its checkout look), built only from Studio's elements so every part
 * is the owner's to change. Both looks wear the flower shop's signature
 * chrome, which every app can take: the `petal` header (131.21), the
 * `petal` bar with its raised bloom (131.22), the `petal` system screens
 * (131.23) and the gift checkout (131.25).
 *
 * A · Rose hour: an immersive hero slider of the five occasions (a line
 * per story filling at its top, the open photo growing slowly), the
 * occasions as story rings on a card hanging over its foot, "Send today"
 * with the owner's cut-off, the flash sale, the collections as a bento,
 * what is loved most, "Build your bouquet", kind words in the owner's
 * [brackets], a ticker of the occasions and a sticky "Send flowers". Blush
 * paper and plum ink in Fraunces by day; a plum night lit in candle rose
 * and champagne (designed, never inverted); the whole app in Fraunces (the
 * look's own font, `font_family`, the app's DM Sans until it is ready).
 *
 * B · Botanical press: the petal header over the page, "Who are the
 * flowers for?" with the occasions as chips, the edit as a card carousel
 * with numbered collections, "Send today" as a ticket with its stub, the
 * flash sale as a forest band, the collections as arches, a filmstrip from
 * the atelier, the price list, the bouquet's three steps and the kind
 * words; sage paper and forest ink in a light Outfit; a forest night
 * with peach and moss.
 *
 * The shop's commerce (131.1–131.19) is the real thing: the premium
 * `flash_sale` element (the shop's sale ending soonest, left out while none
 * is on), the products lists' sale badges, the coupon in its premium look
 * bound to a code the shop shows in the app, and the gift checkout's look
 * (`screens.checkout`). "Send today" says the shop's cut-off in the owner's
 * words (`lqCutoff`), its day chips opening the shop; the real day and
 * slot are picked at checkout. Nothing is made up: no number, review or
 * price is the template's; the lists are the shop's own products.
 */

// ——— The two looks' colours and faces ———

/** A · Rose hour: blush paper and plum ink by day, a plum night in candle rose. */
export const LEQAA_A_INK: SignatureInk = {
  page: "#FBF3F0",
  darkPage: "#140A0F",
  surface: "#FFFFFF",
  darkSurface: "#21121A",
  ink: "#2A121C",
  darkInk: "#F8EAEE",
  muted: "#7B5E67",
  darkMuted: "#C9AEB6",
  line: "#F0DDD9",
  darkLine: "#3A2530",
  accent: "#A8325A",
  darkAccent: "#F3A9C0",
  fill: "#8E2445",
  darkFill: "#F3A9C0",
  onFill: "#FFFFFF",
  darkOnFill: "#2A121C",
};
const A = LEQAA_A_INK;
/** A's second colour: champagne, warmer by night. */
export const LEQAA_CHAMPAGNE = "#C89B6D";
/** The shade over A's photos: a deep rose, never black. */
const ROSE_SHADE = "#2A0C17";
const FRAUNCES = "Fraunces";

/** B · Botanical press: sage paper and forest ink by day, a forest night in peach and moss. */
export const LEQAA_B_INK: SignatureInk = {
  page: "#F3F1EA",
  darkPage: "#0A120E",
  surface: "#FFFFFF",
  darkSurface: "#121E18",
  ink: "#15241D",
  darkInk: "#EDF3EE",
  muted: "#5F6F66",
  darkMuted: "#A9BCB1",
  line: "#DDE3D9",
  darkLine: "#22332A",
  accent: "#B5603F",
  darkAccent: "#F2B79E",
  fill: "#2F5D50",
  darkFill: "#B9D9C6",
  onFill: "#FFFFFF",
  darkOnFill: "#0A120E",
};
const B = LEQAA_B_INK;
/** B's second colour: peach. */
export const LEQAA_PEACH = "#E8A486";
const FOREST = "#1E3B32";
const FOREST_NIGHT = "#0F2019";
/** B's display face: Outfit, light and airy (bundled with the app). */
const OUTFIT = "Outfit";

/** Leqaa's photos (public/flower-photos, CC0 or public domain, credited in CREDITS.md). */
const P = (name: string) => `/flower-photos/${name}.jpg`;

const shop: Action = screen("search");
const toCart: Action = screen("cart");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });

/** 131.24 The delivery blocks' names in the layers: "Send today" with the shop's cut-off, and its day chips. */
export const DELIVERY_BLOCKS = {
  sendToday: "Send today · the shop's cut-off",
  deliveryDays: "Delivery days · today, tomorrow, a date",
} as const;

// ——— What both looks are made of ———

const display = (family: string, size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family, size, weight: 600, line_height: 1.04, letter_spacing: -0.02 * size, ...extra });

/** A text of the look's in its ink. */
function say(ctx: SectionContext, k: SignatureInk, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, k, ctx.w(word), font, extra);
}

/** A section's title in the look's display face, a quieter link at its end. */
function headOf(ctx: SectionContext, k: SignatureInk, family: string, title: SectionWord, link: { word: SectionWord; action: Action } | null, padding: StudioSides = sides(26, 18, 12, 18), kicker?: SectionWord): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    cross: "end",
    gap: 12,
    padding,
    children: [
      {
        id: id(),
        type: "column",
        width: "fill",
        gap: 4,
        children: [
          ...(kicker ? [say(ctx, k, kicker, { size: 11, weight: 700, letter_spacing: 2, uppercase: true }, { accent: true })] : []),
          say(ctx, k, title, display(family, 27), { max_lines: 2 }),
        ],
      },
      ...(link ? [say(ctx, k, link.word, { size: 13, weight: 700 }, { accent: true, action: link.action, padding: sides(0, 0, 4, 0) })] : []),
    ],
  };
}

/** A round frosted disc over a photo. */
function glassDisc(ctx: SectionContext, icon: string, action: Action, size = 42): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    width: size,
    height: size,
    radius: size / 2,
    align: "center",
    cross: "center",
    self_align: "center",
    border_color: "#FFFFFF",
    border_width: 1,
    surface: { glass: 16, tint: 0.18 },
    action,
    children: [{ id: id(), type: "icon", icon, icon_size: 21, color: "#FFFFFF" }],
  };
}

/** A compact button (its own width), its arrow at its end: the hero's and the shop's. */
function heroButton(ctx: SectionContext, word: SectionWord, action: Action, look: { background: string; dark_background?: string; color: string; dark_color?: string }, margin: StudioSides, icon = "arrow_forward", height = 48): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "button",
    name: ctx.w(word),
    text: ctx.w(word),
    icon,
    icon_position: "end",
    width: "hug",
    height,
    radius: height / 2,
    padding: sides(0, 20, 0, 20),
    self_align: "start",
    background: look.background,
    dark_background: look.dark_background ?? look.background,
    color: look.color,
    ...(look.dark_color ? { dark_color: look.dark_color } : { dark_color: look.color }),
    font: { size: 15, weight: 700 },
    shadow: "medium",
    motion: { press: "shrink" },
    action,
    margin,
  };
}

/** A floral rule: a hairline, a small flower, a hairline. */
function floralRule(ctx: SectionContext, k: SignatureInk, margin: StudioSides = sides(6, 0, 6, 0)): StudioNode {
  const id = idOf(ctx);
  const hair = (): StudioNode => ({ id: id(), type: "row", width: "fill", height: 1, background: k.line, dark_background: k.darkLine, children: [] });
  return {
    id: id(),
    type: "row",
    name: "Floral rule",
    gap: 10,
    cross: "center",
    padding: sides(0, 40, 0, 40),
    margin,
    children: [hair(), { id: id(), type: "icon", icon: "local_florist", icon_size: 16, color: k.accent, dark_color: k.darkAccent }, hair()],
  };
}

/** The occasions, each its photo, word and the story it opens. */
const OCCASIONS: readonly { photo: string; word: SectionWord; kicker: SectionWord; headline: SectionWord; icon: string }[] = [
  { photo: P("blush-bouquet"), word: "lqLove", kicker: "lqForLove", headline: "lqHeroLove", icon: "favorite" },
  { photo: P("tulips"), word: "lqBirthday", kicker: "lqForBirthday", headline: "lqHeroBirthday", icon: "cake" },
  { photo: P("white-lilies"), word: "lqSympathy", kicker: "lqForSympathy", headline: "lqHeroSympathy", icon: "spa" },
  { photo: P("sunshine"), word: "lqNewBaby", kicker: "lqForBaby", headline: "lqHeroBaby", icon: "child_care" },
  { photo: P("ranunculus"), word: "lqCongrats", kicker: "lqForCongrats", headline: "lqHeroCongrats", icon: "celebration" },
];

/** The occasions as story rings: each its photo, its word under it, opening the stories (and the shop from each). */
function occasionStories(ctx: SectionContext, k: SignatureInk, ring: string, size = 62): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "stories",
    name: ctx.w("lqOccasions"),
    interval_ms: 5000,
    stories: { size },
    color: k.ink,
    dark_color: k.darkInk,
    slides: OCCASIONS.map((o, i) => ({
      image_url: sigPhoto(ctx, o.photo),
      ...sigTexts(ctx, { heading: o.word }),
      subheading: null,
      action: shop,
      ring: i < 2 ? ("highlight" as const) : ("plain" as const),
      ...(i < 2 ? { ring_color: ring } : {}),
    })),
  };
}

/** The occasions as a ticker of words, the flower between them. */
function occasionTicker(ctx: SectionContext, k: SignatureInk, family: string, look: Partial<StudioNode>): StudioNode {
  const t = sigTexts(ctx, { text: "lqTicker" });
  return {
    id: idOf(ctx)(),
    type: "marquee",
    name: ctx.w("lqOccasions"),
    text: t.text,
    translations: t.translations,
    icon: "local_florist",
    marquee: { speed: 34, direction: "start" },
    font: { family, size: 26, weight: 500, italic: true },
    color: k.ink,
    dark_color: k.darkInk,
    padding: sides(14, 0, 14, 0),
    ...look,
  };
}

/** The code the shop shows in the app (131.17 bound to the shop's coupons: `LEQAA10`, else the first shown; left out without one), in its premium look. */
function shopCoupon(ctx: SectionContext, color: string, look: "ticket" | "glass"): StudioNode {
  return { id: idOf(ctx)(), type: "coupon", name: ctx.w("lqCoupon"), code: LEQAA_COUPON, coupon: { look, bind: "public" }, radius: 20, color, margin: sides(14, 16, 4, 16) };
}

/** The demo's code for a first bouquet (lib/demo/flowers.ts makes it, shown in the app). */
export const LEQAA_COUPON = "LEQAA10";

/**
 * The flash sale: the shop's own (131.15 the `flash_sale` element: the sale
 * ending soonest, its products at was and now prices with the share off, a
 * live countdown and a stock bar; left out while no sale is on), in the
 * look's colour, `banner` in A and the cards side by side in B.
 */
function flashSale(ctx: SectionContext, accent: string, look: "banner" | "carousel" = "banner"): StudioNode {
  const t = sigTexts(ctx, { text: "lqFlashTitle" });
  return {
    id: idOf(ctx)(),
    type: "flash_sale",
    name: ctx.w("lqFlashKicker"),
    text: t.text,
    translations: t.translations,
    flash_sale: { look, limit: 6, countdown: true, stock_bar: true, accent },
    radius: 28,
    margin: sides(18, 16, 4, 16),
  };
}

/** The delivery days as chips: today, tomorrow, a date (each opens the shop; the day and slot are picked at checkout). */
function dayChips(ctx: SectionContext, k: SignatureInk, onColour = false): StudioNode {
  const id = idOf(ctx);
  const chip = (word: SectionWord, lit: boolean, icon: string): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(word),
    // Three equal chips in one row, never cut at the card's edge.
    width: "fill",
    height: 36,
    radius: 18,
    gap: 5,
    align: "center",
    cross: "center",
    padding: sides(0, 6, 0, 6),
    action: shop,
    ...(lit
      ? { background: onColour ? "#FFFFFF" : k.fill, dark_background: onColour ? "#FFFFFF" : k.darkFill }
      : { border_color: onColour ? "#FFFFFF" : k.line, dark_border_color: onColour ? "#FFFFFF" : k.darkLine, border_width: 1 }),
    // Today's bolt only: the three fit on the narrowest phone.
    children: [
      ...(lit ? [{ id: id(), type: "icon", icon, icon_size: 15, color: onColour ? k.ink : k.onFill, dark_color: onColour ? k.ink : k.darkOnFill } satisfies StudioNode] : []),
      { id: id(), type: "text", text: ctx.w(word), max_lines: 1, font: { size: 12.5, weight: 700 }, color: lit ? (onColour ? k.ink : k.onFill) : onColour ? "#FFFFFF" : k.ink, dark_color: lit ? (onColour ? k.ink : k.darkOnFill) : onColour ? "#FFFFFF" : k.darkInk },
    ],
  });
  return { id: id(), type: "row", name: DELIVERY_BLOCKS.deliveryDays, gap: 6, width: "fill", children: [chip("lqToday", true, "bolt"), chip("lqTomorrow", false, "wb_sunny"), chip("lqPickDate", false, "calendar_month")] };
}

/** The shop's products the most people take, as tall photo cards. */
function lovedCards(ctx: SectionContext, k: SignatureInk, family: string): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w("lqLoved"),
    source: "products",
    layout: "carousel",
    gap: 14,
    padding: sides(0, 18, 0, 18),
    query: { limit: 8, category_id: null, featured: false, sort: "popular", ids: [] },
    card: {
      id: id(),
      type: "column",
      width: 172,
      gap: 8,
      children: [
        {
          id: id(),
          type: "stack",
          width: 172,
          height: 214,
          children: [
            { id: id(), type: "image", bind: "image", width: 172, height: 214, radius: 26, fit: "cover", corners: { top_start: 86, top_end: 86, bottom_end: 26, bottom_start: 26 } },
            // 131.16 The sale's share off ("−14%"), nothing when it isn't on sale.
            // At the photo's foot, clear of the arch.
            { id: id(), type: "text", bind: "sale", font: { size: 11, weight: 800 }, color: k.onFill, background: k.fill, dark_color: k.darkOnFill, dark_background: k.darkFill, radius: 99, padding: sides(4, 10, 4, 10), place: { x: 10, y: 92 } },
          ],
        },
        { id: id(), type: "text", bind: "title", max_lines: 2, color: k.ink, dark_color: k.darkInk, font: display(family, 17, { letter_spacing: -0.2, line_height: 1.15 }) },
        {
          id: id(),
          type: "row",
          gap: 8,
          cross: "center",
          children: [
            { id: id(), type: "text", bind: "price", max_lines: 1, color: k.accent, dark_color: k.darkAccent, font: { size: 14, weight: 700 } },
            // Its price before, struck through, while on sale.
            { id: id(), type: "text", bind: "was_price", max_lines: 1, color: k.muted, dark_color: k.darkMuted, font: { size: 12.5 } },
          ],
        },
      ],
    },
  };
}

/** Kind words: the owner's customers' own, in [brackets]; never one made up. */
function kindWords(ctx: SectionContext, k: SignatureInk, style: "carousel" | "stacked"): StudioNode {
  const quote = (text: SectionWord): StudioEntry => sigEntry(ctx, { text, title: "reviewName", subtitle: "lqQuoteRole" }, { value: null });
  return {
    id: idOf(ctx)(),
    type: "testimonials",
    name: ctx.w("lqKindWords"),
    testimonials: { style },
    gap: 12,
    radius: 26,
    background: k.surface,
    dark_background: k.darkSurface,
    color: k.ink,
    dark_color: k.darkInk,
    border_color: k.line,
    dark_border_color: k.darkLine,
    border_width: 1,
    padding: sides(0, 18, 0, 18),
    entries: [quote("reviewText"), quote("lqQuoteTwo")],
    motion: { enter: "slide_up", duration_ms: 500, delay_ms: 0 },
  };
}

/** The sticky "Send flowers" over the tabs while the page scrolls. */
function sendBar(ctx: SectionContext, k: SignatureInk, style: "bar" | "fab"): StudioNode {
  const t = sigTexts(ctx, { title: "lqBrandLine", text: "lqSendFlowers" });
  return {
    id: idOf(ctx)(),
    type: "cta_bar",
    name: ctx.w("lqSendFlowers"),
    title: t.title,
    text: t.text,
    translations: t.translations,
    cta: { style, lead: "local_florist" },
    pin: "bottom",
    icon: "local_florist",
    background: k.fill,
    dark_background: k.darkFill,
    color: k.ink,
    dark_color: k.darkInk,
    action: toCart,
  };
}

// ——— A · Rose hour ———

/** One occasion's slide: its photo full bleed under the rose shade, its kicker, headline and line, Send flowers and the round arrow. */
function roseSlide(ctx: SectionContext, o: (typeof OCCASIONS)[number]): StudioNode {
  const id = idOf(ctx);
  const white = "#FFFFFF";
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w(o.headline),
    image_url: sigPhoto(ctx, o.photo),
    height: 520,
    background: ROSE_SHADE,
    scrim: { color: ROSE_SHADE, from: 0.55, middle: 0.12, at: 38, to: 0.9 },
    align: "end",
    padding: sides(0, 22, 34, 22),
    action: shop,
    children: [
      {
        id: id(),
        type: "row",
        gap: 8,
        cross: "center",
        height: 22,
        children: [
          { id: id(), type: "row", width: 22, height: 1, self_align: "center", background: "#FFD9C2", dark_background: "#FFD9C2", children: [] },
          { id: id(), type: "icon", icon: o.icon, icon_size: 15, color: "#FFD9C2" },
          { id: id(), type: "text", text: ctx.w(o.kicker), color: white, font: { size: 11, weight: 700, letter_spacing: 1.8, uppercase: true } },
        ],
      },
      { id: id(), type: "text", text: ctx.w(o.headline), color: white, max_lines: 3, font: display(FRAUNCES, 50, { weight: 500, line_height: 0.98 }), margin: sides(14, 0, 0, 0) },
      { id: id(), type: "text", text: ctx.w("lqHeroLine"), color: white, opacity: 0.9, max_lines: 2, font: { size: 15, line_height: 1.4 }, margin: sides(10, 0, 0, 0) },
      // A compact button at the words' start edge, as far under them as they are from each other.
      heroButton(ctx, "lqSendFlowers", shop, { background: white, color: ROSE_SHADE }, sides(16, 0, 0, 0)),
    ],
  };
}

/** The wordmark (the app's name, or the demo's own in its languages) between round glass buttons, over the slides' top. */
function roseTop(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("lqWordmark"),
    width: "fill",
    gap: 10,
    // Its own height: in the stack, a row of fixed-size discs would
    // otherwise take the slides' whole height and sit in their middle.
    height: 68,
    cross: "center",
    self_align: "start",
    padding: sides(26, 16, 0, 16),
    children: [
      glassDisc(ctx, "search", shop),
      { id: id(), type: "text", text: ctx.w("lqWordmark"), width: "fill", text_align: "center", color: "#FFFFFF", max_lines: 1, font: display(FRAUNCES, 26, { weight: 600, letter_spacing: 0.5 }) },
      glassDisc(ctx, "shopping_bag", toCart),
    ],
  };
}

/** The hero: the five occasions as full-screen stories (a line each over the top, the open one's photo growing slowly), the wordmark over them, the occasion rings on a frosted card over their foot. */
function roseHero(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "stack",
    name: ctx.w("lqHeroLove"),
    height: 520,
    cross: "start",
    children: [
      {
        id: id(),
        type: "slider",
        name: ctx.w("lqOccasions"),
        height: 520,
        per_view: 1,
        autoplay: true,
        interval_ms: 5500,
        indicator: "progress",
        indicator_look: { at: "top", inset: 80, color: "#FFFFFF", count: "padded" },
        ken_burns: true,
        children: OCCASIONS.map((o) => roseSlide(ctx, o)),
      },
      roseTop(ctx),
    ],
  };
}

/** The occasions as story rings on a frosted card. */
function roseOccasions(ctx: SectionContext): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "column",
    name: ctx.w("lqOccasions"),
    width: "fill",
    radius: 28,
    margin: sides(14, 14, 0, 14),
    padding: sides(14, 6, 8, 6),
    background: A.surface,
    dark_background: A.darkSurface,
    border_color: "#FFFFFF",
    dark_border_color: "#3A2530",
    border_width: 1,
    surface: { glass: 22, tint: 0.88, soft: 3 },
    children: [occasionStories(ctx, A, LEQAA_CHAMPAGNE)],
  };
}

/** "Send today": the shop's cut-off in the owner's words, the delivery days as chips, the courier's van on a champagne disc. */
function sendTodayA(ctx: SectionContext, margin: StudioSides = sides(18, 16, 4, 16)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: DELIVERY_BLOCKS.sendToday,
    gap: 12,
    radius: 26,
    padding: sides(16, 16, 16, 16),
    margin,
    // Solid: a gradient would stay light by night.
    background: "#FCECE6",
    dark_background: "#2A1720",
    border_color: A.line,
    dark_border_color: A.darkLine,
    border_width: 1,
    action: shop,
    children: [
      {
        id: id(),
        type: "row",
        gap: 12,
        cross: "center",
        children: [
          { id: id(), type: "icon", icon: "local_shipping", icon_size: 24, color: "#FFFFFF", gradient: { from: LEQAA_CHAMPAGNE, to: A.accent, angle: 135 }, radius: 99, padding: sides(11, 11, 11, 11) },
          {
            id: id(),
            type: "column",
            width: "fill",
            gap: 3,
            children: [
              say(ctx, A, "lqSendToday", display(FRAUNCES, 24)),
              say(ctx, A, "lqCutoff", { size: 13.5, line_height: 1.35 }, { muted: true, max_lines: 3 }),
            ],
          },
        ],
      },
      dayChips(ctx, A),
    ],
  };
}

/** The collections as a bento of photos, their names on frosted labels, each opening the shop. */
function collectionsBento(ctx: SectionContext, margin: StudioSides = sides(0, 16, 4, 16)): StudioNode {
  const tile = (word: SectionWord, photo: string, size: StudioEntry["size"], chip?: SectionWord): StudioEntry =>
    sigEntry(ctx, chip ? { title: word, subtitle: chip } : { title: word }, { size, image_url: sigPhoto(ctx, photo), action: shop, icon: "local_florist" });
  return {
    id: idOf(ctx)(),
    type: "bento",
    name: ctx.w("lqCollections"),
    columns: 2,
    gap: 10,
    radius: 26,
    bento: { caption: "glass", row: 122 },
    margin,
    entries: [tile("lqSignature", P("blush-bouquet"), "large", "lqLoved"), tile("lqRoses", P("red-rose"), "small"), tile("lqSeasonal", P("ranunculus"), "small"), tile("lqPlants", P("orchid"), "wide"), tile("lqGiftSets", P("garden-jug"), "wide")],
    motion: { enter: "slide_up", duration_ms: 500, delay_ms: 0 },
  };
}

/** "Build your bouquet": the loose stems under a rose shade, its three steps as chips, Start. */
/** The builder's three steps as chips on a dark card: each its number on a white disc, its word in white. */
function buildSteps(ctx: SectionContext, border: string, ink: string, margin: StudioSides): StudioNode {
  const id = idOf(ctx);
  const step = (n: string, word: SectionWord): StudioNode => ({
    id: id(),
    type: "row",
    gap: 6,
    cross: "center",
    height: 32,
    radius: 16,
    // The number's disc as far from the pill's edge as from its top and foot.
    padding: sides(0, 12, 0, 5),
    surface: { glass: 12, tint: 0.2 },
    border_color: border,
    dark_border_color: border,
    border_width: 1,
    children: [
      // The number on a white disc, in plain figures (the serif's old-style 3 reads as a 5 when cut).
      { id: id(), type: "row", width: 22, height: 22, radius: 11, align: "center", cross: "center", background: "#FFFFFF", dark_background: "#FFFFFF", children: [{ id: id(), type: "text", text: n, color: ink, dark_color: ink, font: { family: "DM Sans", size: 12, weight: 800, line_height: 1 } }] },
      { id: id(), type: "text", text: ctx.w(word), color: "#FFFFFF", dark_color: "#FFFFFF", font: { size: 12.5, weight: 700 } },
    ],
  });
  return { id: id(), type: "row", name: ctx.w("lqBuildTitle"), gap: 6, scroll: true, margin, children: [step("1", "lqStepFlowers"), step("2", "lqStepWrap"), step("3", "lqStepCard")] };
}

function builderA(ctx: SectionContext, margin: StudioSides = sides(22, 16, 4, 16)): StudioNode {
  const id = idOf(ctx);
  const white = "#FFFFFF";
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w("lqBuildTitle"),
    image_url: sigPhoto(ctx, P("stems")),
    height: 300,
    radius: 30,
    background: ROSE_SHADE,
    scrim: { color: ROSE_SHADE, from: 0.92, middle: 0.5, at: 55, to: 0.15, angle: 90 },
    align: "center",
    padding: sides(22, 22, 22, 22),
    margin,
    ken_burns: true,
    action: shop,
    children: [
      { id: id(), type: "text", text: ctx.w("lqBuildKicker"), color: "#FFD9C2", font: { size: 11, weight: 700, letter_spacing: 2.2, uppercase: true } },
      { id: id(), type: "text", text: ctx.w("lqBuildTitle"), color: white, width: 230, max_lines: 2, font: display(FRAUNCES, 36, { weight: 500 }), margin: sides(8, 0, 0, 0) },
      { id: id(), type: "text", text: ctx.w("lqBuildLine"), color: white, opacity: 0.88, width: 230, max_lines: 3, font: { size: 13.5, line_height: 1.4 }, margin: sides(8, 0, 0, 0) },
      buildSteps(ctx, "#F6D3DD", ROSE_SHADE, sides(14, 0, 0, 0)),
      heroButton(ctx, "lqBuildStart", shop, { background: white, color: ROSE_SHADE }, sides(16, 0, 0, 0), "arrow_forward", 44),
    ],
  };
}

/** A · the home: the occasions full screen, Send today, the flash sale, the collections, what is loved most, Build your bouquet, kind words, the ticker, Send flowers. */
export function leqaaAHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    background: A.page,
    dark_background: A.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 96, 0),
      children: [
        roseHero(ctx),
        // The flash sale's countdown in the first screen, right under the stories.
        { ...flashSale(ctx, A.fill), margin: sides(14, 16, 4, 16) },
        roseOccasions(ctx),
        sendTodayA(ctx),
        shopCoupon(ctx, A.fill, "ticket"),
        headOf(ctx, A, FRAUNCES, "lqCollections", { word: "lqShopAll", action: shop }, sides(28, 18, 12, 18), "lqOccasions"),
        collectionsBento(ctx),
        headOf(ctx, A, FRAUNCES, "lqLoved", { word: "lqShopAll", action: shop }),
        lovedCards(ctx, A, FRAUNCES),
        builderA(ctx),
        occasionTicker(ctx, A, FRAUNCES, { margin: sides(22, 0, 0, 0), background: "#F6E6E1", dark_background: "#1C0F15" }),
        headOf(ctx, A, FRAUNCES, "lqKindWords", null, sides(22, 18, 12, 18)),
        kindWords(ctx, A, "carousel"),
        floralRule(ctx, A, sides(22, 0, 0, 0)),
      ],
    },
  };
}

// ——— The pages after the home (both looks) ———

/** The shop's top: a photo banner of the collections and the occasions as rings. */
function shopTop(ctx: SectionContext, k: SignatureInk, family: string, photo: string, shade: string, ring: string): StudioNode[] {
  const id = idOf(ctx);
  return [
    {
      id: id(),
      type: "photo_hero",
      name: ctx.w("lqShopHead"),
      image_url: sigPhoto(ctx, photo),
      height: 190,
      radius: 28,
      background: shade,
      scrim: { color: shade, from: 0.85, middle: 0.35, at: 60, to: 0.1, angle: 90 },
      align: "center",
      padding: sides(18, 20, 18, 20),
      margin: sides(8, 16, 4, 16),
      ken_burns: true,
      children: [
        { id: id(), type: "text", text: ctx.w("lqShopHead"), color: "#FFFFFF", width: 220, max_lines: 2, font: display(family, 28, { weight: 500 }) },
        { id: id(), type: "text", text: ctx.w("lqShopLine"), color: "#FFFFFF", opacity: 0.9, width: 220, max_lines: 2, font: { size: 13, line_height: 1.35 }, margin: sides(6, 0, 0, 0) },
      ],
    },
    { ...occasionStories(ctx, k, ring, 58), padding: sides(10, 12, 2, 12) },
    {
      id: id(),
      type: "row",
      name: ctx.w("lqBouquetKicker"),
      gap: 8,
      scroll: true,
      padding: sides(4, 16, 4, 16),
      children: [
        // Each its icon inside beside its words, the same space around both.
        { ...heroButton(ctx, "lqBouquetPage", pageOf("bouquet"), { background: k.fill, dark_background: k.darkFill, color: k.onFill, dark_color: k.darkOnFill }, sides(0, 0, 0, 0), "local_florist", 42), icon_position: "start", shadow: "none", padding: sides(0, 16, 0, 16) },
        { ...heroButton(ctx, "lqWishlist", pageOf("wishlist"), { background: k.surface, dark_background: k.darkSurface, color: k.ink, dark_color: k.darkInk }, sides(0, 0, 0, 0), "favorite", 42), icon_position: "start", shadow: "none", padding: sides(0, 16, 0, 16), border_color: k.line, dark_border_color: k.darkLine, border_width: 1 },
      ],
    },
  ];
}

/** Over the cart: the gift checkout to come (pick the day, write the card); the add-ons are the cart's own. */
function cartTop(ctx: SectionContext, k: SignatureInk): StudioNode[] {
  const id = idOf(ctx);
  return [
    {
      id: id(),
      type: "row",
      name: ctx.w("lqCartNote"),
      gap: 12,
      cross: "center",
      radius: 22,
      padding: sides(14, 14, 14, 14),
      margin: sides(10, 16, 4, 16),
      background: k.surface,
      dark_background: k.darkSurface,
      border_color: k.line,
      dark_border_color: k.darkLine,
      border_width: 1,
      children: [
        { id: id(), type: "icon", icon: "redeem", icon_size: 22, color: k.onFill, dark_color: k.darkOnFill, background: k.fill, dark_background: k.darkFill, radius: 99, padding: sides(9, 9, 9, 9) },
        inked(ctx, k, ctx.w("lqCartNote"), { size: 13.5, weight: 600, line_height: 1.35 }, { width: "fill", max_lines: 3 }),
      ],
    },
  ];
}

/** Over the orders: how an order travels, step by step (the person's own orders under it, the app's). */
function ordersTop(ctx: SectionContext, k: SignatureInk, family: string): StudioNode[] {
  const step = (title: SectionWord, text: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    headOf(ctx, k, family, "lqTrackTitle", null, sides(10, 18, 6, 18)),
    {
      id: idOf(ctx)(),
      type: "timeline",
      name: ctx.w("lqTrackTitle"),
      timeline: { style: "vertical" },
      color: k.ink,
      dark_color: k.darkInk,
      background: k.surface,
      dark_background: k.darkSurface,
      radius: 24,
      padding: sides(16, 14, 16, 14),
      margin: sides(0, 16, 6, 16),
      border_color: k.line,
      dark_border_color: k.darkLine,
      border_width: 1,
      entries: [step("lqTrack1", "lqTrack1Text", true), step("lqTrack2", "lqTrack2Text"), step("lqTrack3", "lqTrack3Text"), step("lqTrack4", "lqTrack4Text")],
    },
  ];
}

/** The look's own pages: the signature bouquet (the product's page as the look draws it) and the person's picks. */
function leqaaPages(k: SignatureInk, family: string, look: "a" | "b") {
  return (ctx: SectionContext) => [
    { slug: "bouquet", title: "lqBouquetPage" as SectionWord, studio: bouquetPage(ctx, k, family, look) },
    { slug: "wishlist", title: "lqWishlist" as SectionWord, studio: wishlistPage(ctx, k, family) },
  ];
}

/**
 * The signature bouquet as the look draws a product's page: its photos as a
 * gallery, the sizes to choose from, the add-ons, when it arrives (the
 * delivery days) and the card (a preview of the words), and the button
 * that opens the shop's own product. The prices, sizes and add-ons a
 * person pays for are the product's own options in the shop.
 */
function bouquetPage(ctx: SectionContext, k: SignatureInk, family: string, look: "a" | "b"): StudioPage {
  const id = idOf(ctx);
  const size = (word: SectionWord, stems: SectionWord, lit: boolean): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    gap: 2,
    cross: "center",
    radius: 20,
    padding: sides(12, 6, 12, 6),
    action: shop,
    ...(lit ? { background: k.fill, dark_background: k.darkFill } : { background: k.surface, dark_background: k.darkSurface, border_color: k.line, dark_border_color: k.darkLine, border_width: 1 }),
    children: [
      { id: id(), type: "icon", icon: "local_florist", icon_size: lit ? 26 : 20, color: lit ? k.onFill : k.accent, dark_color: lit ? k.darkOnFill : k.darkAccent },
      { id: id(), type: "text", text: ctx.w(word), font: { size: 14, weight: 800 }, color: lit ? k.onFill : k.ink, dark_color: lit ? k.darkOnFill : k.darkInk },
      { id: id(), type: "text", text: ctx.w(stems), font: { size: 11.5 }, color: lit ? k.onFill : k.muted, dark_color: lit ? k.darkOnFill : k.darkMuted, opacity: lit ? 0.85 : 1 },
    ],
  });
  const photos = (look === "a" ? ["blush-bouquet", "red-rose", "ranunculus", "atelier"] : ["ranunculus", "blush-bouquet", "baby-breath", "atelier"])
    .map((name) => sigPhoto(ctx, P(name)))
    .filter((url): url is string => url !== null)
    .map((image_url) => ({ image_url, caption: null }));
  const card: StudioNode = {
    id: id(),
    type: "column",
    name: ctx.w("lqGiftMsg"),
    gap: 8,
    radius: 22,
    padding: sides(18, 18, 18, 18),
    margin: sides(0, 16, 4, 16),
    background: look === "a" ? "#FFF8F4" : "#FBF8F1",
    dark_background: look === "a" ? "#2A1720" : "#16241D",
    border_color: k.line,
    dark_border_color: k.darkLine,
    border_width: 1,
    surface: { ticket: { at: 78, axis: "vertical", notch: 9 }, soft: 2 },
    children: [
      { id: id(), type: "icon", icon: "edit_note", icon_size: 22, color: k.accent, dark_color: k.darkAccent },
      say(ctx, k, "lqGiftMsgSample", { family, size: 22, weight: 500, italic: true, line_height: 1.2 }, { max_lines: 3 }),
      say(ctx, k, "lqGiftMsgLine", { size: 12.5, line_height: 1.4 }, { muted: true, max_lines: 2 }),
    ],
  };
  return {
    header: { type: "title", buttons: ["cart"], ...signatureHeader(k, "petal") },
    background: k.page,
    dark_background: k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 110, 0),
      children: [
        photos.length ? { id: id(), type: "gallery", name: ctx.w("lqBouquetKicker"), gallery: { layout: "filmstrip", radius: 28, captions: false }, height: 380, images: photos, padding: sides(8, 16, 0, 16) } : floralRule(ctx, k, sides(12, 0, 0, 0)),
        {
          id: id(),
          type: "column",
          gap: 6,
          padding: sides(18, 18, 4, 18),
          children: [
            say(ctx, k, "lqBouquetKicker", { size: 11, weight: 700, letter_spacing: 2, uppercase: true }, { accent: true }),
            say(ctx, k, "lqBouquetTitle", display(family, 34, { weight: 500 }), { max_lines: 2 }),
            say(ctx, k, "lqBouquetLine", { size: 14, line_height: 1.45 }, { muted: true, max_lines: 3 }),
          ],
        },
        headOf(ctx, k, family, "lqSizes", null, sides(16, 18, 10, 18)),
        { id: id(), type: "row", name: ctx.w("lqSizes"), gap: 10, padding: sides(0, 16, 0, 16), children: [size("lqSizeClassic", "lqStems12", false), size("lqSizeDeluxe", "lqStems24", true), size("lqSizeGrand", "lqStems36", false)] },
        headOf(ctx, k, family, "lqSendToday", null, sides(16, 18, 6, 18)),
        { ...say(ctx, k, "lqDeliveryLine", { size: 13.5, line_height: 1.4 }, { muted: true, max_lines: 2 }), padding: sides(0, 18, 10, 18) },
        { ...dayChips(ctx, k), padding: sides(0, 16, 0, 16) },
        headOf(ctx, k, family, "lqGiftMsg", null, sides(20, 18, 10, 18)),
        card,
        { ...heroButton(ctx, "lqChoose", shop, { background: k.fill, dark_background: k.darkFill, color: k.onFill, dark_color: k.darkOnFill }, sides(20, 18, 0, 18), "arrow_forward", 50), self_align: "center" },
      ],
    },
  };
}

/** The person's picks: what they opened lately (kept on their phone) and the shop's featured flowers picked for them. */
function wishlistPage(ctx: SectionContext, k: SignatureInk, family: string): StudioPage {
  const id = idOf(ctx);
  return {
    header: { type: "title", buttons: ["cart"], ...signatureHeader(k, "petal") },
    background: k.page,
    dark_background: k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 28, 0),
      children: [
        { id: id(), type: "items", name: ctx.w("lqRecent"), source: "products", layout: "carousel", recent: true, title: ctx.w("lqRecent"), gap: 12, padding: sides(12, 16, 6, 16), query: { limit: 10, category_id: null, featured: false, sort: "newest", ids: [] } },
        headOf(ctx, k, family, "lqPicked", { word: "lqShopAll", action: shop }, sides(18, 18, 10, 18)),
        {
          id: id(),
          type: "items",
          name: ctx.w("lqPicked"),
          source: "products",
          layout: "grid",
          columns: 2,
          gap: 12,
          padding: sides(0, 16, 0, 16),
          query: { limit: 6, category_id: null, featured: true, sort: "popular", ids: [] },
          card: {
            id: id(),
            type: "column",
            gap: 6,
            children: [
              { id: id(), type: "image", bind: "image", width: "fill", height: 180, radius: 22, fit: "cover" },
              { id: id(), type: "text", bind: "title", max_lines: 1, color: k.ink, dark_color: k.darkInk, font: display(family, 17, { letter_spacing: -0.2 }) },
              { id: id(), type: "text", bind: "price", max_lines: 1, color: k.accent, dark_color: k.darkAccent, font: { size: 13.5, weight: 700 } },
            ],
          },
        },
      ],
    },
  };
}

/** Over the shop, the cart and the orders, in the look. */
function leqaaOver(k: SignatureInk, family: string, photo: string, shade: string, ring: string) {
  return (screenName: string, ctx: SectionContext): StudioNode[] | null => {
    switch (screenName) {
      case "search":
      case "courses":
        return shopTop(ctx, k, family, photo, shade, ring);
      case "cart":
        // 131.17 And the shop's code for a first bouquet, in the look's coupon.
        // The add-ons are the cart's own "Add a little more" (131.50), under the note.
        return [...cartTop(ctx, k), shopCoupon(ctx, k.fill, k === A ? "ticket" : "glass")];
      case "orders":
        return ordersTop(ctx, k, family);
      default:
        return null;
    }
  };
}

/** Leqaa's five tabs: Home, Bouquets (the shop), Send (the cart, the bar's raised bloom in the middle), Orders, Account. */
export function leqaaTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const out = structuredClone([...tabs]).map((t) => {
    const target = t.target.type === "screen" ? t.target.screen : null;
    if (t.id === "home") return { ...t, icon: "home" };
    if (target === "search") return { ...t, label: "Bouquets", icon: "local_florist" };
    if (target === "cart") return { ...t, label: "Send", icon: "redeem" };
    if (target === "account") return { ...t, icon: "person" };
    return t;
  });
  const account = out.findIndex((t) => t.target.type === "screen" && t.target.screen === "account");
  const orders: LayoutTab = { id: "orders", label: "Orders", icon: "local_shipping", target: { type: "screen", screen: "orders" } };
  if (!out.some((t) => t.target.type === "screen" && t.target.screen === "orders")) out.splice(account < 0 ? out.length : account, 0, orders);
  return out;
}

// ——— The sign-in screens and the account menus ———

const LEQAA_A_SCREENS = signatureScreens({
  style: "photo",
  photo: P("blush-bouquet"),
  title: { en: "Flowers for every moment", ar: "زهور لكل لحظة", tr: "Her an için çiçekler" },
  subtitle: {
    en: "Sign in to send flowers, follow your orders and keep your cards.",
    ar: "سجّل الدخول لترسل الزهور وتتابع طلباتك وتحتفظ ببطاقاتك.",
    tr: "Çiçek göndermek, siparişlerinizi izlemek ve kartlarınızı saklamak için giriş yapın.",
  },
  menu: "cover",
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

const LEQAA_B_SCREENS = signatureScreens({
  style: "photo",
  photo: P("atelier"),
  title: { en: "Who are the flowers for?", ar: "لمن هذه الزهور؟", tr: "Çiçekler kime?" },
  subtitle: {
    en: "Sign in to send flowers with a card in your own words.",
    ar: "سجّل الدخول لترسل الزهور مع بطاقة بكلماتك.",
    tr: "Kendi sözlerinizle bir kartla çiçek göndermek için giriş yapın.",
  },
  menu: "night",
  accent: LEQAA_PEACH,
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** 131.22 The petal bar: blush by day, a plum night; the Send tab the raised bloom. */
export const LEQAA_A_BAR = signatureBar(A, { design: "petal", background: "#FFFFFF", dark_background: "#24131B", labels: "active", radius: 30, margin: 12, center: "cart" });
/** 131.22 B's petal bar: a forest capsule by day and by night, the open tab in moss. */
export const LEQAA_B_BAR = signatureBar(B, { design: "petal", background: FOREST, dark_background: "#14261F", active: "#F3EBDD", dark_active: "#F2B79E", inactive: "#B9CBBF", dark_inactive: "#94A99D", labels: "always", radius: 30, margin: 12, center: "cart" });

/** 131.25 The gift checkout's look in each look's colours (`Config.screens.checkout`). */
/**
 * The looks' checkout: the premium gift checkout in five steps (the gift
 * checkout's real parts, `mode: gift`), A's with round chips on plain
 * cards, B's with square chips on frosted glass and smaller corners.
 */
export const LEQAA_A_CHECKOUT: CheckoutLook = { look: "gift", mode: "gift", style: "steps", chips: "pill", surface: "plain", radius: 24, accent: A.fill, dark_accent: A.darkFill };
export const LEQAA_B_CHECKOUT: CheckoutLook = { look: "gift", mode: "gift", style: "steps", chips: "square", surface: "glass", radius: 14, accent: B.fill, dark_accent: B.darkFill };

export const LEQAA_A: SignatureDesign = {
  demo: "flowers",
  variant: "a",
  template: { id: "flowers_signature_a", icon: "local_florist", fits: { types: ["store"], plain: true } },
  home: leqaaAHome,
  over: leqaaOver(A, FRAUNCES, P("blush-bouquet"), ROSE_SHADE, LEQAA_CHAMPAGNE),
  tabs: leqaaTabs,
  pages: leqaaPages(A, FRAUNCES, "a"),
  bar: LEQAA_A_BAR,
  look: { header: signatureHeader(A, "petal"), background: A.page, dark_background: A.darkPage },
  chrome: { header: "petal", system: "petal" },
  isNew: true,
  project: {
    // Look A is the demo: its main colour the demo's (lib/demo/content.ts).
    // 131.29 Its plum night on every screen, the shop's and the account's too.
    appearance: { secondary_color: LEQAA_CHAMPAGNE, font: "DM Sans", font_family: FRAUNCES, dark_background: A.darkPage, dark_surface: A.darkSurface },
    screens: (platform) => ({ ...LEQAA_A_SCREENS(platform), checkout: { ...LEQAA_A_CHECKOUT } }),
  },
};

// ——— B · Botanical press ———

/** B's home header: the petal style, the wordmark in the middle, the brand's line under it. */
function pressHeader(ctx: SectionContext): StudioPage["header"] {
  const t = sigTexts(ctx, { title: "lqWordmark", subtitle: "lqBrandLine" });
  return { type: "logo_center", title: t.title, subtitle: t.subtitle, buttons: ["search", "cart"], translations: t.translations, ...signatureHeader(B, "petal") };
}

/** "Who are the flowers for?" and the occasions as chips with their icons. */
function askB(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const chip = (o: (typeof OCCASIONS)[number], lit: boolean): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(o.word),
    height: 40,
    radius: 20,
    gap: 7,
    cross: "center",
    padding: sides(0, 16, 0, 12),
    action: shop,
    ...(lit ? { background: B.fill, dark_background: B.darkFill } : { background: B.surface, dark_background: B.darkSurface, border_color: B.line, dark_border_color: B.darkLine, border_width: 1 }),
    children: [
      { id: id(), type: "icon", icon: o.icon, icon_size: 17, color: lit ? B.onFill : B.accent, dark_color: lit ? B.darkOnFill : B.darkAccent },
      { id: id(), type: "text", text: ctx.w(o.word), font: { size: 13.5, weight: 700 }, color: lit ? B.onFill : B.ink, dark_color: lit ? B.darkOnFill : B.darkInk },
    ],
  });
  return {
    id: id(),
    type: "column",
    name: ctx.w("lqAsk"),
    gap: 14,
    padding: sides(18, 0, 6, 0),
    children: [
      { ...say(ctx, B, "lqAsk", display(OUTFIT, 38, { weight: 400, line_height: 1 }), { max_lines: 2 }), padding: sides(0, 18, 0, 18) },
      { id: id(), type: "row", gap: 8, scroll: true, padding: sides(0, 16, 0, 16), children: OCCASIONS.map((o, i) => chip(o, i === 0)) },
    ],
  };
}

/** One of the edit's cards: a collection's photo tall, its number large, its name and a round arrow. */
function editCard(ctx: SectionContext, photo: string, no: SectionWord, word: SectionWord): StudioNode {
  const id = idOf(ctx);
  const white = "#FFFFFF";
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w(word),
    image_url: sigPhoto(ctx, photo),
    height: "fill",
    radius: 32,
    background: FOREST,
    scrim: { color: "#0B1A14", from: 0.25, middle: 0.05, at: 40, to: 0.86 },
    align: "between",
    padding: sides(18, 18, 22, 18),
    action: shop,
    children: [
      // Its number and its round arrow at its top, so nothing of it sits under the bar.
      {
        id: id(),
        type: "row",
        align: "between",
        cross: "start",
        width: "fill",
        children: [
          { id: id(), type: "text", text: ctx.w(no), color: white, font: display(OUTFIT, 64, { weight: 400, line_height: 0.9 }) },
          { id: id(), type: "row", width: 48, height: 48, radius: 24, align: "center", cross: "center", background: white, dark_background: white, shadow: "strong", children: [{ id: id(), type: "icon", icon: "arrow_forward", icon_size: 22, color: FOREST }] },
        ],
      },
      {
        id: id(),
        type: "column",
        gap: 4,
        children: [
          { id: id(), type: "text", text: ctx.w("lqEdit"), color: "#F6D7C8", font: { size: 11, weight: 700, letter_spacing: 2, uppercase: true } },
          { id: id(), type: "text", text: ctx.w(word), color: white, max_lines: 2, font: display(OUTFIT, 32, { weight: 400 }) },
        ],
      },
    ],
  };
}

/** The edit: three collections as cards that peek, a frosted pill of dots over their foot. */
function editSlider(ctx: SectionContext): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "slider",
    name: ctx.w("lqEdit"),
    // Short enough to end above the bar on the first screen.
    height: 372,
    per_view: 1.18,
    gap: 12,
    autoplay: true,
    interval_ms: 5000,
    indicator: "pill",
    // At the cards' top, clear of their titles.
    indicator_look: { at: "top", inset: 14 },
    ken_burns: true,
    padding: sides(4, 0, 4, 16),
    children: [editCard(ctx, P("ranunculus"), "lqNo1", "lqSeasonal"), editCard(ctx, P("red-rose"), "lqNo2", "lqRoses"), editCard(ctx, P("baby-breath"), "lqNo3", "lqSignature")],
  };
}

/** "Send today" as a ticket: the van on a peach disc and the owner's cut-off on its body, the days on its stub. */
function sendTodayB(ctx: SectionContext, margin: StudioSides = sides(18, 16, 4, 16)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: DELIVERY_BLOCKS.sendToday,
    gap: 14,
    radius: 26,
    padding: sides(18, 18, 18, 18),
    margin,
    background: B.surface,
    dark_background: B.darkSurface,
    border_color: B.line,
    dark_border_color: B.darkLine,
    border_width: 1,
    surface: { ticket: { at: 64, axis: "horizontal", notch: 11 }, soft: 2 },
    action: shop,
    children: [
      {
        id: id(),
        type: "row",
        gap: 14,
        cross: "center",
        children: [
          { id: id(), type: "icon", icon: "local_shipping", icon_size: 24, color: FOREST, background: LEQAA_PEACH, dark_background: LEQAA_PEACH, radius: 18, padding: sides(12, 12, 12, 12) },
          {
            id: id(),
            type: "column",
            width: "fill",
            gap: 4,
            children: [say(ctx, B, "lqSendToday", display(OUTFIT, 30, { weight: 400 })), say(ctx, B, "lqCutoff", { size: 13.5, line_height: 1.35 }, { muted: true, max_lines: 3 })],
          },
        ],
      },
      { ...dayChips(ctx, B), margin: sides(10, 0, 0, 0) },
    ],
  };
}

/** The collections as arches: rounded only at the top, their names under them. */
function collectionArches(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const arch = { top_start: 60, top_end: 60, bottom_end: 18, bottom_start: 18 };
  const tile = (photo: string, word: SectionWord): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: 118,
    gap: 8,
    cross: "center",
    action: shop,
    children: [sigImage(ctx, B, photo, { width: 118, height: 156, corners: arch, shadow: "medium" }), inked(ctx, B, ctx.w(word), { family: OUTFIT, size: 19, weight: 400 }, { text_align: "center", max_lines: 2 })],
  });
  return {
    id: id(),
    type: "row",
    name: ctx.w("lqCollections"),
    scroll: true,
    gap: 12,
    cross: "start",
    padding: sides(0, 16, 0, 16),
    children: [tile(P("red-rose"), "lqRoses"), tile(P("tulips"), "lqTulips"), tile(P("orchid"), "lqPlants"), tile(P("garden-jug"), "lqGiftSets"), tile(P("blush-bouquet"), "lqSignature")],
  };
}

/** From the atelier: a filmstrip of the shop's photos. */
function atelierStrip(ctx: SectionContext): StudioNode {
  const photos = ["atelier", "stems", "baby-breath", "sunflowers", "white-lilies"].map((name) => sigPhoto(ctx, P(name))).filter((url): url is string => url !== null).map((image_url) => ({ image_url, caption: null }));
  // Without the platform's photos at hand, the owner's own to add: the floral line in their place.
  if (!photos.length) return floralRule(ctx, B);
  return { id: idOf(ctx)(), type: "gallery", name: ctx.w("lqAtelier"), gallery: { layout: "filmstrip", radius: 24, captions: false }, height: 250, images: photos, padding: sides(0, 16, 0, 16) };
}

/** The price list: the shop's products, a hairline between them, the price in mono. */
function priceList(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w("lqPriceList"),
    source: "products",
    layout: "list",
    gap: 0,
    padding: sides(0, 16, 0, 16),
    query: { limit: 5, category_id: null, featured: true, sort: "popular", ids: [] },
    card: {
      id: id(),
      type: "row",
      gap: 14,
      cross: "center",
      padding: sides(12, 2, 12, 2),
      border_color: B.line,
      dark_border_color: B.darkLine,
      border_width: 0,
      children: [
        { id: id(), type: "image", bind: "image", width: 64, height: 78, radius: 32, fit: "cover" },
        {
          id: id(),
          type: "column",
          width: "fill",
          gap: 2,
          children: [
            { id: id(), type: "text", bind: "title", max_lines: 1, color: B.ink, dark_color: B.darkInk, font: { family: OUTFIT, size: 21, weight: 400 } },
            // 131.16 The sale's share off, nothing when it isn't on sale.
            { id: id(), type: "text", bind: "sale", max_lines: 1, color: B.accent, dark_color: B.darkAccent, font: { size: 12, weight: 700 } },
          ],
        },
        { id: id(), type: "text", bind: "price", max_lines: 1, color: B.ink, dark_color: B.darkInk, font: { family: "JetBrains Mono", size: 14, weight: 700 } },
      ],
    },
  };
}

/** The bouquet's three steps on the forest: a step each as a bar with its icon, Start. */
function builderB(ctx: SectionContext, margin: StudioSides = sides(22, 16, 4, 16)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("lqBuildTitle"),
    gap: 12,
    radius: 30,
    padding: sides(20, 18, 20, 18),
    margin,
    background: FOREST,
    dark_background: FOREST_NIGHT,
    surface: { soft: 3, pattern: "dots", pattern_strength: 0.07 },
    color: "#FFFFFF",
    action: shop,
    children: [
      { id: id(), type: "text", text: ctx.w("lqBuildKicker"), color: LEQAA_PEACH, font: { size: 11, weight: 700, letter_spacing: 2.2, uppercase: true } },
      { id: id(), type: "text", text: ctx.w("lqBuildTitle"), color: "#FFFFFF", max_lines: 2, font: display(OUTFIT, 38, { weight: 400 }) },
      { id: id(), type: "text", text: ctx.w("lqBuildLine"), color: "#FFFFFF", opacity: 0.85, max_lines: 2, font: { size: 13.5, line_height: 1.4 } },
      // A's chips in B's colours: white words and discs, clear on the forest.
      buildSteps(ctx, "#BFD8C9", FOREST, sides(6, 0, 0, 0)),
      heroButton(ctx, "lqBuildStart", shop, { background: LEQAA_PEACH, color: FOREST }, sides(8, 0, 0, 0), "arrow_forward", 46),
    ],
  };
}

/** B · the home: the petal header, who they are for, the edit, Send today, the flash sale, the arches, the atelier, the price list, the steps, kind words, Send flowers. */
export function leqaaBHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    header: pressHeader(ctx),
    background: B.page,
    dark_background: B.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 110, 0),
      children: [
        askB(ctx),
        // The flash sale's countdown in the first screen, right under the occasion chips.
        { ...flashSale(ctx, B.fill), margin: sides(14, 16, 4, 16) },
        { ...editSlider(ctx), margin: sides(14, 0, 0, 0) },
        sendTodayB(ctx),
        shopCoupon(ctx, B.fill, "glass"),
        headOf(ctx, B, OUTFIT, "lqCollections", { word: "lqShopAll", action: shop }, sides(26, 18, 12, 18)),
        collectionArches(ctx),
        headOf(ctx, B, OUTFIT, "lqAtelier", null, sides(26, 18, 12, 18)),
        atelierStrip(ctx),
        headOf(ctx, B, OUTFIT, "lqPriceList", { word: "lqShopAll", action: shop }, sides(26, 18, 4, 18)),
        priceList(ctx),
        builderB(ctx),
        occasionTicker(ctx, B, OUTFIT, { margin: sides(22, 0, 0, 0), background: "#E8ECE2", dark_background: "#0F1B15" }),
        headOf(ctx, B, OUTFIT, "lqKindWords", null, sides(22, 18, 12, 18)),
        kindWords(ctx, B, "stacked"),
        floralRule(ctx, B, sides(22, 0, 0, 0)),
      ],
    },
  };
}

export const LEQAA_B: SignatureDesign = {
  demo: "flowers",
  variant: "b",
  template: { id: "flowers_signature_b", icon: "yard", fits: { types: ["store"], plain: true } },
  home: leqaaBHome,
  over: leqaaOver(B, OUTFIT, P("atelier"), "#0B1A14", LEQAA_PEACH),
  tabs: leqaaTabs,
  pages: leqaaPages(B, OUTFIT, "b"),
  bar: LEQAA_B_BAR,
  look: { header: signatureHeader(B, "petal"), background: B.page, dark_background: B.darkPage },
  chrome: { header: "petal", home: "petal", system: "petal" },
  isNew: true,
  project: {
    primary: B.fill,
    // 131.29 Its forest night on every screen, the shop's and the account's too.
    appearance: { secondary_color: LEQAA_PEACH, font: "Manrope", dark_background: B.darkPage, dark_surface: B.darkSurface },
    screens: (platform) => ({ ...LEQAA_B_SCREENS(platform), checkout: { ...LEQAA_B_CHECKOUT } }),
  },
};

// ——— 131.26 Every slider and section of the two looks, as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;

/** A section of the look: its block wrapped so the section is one element; its words already the app's. */
const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};

export const LEQAA_SECTIONS: readonly SectionInfo[] = [
  { id: "lq_story_hero", icon: "auto_stories", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [roseHero(ctx), roseOccasions(ctx)]) },
  { id: "lq_occasions", icon: "favorite", isNew: true, fits: STORE_PLAIN, make: one((ctx) => ({ ...occasionStories(ctx, A, LEQAA_CHAMPAGNE), padding: sides(10, 12, 6, 12) })) },
  { id: "lq_send_today", icon: "local_shipping", isNew: true, fits: STORE_PLAIN, make: one((ctx) => sendTodayA(ctx)) },
  { id: "lq_send_ticket", icon: "confirmation_number", isNew: true, fits: STORE_PLAIN, make: one((ctx) => sendTodayB(ctx)) },
  { id: "lq_flash", icon: "bolt", isNew: true, fits: STORE_PLAIN, make: one((ctx) => flashSale(ctx, A.fill)) },
  { id: "lq_collections", icon: "dashboard", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, A, FRAUNCES, "lqCollections", { word: "lqShopAll", action: shop }), collectionsBento(ctx)]) },
  { id: "lq_arches", icon: "door_front", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, B, OUTFIT, "lqCollections", { word: "lqShopAll", action: shop }), collectionArches(ctx)]) },
  { id: "lq_loved", icon: "workspace_premium", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, A, FRAUNCES, "lqLoved", null), lovedCards(ctx, A, FRAUNCES)]) },
  { id: "lq_edit", icon: "view_carousel", isNew: true, fits: STORE_PLAIN, make: one(editSlider) },
  { id: "lq_builder", icon: "construction", isNew: true, fits: STORE_PLAIN, make: one((ctx) => builderA(ctx)) },
  { id: "lq_steps", icon: "linear_scale", isNew: true, fits: STORE_PLAIN, make: one((ctx) => builderB(ctx)) },
  { id: "lq_atelier", icon: "photo_library", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, B, OUTFIT, "lqAtelier", null), atelierStrip(ctx)]) },
  { id: "lq_price_list", icon: "receipt_long", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, B, OUTFIT, "lqPriceList", null), priceList(ctx)]) },
  { id: "lq_kind_words", icon: "format_quote", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, A, FRAUNCES, "lqKindWords", null), kindWords(ctx, A, "carousel")]) },
  { id: "lq_ticker", icon: "text_rotation_none", isNew: true, fits: STORE_PLAIN, make: one((ctx) => occasionTicker(ctx, A, FRAUNCES, { background: "#F6E6E1", dark_background: "#1C0F15" })) },
  { id: "lq_send_bar", icon: "local_florist", isNew: true, fits: STORE_PLAIN, make: one((ctx) => sendBar(ctx, A, "bar")) },
];
