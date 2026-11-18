import type { App, BouquetPart, BouquetSettings } from "../data/types";
import { cleanMessage, GIFT_LIMITS } from "./gifts";

/**
 * 162 Build your bouquet, for every store app on the hosted API (its own
 * products or a connected platform's): the customer chooses the flowers
 * from the category the owner set, by the stem and with quantities, then a
 * wrap (one of the gift add-ons the owner chose as wraps, or a product of a
 * wraps category), then the card (one of the add-ons chosen as cards, or
 * only its message) and its words. The three go in the cart as one bouquet:
 * each of its lines carries the same `bouquet` (`id`, its `part`, and the
 * card's `message` on one of them), kept on the order's lines, so the
 * order, the dashboard and Yallapp Business show it as one bouquet. The
 * server prices every line as any other; nothing here changes a price.
 *
 * Without settings the builder is off and Leqaa's Start opens the shop, as
 * before. Everything is checked here, bounded, whatever the app sends.
 */

export const BOUQUET_LIMITS = { stems: 99, wraps: 24, cards: 12, flowers: 60, id: 40, message: GIFT_LIMITS.message } as const;

export const BOUQUET_PARTS = ["flower", "wrap", "card"] as const;

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/** The settings' messages, in the dashboard's words (translated as known texts). */
export const BOUQUET_FORM_ERRORS = {
  flowers: "Choose the category of your flowers.",
  wraps: "Choose at least one wrap.",
  wrapsCategory: "Choose the category of your wraps.",
  sameCategory: "Choose a category for the wraps other than the flowers' one.",
  stems: "Enter a number of stems from 1 to 99, or leave it empty.",
  order: "The most stems can't be fewer than the least.",
} as const;

/** What the cart says about a bouquet that can't be bought as it is (the app keeps to the rules, so only an old cart sees these). */
export const BOUQUET_PROBLEMS = {
  noFlowers: "A bouquet needs its flowers.",
  notFlower: "This flower isn't in the bouquet's flowers any more.",
  fewStems: "This bouquet needs more stems.",
  manyStems: "This bouquet has too many stems.",
  oneWrap: "Choose one wrap for a bouquet.",
  notWrap: "This wrap isn't offered any more.",
  needsWrap: "Choose a wrap for your bouquet.",
  oneCard: "Choose one card for a bouquet.",
  notCard: "This card isn't offered any more.",
  needsCard: "Choose a card for your bouquet.",
} as const;

const ids = (list: readonly (string | number)[] | string | undefined, max: number): number[] => {
  const raw = (Array.isArray(list) ? list.join(",") : String(list ?? "")).split(/[\s,]+/);
  return [...new Set(raw.map((x) => Number(x)).filter((x) => Number.isSafeInteger(x) && x > 0))].slice(0, max);
};

const positive = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

/**
 * The settings from Store › Delivery & offers › Build your bouquet: on or
 * off (`bouquet`), the flowers' category, the wraps (`wrapsFrom` `addons`
 * with the ticked `wrapIds`, or `category` with `wrapsCategoryId`), the
 * ticked `cardIds`, whether the wrap and the card may be left out, and the
 * least and most stems. Off: null.
 */
export function parseBouquetForm(v: Record<string, string>, lists: { wrapIds?: string[]; cardIds?: string[] } = {}): Parsed<BouquetSettings | null> {
  if (v.bouquet !== "on") return { ok: true, value: null };
  const errors: Record<string, string> = {};
  const flowersCategoryId = positive(v.flowersCategoryId);
  if (flowersCategoryId === null) errors.flowersCategoryId = BOUQUET_FORM_ERRORS.flowers;
  const from = v.wrapsFrom === "category" ? "category" : "addons";
  let wraps: BouquetSettings["wraps"] | null = null;
  if (from === "category") {
    const categoryId = positive(v.wrapsCategoryId);
    if (categoryId === null) errors.wrapsCategoryId = BOUQUET_FORM_ERRORS.wrapsCategory;
    else if (categoryId === flowersCategoryId) errors.wrapsCategoryId = BOUQUET_FORM_ERRORS.sameCategory;
    else wraps = { from, categoryId };
  } else {
    const productIds = ids(lists.wrapIds ?? v.wrapIds, BOUQUET_LIMITS.wraps);
    if (productIds.length === 0) errors.wrapIds = BOUQUET_FORM_ERRORS.wraps;
    else wraps = { from, productIds };
  }
  const stems = (key: "minStems" | "maxStems"): number | null => {
    const text = (v[key] ?? "").trim();
    if (text === "") return null;
    const n = Number(text);
    if (!Number.isInteger(n) || n < 1 || n > BOUQUET_LIMITS.stems) {
      errors[key] = BOUQUET_FORM_ERRORS.stems;
      return null;
    }
    return n;
  };
  const minStems = stems("minStems");
  const maxStems = stems("maxStems");
  if (minStems !== null && maxStems !== null && maxStems < minStems) errors.maxStems = BOUQUET_FORM_ERRORS.order;
  // A card can't be a wrap too: the wraps keep it.
  const wrapIds = new Set(wraps?.from === "addons" ? wraps.productIds : []);
  const cardProductIds = ids(lists.cardIds ?? v.cardIds, BOUQUET_LIMITS.cards).filter((id) => !wrapIds.has(id));
  if (Object.keys(errors).length || !wraps || flowersCategoryId === null) return { ok: false, errors };
  return {
    ok: true,
    value: { flowersCategoryId, wraps, cardProductIds, wrapOptional: v.wrapOptional === "on", cardOptional: v.cardOptional === "on", minStems, maxStems },
  };
}

/** The saved settings, checked again (an older or hand-made value): null when off or not whole. */
export function bouquetOf(app: Pick<App, "catalogSettings" | "appType" | "vertical">): BouquetSettings | null {
  if (app.appType !== "store" || app.vertical === "restaurant") return null;
  const s = app.catalogSettings?.bouquet;
  if (!s || typeof s !== "object") return null;
  const flowersCategoryId = positive(s.flowersCategoryId);
  const w = s.wraps as Partial<{ from: string; productIds: number[]; categoryId: number }> | undefined;
  const wraps: BouquetSettings["wraps"] | null =
    w?.from === "category" ? (positive(w.categoryId) ? { from: "category", categoryId: positive(w.categoryId)! } : null) : w?.from === "addons" && ids(w.productIds ?? [], BOUQUET_LIMITS.wraps).length ? { from: "addons", productIds: ids(w.productIds ?? [], BOUQUET_LIMITS.wraps) } : null;
  if (flowersCategoryId === null || !wraps) return null;
  const stems = (n: unknown) => (Number.isInteger(n) && (n as number) >= 1 && (n as number) <= BOUQUET_LIMITS.stems ? (n as number) : null);
  const minStems = stems(s.minStems);
  const maxStems = stems(s.maxStems);
  return {
    flowersCategoryId,
    wraps,
    cardProductIds: ids(s.cardProductIds ?? [], BOUQUET_LIMITS.cards),
    wrapOptional: s.wrapOptional === true,
    cardOptional: s.cardOptional === true,
    minStems,
    maxStems: minStems !== null && maxStems !== null && maxStems < minStems ? null : maxStems,
  };
}

/** `StoreConfig.bouquet`: the builder's rules, the app's Start opening it; null: off (Start opens the shop). */
export function bouquetConfigJson(s: BouquetSettings | null) {
  if (!s) return null;
  return {
    flowers_category_id: s.flowersCategoryId,
    wraps_from: s.wraps.from,
    wrap_optional: s.wrapOptional,
    card_optional: s.cardOptional,
    has_cards: s.cardProductIds.length > 0,
    min_stems: s.minStems ?? 1,
    max_stems: s.maxStems ?? BOUQUET_LIMITS.stems,
    max_message: BOUQUET_LIMITS.message,
  };
}

const ID = /^[A-Za-z0-9_-]{1,40}$/;

/**
 * A cart line's `bouquet` as sent: undefined when it has none, null when
 * it isn't one (the cart is refused), else the part with its message
 * cleaned (at most 500 characters).
 */
export function bouquetPartOf(raw: unknown): BouquetPart | null | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const v = raw as Record<string, unknown>;
  if (typeof v.id !== "string" || !ID.test(v.id) || !(BOUQUET_PARTS as readonly unknown[]).includes(v.part)) return null;
  const message = v.message === undefined || v.message === null ? null : cleanMessage(v.message);
  if (v.message !== undefined && v.message !== null && typeof v.message !== "string") return null;
  return { id: v.id, part: v.part as BouquetPart["part"], ...(message ? { message: [...message].slice(0, BOUQUET_LIMITS.message).join("") } : {}) };
}

/** `bouquet` on a cart's and an order's line, as the app reads it. */
export function bouquetPartJson(b: BouquetPart | null | undefined) {
  return b ? { id: b.id, part: b.part, ...(b.message ? { message: b.message } : {}) } : null;
}

export interface BouquetLine {
  productId: number;
  quantity: number;
  bouquet?: BouquetPart | null;
  /** The product's categories (a flower's must hold the flowers' one). */
  categoryIds: number[];
}

/** Whether a product is one of the bouquet's wraps. */
export function isWrap(s: BouquetSettings, p: { id: number; categoryIds: number[] }): boolean {
  return s.wraps.from === "addons" ? s.wraps.productIds.includes(p.id) : p.categoryIds.includes(s.wraps.categoryId);
}

/** Whether a product is one of the bouquet's cards. */
export function isCard(s: BouquetSettings, p: { id: number }): boolean {
  return s.cardProductIds.includes(p.id);
}

/**
 * 162 A cart's bouquets, checked against the shop's settings: each line's
 * problem, by index (the bouquet's other lines are fine). Lines without a
 * bouquet are left alone; with the builder off, so are a bouquet's (its
 * lines are bought as they are).
 */
export function checkBouquetLines(lines: BouquetLine[], s: BouquetSettings | null): Map<number, string> {
  const problems = new Map<number, string>();
  if (!s) return problems;
  const groups = new Map<string, number[]>();
  lines.forEach((l, i) => {
    if (!l.bouquet) return;
    groups.set(l.bouquet.id, [...(groups.get(l.bouquet.id) ?? []), i]);
  });
  for (const at of groups.values()) {
    const of = (part: BouquetPart["part"]) => at.filter((i) => lines[i]!.bouquet!.part === part);
    const flowers = of("flower");
    const wraps = of("wrap");
    const cards = of("card");
    if (flowers.length === 0) {
      for (const i of at) problems.set(i, BOUQUET_PROBLEMS.noFlowers);
      continue;
    }
    for (const i of flowers) if (!lines[i]!.categoryIds.includes(s.flowersCategoryId)) problems.set(i, BOUQUET_PROBLEMS.notFlower);
    const stems = flowers.reduce((sum, i) => sum + lines[i]!.quantity, 0);
    const first = flowers[0]!;
    if (stems < (s.minStems ?? 1)) problems.set(first, BOUQUET_PROBLEMS.fewStems);
    if (stems > (s.maxStems ?? BOUQUET_LIMITS.stems)) problems.set(first, BOUQUET_PROBLEMS.manyStems);
    for (const i of wraps) {
      const l = lines[i]!;
      if (!isWrap(s, { id: l.productId, categoryIds: l.categoryIds })) problems.set(i, BOUQUET_PROBLEMS.notWrap);
      else if (wraps.length > 1 || l.quantity !== 1) problems.set(i, BOUQUET_PROBLEMS.oneWrap);
    }
    if (wraps.length === 0 && !s.wrapOptional) problems.set(first, BOUQUET_PROBLEMS.needsWrap);
    for (const i of cards) {
      const l = lines[i]!;
      if (!isCard(s, { id: l.productId })) problems.set(i, BOUQUET_PROBLEMS.notCard);
      else if (cards.length > 1 || l.quantity !== 1) problems.set(i, BOUQUET_PROBLEMS.oneCard);
    }
    // A shop with cards to choose: one of them, unless the card may be left out.
    if (cards.length === 0 && s.cardProductIds.length > 0 && !s.cardOptional) problems.set(first, BOUQUET_PROBLEMS.needsCard);
  }
  return problems;
}

/**
 * A line in a bouquet whose product is one of its wraps or cards: offered
 * with the bouquet's flowers, whatever its own "Offer with" says (the owner
 * chose it for the bouquet).
 */
export function bouquetOffers(s: BouquetSettings | null, line: { bouquet?: BouquetPart | null }, product: { id: number; categoryIds: number[] }): boolean {
  if (!s || !line.bouquet || line.bouquet.part === "flower") return false;
  return line.bouquet.part === "wrap" ? isWrap(s, product) : isCard(s, product);
}

/**
 * The bouquets' messages kept once each: the first line of a bouquet that
 * carries one keeps it, the others' are dropped.
 */
export function onceEach<T extends { bouquet?: BouquetPart | null }>(lines: T[]): T[] {
  const said = new Set<string>();
  return lines.map((l) => {
    const b = l.bouquet;
    if (!b?.message) return l;
    if (said.has(b.id)) return { ...l, bouquet: { id: b.id, part: b.part } };
    said.add(b.id);
    return l;
  });
}

export type OrderGroup<T> = { kind: "line"; line: T; index: number } | { kind: "bouquet"; id: string; lines: { line: T; index: number }[]; message: string | null; stems: number };

/**
 * 162 An order's lines as the dashboard and the apps show them: each
 * bouquet once, where its first line was, with its flowers, then its wrap,
 * then its card, its message and its stems; the other lines as they are.
 */
export function orderGroups<T extends { quantity: number; bouquet?: BouquetPart | null }>(lines: T[]): OrderGroup<T>[] {
  const out: OrderGroup<T>[] = [];
  const at = new Map<string, Extract<OrderGroup<T>, { kind: "bouquet" }>>();
  const rank = { flower: 0, wrap: 1, card: 2 } as const;
  lines.forEach((line, index) => {
    const b = line.bouquet;
    if (!b) {
      out.push({ kind: "line", line, index });
      return;
    }
    let group = at.get(b.id);
    if (!group) {
      group = { kind: "bouquet", id: b.id, lines: [], message: null, stems: 0 };
      at.set(b.id, group);
      out.push(group);
    }
    group.lines.push({ line, index });
    if (b.part === "flower") group.stems += line.quantity;
    if (b.message && group.message === null) group.message = b.message;
  });
  for (const g of at.values()) g.lines.sort((a, b) => rank[a.line.bouquet!.part] - rank[b.line.bouquet!.part] || a.index - b.index);
  return out;
}

/** `GET /store/bouquet`: the rules and what to choose from, each a `ProductSummary` with its photo and price. */
export function bouquetJson(s: BouquetSettings, lists: { flowers: unknown[]; wraps: unknown[]; cards: unknown[] }) {
  return {
    ...bouquetConfigJson(s)!,
    flowers: lists.flowers.slice(0, BOUQUET_LIMITS.flowers),
    wraps: lists.wraps.slice(0, BOUQUET_LIMITS.wraps),
    cards: lists.cards.slice(0, BOUQUET_LIMITS.cards),
  };
}
