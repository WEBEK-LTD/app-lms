import type { ItemsQuery, StudioNode } from "../pages/types";
import { newNodeId } from "./elements";
import type { SectionContext, SectionInfo, SectionWord } from "./sections";

/**
 * 112.4 A store's own ready sections (a flash sale, brands, categories in
 * pictures, lists from the shop, shop the look, why buy here, a coupon and
 * what was seen lately) and the sliders every project can use (a hero over
 * the whole width, cards that peek, a picture beside its words, and offers
 * that change by themselves). Made of Studio's own elements, so each part
 * is edited on its own; the pictures are Yallapp's (public/design-pictures).
 */

const STORE = { types: ["store"] } as const;

const pad = (v: number, h: number) => ({ top: v, end: h, bottom: v, start: h });

const idOf = (ctx: SectionContext) => (ctx.newId ?? newNodeId)();

function text(ctx: SectionContext, value: string, extra: Partial<StudioNode> = {}): StudioNode {
  return { id: idOf(ctx), type: "text", text: value, ...extra };
}

/** A picture behind an element, when the platform's address is known. */
function behind(ctx: SectionContext, file: string): Partial<StudioNode> {
  const url = ctx.picture?.(file);
  return url ? { image_background_url: url } : {};
}

const query = (extra: Partial<ItemsQuery>): ItemsQuery => ({ limit: 8, category_id: null, featured: false, sort: "newest", ids: [], ...extra });

/** A section's title over a list of the shop's products. */
function titled(ctx: SectionContext, word: SectionWord, list: StudioNode): StudioNode {
  return {
    id: idOf(ctx),
    type: "column",
    name: ctx.w(word),
    gap: 10,
    padding: pad(8, 12),
    children: [text(ctx, ctx.w(word), { font: { size: 18, weight: 800 } }), list],
  };
}

function products(ctx: SectionContext, layout: "carousel" | "grid" | "list", q: Partial<ItemsQuery>, extra: Partial<StudioNode> = {}): StudioNode {
  return { id: idOf(ctx), type: "items", source: "products", layout, ...(layout === "grid" ? { columns: 2 } : {}), gap: 10, query: query(q), ...extra };
}

/** A slide over a picture: its words at the bottom, darkened under them. */
function heroSlide(ctx: SectionContext, title: SectionWord, body: SectionWord, file: string, color: string, round: number): StudioNode {
  return {
    id: idOf(ctx),
    type: "column",
    height: "fill",
    align: "end",
    gap: 8,
    padding: pad(22, 20),
    radius: round,
    background: color,
    ...behind(ctx, file),
    overlay: { color: "#000000", opacity: 0.35 },
    color: "#FFFFFF",
    children: [
      text(ctx, ctx.w(title), { font: { size: round ? 20 : 28, weight: 800, line_height: 1.2 } }),
      text(ctx, ctx.w(body), { font: { size: 14 }, opacity: 0.9 }),
      ...(round
        ? []
        : [
            {
              id: idOf(ctx),
              type: "button" as const,
              text: ctx.w(ctx.button?.word ?? "heroButton"),
              width: "hug" as const,
              height: 42,
              radius: 12,
              background: "#FFFFFF",
              color: "#0E0D24",
              font: { weight: 800 as const, size: 14 },
              padding: pad(0, 18),
              margin: { top: 6 },
              action: ctx.button?.action ?? null,
            },
          ]),
    ],
  };
}

const SLIDES: readonly [SectionWord, SectionWord, string, string][] = [
  ["heroTitle", "heroText", "sunset-waves.jpg", "#7C2D12"],
  ["slideNewTitle", "slideNewText", "ocean-circles.jpg", "#0C4A6E"],
  ["slideOfferTitle", "slideOfferText", "berry-blocks.jpg", "#831843"],
];

/** The sliders, for every project. */
export const SLIDER_SECTIONS: readonly SectionInfo[] = [
  {
    // Over the whole width, its words and button on the picture, going on by itself with lines that fill.
    id: "hero_slider",
    icon: "view_carousel",
    make: (ctx) => ({
      id: idOf(ctx),
      type: "slider",
      name: ctx.w("heroTitle"),
      height: 420,
      autoplay: true,
      interval_ms: 5000,
      indicator: "progress",
      children: SLIDES.map(([title, body, file, color]) => heroSlide(ctx, title, body, file, color, 0)),
    }),
  },
  {
    // Rounded cards, the next one peeking at the side.
    id: "peek_slider",
    icon: "view_column",
    make: (ctx) => ({
      id: idOf(ctx),
      type: "slider",
      name: ctx.w("slideNewTitle"),
      height: 200,
      per_view: 1.2,
      gap: 12,
      padding: { top: 8, end: 0, bottom: 4, start: 12 },
      children: SLIDES.map(([title, body, file, color]) => heroSlide(ctx, title, body, file, color, 18)),
    }),
  },
  {
    // A picture beside its words, "1 / 3" over it.
    id: "split_slider",
    icon: "view_agenda",
    make: (ctx) => ({
      id: idOf(ctx),
      type: "slider",
      name: ctx.w("slideOfferTitle"),
      height: 190,
      autoplay: true,
      interval_ms: 4500,
      indicator: "count",
      margin: pad(8, 12),
      children: SLIDES.map(([title, body, file, color]) => ({
        id: idOf(ctx),
        type: "row" as const,
        height: "fill" as const,
        radius: 18,
        background: "#F4EFE6",
        dark_background: "#22203A",
        children: [
          {
            id: idOf(ctx),
            type: "column" as const,
            width: "fill" as const,
            align: "center" as const,
            gap: 6,
            padding: pad(14, 16),
            children: [
              text(ctx, ctx.w(title), { font: { size: 18, weight: 800, line_height: 1.25 }, max_lines: 3 }),
              text(ctx, ctx.w(body), { font: { size: 13 }, opacity: 0.8, max_lines: 3 }),
              {
                id: idOf(ctx),
                type: "button" as const,
                text: ctx.w(ctx.button?.word ?? "heroButton"),
                width: "hug" as const,
                height: 36,
                radius: 10,
                background: ctx.brand,
                color: "#FFFFFF",
                font: { weight: 800 as const, size: 13 },
                padding: pad(0, 14),
                margin: { top: 4 },
                action: ctx.button?.action ?? null,
              },
            ],
          },
          { id: idOf(ctx), type: "stack" as const, width: 136, height: "fill" as const, corners: { top_end: 18, bottom_end: 18 }, background: color, ...behind(ctx, file), children: [] },
        ],
      })),
    }),
  },
];

/** A store's own sections. */
export const STORE_SECTIONS: readonly SectionInfo[] = [
  {
    // Offers that change by themselves, lines filling as each one waits.
    id: "banner_slider",
    icon: "local_offer",
    fits: STORE,
    make: (ctx) => {
      const banner = (icon: string, title: SectionWord, body: SectionWord, from: string, to: string): StudioNode => ({
        id: idOf(ctx),
        type: "column",
        height: "fill",
        align: "center",
        cross: "center",
        gap: 4,
        padding: pad(16, 18),
        radius: 18,
        gradient: { from, to, angle: 135 },
        color: "#FFFFFF",
        children: [
          { id: idOf(ctx), type: "icon", icon, icon_size: 30, color: "#FFFFFF" },
          text(ctx, ctx.w(title), { font: { size: 19, weight: 800 }, text_align: "center" }),
          text(ctx, ctx.w(body), { font: { size: 13 }, opacity: 0.9, text_align: "center" }),
        ],
      });
      return {
        id: idOf(ctx),
        type: "slider",
        name: ctx.w("bannerOne"),
        height: 150,
        autoplay: true,
        interval_ms: 4000,
        indicator: "progress",
        margin: pad(8, 12),
        children: [
          banner("local_shipping", "bannerOne", "bannerOneText", ctx.brand, "#0E0D24"),
          banner("auto_awesome", "bannerTwo", "bannerTwoText", "#C2410C", "#7C2D12"),
          banner("payments", "bannerThree", "bannerThreeText", "#0369A1", "#15803D"),
        ],
      };
    },
  },
  {
    // A flash sale: its time running out, and the products on sale.
    id: "flash_sale",
    icon: "bolt",
    fits: STORE,
    make: (ctx) => {
      const ends = new Date(Date.now() + 3 * 86_400_000);
      ends.setUTCMinutes(0, 0, 0);
      return {
        id: idOf(ctx),
        type: "column",
        name: ctx.w("flashKicker"),
        gap: 12,
        padding: pad(14, 12),
        margin: pad(8, 12),
        radius: 20,
        gradient: { from: "#0E0D24", to: ctx.brand, angle: 135 },
        color: "#FFFFFF",
        children: [
          {
            id: idOf(ctx),
            type: "row",
            gap: 8,
            cross: "center",
            children: [
              { id: idOf(ctx), type: "icon", icon: "bolt", icon_size: 26, color: "#FFD166", motion: { loop: "pulse" } },
              {
                id: idOf(ctx),
                type: "column",
                width: "fill",
                gap: 2,
                children: [text(ctx, ctx.w("flashKicker"), { font: { size: 12, weight: 700, uppercase: true, letter_spacing: 1 }, opacity: 0.85 }), text(ctx, ctx.w("flashTitle"), { font: { size: 19, weight: 800 } })],
              },
            ],
          },
          { id: idOf(ctx), type: "countdown", ends_at: ends.toISOString(), text: ctx.w("flashEnded"), text_align: "center" },
          products(ctx, "carousel", { on_sale: true, sort: "popular" }),
        ],
      };
    },
  },
  {
    // The shop's categories in pictures, two to a row.
    id: "category_pictures",
    icon: "category",
    fits: STORE,
    needsCategories: true,
    make: (ctx) => titled(ctx, "categoriesTitle", { id: idOf(ctx), type: "categories", source: "products", style: "pictures", columns: 2 }),
  },
  {
    // The shop's categories as round pictures in a row that scrolls.
    id: "category_circles",
    icon: "shopping_bag",
    fits: STORE,
    needsCategories: true,
    make: (ctx) => ({ id: idOf(ctx), type: "categories", source: "products", style: "circles", padding: pad(8, 12) }),
  },
  {
    id: "new_arrivals",
    icon: "auto_awesome",
    fits: STORE,
    make: (ctx) => titled(ctx, "newTitle", products(ctx, "carousel", { sort: "newest" })),
  },
  {
    id: "best_sellers",
    icon: "workspace_premium",
    fits: STORE,
    make: (ctx) => titled(ctx, "bestTitle", products(ctx, "carousel", { sort: "popular" })),
  },
  {
    id: "on_sale",
    icon: "sell",
    fits: STORE,
    make: (ctx) => titled(ctx, "onSaleTitle", products(ctx, "grid", { on_sale: true, limit: 4 })),
  },
  {
    // One product, large: the best seller, in a card of its own.
    id: "deal",
    icon: "percent",
    fits: STORE,
    make: (ctx) =>
      titled(
        ctx,
        "dealTitle",
        products(
          ctx,
          "list",
          { sort: "popular", limit: 1 },
          {
            card: {
              id: idOf(ctx),
              type: "row",
              gap: 12,
              cross: "center",
              padding: pad(10, 10),
              radius: 18,
              background: "#FFFFFF",
              dark_background: "#22203A",
              border_color: ctx.brand,
              border_width: 2,
              shadow: "light",
              children: [
                { id: idOf(ctx), type: "image", bind: "image", width: 112, height: 112, radius: 14 },
                {
                  id: idOf(ctx),
                  type: "column",
                  width: "fill",
                  gap: 6,
                  children: [
                    { id: idOf(ctx), type: "text", bind: "badge", font: { size: 11, weight: 800, uppercase: true }, color: ctx.brand },
                    { id: idOf(ctx), type: "text", bind: "title", font: { size: 16, weight: 800 }, max_lines: 2 },
                    { id: idOf(ctx), type: "text", bind: "price", font: { size: 18, weight: 800 }, color: ctx.brand },
                  ],
                },
              ],
            },
          },
        ),
      ),
  },
  {
    // A photo with spots on what's for sale in it, each opening its product, and the pieces under it.
    id: "shop_look",
    icon: "checkroom",
    fits: STORE,
    make: (ctx) => {
      const spots: [number, number][] = [
        [50, 66],
        [73, 36],
        [50, 30],
      ];
      return {
        id: idOf(ctx),
        type: "column",
        name: ctx.w("lookTitle"),
        gap: 10,
        padding: pad(8, 12),
        children: [
          text(ctx, ctx.w("lookTitle"), { font: { size: 18, weight: 800 } }),
          text(ctx, ctx.w("lookText"), { font: { size: 13 }, opacity: 0.75 }),
          {
            id: idOf(ctx),
            type: "stack",
            aspect_ratio: 4 / 3,
            radius: 18,
            background: "#EDE4D6",
            ...behind(ctx, "art-room-living.png"),
            children: spots.map(([x, y], i) => {
              const entry = ctx.entries?.[i];
              return {
                id: idOf(ctx),
                type: "icon" as const,
                icon: "add",
                icon_size: 18,
                color: "#FFFFFF",
                background: ctx.brand,
                radius: 99,
                padding: pad(6, 6),
                border_color: "#FFFFFF",
                border_width: 2,
                shadow: "medium",
                place: { x, y },
                motion: { loop: "pulse" as const },
                ...(entry ? { action: { type: "item" as const, item: { source: "products" as const, id: entry.id } } } : {}),
              };
            }),
          },
          products(ctx, "carousel", { limit: 6, ids: (ctx.entries ?? []).slice(0, 3).map((e) => e.id) }),
        ],
      };
    },
  },
  {
    // Free brands' names in rounded chips that scroll; each one's picture and link are the owner's to set.
    id: "brands",
    icon: "storefront",
    fits: STORE,
    make: (ctx) => ({
      id: idOf(ctx),
      type: "column",
      name: ctx.w("brandsTitle"),
      gap: 10,
      padding: pad(8, 12),
      children: [
        text(ctx, ctx.w("brandsTitle"), { font: { size: 18, weight: 800 } }),
        {
          id: idOf(ctx),
          type: "row",
          scroll: true,
          gap: 10,
          children: ["NOVA", "ATLAS", "LUMA", "ORBIT", "MIRA", "KOTO"].map((brand, i) => ({
            id: idOf(ctx),
            type: "column" as const,
            width: 84,
            height: 84,
            align: "center" as const,
            cross: "center" as const,
            radius: 99,
            background: i % 2 ? "#F4EFE6" : "#FFFFFF",
            dark_background: "#22203A",
            border_color: "#E5E0D5",
            border_width: 1,
            children: [text(ctx, brand, { font: { size: 13, weight: 900, letter_spacing: 1.5 }, text_align: "center" })],
          })),
        },
      ],
    }),
  },
  {
    // Why buy here: delivery, returns, payment and help.
    id: "trust",
    icon: "verified_user",
    fits: STORE,
    make: (ctx) => {
      const badge = (icon: string, title: SectionWord, body: SectionWord): StudioNode => ({
        id: idOf(ctx),
        type: "row",
        gap: 10,
        cross: "center",
        padding: pad(10, 10),
        radius: 14,
        background: "#FFFFFF",
        dark_background: "#22203A",
        shadow: "light",
        children: [
          { id: idOf(ctx), type: "icon", icon, icon_size: 22, color: ctx.brand, background: "#F4EFE6", dark_background: "#2A2742", radius: 99, padding: pad(8, 8) },
          {
            id: idOf(ctx),
            type: "column",
            width: "fill",
            gap: 2,
            children: [text(ctx, ctx.w(title), { font: { size: 13, weight: 800 } }), text(ctx, ctx.w(body), { font: { size: 11 }, opacity: 0.75 })],
          },
        ],
      });
      return {
        id: idOf(ctx),
        type: "grid",
        name: ctx.w("trustShip"),
        columns: 2,
        gap: 10,
        padding: pad(8, 12),
        children: [badge("local_shipping", "trustShip", "trustShipText"), badge("undo", "trustReturn", "trustReturnText"), badge("lock", "trustPay", "trustPayText"), badge("support_agent", "trustHelp", "trustHelpText")],
      };
    },
  },
  {
    // An offer with a code people copy with one tap.
    id: "coupon",
    icon: "confirmation_number",
    fits: STORE,
    make: (ctx) => ({
      id: idOf(ctx),
      type: "row",
      name: ctx.w("couponTitle"),
      gap: 12,
      cross: "center",
      padding: pad(14, 14),
      margin: pad(8, 12),
      radius: 18,
      background: "#FFF7ED",
      dark_background: "#2A2742",
      border_color: ctx.brand,
      border_width: 1.5,
      children: [
        { id: idOf(ctx), type: "icon", icon: "redeem", icon_size: 30, color: ctx.brand },
        {
          id: idOf(ctx),
          type: "column",
          width: "fill",
          gap: 6,
          children: [
            text(ctx, ctx.w("couponKicker"), { font: { size: 12, weight: 700 }, opacity: 0.75 }),
            text(ctx, ctx.w("couponTitle"), { font: { size: 17, weight: 800 } }),
            { id: idOf(ctx), type: "coupon", code: "WELCOME15", radius: 10, color: ctx.brand },
          ],
        },
      ],
    }),
  },
  {
    // What this person opened lately, kept on their phone; hidden until there is something.
    id: "recent",
    icon: "visibility",
    fits: STORE,
    // Its title is the list's own, so it hides with it.
    make: (ctx) => products(ctx, "carousel", { limit: 10 }, { recent: true, title: ctx.w("recentTitle"), name: ctx.w("recentTitle"), padding: pad(8, 12) }),
  },
];
