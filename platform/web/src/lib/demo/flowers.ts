import type { CatalogCurrency, CatalogOptionGroup } from "../data/types";
import type { FlowerPhoto } from "./flower-photos";

/**
 * 131.20 Leqaa's shop (the flower shop's demo, lib/studio/demo-designs/
 * leqaa-signature.ts): bouquets and arrangements for every occasion, each
 * in three sizes with what goes with it (a vase, chocolates, a card) as its
 * options, and the add-ons on their own. Its collections and occasions are
 * the shop's categories, a bouquet in its collection and each occasion it
 * suits. The shop, its bouquets and its prices are invented; its photos
 * are real, CC0 or public domain (public/flower-photos/CREDITS.md).
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
  photo: FlowerPhoto;
  featured: boolean;
  description: string;
  optionGroups?: CatalogOptionGroup[];
}

const option = (id: string, name: string, delta: number) => ({ id, name, priceDeltaCents: delta });

/** A bouquet's three sizes, by how many stems it has. */
function sizes(deluxe: number, grand: number): CatalogOptionGroup {
  return { id: "size", name: "Size", min: 1, max: 1, options: [option("classic", "Classic · 12 stems", 0), option("deluxe", "Deluxe · 24 stems", deluxe), option("grand", "Grand · 36 stems", grand)] };
}

/** What goes with it: a vase, chocolates, a card. */
const WITH: CatalogOptionGroup = { id: "with", name: "Add to it", min: 0, max: 3, options: [option("vase", "Ceramic vase", 350_00), option("chocolates", "Chocolate box", 320_00), option("card", "Greeting card", 60_00)] };

const bouquet = (deluxe: number, grand: number): CatalogOptionGroup[] => [sizes(deluxe, grand), structuredClone(WITH)];

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
    optionGroups: bouquet(650_00, 1250_00),
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
    optionGroups: bouquet(900_00, 1700_00),
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
    optionGroups: bouquet(500_00, 950_00),
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
    optionGroups: bouquet(1100_00, 2100_00),
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
    optionGroups: bouquet(700_00, 1300_00),
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
    optionGroups: bouquet(400_00, 800_00),
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
    optionGroups: bouquet(750_00, 1400_00),
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
    optionGroups: [structuredClone(WITH)],
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
    optionGroups: bouquet(450_00, 850_00),
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
    optionGroups: [structuredClone(WITH)],
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
    photo: "chocolates",
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
    photo: "greeting-card",
    featured: false,
    description: "A folded card with your message written in it by hand.",
  },
];
