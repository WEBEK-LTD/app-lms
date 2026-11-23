import type { StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { idOf } from "./parts";
import { sides, signatureBar, signatureHeader, type SignatureInk } from "./food-signature-parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import {
  KIT_MENU_PAGE,
  kitBanner,
  kitCartTop,
  kitCategories,
  kitChips,
  kitDeal,
  kitGift,
  kitHead,
  kitHero,
  kitHomeHeader,
  kitMenuPage,
  kitOrdersTop,
  kitProducts,
  kitPromises,
  kitReviews,
  kitSearch,
  kitSeasons,
  kitShopTheLook,
  kitShopTop,
  kitStory,
  kitTabs,
  kitTiles,
  kitTopList,
  ownPage,
  shop,
  type KitLook,
} from "./shop-kit-parts";

/**
 * 210 Sakan (سكن), Studio's home decor type (lib/studio/shop-types.ts):
 * a Studio demo of the store kind (lib/demo/kits/decor.ts) and its two
 * Signature looks, each a whole store project built from Studio's elements
 * and the shop types' parts (./shop-kit-parts.ts), as the owner approved
 * them on 23 November 2026 (a small header, a search pill, the categories,
 * a compact hero carousel of about 210 px with the next card peeking, tight
 * sections and a floating bar).
 *
 * A · SAKAN, the decor magazine: olive green on warm paper, wide photos,
 * Alexandria; a deep olive-black night. Shop by room, new arrivals, the
 * weekend's offers, a banner of the ceramics, "Complete the room" (the
 * styled dining corner with a spot on each piece), shop by style, the most
 * loved, gifts with wrapping and a card, the seasons (Ramadan, the new
 * year) and the customers' words.
 * B · TEEN (طين, "clay"), warm and calm: near-black ink on white and sand,
 * oak and clay, Almarai; a warm charcoal night. Curated collections, the
 * numbered best sellers, new arrivals, the house's story and numbers,
 * "Shop the corner", a gift card, the pieces that last, the Ramadan banner
 * and the promises.
 *
 * The room tiles and the seasons' banners are named like the shop's
 * categories (its rooms, Ramadan, New year), so each opens its category.
 * Nothing is made up: the lists, the sale and the prices are the shop's;
 * the owner's words are in [brackets] (DEMO_FACTS fills the demo's).
 */

// ——— The two looks' colours and faces ———

/** A · SAKAN: warm paper and olive by day, a deep olive-black night. */
export const SAKAN_INK: SignatureInk = {
  page: "#F3F0E9",
  darkPage: "#121310",
  surface: "#FBFAF6",
  darkSurface: "#1B1C18",
  ink: "#23251F",
  darkInk: "#EDEBE3",
  muted: "#62635A",
  darkMuted: "#B4B3A7",
  line: "#E1DBCF",
  darkLine: "#2C2E26",
  accent: "#4F5D2F",
  darkAccent: "#B9C98F",
  fill: "#4F5D2F",
  darkFill: "#9DB06A",
  onFill: "#FFFFFF",
  darkOnFill: "#121310",
};

/** B · TEEN: white and sand, near-black ink, oak; a warm charcoal night with oak light. */
export const TEEN_INK: SignatureInk = {
  page: "#FFFFFF",
  darkPage: "#111110",
  surface: "#F5F2EC",
  darkSurface: "#1C1B19",
  ink: "#1B1B1A",
  darkInk: "#F3F1EC",
  muted: "#5D5B56",
  darkMuted: "#B7B3AB",
  line: "#ECE8E1",
  darkLine: "#2A2926",
  accent: "#8E643C",
  darkAccent: "#D4AA7A",
  fill: "#1B1B1A",
  darkFill: "#D4AA7A",
  onFill: "#FFFFFF",
  darkOnFill: "#111110",
};

const LOOK_A: KitLook = { k: SAKAN_INK, tint: { day: "#E9E4D9", night: "#24261F" }, family: "Alexandria", look: "a", dir: "decor-photos", radius: 20, heavy: 600 };
const LOOK_B: KitLook = { k: TEEN_INK, tint: { day: "#EFE9DF", night: "#282724" }, family: "Almarai", look: "b", dir: "decor-photos", radius: 16, heavy: 800 };

/** The demo's code shown in the cart (lib/demo/kits/decor.ts). */
export const DECOR_COUPON_CODE = "SAKAN10";

// ——— What both looks share ———

/**
 * Shop the look on the styled dining corner (room-dining.jpg): the orchid,
 * the table and the chairs, in the order of the demo's first pieces. A
 * spot's place is from the start, so in Arabic it lands on the other chair.
 */
const CORNER_SPOTS = [
  { x: 38, y: 24, label: "dcSpotPlanter" as SectionWord },
  { x: 56, y: 46, label: "dcSpotTable" as SectionWord },
  { x: 8, y: 68, label: "dcSpotChairs" as SectionWord },
];

/** The seasons' banners, each named like its category (Ramadan, New year), so it opens it. */
function seasons(ctx: SectionContext, l: KitLook): StudioNode {
  const cards = [
    { photo: "brass-lantern", kicker: "dcSeasonRamadan" as SectionWord, title: "dcSeasonRamadanTitle" as SectionWord },
    { photo: "table-setting", kicker: "dcSeasonNewYear" as SectionWord, title: "dcSeasonNewYearTitle" as SectionWord },
  ];
  const made = kitSeasons(ctx, l, cards);
  return { ...made, children: made.children!.map((c, i) => ({ ...c, name: ctx.w(cards[i]!.kicker) })) };
}

/** Shop by style: a row of chips. */
function styles(ctx: SectionContext, l: KitLook): StudioNode {
  return kitChips(ctx, l, "dcStyles", [
    { word: "dcStyleNatural", icon: "spa" },
    { word: "dcStyleMinimal", icon: "auto_awesome" },
    { word: "dcStyleWarm", icon: "wb_sunny" },
    { word: "dcStyleClassic", icon: "diamond" },
    { word: "dcStyleBright", icon: "star" },
  ]);
}

/** The rooms as photo tiles, each named like the shop's room category. */
function rooms(ctx: SectionContext, l: KitLook): StudioNode {
  return kitTiles(ctx, l, [
    { photo: "room-bed", title: "skRoomBedroom" },
    { photo: "room-living", title: "skRoomLiving" },
    { photo: "room-dining", title: "skRoomDining" },
    { photo: "room-reading", title: "skRoomReading" },
  ]);
}

/** B's collections: a tall first tile, each named like a category of the shop. */
function collections(ctx: SectionContext, l: KitLook): StudioNode {
  return kitTiles(
    ctx,
    l,
    [
      { photo: "oak-dining", title: "skRoomDining", line: "dcColDining" },
      { photo: "room-bed", title: "skRoomBedroom", line: "dcColBedroom" },
      { photo: "sage-jars", title: "dcVasesBowls", line: "dcColVases" },
      { photo: "reading-chair", title: "skRoomReading", line: "dcColReading" },
    ],
    true,
  );
}

/** B's trust card: the house's story and its numbers. */
function story(ctx: SectionContext, l: KitLook): StudioNode {
  return {
    ...kitStory(ctx, l, {
      photo: "pottery-shelf",
      kicker: "dcStoryKicker",
      quote: "dcStoryQuote",
      name: "skStoryName",
      role: "skStoryRole",
      stats: [
        { value: "dcStatReturns", label: "dcStatReturnsLabel" },
        { value: "dcStatStudios", label: "dcStatStudiosLabel" },
        { value: "dcStatRating", label: "dcStatRatingLabel" },
      ],
    }),
    margin: sides(24, 16, 4, 16),
  };
}

// ——— A · SAKAN, the decor magazine ———

function sakanHome(ctx: SectionContext): StudioPage {
  const l = LOOK_A;
  return {
    header: kitHomeHeader(ctx, l, "dcWordmark", "dcTagA"),
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: idOf(ctx)(),
      type: "column",
      padding: sides(0, 0, 96, 0),
      children: [
        kitSearch(ctx, l, "dcSearch"),
        kitCategories(ctx, l, "tiles"),
        kitHero(
          ctx,
          l,
          [
            { photo: "hero-autumn", kicker: "dcHeroKicker1", title: "dcHeroTitle1", line: "dcHeroLine1" },
            { photo: "hero-bedroom", kicker: "dcHeroKicker2", title: "dcHeroTitle2", line: "dcHeroLine2" },
            { photo: "room-living", kicker: "dcHeroKicker3", title: "dcHeroTitle3", line: "dcHeroLine3" },
          ],
          "dcHeroButton",
        ),
        kitHead(ctx, l, "skRooms", { word: "dcAllRooms", action: ownPage(ctx, KIT_MENU_PAGE) }, "skRoomsLine"),
        rooms(ctx, l),
        kitHead(ctx, l, "dcNewIn", { word: "skSeeAll", action: shop }),
        kitProducts(ctx, l, { word: "dcNewIn", size: [156, 180] }),
        kitDeal(ctx, l, "dcWeekend", "carousel"),
        kitBanner(ctx, l, { photo: "pottery-shelf", kicker: "dcBannerKicker", title: "dcBannerTitle", line: "dcBannerLine" }),
        ...kitShopTheLook(ctx, l, { photo: "room-dining", title: "dcCompleteTitle", line: "dcCompleteLine", name: "skLookName", spots: CORNER_SPOTS, height: 300 }),
        kitHead(ctx, l, "dcStyles", null, "dcStylesLine"),
        styles(ctx, l),
        kitHead(ctx, l, "dcMostLoved", { word: "skSeeAll", action: shop }),
        kitProducts(ctx, l, { word: "dcMostLoved", layout: "grid", sort: "popular", featured: true, limit: 4 }),
        kitGift(ctx, l, { title: "dcGiftTitle", line: "dcGiftLine", photo: "flowers-glass" }),
        kitHead(ctx, l, "dcSeasons", null, "dcSeasonsLine"),
        seasons(ctx, l),
        kitHead(ctx, l, "dcReviews", null),
        kitReviews(ctx, l, [
          { quote: "dcReview1", name: "dcReview1Name", place: "dcReview1Place" },
          { quote: "dcReview2", name: "dcReview2Name", place: "dcReview2Place" },
        ]),
      ],
    },
  };
}

// ——— B · TEEN, warm and calm ———

function teenHome(ctx: SectionContext): StudioPage {
  const l = LOOK_B;
  return {
    header: kitHomeHeader(ctx, l, "dcWordmark", "dcTagB"),
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: idOf(ctx)(),
      type: "column",
      padding: sides(0, 0, 96, 0),
      children: [
        kitSearch(ctx, l, "dcSearchB"),
        kitCategories(ctx, l, "circles"),
        kitHero(
          ctx,
          l,
          [
            { photo: "wishbone", kicker: "dcHeroKickerB1", title: "dcHeroTitleB1", line: "dcHeroLineB1" },
            { photo: "sage-jars", kicker: "dcHeroKickerB2", title: "dcHeroTitleB2", line: "dcHeroLineB2" },
            { photo: "reading-chair", kicker: "dcHeroKickerB3", title: "dcHeroTitleB3", line: "dcHeroLineB3" },
          ],
          "dcDiscover",
        ),
        kitHead(ctx, l, "dcCollections", { word: "dcAllCollections", action: ownPage(ctx, KIT_MENU_PAGE) }, "dcCollectionsLine"),
        collections(ctx, l),
        kitHead(ctx, l, "dcBest", { word: "dcFullList", action: shop }),
        kitTopList(ctx, l, "dcBest"),
        kitHead(ctx, l, "dcNewIn", { word: "skSeeAll", action: shop }),
        kitProducts(ctx, l, { word: "dcNewIn", size: [150, 170] }),
        story(ctx, l),
        ...kitShopTheLook(ctx, l, { photo: "room-dining", title: "dcCornerTitle", line: "dcCornerLine", name: "skLookName", spots: CORNER_SPOTS, height: 300 }),
        kitGift(ctx, l, { title: "dcGiftTitleB", line: "dcGiftLineB", photo: "twin-vases" }),
        kitHead(ctx, l, "dcLasting", { word: "skSeeAll", action: shop }, "dcLastingLine"),
        kitProducts(ctx, l, { word: "dcLasting", layout: "grid", sort: "popular", featured: true, limit: 4 }),
        { ...kitBanner(ctx, l, { photo: "brass-lantern", kicker: "dcSeasonRamadan", title: "dcSeasonRamadanTitle" }), name: ctx.w("dcSeasonRamadan") },
        kitPromises(ctx, l, [
          { icon: "local_shipping", title: "skPromiseDelivery", line: "skPromiseDeliveryLine" },
          { icon: "sync", title: "dcPromiseReturns", line: "dcPromiseReturnsLine" },
          { icon: "redeem", title: "dcPromiseGift", line: "dcPromiseGiftLine" },
        ]),
      ],
    },
  };
}

// ——— The pages after the home, the shop, cart and orders, the screens and the bars ———

const pages = (l: KitLook) => (ctx: SectionContext) => [
  {
    slug: KIT_MENU_PAGE,
    title: "skCategoryMenu" as const,
    studio: kitMenuPage(ctx, l, {
      wordmark: "dcWordmark",
      search: "dcSearchAll",
      quick: [
        { word: "dcNewIn", icon: "new_releases" },
        { word: "dcOffers", icon: "percent" },
        { word: "dcStyles", icon: "auto_awesome" },
        { word: "dcGifts", icon: "redeem" },
      ],
      contactLine: "dcContactLine",
    }),
  },
];

function over(l: KitLook) {
  return (screenName: string, ctx: SectionContext): StudioNode[] | null => {
    switch (screenName) {
      case "search":
        return kitShopTop(ctx, l, { photo: l.look === "a" ? "hero-autumn" : "oak-dining", kicker: "dcShopKicker", title: "dcShopTitle" });
      case "cart":
        return kitCartTop(ctx, l, DECOR_COUPON_CODE, { icon: "redeem", word: "dcCartGiftNote" });
      case "orders":
        return kitOrdersTop(ctx, l, [
          { title: "dcTrack1", text: "dcTrack1Text" },
          { title: "dcTrack2", text: "dcTrack2Text" },
          { title: "dcTrack3", text: "dcTrack3Text" },
          { title: "dcTrack4", text: "dcTrack4Text" },
        ]);
      default:
        return null;
    }
  };
}

const FIRST = ["orders", "notifications", "settings", "help", "privacy", "terms"] as const;

const SAKAN_SCREENS = signatureScreens({
  style: "photo",
  photo: "/decor-photos/hero.jpg",
  title: { en: "Welcome home", ar: "أهلًا بك في بيتك", tr: "Evinize hoş geldiniz" },
  subtitle: { en: "Sign in to follow your orders and your wishlist.", ar: "سجّل الدخول لتتابع طلباتك وقائمة أمنياتك.", tr: "Siparişlerinizi ve favorilerinizi takip etmek için giriş yapın." },
  menu: "cover",
  first: FIRST,
});

const TEEN_SCREENS = signatureScreens({
  style: "photo",
  photo: "/decor-photos/reading-chair.jpg",
  title: { en: "A calm home starts here", ar: "البيت الهادئ يبدأ معنا", tr: "Sakin bir ev burada başlar" },
  subtitle: { en: "Sign in for new pieces and your orders.", ar: "سجّل الدخول للقطع الجديدة وطلباتك.", tr: "Yeni parçalar ve siparişleriniz için giriş yapın." },
  menu: "night",
  accent: TEEN_INK.accent,
  first: FIRST,
});

/** A's floating bar: deep olive-grey by day and by night, the open tab a lighter pill with its name. */
export const SAKAN_BAR = signatureBar(SAKAN_INK, { design: "float", background: "#2E3029", dark_background: "#24261F", active: "#FFFFFF", dark_active: "#EDEBE3", inactive: "#C9C8BD", dark_inactive: "#8E8D82", labels: "active", radius: 30, margin: 12 });
/** B's floating bar: white by day, warm charcoal by night, the open tab near black (oak by night). */
export const TEEN_BAR = signatureBar(TEEN_INK, { design: "float", background: "#FFFFFF", dark_background: "#1E1D1B", active: "#1B1B1A", dark_active: "#D4AA7A", inactive: "#6E6B65", dark_inactive: "#9C988F", labels: "active", radius: 30, margin: 12 });

export const DECOR_A: SignatureDesign = {
  demo: "decor",
  variant: "a",
  template: { id: "decor_signature_a", icon: "chair", fits: { types: ["store"], plain: true } },
  home: sakanHome,
  over: over(LOOK_A),
  tabs: kitTabs,
  pages: pages(LOOK_A),
  bar: SAKAN_BAR,
  look: { header: signatureHeader(SAKAN_INK, "glass"), background: SAKAN_INK.page, dark_background: SAKAN_INK.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    // Look A is the demo: its main colour the demo's (lib/demo/content.ts).
    appearance: { secondary_color: "#B4643E", font: "DM Sans", font_family: LOOK_A.family, dark_background: SAKAN_INK.darkPage, dark_surface: SAKAN_INK.darkSurface },
    screens: SAKAN_SCREENS,
  },
};

export const DECOR_B: SignatureDesign = {
  demo: "decor",
  variant: "b",
  template: { id: "decor_signature_b", icon: "spa", fits: { types: ["store"], plain: true } },
  home: teenHome,
  over: over(LOOK_B),
  tabs: kitTabs,
  pages: pages(LOOK_B),
  bar: TEEN_BAR,
  look: { header: signatureHeader(TEEN_INK, "glass"), background: TEEN_INK.page, dark_background: TEEN_INK.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    primary: TEEN_INK.accent,
    appearance: { secondary_color: "#A4472F", font: "Outfit", font_family: LOOK_B.family, dark_background: TEEN_INK.darkPage, dark_surface: TEEN_INK.darkSurface },
    screens: TEEN_SCREENS,
  },
};

// ——— The looks' own parts as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;
const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};

export const DECOR_SECTIONS: readonly SectionInfo[] = [
  // Complete the room: the styled dining corner, a spot on each piece.
  { id: "dc_complete_room", icon: "touch_app", isNew: true, fits: STORE_PLAIN, make: one((ctx) => kitShopTheLook(ctx, LOOK_A, { photo: "room-dining", title: "dcCompleteTitle", line: "dcCompleteLine", name: "skLookName", spots: CORNER_SPOTS, height: 300 })) },
  // Shop by style: chips.
  { id: "dc_styles", icon: "auto_awesome", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [kitHead(ctx, LOOK_A, "dcStyles", null, "dcStylesLine"), styles(ctx, LOOK_A)]) },
  // The seasons' banners, Ramadan and the new year, each opening its category.
  { id: "dc_seasons", icon: "celebration", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [kitHead(ctx, LOOK_A, "dcSeasons", null, "dcSeasonsLine"), seasons(ctx, LOOK_A)]) },
  // B's curated collections: a tall first tile.
  { id: "dc_collections", icon: "dashboard", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [kitHead(ctx, LOOK_B, "dcCollections", { word: "dcAllCollections", action: shop }, "dcCollectionsLine"), collections(ctx, LOOK_B)]) },
  // B's numbered best sellers.
  { id: "dc_best_list", icon: "format_list_numbered", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [kitHead(ctx, LOOK_B, "dcBest", { word: "dcFullList", action: shop }), kitTopList(ctx, LOOK_B, "dcBest")]) },
  // B's trust card: the house's story and its numbers.
  { id: "dc_house_story", icon: "format_quote", isNew: true, fits: STORE_PLAIN, make: one((ctx) => story(ctx, LOOK_B)) },
];
