import type { Action, FormField, LayoutTab, StudioEntry, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { inked, sides, sigEntry, sigPhoto, sigTexts, signatureHeader, type SignatureInk } from "./food-signature-parts";
import { clothesTabs } from "./clothes-signature";

/**
 * 210 What the shop types after Clothes are drawn with (home decor Sakan,
 * crochet Ghurza, furniture Rukn: ./decor-signature.ts,
 * ./crochet-signature.ts, ./furniture-signature.ts), each part a reusable
 * element of the editor's library for any store (`SHOP_KIT_SECTIONS`),
 * built only from Studio's elements so every part is the owner's to change:
 *
 * - shop the look: a room photo with a tappable spot on each product (its
 *   name on a label), each opening the product, the products under it;
 * - shop by room or by style: photo tiles named like the shop's categories
 *   (an element named like one opens it, lib/studio/shop-categories.ts);
 * - the custom-order card and its page: the `form` element as a custom-order
 *   request (`StudioForm.request`), kept as the shop's request in the
 *   dashboard and Yallapp Business;
 * - the delivery and assembly booking: the `delivery_slots` element, the
 *   shop's next delivery days and times kept for the checkout;
 * - the maker's story, the promises row, gifts with wrapping and a card,
 *   the seasons' banners, the workshops (the academy's courses), reviews.
 *
 * A look is its ink, its tint, its face and its photos' folder (`KitLook`).
 * Nothing is made up: lists, categories, sales and prices are the shop's;
 * the owner's words are in [brackets].
 */

export interface KitLook {
  k: SignatureInk;
  /** The look's quiet fill (cards, chips) by day and by night. */
  tint: { day: string; night: string };
  /** Its face for the headlines (and the app's text). */
  family: string;
  look: "a" | "b";
  /** Its photos' folder under public/ (`decor-photos`). */
  dir: string;
  /** Cards' corners. */
  radius: number;
  /** The headlines' weight. */
  heavy: StudioFont["weight"];
}

export const shop: Action = screen("search");
export const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
/** One of the look's own pages where the whole look is made; where its home is made alone, the shop. */
export const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));
/** The pages every kit look has: the category menu and the custom-order request. */
export const KIT_MENU_PAGE = "menu";
export const KIT_CUSTOM_PAGE = "custom-order";

export const kitPhoto = (ctx: SectionContext, l: KitLook, name: string) => sigPhoto(ctx, `/${l.dir}/${name}.jpg`);
export const face = (l: KitLook, size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: l.family, size, weight: l.heavy, line_height: 1.2, ...extra });

export function say(ctx: SectionContext, l: KitLook, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, l.k, ctx.w(word), font, extra);
}

const white = { color: "#FFFFFF", dark_color: "#FFFFFF" } as const;

/** A section's title (a small kicker over it, a line under it), a quieter link at its end. */
export function kitHead(ctx: SectionContext, l: KitLook, title: SectionWord, link: { word: SectionWord; action: Action } | null, line?: SectionWord, kicker?: SectionWord, padding: StudioSides = sides(24, 16, 10, 16)): StudioNode {
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
        gap: 3,
        children: [
          ...(kicker ? [say(ctx, l, kicker, { size: 11.5, weight: 700, letter_spacing: 0.6 }, { accent: true, max_lines: 1 })] : []),
          say(ctx, l, title, face(l, 21), { max_lines: 2 }),
          ...(line ? [say(ctx, l, line, { size: 12.5 }, { muted: true, max_lines: 2 })] : []),
        ],
      },
      ...(link
        ? [
            {
              id: id(),
              type: "row" as const,
              name: ctx.w(link.word),
              gap: 2,
              cross: "center" as const,
              padding: sides(4, 0, 4, 4),
              action: link.action,
              children: [say(ctx, l, link.word, { size: 13, weight: 700 }, { accent: true, max_lines: 1 }), { id: id(), type: "icon" as const, icon: "arrow_forward", icon_size: 18, color: l.k.accent, dark_color: l.k.darkAccent }],
            },
          ]
        : []),
    ],
  };
}

/** The search pill: the shop's search on the look's surface. */
export function kitSearch(ctx: SectionContext, l: KitLook, word: SectionWord, margin = sides(4, 16, 6, 16)): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "search",
    name: ctx.w(word),
    text: ctx.w(word),
    source: "products",
    radius: 26,
    height: 50,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    color: l.k.muted,
    dark_color: l.k.darkMuted,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    margin,
  };
}

/** The shop's main categories under the search (each opens the shop on it). */
export function kitCategories(ctx: SectionContext, l: KitLook, style: "circles" | "tiles" | "chips" = "circles"): StudioNode {
  return { id: idOf(ctx)(), type: "categories", name: ctx.w("skCategories"), source: "products", style, color: l.k.ink, dark_color: l.k.darkInk, padding: sides(8, 12, 4, 12) };
}

/** One hero card: a photo under a shade, its kicker, a two-line headline, its line and a button. */
export function kitHeroCard(ctx: SectionContext, l: KitLook, card: { photo: string; kicker: SectionWord; title: SectionWord; line?: SectionWord }, button: SectionWord, height = 210): StudioNode {
  const id = idOf(ctx);
  const shade = l.k.darkPage;
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w(card.title),
    image_url: kitPhoto(ctx, l, card.photo),
    height,
    radius: l.radius + 4,
    background: shade,
    scrim: { color: "#000000", from: 0.05, middle: 0.2, at: 45, to: 0.72 },
    align: "end",
    padding: sides(16, 18, 16, 18),
    action: shop,
    children: [
      say(ctx, l, card.kicker, { size: 11.5, weight: 600, letter_spacing: 0.4 }, { ...white, opacity: 0.9, max_lines: 1 }),
      say(ctx, l, card.title, face(l, 24, { line_height: 1.15 }), { ...white, max_lines: 2, margin: sides(4, 0, 0, 0) }),
      ...(card.line ? [say(ctx, l, card.line, { size: 12.5 }, { ...white, opacity: 0.88, max_lines: 1, margin: sides(4, 0, 0, 0) })] : []),
      {
        id: id(),
        type: "button",
        name: ctx.w(button),
        text: ctx.w(button),
        icon: "arrow_forward",
        icon_position: "end",
        width: "hug",
        height: 38,
        radius: 19,
        padding: sides(0, 16, 0, 16),
        self_align: "start",
        margin: sides(10, 0, 0, 0),
        background: l.k.fill,
        dark_background: l.k.darkFill,
        color: l.k.onFill,
        dark_color: l.k.darkOnFill,
        font: { size: 13.5, weight: 700 },
        motion: { press: "shrink" },
        action: shop,
      },
    ],
  };
}

/** The compact hero carousel: cards about 210 px tall, the next one peeking, dots under them. */
export function kitHero(ctx: SectionContext, l: KitLook, cards: readonly { photo: string; kicker: SectionWord; title: SectionWord; line?: SectionWord }[], button: SectionWord, height = 210): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "slider",
    name: ctx.w("skHeroName"),
    height,
    per_view: 1.12,
    gap: 10,
    autoplay: true,
    interval_ms: 5000,
    dots: true,
    indicator: "dots",
    padding: sides(10, 16, 4, 16),
    children: cards.map((c) => kitHeroCard(ctx, l, c, button, height)),
  };
}

/**
 * A product card: its photo (the sale's share off over it, a round add
 * button at its foot), its name, its line (its size in cm or its days to
 * make, when it has them) and its price (struck through before while on sale).
 */
export function kitCard(ctx: SectionContext, l: KitLook, width: number, height: number): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    width,
    gap: 5,
    children: [
      {
        id: id(),
        type: "stack",
        width,
        height,
        children: [
          { id: id(), type: "image", bind: "image", width, height, radius: l.radius, fit: "cover", background: l.tint.day, dark_background: l.tint.night },
          { id: id(), type: "text", bind: "sale", font: { size: 11, weight: 800 }, color: l.k.onFill, background: l.k.fill, dark_color: l.k.darkOnFill, dark_background: l.k.darkFill, radius: 8, padding: sides(3, 7, 3, 7), place: { x: 6, y: 5 } },
          {
            id: id(),
            type: "row",
            name: ctx.w("skAdd"),
            width: 34,
            height: 34,
            radius: 17,
            align: "center",
            cross: "center",
            background: l.k.surface,
            dark_background: l.k.darkSurface,
            shadow: "light",
            place: { x: 88, y: 86 },
            children: [{ id: id(), type: "icon", icon: "add", icon_size: 20, color: l.k.ink, dark_color: l.k.darkInk }],
          },
        ],
      },
      { id: id(), type: "text", bind: "title", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 13.5, weight: 600 } },
      { id: id(), type: "text", bind: "subtitle", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 11.5 } },
      {
        id: id(),
        type: "row",
        gap: 6,
        cross: "center",
        children: [
          { id: id(), type: "text", bind: "price", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 14, weight: 800 } },
          { id: id(), type: "text", bind: "was_price", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 12 } },
        ],
      },
    ],
  };
}

/** The shop's products as a row of cards (`carousel`) or two columns (`grid`). */
export function kitProducts(ctx: SectionContext, l: KitLook, opts: { word: SectionWord; sort?: "newest" | "popular"; featured?: boolean; layout?: "carousel" | "grid"; limit?: number; size?: [number, number] }): StudioNode {
  const grid = opts.layout === "grid";
  const [w, h] = opts.size ?? (grid ? [170, 180] : [150, 176]);
  return {
    id: idOf(ctx)(),
    type: "items",
    name: ctx.w(opts.word),
    source: "products",
    layout: grid ? "grid" : "carousel",
    ...(grid ? { columns: 2 } : {}),
    gap: 12,
    padding: sides(0, 16, 0, 16),
    query: { limit: opts.limit ?? (grid ? 4 : 8), category_id: null, featured: Boolean(opts.featured), sort: opts.sort ?? "newest", ids: [] },
    card: kitCard(ctx, l, w, h),
  };
}

/** The shop's best sellers as a numbered list (B's). */
export function kitTopList(ctx: SectionContext, l: KitLook, word: SectionWord): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w(word),
    source: "products",
    layout: "list",
    gap: 0,
    radius: l.radius + 4,
    padding: sides(6, 14, 6, 14),
    margin: sides(0, 16, 0, 16),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    query: { limit: 3, category_id: null, featured: false, sort: "popular", ids: [] },
    card: {
      id: id(),
      type: "row",
      gap: 12,
      cross: "center",
      padding: sides(10, 0, 10, 0),
      children: [
        { id: id(), type: "image", bind: "image", width: 64, height: 72, radius: 12, fit: "cover" },
        {
          id: id(),
          type: "column",
          width: "fill",
          gap: 3,
          children: [
            { id: id(), type: "text", bind: "title", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 14, weight: 700 } },
            { id: id(), type: "text", bind: "subtitle", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 12 } },
            { id: id(), type: "text", bind: "price", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 14, weight: 800 } },
          ],
        },
        { id: id(), type: "icon", icon: "add_circle", icon_size: 28, color: l.k.ink, dark_color: l.k.darkInk },
      ],
    },
  };
}

/** The shop's flash sale (the `flash_sale` element: its products at was and now prices, a live countdown, the stock left; none while none is on). */
export function kitDeal(ctx: SectionContext, l: KitLook, word: SectionWord, look: "banner" | "carousel" = "carousel"): StudioNode {
  const t = sigTexts(ctx, { text: word });
  return {
    id: idOf(ctx)(),
    type: "flash_sale",
    name: ctx.w(word),
    text: t.text,
    translations: t.translations,
    flash_sale: { look, limit: 6, countdown: true, stock_bar: true, accent: l.k.fill },
    radius: l.radius + 6,
    margin: sides(22, 16, 4, 16),
  };
}

/**
 * Shop the look: a room photo with a spot on each product (a numbered dot
 * and its name on a label), each opening the product (the demo's own, else
 * the shop's best sellers), the products under it in a list. `spots` are
 * places on the photo in percent, in the order of `ctx.entries`.
 */
export function kitShopTheLook(ctx: SectionContext, l: KitLook, o: { photo: string; spots: readonly { x: number; y: number; label: SectionWord }[]; title: SectionWord; line?: SectionWord; name: SectionWord; height?: number }): StudioNode[] {
  const id = idOf(ctx);
  const ids = (ctx.entries ?? []).slice(0, o.spots.length).map((e) => e.id);
  const spot = ({ x, y, label }: { x: number; y: number; label: SectionWord }, i: number): StudioNode => {
    const entry = ctx.entries?.[i];
    return {
      id: id(),
      type: "row",
      name: ctx.w(label),
      height: 30,
      radius: 15,
      gap: 6,
      cross: "center",
      padding: sides(0, 10, 0, 4),
      background: "#FFFFFF",
      dark_background: "#FFFFFF",
      shadow: "medium",
      place: { x, y },
      motion: { loop: "pulse" },
      action: entry ? { type: "item", item: { source: "products", id: entry.id } } : shop,
      children: [
        { id: id(), type: "row", width: 22, height: 22, radius: 11, align: "center", cross: "center", background: l.k.fill, dark_background: l.k.fill, children: [{ id: id(), type: "text", text: String(i + 1), font: { size: 11.5, weight: 800 }, color: l.k.onFill, dark_color: l.k.onFill }] },
        { id: id(), type: "text", text: ctx.w(label), max_lines: 1, font: { size: 12, weight: 700 }, color: "#1A1A1A", dark_color: "#1A1A1A" },
      ],
    };
  };
  return [
    kitHead(ctx, l, o.title, { word: "skMoreLooks", action: shop }, o.line),
    {
      id: id(),
      type: "column",
      name: ctx.w(o.title),
      gap: 12,
      radius: l.radius + 8,
      padding: sides(10, 10, 14, 10),
      margin: sides(0, 16, 0, 16),
      background: l.k.surface,
      dark_background: l.k.darkSurface,
      border_color: l.k.line,
      dark_border_color: l.k.darkLine,
      border_width: 1,
      children: [
        {
          id: id(),
          type: "stack",
          height: o.height ?? 230,
          radius: l.radius + 2,
          background: l.tint.day,
          dark_background: l.tint.night,
          ...(kitPhoto(ctx, l, o.photo) ? { image_background_url: kitPhoto(ctx, l, o.photo)! } : {}),
          children: o.spots.map(spot),
        },
        { ...say(ctx, l, o.name, face(l, 17), { max_lines: 2 }), padding: sides(0, 4, 0, 4) },
        {
          id: id(),
          type: "items",
          name: ctx.w("skLookPieces"),
          source: "products",
          layout: "carousel",
          gap: 10,
          query: { limit: o.spots.length, category_id: null, featured: ids.length === 0, sort: "popular", ids },
          card: {
            id: id(),
            type: "column",
            width: 104,
            gap: 4,
            children: [
              { id: id(), type: "image", bind: "image", width: 104, height: 80, radius: 12, fit: "cover", background: l.tint.day, dark_background: l.tint.night },
              { id: id(), type: "text", bind: "title", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { size: 12.5, weight: 600 } },
              { id: id(), type: "text", bind: "price", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { size: 12.5, weight: 800 } },
            ],
          },
        },
        {
          id: id(),
          type: "button",
          name: ctx.w("skShopLook"),
          text: ctx.w("skShopLook"),
          icon: "shopping_bag",
          width: "fill",
          height: 46,
          radius: 23,
          background: l.k.fill,
          dark_background: l.k.darkFill,
          color: l.k.onFill,
          dark_color: l.k.darkOnFill,
          font: { size: 14, weight: 700 },
          motion: { press: "shrink" },
          action: shop,
        },
      ],
    },
  ];
}

/**
 * Photo tiles (shop by room, by style, collections): two by two, the first
 * taller when `lead`. Each tile is named like the shop's category it stands
 * for, so it opens that category (lib/studio/shop-categories.ts).
 */
export function kitTiles(ctx: SectionContext, l: KitLook, tiles: readonly { photo: string; title: SectionWord; line?: SectionWord }[], lead = false): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "grid",
    name: ctx.w(tiles[0]!.title),
    columns: 2,
    gap: 10,
    padding: sides(0, 16, 0, 16),
    children: tiles.map((t, i) => ({
      id: id(),
      type: "photo_hero" as const,
      name: ctx.w(t.title),
      image_url: kitPhoto(ctx, l, t.photo),
      height: lead && i === 0 ? 200 : 150,
      radius: l.radius + 2,
      background: l.k.darkPage,
      scrim: { color: "#000000", from: 0, middle: 0.1, at: 50, to: 0.68 },
      align: "end" as const,
      padding: sides(12, 12, 12, 12),
      action: shop,
      children: [
        say(ctx, l, t.title, face(l, 16), { ...white, max_lines: 2 }),
        ...(t.line ? [say(ctx, l, t.line, { size: 11.5 }, { ...white, opacity: 0.88, max_lines: 1 })] : []),
      ],
    })),
  };
}

/** A row of chips that slides (shop by style, by yarn): each named like a category of the shop. */
export function kitChips(ctx: SectionContext, l: KitLook, name: SectionWord, chips: readonly { word: SectionWord; icon: string }[]): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(name),
    gap: 8,
    scroll: true,
    padding: sides(0, 16, 4, 16),
    children: chips.map((c, i) => ({
      id: id(),
      type: "row" as const,
      name: ctx.w(c.word),
      height: 40,
      radius: 20,
      gap: 6,
      cross: "center" as const,
      padding: sides(0, 14, 0, 12),
      action: shop,
      ...(i === 0 ? { background: l.k.fill, dark_background: l.k.darkFill } : { background: l.k.surface, dark_background: l.k.darkSurface, border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1 }),
      children: [
        { id: id(), type: "icon" as const, icon: c.icon, icon_size: 18, color: i === 0 ? l.k.onFill : l.k.ink, dark_color: i === 0 ? l.k.darkOnFill : l.k.darkInk },
        { id: id(), type: "text" as const, text: ctx.w(c.word), max_lines: 1, font: { size: 13, weight: 700 }, color: i === 0 ? l.k.onFill : l.k.ink, dark_color: i === 0 ? l.k.darkOnFill : l.k.darkInk },
      ],
    })),
  };
}

/** The shop's promises side by side (delivery, assembly, warranty, returns), each an icon over two short lines; an optional tag under one (installments coming soon). */
export function kitPromises(ctx: SectionContext, l: KitLook, items: readonly { icon: string; title: SectionWord; line: SectionWord; tag?: SectionWord }[], margin = sides(18, 16, 4, 16)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("skPromises"),
    gap: 8,
    radius: l.radius + 4,
    padding: sides(14, 10, 14, 10),
    margin,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    children: items.map((it) => ({
      id: id(),
      type: "column" as const,
      name: ctx.w(it.title),
      width: "fill" as const,
      gap: 4,
      cross: "center" as const,
      children: [
        { id: id(), type: "icon" as const, icon: it.icon, icon_size: 24, color: l.k.accent, dark_color: l.k.darkAccent },
        say(ctx, l, it.title, { size: 12.5, weight: 700 }, { text_align: "center", max_lines: 2 }),
        say(ctx, l, it.line, { size: 11 }, { muted: true, text_align: "center", max_lines: 2 }),
        ...(it.tag
          ? [
              {
                id: id(),
                type: "row" as const,
                name: ctx.w(it.tag),
                gap: 4,
                cross: "center" as const,
                radius: 12,
                padding: sides(3, 8, 3, 8),
                margin: sides(2, 0, 0, 0),
                background: l.tint.day,
                dark_background: l.tint.night,
                children: [{ id: id(), type: "icon" as const, icon: "schedule", icon_size: 13, color: l.k.ink, dark_color: l.k.darkInk }, say(ctx, l, it.tag, { size: 10.5, weight: 700 }, { max_lines: 1 })],
              },
            ]
          : []),
      ],
    })),
  };
}

/**
 * The custom-order card: what can be made to measure (a few options, each
 * an icon over its name and line), how long it takes, and a button that
 * opens the custom-order request (its own page in the look, else the shop).
 */
export function kitCustomCard(ctx: SectionContext, l: KitLook, o: { title: SectionWord; text: SectionWord; options: readonly { icon: string; title: SectionWord; line: SectionWord }[]; time: SectionWord; button: SectionWord; photo?: string }): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w(o.title),
    gap: 14,
    radius: l.radius + 8,
    padding: sides(18, 16, 18, 16),
    margin: sides(22, 16, 4, 16),
    background: l.tint.day,
    dark_background: l.tint.night,
    children: [
      {
        id: id(),
        type: "row",
        gap: 12,
        cross: "start",
        children: [
          { id: id(), type: "column", width: "fill", gap: 6, children: [say(ctx, l, o.title, face(l, 19), { max_lines: 2 }), say(ctx, l, o.text, { size: 13, line_height: 1.45 }, { muted: true, max_lines: 3 })] },
          ...(o.photo && kitPhoto(ctx, l, o.photo) ? [{ id: id(), type: "image" as const, image_url: kitPhoto(ctx, l, o.photo)!, width: 72, height: 72, radius: 18, fit: "cover" as const }] : []),
        ],
      },
      {
        id: id(),
        type: "row",
        gap: 8,
        children: o.options.map((op) => ({
          id: id(),
          type: "column" as const,
          name: ctx.w(op.title),
          width: "fill" as const,
          gap: 4,
          cross: "center" as const,
          radius: 16,
          padding: sides(12, 6, 12, 6),
          background: l.k.surface,
          dark_background: l.k.darkSurface,
          children: [
            { id: id(), type: "icon" as const, icon: op.icon, icon_size: 22, color: l.k.accent, dark_color: l.k.darkAccent },
            say(ctx, l, op.title, { size: 12.5, weight: 700 }, { text_align: "center", max_lines: 1 }),
            say(ctx, l, op.line, { size: 10.5 }, { muted: true, text_align: "center", max_lines: 1 }),
          ],
        })),
      },
      {
        id: id(),
        type: "row",
        gap: 10,
        cross: "center",
        children: [
          {
            id: id(),
            type: "button",
            name: ctx.w(o.button),
            text: ctx.w(o.button),
            icon: "arrow_forward",
            icon_position: "end",
            width: "hug",
            height: 44,
            radius: 22,
            padding: sides(0, 18, 0, 18),
            background: l.k.fill,
            dark_background: l.k.darkFill,
            color: l.k.onFill,
            dark_color: l.k.darkOnFill,
            font: { size: 13.5, weight: 700 },
            motion: { press: "shrink" },
            action: ownPage(ctx, KIT_CUSTOM_PAGE),
          },
          { id: id(), type: "row", width: "fill", gap: 5, cross: "center", align: "end", children: [{ id: id(), type: "icon", icon: "schedule", icon_size: 16, color: l.k.muted, dark_color: l.k.darkMuted }, say(ctx, l, o.time, { size: 12 }, { muted: true, max_lines: 1 })] },
        ],
      },
    ],
  };
}

/** The custom-order request: the `form` element as a custom-order request (kept as the shop's request; emailed too). */
export function kitCustomForm(ctx: SectionContext, l: KitLook, o: { fields: readonly { kind: FormField["kind"]; label: SectionWord; required?: boolean; options?: readonly SectionWord[] }[]; submit: SectionWord; success: SectionWord }): StudioNode {
  const t = sigTexts(ctx, { submit: o.submit, success: o.success });
  const fields: FormField[] = o.fields.map((f, i) => {
    const words = sigTexts(ctx, { label: f.label });
    return {
      id: `f${i + 1}`,
      kind: f.kind,
      label: words.label,
      required: Boolean(f.required),
      options: f.options ? f.options.map((w) => ctx.w(w)) : null,
      translations: Object.fromEntries(
        Object.entries(words.translations).map(([lang, tr]) => [lang, { ...(tr as Record<string, string>), ...(f.options ? { options: f.options.map((w) => sigTexts(ctx, { o: w }).translations[lang]?.o ?? ctx.w(w)).join("\n") } : {}) }]),
      ),
    } as FormField;
  });
  return {
    id: idOf(ctx)(),
    type: "form",
    name: ctx.w("skCustomForm"),
    form: { fields, submit_label: t.submit, success_text: t.success, send_to: "email", request: "custom_order" },
    translations: Object.fromEntries(Object.entries(t.translations).map(([lang, tr]) => [lang, { submit_label: (tr as Record<string, string>).submit ?? "", success_text: (tr as Record<string, string>).success ?? "" }])),
    color: l.k.ink,
    dark_color: l.k.darkInk,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    radius: l.radius + 6,
    padding: sides(16, 16, 16, 16),
    margin: sides(10, 16, 4, 16),
  };
}

/** The delivery and assembly booking: the shop's next days and times (`delivery_slots`), kept for the checkout. */
export function kitDeliverySlots(ctx: SectionContext, l: KitLook, o: { title: SectionWord; text: SectionWord; assembly?: boolean; dark?: boolean }): StudioNode {
  const id = idOf(ctx);
  const dark = Boolean(o.dark);
  const ink = dark ? { ...white } : { color: l.k.ink, dark_color: l.k.darkInk };
  return {
    id: id(),
    type: "column",
    name: ctx.w(o.title),
    gap: 12,
    radius: l.radius + 8,
    padding: sides(18, 16, 18, 16),
    margin: sides(22, 16, 4, 16),
    ...(dark ? { background: l.k.ink, dark_background: l.k.darkSurface } : { background: l.k.surface, dark_background: l.k.darkSurface, border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1 }),
    children: [
      {
        id: id(),
        type: "row",
        gap: 12,
        cross: "start",
        children: [
          { id: id(), type: "column", width: "fill", gap: 4, children: [{ ...say(ctx, l, o.title, face(l, 18), { max_lines: 2 }), ...ink }, { ...say(ctx, l, o.text, { size: 12.5, line_height: 1.45 }, { max_lines: 3, opacity: 0.8 }), ...ink }] },
          { id: id(), type: "icon", icon: o.assembly ? "event_available" : "local_shipping", icon_size: 24, ...ink },
        ],
      },
      {
        id: id(),
        type: "delivery_slots",
        name: ctx.w("skSlots"),
        delivery_slots: { days: 5, assembly: Boolean(o.assembly) },
        // Its ink on the card, the chosen day and time in the accent.
        ...(dark ? { color: "#FFFFFF", dark_color: l.k.darkInk, border_color: l.k.accent, dark_border_color: l.k.darkAccent } : { color: l.k.ink, dark_color: l.k.darkInk, border_color: l.k.fill, dark_border_color: l.k.darkFill }),
      },
    ],
  };
}

/** The maker's story: a photo, the quote, who says it, and the shop's numbers in a row. */
export function kitStory(ctx: SectionContext, l: KitLook, o: { photo: string; kicker?: SectionWord; quote: SectionWord; name: SectionWord; role: SectionWord; stats: readonly { value: SectionWord; label: SectionWord }[] }): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w(o.name),
    gap: 0,
    radius: l.radius + 8,
    margin: sides(0, 16, 4, 16),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    children: [
      ...(kitPhoto(ctx, l, o.photo) ? [{ id: id(), type: "image" as const, image_url: kitPhoto(ctx, l, o.photo)!, height: 190, fit: "cover" as const }] : []),
      {
        id: id(),
        type: "column",
        gap: 10,
        padding: sides(16, 16, 16, 16),
        children: [
          ...(o.kicker ? [say(ctx, l, o.kicker, { size: 11.5, weight: 700 }, { accent: true, max_lines: 1 })] : []),
          { id: id(), type: "icon", icon: "format_quote", icon_size: 28, color: l.k.accent, dark_color: l.k.darkAccent },
          say(ctx, l, o.quote, face(l, 15.5, { weight: 500, line_height: 1.6 }), { max_lines: 5 }),
          { id: id(), type: "column", gap: 2, children: [say(ctx, l, o.name, { size: 13.5, weight: 700 }, { max_lines: 1 }), say(ctx, l, o.role, { size: 12 }, { muted: true, max_lines: 1 })] },
          {
            id: id(),
            type: "row",
            gap: 8,
            margin: sides(4, 0, 0, 0),
            children: o.stats.map((s) => ({
              id: id(),
              type: "column" as const,
              width: "fill" as const,
              gap: 2,
              cross: "center" as const,
              radius: 14,
              padding: sides(10, 4, 10, 4),
              background: l.tint.day,
              dark_background: l.tint.night,
              children: [say(ctx, l, s.value, face(l, 18), { accent: true, max_lines: 1 }), say(ctx, l, s.label, { size: 11 }, { muted: true, text_align: "center", max_lines: 1 })],
            })),
          },
        ],
      },
    ],
  };
}

/** A wide banner: a photo with a shade, a kicker, a title and its line, opening the shop (gifts, seasons, a collection). */
export function kitBanner(ctx: SectionContext, l: KitLook, o: { photo: string; kicker?: SectionWord; title: SectionWord; line?: SectionWord; button?: SectionWord; height?: number }): StudioNode {
  const card = kitHeroCard(ctx, l, { photo: o.photo, kicker: o.kicker ?? o.title, title: o.title, ...(o.line ? { line: o.line } : {}) }, o.button ?? "skShopNow", o.height ?? 170);
  return { ...card, margin: sides(18, 16, 4, 16), children: o.kicker ? card.children : card.children!.slice(1) };
}

/** The seasons' banners (Ramadan, the new year…) as a carousel of wide cards. */
export function kitSeasons(ctx: SectionContext, l: KitLook, cards: readonly { photo: string; kicker: SectionWord; title: SectionWord }[]): StudioNode {
  return { ...kitHero(ctx, l, cards, "skShopNow", 170), name: ctx.w("skSeasons") };
}

/** Gifts: wrapped by hand with a card in the customer's words (the shop's card message at checkout). */
export function kitGift(ctx: SectionContext, l: KitLook, o: { title: SectionWord; line: SectionWord; photo?: string }): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(o.title),
    gap: 12,
    cross: "center",
    radius: l.radius + 4,
    padding: sides(14, 14, 14, 14),
    margin: sides(18, 16, 4, 16),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.accent,
    dark_border_color: l.k.darkAccent,
    border_width: 1,
    action: shop,
    children: [
      ...(o.photo && kitPhoto(ctx, l, o.photo) ? [{ id: id(), type: "image" as const, image_url: kitPhoto(ctx, l, o.photo)!, width: 64, height: 64, radius: 14, fit: "cover" as const }] : []),
      { id: id(), type: "column", width: "fill", gap: 3, children: [say(ctx, l, o.title, { size: 15, weight: 700 }, { max_lines: 2 }), say(ctx, l, o.line, { size: 12 }, { muted: true, max_lines: 2 })] },
      { id: id(), type: "icon", icon: "redeem", icon_size: 28, color: l.k.accent, dark_color: l.k.darkAccent },
    ],
  };
}

/** The workshops: the app's courses (the academy's courses system), as cards with their price. */
export function kitCourses(ctx: SectionContext, l: KitLook, word: SectionWord): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w(word),
    source: "courses",
    layout: "carousel",
    gap: 12,
    padding: sides(0, 16, 0, 16),
    query: { limit: 6, category_id: null, featured: false, sort: "newest", ids: [] },
    card: {
      id: id(),
      type: "column",
      width: 250,
      gap: 0,
      radius: l.radius + 4,
      background: l.k.surface,
      dark_background: l.k.darkSurface,
      border_color: l.k.line,
      dark_border_color: l.k.darkLine,
      border_width: 1,
        children: [
        { id: id(), type: "image", bind: "image", width: 250, height: 130, fit: "cover", background: l.tint.day, dark_background: l.tint.night },
        {
          id: id(),
          type: "column",
          gap: 4,
          padding: sides(12, 12, 12, 12),
          children: [
            { id: id(), type: "text", bind: "title", max_lines: 2, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 14.5, weight: 700 } },
            { id: id(), type: "text", bind: "subtitle", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 12 } },
            { id: id(), type: "text", bind: "price", max_lines: 1, color: l.k.accent, dark_color: l.k.darkAccent, font: { family: l.family, size: 14, weight: 800 } },
          ],
        },
      ],
    },
  };
}

/** What customers say: the shop's quotes (the owner's to change) with their stars. */
export function kitReviews(ctx: SectionContext, l: KitLook, entries: readonly { quote: SectionWord; name: SectionWord; place: SectionWord }[]): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "testimonials",
    name: ctx.w("skReviews"),
    testimonials: { style: "carousel" },
    color: l.k.ink,
    dark_color: l.k.darkInk,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    radius: l.radius + 6,
    padding: sides(0, 16, 0, 16),
    entries: entries.map((e) => sigEntry(ctx, { text: e.quote, title: e.name, subtitle: e.place }, { value: 5 })),
  };
}

/** What this person opened lately. */
export function kitRecent(ctx: SectionContext, l: KitLook): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w("skRecent"), source: "products", layout: "carousel", recent: true, gap: 10, padding: sides(0, 16, 0, 16), query: { limit: 10, category_id: null, featured: false, sort: "newest", ids: [] }, card: kitCard(ctx, l, 118, 130) };
}

/** The home's header: the wordmark (and a line under it), the menu (the category menu), the bell and the bag. */
export function kitHomeHeader(ctx: SectionContext, l: KitLook, wordmark: SectionWord, line?: SectionWord): StudioPage["header"] {
  const t = line ? sigTexts(ctx, { title: wordmark, subtitle: line }) : sigTexts(ctx, { title: wordmark });
  return { type: "logo_actions", ...t, buttons: ["menu", "notifications", "cart"], menu_page: KIT_MENU_PAGE, background: l.k.page, dark_background: l.k.darkPage, color: l.k.ink, dark_color: l.k.darkInk };
}

/**
 * The category menu (the header's menu opens it): the search, quick ways in,
 * every main category a row of cards (its "All" card, then its
 * sub-categories), then the account, orders, language and contact.
 */
export function kitMenuPage(ctx: SectionContext, l: KitLook, o: { wordmark: SectionWord; search: SectionWord; quick: readonly { word: SectionWord; icon: string; action?: Action }[]; contactLine: SectionWord; menuLook?: "lead" | "label" }): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: o.wordmark });
  const quick = (word: SectionWord, icon: string, lit: boolean, action: Action): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(word),
    height: 42,
    radius: 21,
    gap: 7,
    cross: "center",
    padding: sides(0, 16, 0, 14),
    action,
    ...(lit ? { background: l.k.fill, dark_background: l.k.darkFill } : { background: l.k.surface, dark_background: l.k.darkSurface, border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1 }),
    children: [
      { id: id(), type: "icon", icon, icon_size: 18, color: lit ? l.k.onFill : l.k.ink, dark_color: lit ? l.k.darkOnFill : l.k.darkInk },
      { id: id(), type: "text", text: ctx.w(word), max_lines: 1, font: { size: 13.5, weight: 700 }, color: lit ? l.k.onFill : l.k.ink, dark_color: lit ? l.k.darkOnFill : l.k.darkInk },
    ],
  });
  const tile = (word: SectionWord, icon: string, action: Action): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    gap: 6,
    cross: "center",
    radius: 18,
    padding: sides(14, 6, 12, 6),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    action,
    children: [
      { id: id(), type: "icon", icon, icon_size: 22, color: l.k.ink, dark_color: l.k.darkInk },
      { id: id(), type: "text", text: ctx.w(word), max_lines: 1, text_align: "center", font: { size: 12.5, weight: 600 }, color: l.k.ink, dark_color: l.k.darkInk },
    ],
  });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...signatureHeader(l.k, "glass") },
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        kitSearch(ctx, l, o.search, sides(6, 16, 4, 16)),
        { id: id(), type: "row", name: ctx.w("skQuick"), gap: 8, scroll: true, padding: sides(8, 16, 8, 16), children: o.quick.map((q, i) => quick(q.word, q.icon, i === 0, q.action ?? shop)) },
        {
          id: id(),
          type: "categories",
          name: ctx.w("skCategoryMenu"),
          source: "products",
          style: "rows",
          category_menu: { look: o.menuLook ?? (l.look === "a" ? "lead" : "label"), radius: l.radius + 2 },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          padding: sides(6, 0, 6, 0),
        },
        { id: id(), type: "divider", height: 1, background: l.k.line, dark_background: l.k.darkLine, margin: sides(14, 16, 14, 16) },
        { id: id(), type: "row", name: ctx.w("skMenuAccount"), gap: 8, padding: sides(0, 16, 0, 16), children: [tile("skAccount", "person", screen("account")), tile("skOrders", "package_2", screen("orders")), tile("skLanguage", "language", screen("settings"))] },
        {
          id: id(),
          type: "row",
          name: ctx.w("skContact"),
          gap: 12,
          cross: "center",
          radius: 20,
          padding: sides(14, 16, 14, 16),
          margin: sides(10, 16, 0, 16),
          background: l.tint.day,
          dark_background: l.tint.night,
          action: screen("account"),
          children: [
            { id: id(), type: "icon", icon: "support_agent", icon_size: 22, color: l.k.ink, dark_color: l.k.darkInk },
            { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, l, "skContact", { size: 14, weight: 700 }), say(ctx, l, o.contactLine, { size: 12 }, { muted: true, max_lines: 2 })] },
            { id: id(), type: "icon", icon: "chat", icon_size: 20, color: l.k.ink, dark_color: l.k.darkInk },
          ],
        },
      ],
    },
  };
}

/** The custom-order page: what to expect, the steps, then the request form. */
export function kitCustomPage(ctx: SectionContext, l: KitLook, o: { title: SectionWord; intro: SectionWord; steps: readonly { title: SectionWord; text: SectionWord }[]; form: Parameters<typeof kitCustomForm>[2] }): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: o.title });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...signatureHeader(l.k, "glass") },
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { ...say(ctx, l, o.intro, { size: 14, line_height: 1.55 }, { muted: true }), padding: sides(8, 16, 4, 16) },
        {
          id: id(),
          type: "timeline",
          name: ctx.w("skCustomSteps"),
          timeline: { style: "vertical" },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          background: l.k.surface,
          dark_background: l.k.darkSurface,
          radius: l.radius + 6,
          padding: sides(14, 14, 14, 14),
          margin: sides(12, 16, 4, 16),
          entries: o.steps.map((s, i): StudioEntry => sigEntry(ctx, { title: s.title, text: s.text }, i === 0 ? { highlight: true } : {})),
        },
        kitHead(ctx, l, "skCustomForm", null),
        kitCustomForm(ctx, l, o.form),
      ],
    },
  };
}

/** Over the shop: its categories as chips, and a banner. */
export function kitShopTop(ctx: SectionContext, l: KitLook, banner: { photo: string; kicker: SectionWord; title: SectionWord }): StudioNode[] {
  return [{ id: idOf(ctx)(), type: "categories", name: ctx.w("skCategories"), source: "products", padding: sides(4, 12, 4, 12) }, { ...kitHeroCard(ctx, l, banner, "skShopNow", 150), margin: sides(6, 16, 6, 16) }];
}

/** Over the cart: the shop's code and a note (gift wrap, assembly, delivery). */
export function kitCartTop(ctx: SectionContext, l: KitLook, code: string, note: { icon: string; word: SectionWord }): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "coupon", name: ctx.w("skCoupon"), code, coupon: { look: l.look === "a" ? "ticket" : "glass", bind: "public" }, radius: 18, color: l.k.fill, margin: sides(10, 16, 4, 16) },
    {
      id: id(),
      type: "row",
      name: ctx.w(note.word),
      gap: 12,
      cross: "center",
      radius: 18,
      padding: sides(12, 14, 12, 14),
      margin: sides(8, 16, 4, 16),
      background: l.tint.day,
      dark_background: l.tint.night,
      children: [{ id: id(), type: "icon", icon: note.icon, icon_size: 22, color: l.k.ink, dark_color: l.k.darkInk }, say(ctx, l, note.word, { size: 13, weight: 600, line_height: 1.4 }, { width: "fill", max_lines: 3 })],
    },
  ];
}

/** Over the orders: how an order travels (the person's newest order, else the first step lit). */
export function kitOrdersTop(ctx: SectionContext, l: KitLook, steps: readonly { title: SectionWord; text: SectionWord }[]): StudioNode[] {
  return [
    kitHead(ctx, l, "skTrack", null, undefined, undefined, sides(10, 16, 6, 16)),
    {
      id: idOf(ctx)(),
      type: "timeline",
      name: ctx.w("skTrack"),
      timeline: { style: "vertical", source: "latest_order" },
      color: l.k.ink,
      dark_color: l.k.darkInk,
      background: l.k.surface,
      dark_background: l.k.darkSurface,
      radius: 22,
      padding: sides(16, 14, 16, 14),
      margin: sides(0, 16, 6, 16),
      border_color: l.k.line,
      dark_border_color: l.k.darkLine,
      border_width: 1,
      entries: steps.map((s, i) => sigEntry(ctx, { title: s.title, text: s.text }, i === 0 ? { highlight: true } : {})),
    },
  ];
}

/** The five tabs of the floating bar: Home, Shop, Cart, Orders, Account (as Lujain's). */
export const kitTabs = (tabs: readonly LayoutTab[]): LayoutTab[] => clothesTabs(tabs);

// ——— The kit's parts as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;
const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};

/** The look the ready sections are drawn in: Sakan's (home decor's look A). */
const SECTION_LOOK: KitLook = {
  k: { page: "#F4F1EA", darkPage: "#141613", surface: "#FFFFFF", darkSurface: "#1E211D", ink: "#1F241C", darkInk: "#EEF0E8", muted: "#62675C", darkMuted: "#AEB4A6", line: "#E3DFD4", darkLine: "#30342D", accent: "#4F5D2F", darkAccent: "#B9C98F", fill: "#4F5D2F", darkFill: "#9DB06A", onFill: "#FFFFFF", darkOnFill: "#141613" },
  tint: { day: "#ECE8DD", night: "#252922" },
  family: "IBM Plex Sans Arabic",
  look: "a",
  dir: "decor-photos",
  radius: 18,
  heavy: 700,
};

export const SHOP_KIT_SECTIONS: readonly SectionInfo[] = [
  // Shop the look: a room photo with a labelled spot on each product, each opening it.
  {
    id: "sk_shop_look",
    icon: "touch_app",
    isNew: true,
    fits: STORE_PLAIN,
    make: one((ctx) =>
      kitShopTheLook(ctx, SECTION_LOOK, {
        photo: "room-dining",
        title: "skLookTitle",
        line: "skLookLine",
        name: "skLookName",
        spots: [
          { x: 22, y: 30, label: "skLookSpot1" },
          { x: 58, y: 50, label: "skLookSpot2" },
          { x: 34, y: 72, label: "skLookSpot3" },
        ],
      }),
    ),
  },
  // Shop by room (or style): photo tiles named like the shop's categories.
  { id: "sk_rooms", icon: "chair", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [kitHead(ctx, SECTION_LOOK, "skRooms", { word: "skSeeAll", action: shop }, "skRoomsLine"), kitTiles(ctx, SECTION_LOOK, [{ photo: "room-living", title: "skRoomLiving" }, { photo: "room-bed", title: "skRoomBedroom" }, { photo: "room-dining", title: "skRoomDining" }, { photo: "room-reading", title: "skRoomReading" }])]) },
  // The custom-order card, opening the shop's request page (on its own, the shop).
  { id: "sk_custom_card", icon: "edit_note", isNew: true, fits: STORE_PLAIN, make: one((ctx) => kitCustomCard({ ...ctx, ownPages: false }, SECTION_LOOK, { title: "skCustomTitle", text: "skCustomText", options: [{ icon: "straighten", title: "skCustomSize", line: "skCustomSizeLine" }, { icon: "palette", title: "skCustomColour", line: "skCustomColourLine" }, { icon: "edit_note", title: "skCustomNotes", line: "skCustomNotesLine" }], time: "skCustomTime", button: "skCustomButton" })) },
  // The custom-order request form (kept as the shop's request in the dashboard and Yallapp Business).
  { id: "sk_custom_form", icon: "assignment", isNew: true, fits: STORE_PLAIN, make: one((ctx) => kitCustomForm(ctx, SECTION_LOOK, { fields: KIT_CUSTOM_FIELDS, submit: "skCustomSend", success: "skCustomSent" })) },
  // The delivery and assembly booking: the shop's next days and times, kept for the checkout.
  { id: "sk_delivery_slots", icon: "event_available", isNew: true, fits: STORE_PLAIN, make: one((ctx) => kitDeliverySlots(ctx, SECTION_LOOK, { title: "skSlotsTitle", text: "skSlotsText", assembly: true, dark: true })) },
  // The shop's promises side by side, one with "Installments coming soon".
  { id: "sk_promises", icon: "verified", isNew: true, fits: STORE_PLAIN, make: one((ctx) => kitPromises(ctx, SECTION_LOOK, [{ icon: "local_shipping", title: "skPromiseDelivery", line: "skPromiseDeliveryLine" }, { icon: "verified_user", title: "skPromiseWarranty", line: "skPromiseWarrantyLine" }, { icon: "event_available", title: "skPromiseDate", line: "skPromiseDateLine", tag: "installmentsSoon" }])) },
  // The maker's story.
  { id: "sk_story", icon: "format_quote", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [kitHead(ctx, SECTION_LOOK, "skStoryTitle", null, "skStoryLine"), kitStory(ctx, SECTION_LOOK, { photo: "pottery-shelf", quote: "skStoryQuote", name: "skStoryName", role: "skStoryRole", stats: [{ value: "skStat1", label: "skStat1Label" }, { value: "skStat2", label: "skStat2Label" }, { value: "skStat3", label: "skStat3Label" }] })]) },
  // Gifts with wrapping and a card.
  { id: "sk_gift", icon: "redeem", isNew: true, fits: STORE_PLAIN, make: one((ctx) => kitGift(ctx, SECTION_LOOK, { title: "skGiftTitle", line: "skGiftLine", photo: "table-setting" })) },
  // The seasons' banners.
  { id: "sk_seasons", icon: "celebration", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [kitHead(ctx, SECTION_LOOK, "skSeasons", null), kitSeasons(ctx, SECTION_LOOK, [{ photo: "brass-lantern", kicker: "skSeasonKicker1", title: "skSeasonTitle1" }, { photo: "hero-autumn", kicker: "skSeasonKicker2", title: "skSeasonTitle2" }])]) },
  // The workshops: the app's courses.
  { id: "sk_courses", icon: "school", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [kitHead(ctx, SECTION_LOOK, "skCourses", { word: "skSeeAll", action: screen("courses") }, "skCoursesLine"), kitCourses(ctx, SECTION_LOOK, "skCourses")]) },
];

/** The custom-order request's fields (the owner's to change): the piece, its size, its colour, the details, the name and phone. */
export const KIT_CUSTOM_FIELDS: Parameters<typeof kitCustomForm>[2]["fields"] = [
  { kind: "text", label: "skFieldPiece", required: true },
  { kind: "text", label: "skFieldSize" },
  { kind: "text", label: "skFieldColour" },
  { kind: "long_text", label: "skFieldDetails", required: true },
  { kind: "text", label: "skFieldName", required: true },
  { kind: "phone", label: "skFieldPhone", required: true },
];
