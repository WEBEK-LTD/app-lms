import type { CatalogCurrency, CatalogVariants } from "../data/types";
import type { FlowerPhoto } from "./flower-photos";

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

/** The collections, in the shop's order. */
export const FLOWER_COLLECTIONS = ["Signature bouquets", "Roses", "In season", "Plants", "Gift sets", "Add-ons"] as const;
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
}

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
  {
    sku: "LQ-201",
    name: "Ceramic Vase",
    collection: "Add-ons",
    occasions: [],
    priceCents: 350_00,
    salePriceCents: null,
    photo: "ceramic-vase",
    featured: false,
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
    description: "A folded card with your message written in it by hand.",
  },
];
