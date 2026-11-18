import type { CatalogCurrency, CatalogSettings, CatalogVariants } from "../data/types";
import type { FlowerPhoto } from "./flower-photos";
import { giftBeginningsIn } from "../selling/gift-starters";

/**
 * 131.20 Leqaa's shop (the flower shop's demo, lib/studio/demo-designs/
 * leqaa-signature.ts): bouquets and arrangements for every occasion, a
 * bouquet in three sizes (its variations: the size a person picks on its
 * page, each with its price), and the add-ons on their own (a vase,
 * chocolates, a card) that the cart offers with the flowers. Its
 * collections and occasions are the shop's categories, a bouquet in its
 * collection and each occasion it suits. The shop, its bouquets and its
 * prices are invented; its photos are real, CC0 or public domain
 * (public/flower-photos/CREDITS.md); an add-on with no fitting free photo
 * has none.
 */

export const FLOWER_CURRENCY: CatalogCurrency = "EGP";
/** Delivery anywhere in Cairo, free from a bigger order (the commerce side's zones and slots come on top). */
export const FLOWER_SHIPPING_CENTS = 90_00;
export const FLOWER_FREE_SHIPPING_OVER_CENTS = 2500_00;

/**
 * 131 The shop's commerce, the real thing (the commerce side, 131.1–131.19):
 * the gift checkout (who it is from, who it is for with the address, the
 * day and slot, the card), same-day delivery until 4 pm in Cairo or the
 * next day, four slots (the evening's dearer), Greater Cairo only (Cairo,
 * Giza, New Cairo) priced by the distance from the shop (a base fee and a
 * fee a km) and free over E£ 2,500.
 */
export const FLOWER_COMMERCE: Pick<CatalogSettings, "delivery" | "gifts" | "areas" | "shippingMode" | "distancePricing"> = {
  delivery: {
    enabled: true,
    required: true,
    sameDay: true,
    cutoff: "16:00",
    nextDay: true,
    maxDays: 14,
    closedWeekdays: [],
    timezone: "Africa/Cairo",
    slots: [
      // The morning's taken already (as the story tells it): shown full.
      { id: "s1", start: "10:00", end: "13:00", capacity: 0, feeCents: null },
      { id: "s2", start: "13:00", end: "16:00", capacity: null, feeCents: null },
      { id: "s3", start: "16:00", end: "19:00", capacity: null, feeCents: 50_00 },
      { id: "s4", start: "19:00", end: "22:00", capacity: null, feeCents: 80_00 },
    ],
  },
  // 169 Yallapp's beginnings to tap, in English (the demo's main language), Arabic and Turkish.
  gifts: { checkout: "gift", message: true, maxLength: 300, starters: giftBeginningsIn("en"), starterTexts: { ar: giftBeginningsIn("ar"), tr: giftBeginningsIn("tr") }, recipient: true, anonymous: true },
  areas: [{ country: "EG", cities: ["Cairo", "Giza", "New Cairo"] }],
  shippingMode: "distance",
  // From the shop in Zamalek.
  distancePricing: { origin: { lat: 30.0626, lng: 31.2197 }, baseCents: 60_00, perKmCents: 5_00, maxKm: 40 },
};

/** The demo's flash sale: Blush Garden a quarter off for 26 hours (made again each day), 12 bouquets at that price and 8 of them gone (4 left, as the story tells it). */
export const FLOWER_FLASH_SALE = { title: "Blush hour", titles: { ar: "ساعة الورد", tr: "Pembe saat" }, percent: 25, hours: 26, limit: 12, sold: 8, skus: ["LQ-101"] } as const;

/** The demo's code shown in the app: 10% off a first bouquet from E£ 1,000 (the looks' coupon element). */
export const FLOWER_COUPON = { code: "LEQAA10", percent: 10, minOrderCents: 1000_00 } as const;

/** The collections, in the shop's order; 162 the loose stems and the wraps Build your bouquet chooses from. */
export const FLOWER_COLLECTIONS = ["Signature bouquets", "Roses", "In season", "Plants", "Gift sets", "Loose stems", "Wraps", "Add-ons"] as const;
/** The occasions a bouquet suits, the shop's categories too. */
export const FLOWER_OCCASIONS = ["Love", "Birthday", "Sympathy", "New baby", "Congratulations"] as const;
export const FLOWER_CATEGORIES: readonly string[] = [...FLOWER_COLLECTIONS, ...FLOWER_OCCASIONS];

export interface FlowerProduct {
  sku: string;
  name: string;
  collection: (typeof FLOWER_COLLECTIONS)[number];
  occasions: readonly (typeof FLOWER_OCCASIONS)[number][];
  priceCents: number;
  salePriceCents: number | null;
  /** Null: no fitting free photo (the add-ons drawn as tiles in the looks). */
  photo: FlowerPhoto | null;
  featured: boolean;
  description: string;
  /** A bouquet's bigger sizes, what each adds to its price (Classic is its own). */
  sizes?: { deluxe: number; grand: number };
  /** 131 A gift add-on (a vase, chocolates, a card): offered as "Add a little more" with every bouquet, never listed on its own. */
  addon?: boolean;
  /** 162 An add-on offered only with this collection's products (a wrap with the loose stems); missing: with every product. */
  addonWith?: (typeof FLOWER_COLLECTIONS)[number];
}

/**
 * 162 Build your bouquet on the demo: the loose stems are the flowers
 * (from 3 to 36 a bouquet), the two papers its wraps (one of them always),
 * the greeting card its card (which may be left out), by SKU and name.
 */
export const FLOWER_BOUQUET = { flowers: "Loose stems", wraps: ["LQ-401", "LQ-402"], cards: ["LQ-203"], wrapOptional: false, cardOptional: true, minStems: 3, maxStems: 36 } as const;

/** A bouquet's three sizes, by how many stems it has. */
export const FLOWER_SIZES = ["Classic · 12 stems", "Deluxe · 24 stems", "Grand · 36 stems"] as const;

/** A bouquet's sizes as its variations (91.5), priced by [money] (the app's currency); none for the rest. */
export function flowerVariants(p: FlowerProduct, money: (cents: number) => number): CatalogVariants | null {
  if (!p.sizes) return null;
  const add = [0, p.sizes.deluxe, p.sizes.grand];
  return {
    attributes: [{ name: "Size", values: [...FLOWER_SIZES] }],
    items: FLOWER_SIZES.map((size, i) => ({
      id: i + 1,
      values: [size],
      priceCents: money(p.priceCents + add[i]!),
      salePriceCents: p.salePriceCents === null ? null : money(p.salePriceCents + add[i]!),
      stock: null,
      sku: `${p.sku}-${["C", "D", "G"][i]}`,
      active: true,
    })),
    // Deluxe chosen when its page opens.
    defaultId: 2,
  };
}

export const FLOWER_PRODUCTS: readonly FlowerProduct[] = [
  {
    sku: "LQ-101",
    name: "Blush Garden",
    collection: "Signature bouquets",
    occasions: ["Love", "Birthday"],
    priceCents: 1450_00,
    salePriceCents: null,
    photo: "blush-bouquet",
    featured: true,
    description: "Blush roses, lisianthus and eucalyptus, made on the day it is delivered and wrapped in our blush paper with a silk ribbon.\n\nClassic has 12 stems, Deluxe 24 and Grand 36.",
    sizes: { deluxe: 650_00, grand: 1250_00 },
  },
  {
    sku: "LQ-102",
    name: "Velvet Red Roses",
    collection: "Roses",
    occasions: ["Love"],
    priceCents: 1850_00,
    salePriceCents: 1590_00,
    photo: "red-rose",
    featured: true,
    description: "Deep red roses, nothing else: the simplest way to say it.\n\nClassic has 12 stems, Deluxe 24 and Grand 36.",
    sizes: { deluxe: 900_00, grand: 1700_00 },
  },
  {
    sku: "LQ-103",
    name: "Morning Tulips",
    collection: "In season",
    occasions: ["Birthday", "Congratulations"],
    priceCents: 1100_00,
    salePriceCents: null,
    photo: "tulips",
    featured: false,
    description: "Tulips in their spring colours, wrapped in pink paper. They keep opening for days in a vase.",
    sizes: { deluxe: 500_00, grand: 950_00 },
  },
  {
    sku: "LQ-104",
    name: "Ranunculus Cloud",
    collection: "In season",
    occasions: ["Love", "Congratulations"],
    priceCents: 2400_00,
    salePriceCents: null,
    photo: "ranunculus",
    featured: true,
    description: "Soft pink and white ranunculus while they are in season, with a little greenery. Each one opens into a cloud of petals.",
    sizes: { deluxe: 1100_00, grand: 2100_00 },
  },
  {
    sku: "LQ-105",
    name: "White Serenity",
    collection: "Signature bouquets",
    occasions: ["Sympathy"],
    priceCents: 1650_00,
    salePriceCents: null,
    photo: "white-lilies",
    featured: false,
    description: "White lilies and roses, calm and quiet, with a card for the words that are hard to say.",
    sizes: { deluxe: 700_00, grand: 1300_00 },
  },
  {
    sku: "LQ-106",
    name: "Little Sunshine",
    collection: "In season",
    occasions: ["New baby", "Birthday"],
    priceCents: 950_00,
    salePriceCents: null,
    photo: "sunshine",
    featured: false,
    description: "Bright yellow and white blooms for a new arrival or a happy day, in a small hand-tied bunch.",
    sizes: { deluxe: 400_00, grand: 800_00 },
  },
  {
    sku: "LQ-107",
    name: "Blue Cloud",
    collection: "Signature bouquets",
    occasions: ["Congratulations", "Sympathy"],
    priceCents: 1750_00,
    salePriceCents: null,
    photo: "baby-breath",
    featured: false,
    description: "Baby's breath in a soft blue, wrapped in white paper with a scalloped edge.",
    sizes: { deluxe: 750_00, grand: 1400_00 },
  },
  {
    sku: "LQ-108",
    name: "Orchid Elegance",
    collection: "Plants",
    occasions: ["Congratulations", "New baby"],
    priceCents: 2200_00,
    salePriceCents: null,
    photo: "orchid",
    featured: true,
    description: "A cattleya orchid with ruffled violet petals, in a pot, that flowers for weeks with a little water once a week.",
  },
  {
    sku: "LQ-109",
    name: "Sunflower Field",
    collection: "In season",
    occasions: ["Birthday", "Congratulations"],
    priceCents: 980_00,
    salePriceCents: 850_00,
    photo: "sunflowers",
    featured: false,
    description: "Sunflowers with wild blooms and baby's breath, as if picked from a field on the way over.",
    sizes: { deluxe: 450_00, grand: 850_00 },
  },
  {
    sku: "LQ-110",
    name: "Garden Jug",
    collection: "Gift sets",
    occasions: ["Love", "Birthday"],
    priceCents: 2900_00,
    salePriceCents: null,
    photo: "garden-jug",
    featured: true,
    description: "Pink and white blooms in an enamel jug with a hand-written tag, ready to give: no vase needed.",
  },
  // 162 The loose stems Build your bouquet chooses from, one stem each.
  {
    sku: "LQ-301",
    name: "Red Rose",
    collection: "Loose stems",
    occasions: ["Love"],
    priceCents: 45_00,
    salePriceCents: null,
    photo: "red-rose",
    featured: false,
    description: "One long-stemmed deep red rose, priced by the stem.",
  },
  {
    sku: "LQ-302",
    name: "Blush Ranunculus",
    collection: "Loose stems",
    occasions: ["Love", "Congratulations"],
    priceCents: 55_00,
    salePriceCents: null,
    photo: "ranunculus",
    featured: false,
    description: "A soft pink ranunculus that opens into a cloud of petals, priced by the stem.",
  },
  {
    sku: "LQ-303",
    name: "White Lily",
    collection: "Loose stems",
    occasions: ["Sympathy"],
    priceCents: 60_00,
    salePriceCents: null,
    photo: "white-lilies",
    featured: false,
    description: "A white lily with its buds still to open, priced by the stem.",
  },
  {
    sku: "LQ-304",
    name: "Sunflower",
    collection: "Loose stems",
    occasions: ["Birthday", "Congratulations"],
    priceCents: 40_00,
    salePriceCents: null,
    photo: "sunflowers",
    featured: false,
    description: "A bright sunflower, priced by the stem.",
  },
  {
    sku: "LQ-305",
    name: "Baby's Breath",
    collection: "Loose stems",
    occasions: ["New baby"],
    priceCents: 25_00,
    salePriceCents: null,
    photo: "baby-breath",
    featured: false,
    description: "A spray of baby's breath to fill the bouquet, priced by the stem.",
  },
  // 162 The wraps: add-ons offered only with the loose stems.
  {
    sku: "LQ-401",
    name: "Kraft Paper Wrap",
    collection: "Wraps",
    occasions: [],
    priceCents: 60_00,
    salePriceCents: null,
    photo: "stems",
    featured: false,
    addon: true,
    addonWith: "Loose stems",
    description: "Natural kraft paper tied with twine.",
  },
  {
    sku: "LQ-402",
    name: "Blush Paper Wrap",
    collection: "Wraps",
    occasions: [],
    priceCents: 90_00,
    salePriceCents: null,
    photo: "tulips",
    featured: false,
    addon: true,
    addonWith: "Loose stems",
    description: "Our blush paper in soft layers, with a silk ribbon.",
  },
  {
    sku: "LQ-201",
    name: "Ceramic Vase",
    collection: "Add-ons",
    occasions: [],
    priceCents: 350_00,
    salePriceCents: null,
    photo: "ceramic-vase",
    featured: false,
    addon: true,
    description: "A white ceramic vase that fits a Classic or a Deluxe bouquet.",
  },
  {
    sku: "LQ-202",
    name: "Chocolate Box",
    collection: "Add-ons",
    occasions: [],
    priceCents: 320_00,
    salePriceCents: null,
    photo: null,
    featured: false,
    addon: true,
    description: "A box of assorted chocolates to go with the flowers.",
  },
  {
    sku: "LQ-203",
    name: "Greeting Card",
    collection: "Add-ons",
    occasions: [],
    priceCents: 60_00,
    salePriceCents: null,
    photo: null,
    featured: false,
    addon: true,
    description: "A folded card with your message written in it by hand.",
  },
];
