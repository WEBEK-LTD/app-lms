import type { CatalogCurrency, CatalogSettings, CatalogVariants, ProductBadge, ProductDetails } from "../data/types";
import type { BeautyPhotoName } from "./shop-photos";

/**
 * 209 Velours (فيلور), the cosmetics shop: the demo of Studio's cosmetics
 * type (lib/studio/shop-types.ts) and its two Signature looks (A VELOURS,
 * plum and gold; B NAQA LAB, the clinic's cobalt; lib/studio/demo-designs/
 * beauty-signature.ts). A beauty house in Dubai: skincare, makeup,
 * fragrance, body and bath, hair, gifts and ready-made routines, by six
 * brands of its own (ROSÉ LAB, NOOR SKIN, VELA, MAISON AURA, NAQA LAB, PURE
 * FORMULA). Its main categories and their sub-categories are the category
 * menu's rows; two more main categories sort every product by the skin
 * types it suits and by its brand, so the menu, the chips and the skin quiz
 * open them. A foundation's and a lipstick's shades are their variations
 * (the stock of each) with a swatch colour each; every product's page has
 * its ingredients, how to use it, its facts, the genuine badge and its
 * batch's expiry (`details`, lib/catalog/details.ts). The shop, its
 * brands, products and prices are invented; its photos are real, CC0
 * (public/beauty-photos/CREDITS.md).
 */

export const BEAUTY_CURRENCY: CatalogCurrency = "AED";
export const BEAUTY_SHIPPING_CENTS = 20_00;
export const BEAUTY_FREE_SHIPPING_OVER_CENTS = 150_00;

/** Its settings besides money: unopened products back within 14 days. */
export const BEAUTY_COMMERCE: Pick<CatalogSettings, "returnDays"> = { returnDays: 14 };

/** The flash sale: a few products at their share off for 30 hours (made again each day), 24 at that price and 17 gone. */
export const BEAUTY_FLASH_SALE = { title: "Flash deals", titles: { ar: "عروض الساعة", tr: "Saatin fırsatları" }, percent: 30, hours: 30, limit: 24, sold: 17, skus: ["BT-204", "BT-209", "BT-206"] } as const;

/** The code shown in the app: 10% off a first order from 250 AED. */
export const BEAUTY_COUPON = { code: "VELOURS10", percent: 10, minOrderCents: 250_00 } as const;

export interface BeautyCategory {
  name: string;
  names: { ar: string; tr: string };
  subs: readonly { name: string; names: { ar: string; tr: string } }[];
}

const named = (name: string, ar: string, tr: string) => ({ name, names: { ar, tr } });

/** The skin types (the "Skin type" main category's sub-categories; the quiz's results, in this order). */
export const SKIN_TYPES = [named("Dry", "جافة", "Kuru"), named("Combination", "مختلطة", "Karma"), named("Oily", "دهنية", "Yağlı"), named("Sensitive", "حساسة", "Hassas")] as const;
export type SkinType = (typeof SKIN_TYPES)[number]["name"];
const ALL_SKIN: readonly SkinType[] = ["Dry", "Combination", "Oily", "Sensitive"];

/** The shop's own brands (the "Brands" main category's sub-categories), as their packs write them. */
export const BEAUTY_BRANDS = [
  named("Rosé Lab", "روزيه لاب", "Rosé Lab"),
  named("Noor Skin", "نور سكن", "Noor Skin"),
  named("Vela", "فيلا", "Vela"),
  named("Maison Aura", "ميزون أورا", "Maison Aura"),
  named("Naqa Lab", "نقاء لاب", "Naqa Lab"),
  named("Pure Formula", "بيور فورميولا", "Pure Formula"),
] as const;
export type BeautyBrand = (typeof BEAUTY_BRANDS)[number]["name"];

export const SKIN_TYPE_CATEGORY = named("Skin type", "نوع البشرة", "Cilt tipi");
export const BRANDS_CATEGORY = named("Brands", "الماركات", "Markalar");
/** The ready-made routines' sub-category (in Gifts & sets). */
export const ROUTINES_CATEGORY = named("Routines", "روتينات العناية", "Bakım rutinleri");

/** The main categories in the shop's order, each with its sub-categories; then by skin type and by brand. */
export const BEAUTY_CATEGORIES: readonly BeautyCategory[] = [
  { ...named("Skincare", "العناية بالبشرة", "Cilt bakımı"), subs: [named("Serums", "السيرومات", "Serumlar"), named("Moisturisers", "المرطّبات", "Nemlendiriciler"), named("Cleansers", "المنظّفات", "Temizleyiciler"), named("Face oils", "زيوت الوجه", "Yüz yağları"), named("Sunscreen", "واقيات الشمس", "Güneş koruyucular")] },
  { ...named("Makeup", "المكياج", "Makyaj"), subs: [named("Face", "البشرة", "Ten"), named("Eyes", "العيون", "Gözler"), named("Lips", "الشفاه", "Dudaklar"), named("Nails", "الأظافر", "Tırnaklar"), named("Brushes & tools", "الفرش والأدوات", "Fırça ve aletler")] },
  { ...named("Fragrance", "العطور", "Parfüm"), subs: [named("Women's perfume", "عطور نسائية", "Kadın parfümleri"), named("Oud & incense", "عود وبخور", "Ud ve tütsü"), named("Scented candles", "شموع معطّرة", "Kokulu mumlar")] },
  { ...named("Body & bath", "الجسم والاستحمام", "Vücut ve banyo"), subs: [named("Bath salts", "أملاح الاستحمام", "Banyo tuzları"), named("Natural soap", "صابون طبيعي", "Doğal sabun"), named("Spa rituals", "طقوس السبا", "Spa ritüelleri")] },
  { ...named("Hair", "الشعر", "Saç"), subs: [named("Hair care", "العناية بالشعر", "Saç bakımı"), named("Hair oils", "زيوت الشعر", "Saç yağları"), named("Beard care", "العناية باللحية", "Sakal bakımı")] },
  { ...named("Gifts & sets", "هدايا وأطقم", "Hediye ve setler"), subs: [ROUTINES_CATEGORY, named("Makeup sets", "أطقم المكياج", "Makyaj setleri")] },
  { ...SKIN_TYPE_CATEGORY, subs: SKIN_TYPES },
  { ...BRANDS_CATEGORY, subs: BEAUTY_BRANDS },
];

/** A shade: its value as the product's choice ("3W", "Rose") and its colour. */
export type Shade = readonly [value: string, hex: string];

/** The velvet cushion foundation's twelve shades (the home's shade finder shows eight of them). */
export const FOUNDATION_SHADES: readonly Shade[] = [
  ["1N", "#F3D9C6"],
  ["1W", "#F0D2B8"],
  ["2C", "#EDCBB2"],
  ["2W", "#E3B898"],
  ["3N", "#DDB091"],
  ["3W", "#D7A887"],
  ["4N", "#C89272"],
  ["4W", "#BE8762"],
  ["5W", "#B17A5A"],
  ["6C", "#8F5C40"],
  ["7N", "#6B412D"],
  ["8C", "#4E2E20"],
];

export interface BeautyProduct {
  sku: string;
  name: string;
  /** Its sub-category, by name (its main category follows). */
  sub: string;
  brand: BeautyBrand;
  /** The skin types it suits (each a sub-category of "Skin type"); none for a fragrance, a brush or the hair's. */
  skins: readonly SkinType[];
  priceCents: number;
  salePriceCents: number | null;
  /** Its photos, the first its cover. */
  photos: readonly BeautyPhotoName[];
  /** The ready-made routines only (the home's routine card lists the featured products). */
  featured: boolean;
  description: string;
  /** Its shades (a "Shade" choice, the stock of each, a swatch each); null: none to choose. */
  shades: readonly Shade[] | null;
  /** Its facts besides the brand and the skin types (Volume, Finish, Key ingredient). */
  facts: readonly (readonly [string, string])[];
  ingredients: string;
  howToUse: string;
  /** Not tested on animals (every product is genuine). */
  crueltyFree: boolean;
  /** The batch's expiry, "YYYY-MM". */
  expiry: string;
}

interface Seed {
  sku: string;
  name: string;
  sub: string;
  brand: BeautyBrand;
  skins?: readonly SkinType[];
  price: number;
  sale?: number;
  photos: readonly BeautyPhotoName[];
  description: string;
  shades?: readonly Shade[];
  facts: readonly (readonly [string, string])[];
  ingredients: string;
  howToUse: string;
  crueltyFree?: boolean;
  expiry: string;
  featured?: boolean;
}

const p = (s: Seed): BeautyProduct => ({
  sku: s.sku,
  name: s.name,
  sub: s.sub,
  brand: s.brand,
  skins: s.skins ?? [],
  priceCents: s.price * 100,
  salePriceCents: s.sale === undefined ? null : s.sale * 100,
  photos: s.photos,
  featured: s.featured ?? false,
  description: s.description,
  shades: s.shades ?? null,
  facts: s.facts,
  ingredients: s.ingredients,
  howToUse: s.howToUse,
  crueltyFree: s.crueltyFree ?? true,
  expiry: s.expiry,
});

/** A ready-made routine: its steps' products by SKU, its price the sum of theirs, sold together for less. */
interface RoutineSeed {
  sku: string;
  name: string;
  skins: readonly SkinType[];
  steps: readonly [step: string, sku: string][];
  sale: number;
  photo: BeautyPhotoName;
  line: string;
  expiry: string;
}

/** The shop's products, newest first as the demo lists them. */
const PRODUCTS: readonly BeautyProduct[] = [
  // ——— Skincare ———
  p({
    sku: "BT-101",
    name: "Vitamin C brightening serum",
    sub: "Serums",
    brand: "Noor Skin",
    skins: ["Dry", "Combination", "Oily"],
    price: 189,
    photos: ["vitamin-c", "hero-glow"],
    description: "A light serum with 15% stable vitamin C that evens the skin's tone and brings back its glow in four weeks.\n\nFragrance-free, in an amber glass bottle that keeps the vitamin C fresh.",
    facts: [["Volume", "30 ml"], ["Key ingredient", "Vitamin C 15%"], ["Texture", "Light serum"]],
    ingredients: "Aqua, Ascorbic Acid (15%), Propanediol, Glycerin, Ferulic Acid, Tocopherol, Sodium Hyaluronate, Panthenol, Citric Acid, Phenoxyethanol.",
    howToUse: "Every morning, after cleansing, press 3 drops into the face and neck. Follow with your moisturiser and a sunscreen.",
    expiry: "2027-09",
  }),
  p({
    sku: "BT-102",
    name: "Deep hydration cream",
    sub: "Moisturisers",
    brand: "Rosé Lab",
    skins: ["Dry", "Sensitive"],
    price: 210,
    sale: 165,
    photos: ["deep-cream", "hero-cream"],
    description: "A rich cream with rose water, shea butter and hyaluronic acid that keeps dry skin soft from morning to night.",
    facts: [["Volume", "50 ml"], ["Key ingredient", "Hyaluronic acid"], ["Texture", "Rich cream"]],
    ingredients: "Aqua, Rosa Damascena Flower Water, Butyrospermum Parkii Butter, Glycerin, Squalane, Sodium Hyaluronate, Cetearyl Alcohol, Ceramide NP, Tocopherol, Phenoxyethanol.",
    howToUse: "Morning and night, warm a pea-sized amount between your fingers and press it into the face and neck.",
    expiry: "2028-02",
  }),
  p({
    sku: "BT-103",
    name: "Niacinamide and zinc serum",
    sub: "Serums",
    brand: "Naqa Lab",
    skins: ["Oily", "Combination"],
    price: 89,
    photos: ["niacinamide"],
    description: "10% niacinamide with 1% zinc to balance oil and refine the look of pores, in a water-light serum.",
    facts: [["Volume", "30 ml"], ["Key ingredient", "Niacinamide 10%"], ["Texture", "Water-light serum"]],
    ingredients: "Aqua, Niacinamide (10%), Zinc PCA (1%), Pentylene Glycol, Tamarindus Indica Seed Gum, Xanthan Gum, Phenoxyethanol, Chlorphenesin.",
    howToUse: "Morning and night, smooth 2 to 3 drops over the face before your creams. Use it with vitamin C on different nights.",
    expiry: "2027-11",
  }),
  p({
    sku: "BT-104",
    name: "Ceramide barrier cream",
    sub: "Moisturisers",
    brand: "Naqa Lab",
    skins: ["Dry", "Sensitive"],
    price: 159,
    sale: 129,
    photos: ["ceramide"],
    description: "Three ceramides and cholesterol rebuild the skin's barrier, so it holds its water and calms down.",
    facts: [["Volume", "50 ml"], ["Key ingredient", "Ceramides 3%"], ["Texture", "Cream"]],
    ingredients: "Aqua, Glycerin, Caprylic/Capric Triglyceride, Ceramide NP, Ceramide AP, Ceramide EOP, Cholesterol, Phytosphingosine, Sodium Hyaluronate, Carbomer, Phenoxyethanol.",
    howToUse: "Morning and night, after your serum, smooth it over the face. On very dry areas, add a second layer at night.",
    expiry: "2028-01",
  }),
  p({
    sku: "BT-105",
    name: "Pure squalane face oil",
    sub: "Face oils",
    brand: "Pure Formula",
    skins: ["Dry", "Combination", "Sensitive"],
    price: 74,
    photos: ["squalane"],
    description: "100% plant squalane from olives: weightless, it softens the skin without clogging it.",
    facts: [["Volume", "30 ml"], ["Key ingredient", "Squalane 100%"], ["Texture", "Dry oil"]],
    ingredients: "Squalane (from olives).",
    howToUse: "Warm 2 drops between your palms and press them into the face as the last step at night, or mix one drop into your cream.",
    expiry: "2028-06",
  }),
  p({
    sku: "BT-106",
    name: "Coconut cleansing balm",
    sub: "Cleansers",
    brand: "Pure Formula",
    skins: ["Dry", "Combination", "Sensitive"],
    price: 79,
    photos: ["coconut-balm"],
    description: "A balm that melts into an oil and takes off makeup and sunscreen, then rinses away as a milk.",
    facts: [["Volume", "100 ml"], ["Key ingredient", "Coconut oil"], ["Texture", "Balm to oil"]],
    ingredients: "Cocos Nucifera Oil, Caprylic/Capric Triglyceride, PEG-20 Glyceryl Triisostearate, Polyethylene, Helianthus Annuus Seed Oil, Tocopherol.",
    howToUse: "On dry skin, massage a scoop over the face and eyes, add a little water to turn it milky, then rinse.",
    expiry: "2028-04",
  }),
  p({
    sku: "BT-107",
    name: "Gentle oat cleansing bar",
    sub: "Cleansers",
    brand: "Noor Skin",
    skins: ALL_SKIN,
    price: 62,
    photos: ["oat-bar"],
    description: "A soap-free bar of colloidal oat that cleanses without tightness, kind to the skin's barrier.",
    facts: [["Weight", "150 g"], ["Key ingredient", "Colloidal oat"], ["Texture", "Soap-free bar"]],
    ingredients: "Sodium Cocoyl Isethionate, Avena Sativa Kernel Flour, Stearic Acid, Glycerin, Butyrospermum Parkii Butter, Aqua, Titanium Dioxide.",
    howToUse: "Lather the bar between wet hands, massage the lather over the face for 30 seconds and rinse. Let the bar dry between uses.",
    expiry: "2028-08",
  }),
  p({
    sku: "BT-108",
    name: "Clear daily sunscreen SPF 50+",
    sub: "Sunscreen",
    brand: "Naqa Lab",
    skins: ALL_SKIN,
    price: 84,
    photos: ["spf", "spf-banner"],
    description: "A clear fluid with broad-spectrum SPF 50+ that leaves no white cast, made for the Gulf's sun every day.",
    facts: [["Volume", "50 ml"], ["Protection", "SPF 50+ · PA++++"], ["Finish", "Invisible"]],
    ingredients: "Aqua, Homosalate, Ethylhexyl Salicylate, Butyl Methoxydibenzoylmethane, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Glycerin, Niacinamide, Tocopherol, Phenoxyethanol.",
    howToUse: "Every morning, as the last step, apply two finger lengths to the face and neck. Apply again every two hours in the sun.",
    expiry: "2027-07",
  }),
  p({
    sku: "BT-109",
    name: "Hyaluronic acid serum",
    sub: "Serums",
    brand: "Naqa Lab",
    skins: ALL_SKIN,
    price: 96,
    photos: ["hyaluronic"],
    description: "Hyaluronic acid of three sizes hydrates the skin at three depths, for plump, comfortable skin all day.",
    facts: [["Volume", "30 ml"], ["Key ingredient", "Hyaluronic acid 2%"], ["Texture", "Gel serum"]],
    ingredients: "Aqua, Sodium Hyaluronate, Hydrolyzed Hyaluronic Acid, Sodium Hyaluronate Crosspolymer, Panthenol, Pentylene Glycol, Phenoxyethanol.",
    howToUse: "Morning and night, smooth 3 drops over damp skin, then seal it in with your moisturiser.",
    expiry: "2027-12",
  }),
  p({
    sku: "BT-110",
    name: "Rose face oil",
    sub: "Face oils",
    brand: "Maison Aura",
    skins: ["Dry"],
    price: 145,
    photos: ["rose-oil"],
    description: "Rosehip and Damask rose in a golden oil that nourishes dry skin overnight.",
    facts: [["Volume", "30 ml"], ["Key ingredient", "Rosehip oil"], ["Texture", "Oil"]],
    ingredients: "Rosa Canina Fruit Oil, Simmondsia Chinensis Seed Oil, Rosa Damascena Flower Oil, Tocopherol, Parfum.",
    howToUse: "At night, warm 3 drops between your palms and press them into clean skin.",
    expiry: "2028-03",
  }),
  p({
    sku: "BT-111",
    name: "Retinol 0.3% night serum",
    sub: "Serums",
    brand: "Naqa Lab",
    skins: ["Combination", "Oily"],
    price: 135,
    photos: ["retinol"],
    description: "A gentle 0.3% retinol with bakuchiol that smooths fine lines and evens texture while you sleep.",
    facts: [["Volume", "30 ml"], ["Key ingredient", "Retinol 0.3%"], ["Texture", "Serum"]],
    ingredients: "Aqua, Caprylic/Capric Triglyceride, Glycerin, Retinol (0.3%), Bakuchiol, Squalane, Tocopherol, Polysorbate 20, Phenoxyethanol.",
    howToUse: "Start two nights a week, then every other night: 3 drops on dry skin, then your moisturiser. Always wear a sunscreen the next morning.",
    crueltyFree: true,
    expiry: "2027-08",
  }),
  p({
    sku: "BT-112",
    name: "Light gel moisturiser",
    sub: "Moisturisers",
    brand: "Rosé Lab",
    skins: ["Combination", "Oily"],
    price: 118,
    photos: ["gel-cream"],
    description: "An oil-free gel cream that hydrates and leaves the skin fresh and matte, never shiny.",
    facts: [["Volume", "50 ml"], ["Key ingredient", "Green tea"], ["Texture", "Gel cream"]],
    ingredients: "Aqua, Glycerin, Dimethicone, Camellia Sinensis Leaf Extract, Niacinamide, Sodium Hyaluronate, Carbomer, Phenoxyethanol.",
    howToUse: "Morning and night, smooth a pea-sized amount over the face after your serum.",
    expiry: "2028-01",
  }),
  // ——— Makeup ———
  p({
    sku: "BT-201",
    name: "Velvet cushion foundation SPF 25",
    sub: "Face",
    brand: "Rosé Lab",
    skins: ALL_SKIN,
    price: 199,
    sale: 149,
    photos: ["foundation", "shade-face"],
    description: "Medium, buildable coverage with a soft velvet finish, in twelve shades, with a sponge and SPF 25.\n\nNot sure of your shade? The shade finder on the home matches it.",
    shades: FOUNDATION_SHADES,
    facts: [["Weight", "15 g"], ["Coverage", "Medium, buildable"], ["Finish", "Velvet"], ["Protection", "SPF 25"]],
    ingredients: "Aqua, Cyclopentasiloxane, Titanium Dioxide, Ethylhexyl Methoxycinnamate, Glycerin, Niacinamide, Sodium Hyaluronate, Iron Oxides (CI 77491, CI 77492, CI 77499), Phenoxyethanol.",
    howToUse: "Press the sponge into the cushion and tap it over the face from the centre outwards. Add a second layer where you need more cover.",
    expiry: "2027-10",
  }),
  p({
    sku: "BT-202",
    name: "Rose lip and cheek balm",
    sub: "Lips",
    brand: "Vela",
    skins: ALL_SKIN,
    price: 89,
    photos: ["lip-cheek"],
    description: "A creamy balm of rose wax that gives the lips and cheeks a soft flush of colour.",
    shades: [
      ["Petal", "#E8A0A6"],
      ["Rose", "#D7747E"],
      ["Berry", "#B85563"],
      ["Plum", "#9A3C4C"],
    ],
    facts: [["Weight", "6 g"], ["Finish", "Dewy"]],
    ingredients: "Ricinus Communis Seed Oil, Rosa Damascena Flower Wax, Butyrospermum Parkii Butter, Cera Alba, Tocopherol, Iron Oxides (CI 77491), Red 7 Lake (CI 15850).",
    howToUse: "Dab it on the lips with a fingertip, then tap what is left on the cheeks and blend upwards.",
    expiry: "2027-12",
  }),
  p({
    sku: "BT-203",
    name: "Tinted lip balm",
    sub: "Lips",
    brand: "Noor Skin",
    price: 80,
    sale: 64,
    photos: ["tinted-balm"],
    description: "Shea and jojoba in a sheer tint that keeps the lips soft all day.",
    shades: [
      ["Nude", "#E9A9A0"],
      ["Coral", "#D98A86"],
      ["Cherry", "#C06A6E"],
    ],
    facts: [["Weight", "4 g"], ["Finish", "Sheer"]],
    ingredients: "Simmondsia Chinensis Seed Oil, Butyrospermum Parkii Butter, Cera Alba, Ricinus Communis Seed Oil, Tocopherol, Iron Oxides (CI 77491).",
    howToUse: "Apply on bare lips as often as you like.",
    expiry: "2028-02",
  }),
  p({
    sku: "BT-204",
    name: "Gel nail polish",
    sub: "Nails",
    brand: "Vela",
    price: 89,
    sale: 58,
    photos: ["nail"],
    description: "A long-wear gel colour that dries without a lamp and stays glossy for up to ten days.",
    shades: [
      ["Cranberry", "#C2185B"],
      ["Peony", "#E57396"],
      ["Merlot", "#8E1C3E"],
      ["Blush", "#F2B8C6"],
    ],
    facts: [["Volume", "12 ml"], ["Finish", "Gloss"]],
    ingredients: "Butyl Acetate, Ethyl Acetate, Nitrocellulose, Acetyl Tributyl Citrate, Isopropyl Alcohol, Stearalkonium Bentonite, CI 15850, CI 77891.",
    howToUse: "On clean nails, apply two thin coats and let each dry for two minutes. Finish with a top coat.",
    expiry: "2028-05",
  }),
  p({
    sku: "BT-205",
    name: "Velvet matte lipstick",
    sub: "Lips",
    brand: "Maison Aura",
    price: 95,
    photos: ["velvet-lips"],
    description: "A soft matte colour that feels like velvet and doesn't dry the lips, in five shades.",
    shades: [
      ["Nude rose", "#C98579"],
      ["Rosewood", "#A65E5B"],
      ["Coral", "#D9624E"],
      ["Classic red", "#B3202E"],
      ["Plum", "#7A2E45"],
    ],
    facts: [["Weight", "3.5 g"], ["Finish", "Soft matte"]],
    ingredients: "Isododecane, Dimethicone, Trimethylsiloxysilicate, Cera Microcristallina, Butyrospermum Parkii Butter, Tocopherol, CI 15850, CI 77491, CI 77891.",
    howToUse: "Line the lips from the centre outwards, then fill in. Blot once for a softer look.",
    expiry: "2028-03",
  }),
  p({
    sku: "BT-206",
    name: "Rose sunset eyeshadow palette",
    sub: "Eyes",
    brand: "Vela",
    price: 240,
    sale: 185,
    photos: ["rose-palette"],
    description: "Twelve shades of rose, copper and plum, in matte and shimmer, for the day and the evening.",
    facts: [["Shades", "12"], ["Finish", "Matte and shimmer"]],
    ingredients: "Talc, Mica, Magnesium Stearate, Dimethicone, Ethylhexyl Palmitate, Silica, Phenoxyethanol, CI 77491, CI 77492, CI 77891, CI 77742.",
    howToUse: "Sweep a matte shade over the lid, deepen the crease with a darker one and tap a shimmer on the centre of the lid.",
    expiry: "2029-01",
  }),
  p({
    sku: "BT-207",
    name: "Smoky eyeshadow palette",
    sub: "Eyes",
    brand: "Noor Skin",
    price: 175,
    photos: ["smoky-palette"],
    description: "Nine cool shades from dove grey to night blue, for a soft or a deep smoky eye.",
    facts: [["Shades", "9"], ["Finish", "Matte and satin"]],
    ingredients: "Talc, Mica, Zinc Stearate, Dimethicone, Octyldodecanol, Silica, Phenoxyethanol, CI 77499, CI 77007, CI 77891.",
    howToUse: "Build the colour from the lash line upwards, blending the edges with a clean brush.",
    expiry: "2029-02",
  }),
  p({
    sku: "BT-208",
    name: "Nude eyeshadow palette",
    sub: "Eyes",
    brand: "Maison Aura",
    price: 210,
    photos: ["nude-palette"],
    description: "Eight warm nudes that suit every skin tone, from a soft wash to a defined crease.",
    facts: [["Shades", "8"], ["Finish", "Matte"]],
    ingredients: "Talc, Mica, Magnesium Stearate, Caprylic/Capric Triglyceride, Silica, Tocopherol, CI 77491, CI 77492, CI 77891.",
    howToUse: "Use the lightest shade under the brow, the middle shades on the lid and the deepest along the lash line.",
    expiry: "2029-01",
  }),
  p({
    sku: "BT-209",
    name: "Kabuki powder brush",
    sub: "Brushes & tools",
    brand: "Rosé Lab",
    price: 65,
    photos: ["kabuki"],
    description: "A dense, soft kabuki for powder, bronzer and a buffed foundation, with a short wooden handle.",
    facts: [["Bristles", "Soft synthetic"], ["Handle", "Wood"]],
    ingredients: "Synthetic bristles (polyamide), beech wood handle, aluminium ferrule.",
    howToUse: "Swirl it in powder, tap off the excess and buff in small circles. Wash it once a week with a gentle shampoo and let it dry flat.",
    expiry: "2031-12",
  }),
  p({
    sku: "BT-210",
    name: "Pressed blush",
    sub: "Face",
    brand: "Maison Aura",
    skins: ALL_SKIN,
    price: 110,
    photos: ["blush"],
    description: "A silky pressed blush that blends into a natural flush, with a brush in the compact.",
    shades: [
      ["Petal", "#F0A8A8"],
      ["Coral", "#E98C7A"],
      ["Mauve", "#C27C8E"],
    ],
    facts: [["Weight", "5 g"], ["Finish", "Satin"]],
    ingredients: "Talc, Mica, Zinc Stearate, Dimethicone, Octyldodecyl Stearoyl Stearate, Tocopherol, CI 15850, CI 77491, CI 77891.",
    howToUse: "Smile, sweep the colour over the apples of the cheeks and blend up towards the temples.",
    expiry: "2028-11",
  }),
  p({
    sku: "BT-211",
    name: "Ink eyeliner pen",
    sub: "Eyes",
    brand: "Noor Skin",
    price: 72,
    photos: ["eyeliner"],
    description: "A fine felt tip in a deep black that draws a sharp line and stays put all day.",
    facts: [["Volume", "0.6 ml"], ["Finish", "Matte black"]],
    ingredients: "Aqua, Styrene/Acrylates Copolymer, Butylene Glycol, Laureth-21, Phenoxyethanol, CI 77266.",
    howToUse: "Draw short strokes along the lash line from the inner corner, then join them. Lift the end for a wing.",
    expiry: "2027-06",
  }),
  p({
    sku: "BT-212",
    name: "Silk lip balm stick",
    sub: "Lips",
    brand: "Rosé Lab",
    price: 45,
    photos: ["balm-stick"],
    description: "A clear balm stick with rose oil and vitamin E for soft lips, before your lipstick or on its own.",
    facts: [["Weight", "4 g"], ["Finish", "Clear"]],
    ingredients: "Ricinus Communis Seed Oil, Cera Alba, Butyrospermum Parkii Butter, Rosa Canina Fruit Oil, Tocopherol.",
    howToUse: "Glide it over the lips whenever they feel dry, and before bed.",
    expiry: "2028-04",
  }),
  // ——— Fragrance ———
  p({
    sku: "BT-301",
    name: "Velvet rose eau de parfum",
    sub: "Women's perfume",
    brand: "Maison Aura",
    price: 420,
    photos: ["perfume"],
    description: "Taif rose and pink pepper over a warm base of amber and musk: the house's signature.",
    facts: [["Volume", "50 ml"], ["Notes", "Rose, pink pepper, amber"], ["Concentration", "Eau de parfum"]],
    ingredients: "Alcohol Denat., Parfum, Aqua, Limonene, Linalool, Citronellol, Geraniol, Coumarin.",
    howToUse: "Spray on the wrists and the neck from 15 cm away. Don't rub it in: let it settle on the skin.",
    expiry: "2030-05",
  }),
  p({
    sku: "BT-302",
    name: "Petal eau de parfum",
    sub: "Women's perfume",
    brand: "Vela",
    price: 340,
    photos: ["rose-perfume"],
    description: "A fresh rose with peony and white musk, light enough for every day.",
    facts: [["Volume", "50 ml"], ["Notes", "Rose, peony, white musk"], ["Concentration", "Eau de parfum"]],
    ingredients: "Alcohol Denat., Parfum, Aqua, Linalool, Citronellol, Geraniol, Hexyl Cinnamal.",
    howToUse: "Spray on the pulse points; a mist on the hair lasts longer.",
    expiry: "2030-03",
  }),
  p({
    sku: "BT-303",
    name: "Oud incense sticks",
    sub: "Oud & incense",
    brand: "Maison Aura",
    price: 95,
    photos: ["oud"],
    description: "Forty hand-rolled sticks of oud and sandalwood that scent a room for an evening.",
    facts: [["Contents", "40 sticks"], ["Notes", "Oud, sandalwood"]],
    ingredients: "Bamboo sticks, wood powder, oud wood extract, sandalwood oil, natural resin.",
    howToUse: "Light the tip, let it flame for a few seconds, then blow it out. Burn in a holder, away from what can catch fire.",
    crueltyFree: false,
    expiry: "2030-12",
  }),
  p({
    sku: "BT-304",
    name: "Amber scented candle",
    sub: "Scented candles",
    brand: "Maison Aura",
    price: 120,
    photos: ["candle-amber"],
    description: "A soy wax candle of amber, vanilla and a touch of oud, in a glass jar with a lid.",
    facts: [["Weight", "220 g"], ["Burns for", "45 hours"]],
    ingredients: "Soy wax, fragrance oil, cotton wick.",
    howToUse: "Burn for two hours the first time so the wax melts to the edge. Trim the wick to 5 mm before each use.",
    crueltyFree: false,
    expiry: "2030-12",
  }),
  p({
    sku: "BT-305",
    name: "Fig and cedar candle",
    sub: "Scented candles",
    brand: "Vela",
    price: 110,
    photos: ["candle-fig"],
    description: "Green fig and cedarwood in a soy wax candle for calm evenings.",
    facts: [["Weight", "200 g"], ["Burns for", "40 hours"]],
    ingredients: "Soy wax, fragrance oil, cotton wick.",
    howToUse: "Burn for two hours the first time; keep the wick trimmed and never leave it burning alone.",
    crueltyFree: false,
    expiry: "2030-12",
  }),
  // ——— Body & bath ———
  p({
    sku: "BT-401",
    name: "Mineral bath salts duo",
    sub: "Bath salts",
    brand: "Pure Formula",
    skins: ALL_SKIN,
    price: 85,
    photos: ["bath-salts"],
    description: "Dead Sea and Epsom salts with eucalyptus and orange blossom, for a bath that eases tired muscles.",
    facts: [["Weight", "2 × 250 g"], ["Key ingredient", "Dead Sea salt"]],
    ingredients: "Maris Sal, Magnesium Sulfate, Eucalyptus Globulus Leaf Oil, Citrus Aurantium Amara Flower Oil, Limonene.",
    howToUse: "Dissolve two handfuls in a warm bath and soak for 20 minutes.",
    expiry: "2029-06",
  }),
  p({
    sku: "BT-402",
    name: "Handmade olive oil soap",
    sub: "Natural soap",
    brand: "Pure Formula",
    skins: ["Dry", "Sensitive"],
    price: 35,
    photos: ["olive-soap"],
    description: "Cold-pressed olive oil soap, cured for six weeks, gentle enough for the face and body.",
    facts: [["Weight", "120 g"], ["Key ingredient", "Olive oil"]],
    ingredients: "Sodium Olivate, Aqua, Glycerin, Sodium Chloride.",
    howToUse: "Lather in wet hands, wash and rinse. Keep it on a draining dish.",
    expiry: "2028-12",
  }),
  p({
    sku: "BT-403",
    name: "Lavender spa soap",
    sub: "Natural soap",
    brand: "Noor Skin",
    skins: ["Combination", "Oily"],
    price: 32,
    photos: ["spa-soap"],
    description: "A calming bar of lavender and shea butter for the body.",
    facts: [["Weight", "120 g"], ["Key ingredient", "Lavender oil"]],
    ingredients: "Sodium Palmate, Sodium Cocoate, Aqua, Butyrospermum Parkii Butter, Lavandula Angustifolia Oil, Linalool.",
    howToUse: "Lather in wet hands or on a sponge, wash and rinse.",
    expiry: "2028-10",
  }),
  p({
    sku: "BT-404",
    name: "Spa ritual set",
    sub: "Spa rituals",
    brand: "Maison Aura",
    price: 165,
    photos: ["spa-ritual"],
    description: "Massage stones, a body oil and a small candle for a spa evening at home.",
    facts: [["Contents", "3 stones, 100 ml oil, 1 candle"]],
    ingredients: "Body oil: Prunus Amygdalus Dulcis Oil, Simmondsia Chinensis Seed Oil, Lavandula Angustifolia Oil, Tocopherol. Basalt stones; soy wax candle.",
    howToUse: "Warm the stones in hot water, oil the skin and glide them in long strokes. Light the candle for the scent.",
    expiry: "2029-03",
  }),
  p({
    sku: "BT-405",
    name: "Bath bomb and towel set",
    sub: "Spa rituals",
    brand: "Pure Formula",
    price: 75,
    photos: ["bath-set"],
    description: "A fizzing bath bomb of sea salt and coconut milk with a soft cotton towel, wrapped as a gift.",
    facts: [["Contents", "1 bath bomb, 1 towel"]],
    ingredients: "Bath bomb: Sodium Bicarbonate, Citric Acid, Maris Sal, Cocos Nucifera Milk Powder, Parfum.",
    howToUse: "Drop the bath bomb in a warm bath and soak while it fizzes.",
    expiry: "2028-09",
  }),
  // ——— Hair ———
  p({
    sku: "BT-501",
    name: "Argan hair oil",
    sub: "Hair oils",
    brand: "Pure Formula",
    price: 92,
    photos: ["argan"],
    description: "Cold-pressed argan oil that tames frizz and adds shine without weighing hair down.",
    facts: [["Volume", "50 ml"], ["Hair", "Dry and frizzy"]],
    ingredients: "Argania Spinosa Kernel Oil, Tocopherol.",
    howToUse: "Warm 2 drops in your palms and smooth them over the lengths of damp or dry hair.",
    expiry: "2028-07",
  }),
  p({
    sku: "BT-502",
    name: "Repair shampoo and conditioner",
    sub: "Hair care",
    brand: "Noor Skin",
    price: 128,
    photos: ["shampoo"],
    description: "A sulphate-free shampoo and a conditioner with keratin and rice protein for damaged hair.",
    facts: [["Volume", "2 × 250 ml"], ["Hair", "Damaged"]],
    ingredients: "Aqua, Sodium Lauroyl Methyl Isethionate, Cocamidopropyl Betaine, Hydrolyzed Keratin, Hydrolyzed Rice Protein, Panthenol, Parfum.",
    howToUse: "Massage the shampoo into wet hair and rinse; smooth the conditioner over the lengths, leave it for two minutes and rinse.",
    expiry: "2028-05",
  }),
  p({
    sku: "BT-503",
    name: "Soothing scalp serum",
    sub: "Hair care",
    brand: "Naqa Lab",
    price: 110,
    photos: ["scalp"],
    description: "Niacinamide and rosemary calm the scalp and help hair grow stronger.",
    facts: [["Volume", "50 ml"], ["Key ingredient", "Rosemary and niacinamide"]],
    ingredients: "Aqua, Propanediol, Niacinamide, Rosmarinus Officinalis Leaf Extract, Caffeine, Panthenol, Phenoxyethanol.",
    howToUse: "Part the hair and apply a dropper along the parts, then massage it in. Don't rinse.",
    expiry: "2027-11",
  }),
  p({
    sku: "BT-504",
    name: "Beard oil",
    sub: "Beard care",
    brand: "Pure Formula",
    price: 70,
    photos: ["beard"],
    description: "Jojoba and cedarwood soften the beard and calm the skin under it.",
    facts: [["Volume", "30 ml"], ["Scent", "Cedarwood"]],
    ingredients: "Simmondsia Chinensis Seed Oil, Argania Spinosa Kernel Oil, Cedrus Atlantica Bark Oil, Tocopherol.",
    howToUse: "Rub 3 drops between your palms and work them through the beard to the skin.",
    expiry: "2028-06",
  }),
  p({
    sku: "BT-505",
    name: "Shaving cream",
    sub: "Beard care",
    brand: "Pure Formula",
    price: 55,
    photos: ["shave"],
    description: "A rich cream with aloe that gives a close, smooth shave.",
    facts: [["Volume", "150 ml"], ["Key ingredient", "Aloe vera"]],
    ingredients: "Aqua, Stearic Acid, Glycerin, Aloe Barbadensis Leaf Juice, Potassium Hydroxide, Coconut Acid, Parfum.",
    howToUse: "Lather a little on wet skin with your fingers or a brush, shave with the grain and rinse with cool water.",
    expiry: "2028-03",
  }),
  // ——— Gifts & sets ———
  p({
    sku: "BT-701",
    name: "Complexion brush set",
    sub: "Makeup sets",
    brand: "Rosé Lab",
    price: 195,
    photos: ["brush-set", "kabuki"],
    description: "Four brushes for foundation, powder, blush and the eyes, in a soft pouch, wrapped as a gift.",
    facts: [["Contents", "4 brushes, 1 pouch"]],
    ingredients: "Synthetic bristles (polyamide), beech wood handles, aluminium ferrules; cotton pouch.",
    howToUse: "Use the flat brush for foundation, the round one for powder, the angled one for blush and the small one for the eyes. Wash them weekly.",
    expiry: "2031-12",
  }),
];

/** The ready-made routines, each its steps' products sold together for less. */
const ROUTINES: readonly RoutineSeed[] = [
  {
    sku: "BT-601",
    name: "Morning routine for combination skin",
    skins: ["Combination"],
    steps: [
      ["Cleanse", "BT-107"],
      ["Treat", "BT-101"],
      ["Moisturise", "BT-112"],
      ["Protect", "BT-108"],
    ],
    sale: 385,
    photo: "routine-morning",
    line: "Four steps for a fresh, balanced morning: clean, bright, light and protected.",
    expiry: "2027-07",
  },
  {
    sku: "BT-602",
    name: "Evening routine for dry skin",
    skins: ["Dry"],
    steps: [
      ["Cleanse", "BT-106"],
      ["Treat", "BT-109"],
      ["Moisturise", "BT-102"],
    ],
    sale: 329,
    photo: "routine-dry",
    line: "Three steps that take off the day and put the water back in, for soft skin by the morning.",
    expiry: "2027-12",
  },
  {
    sku: "BT-603",
    name: "Clear skin routine for oily skin",
    skins: ["Oily"],
    steps: [
      ["Cleanse", "BT-107"],
      ["Treat", "BT-103"],
      ["Moisturise", "BT-112"],
      ["Protect", "BT-108"],
    ],
    sale: 299,
    photo: "routine-oily",
    line: "Four steps that balance oil and refine pores without drying the skin.",
    expiry: "2027-07",
  },
  {
    sku: "BT-604",
    name: "Calm routine for sensitive skin",
    skins: ["Sensitive"],
    steps: [
      ["Cleanse", "BT-106"],
      ["Moisturise", "BT-104"],
      ["Protect", "BT-108"],
    ],
    sale: 275,
    photo: "routine-calm",
    line: "Three gentle steps, fragrance-free, that calm the skin and rebuild its barrier.",
    expiry: "2027-07",
  },
];

/** A routine as a product of the "Routines" sub-category: its steps in its description, its price their sum, its sale price less. */
function routineProduct(r: RoutineSeed): BeautyProduct {
  const parts = r.steps.map(([step, sku]) => ({ step, product: PRODUCTS.find((x) => x.sku === sku)! }));
  const price = parts.reduce((sum, x) => sum + x.product.priceCents, 0);
  const steps = parts.map((x, i) => `${i + 1}. ${x.step}: ${x.product.name} (${x.product.brand})`).join("\n");
  return {
    sku: r.sku,
    name: r.name,
    sub: ROUTINES_CATEGORY.name,
    brand: parts[0]!.product.brand,
    skins: r.skins,
    priceCents: price,
    salePriceCents: r.sale * 100,
    photos: [r.photo, ...parts.map((x) => x.product.photos[0]!)],
    featured: true,
    description: `${r.line}\n\nThe routine, step by step:\n${steps}\n\nSold together, it costs less than each product on its own.`,
    shades: null,
    facts: [
      ["Steps", String(parts.length)],
      ["Brands", [...new Set(parts.map((x) => x.product.brand))].join(", ")],
    ],
    ingredients: parts.map((x) => `${x.product.name}: ${x.product.ingredients}`).join("\n\n"),
    howToUse: parts.map((x, i) => `${i + 1}. ${x.step}. ${x.product.howToUse}`).join("\n"),
    crueltyFree: parts.every((x) => x.product.crueltyFree),
    expiry: r.expiry,
  };
}

/** Every product of the demo, newest first as the demo lists them, the routines last. */
export const BEAUTY_PRODUCTS: readonly BeautyProduct[] = [...PRODUCTS, ...ROUTINES.map(routineProduct)];

/** The SKUs a routine bundles, in their order. */
export function routineSteps(sku: string): string[] {
  return ROUTINES.find((r) => r.sku === sku)?.steps.map(([, s]) => s) ?? [];
}

/** The main category a sub-category is in (the shop's own, never Skin type or Brands). */
export function beautyMainOf(sub: string): BeautyCategory {
  const found = BEAUTY_CATEGORIES.slice(0, -2).find((c) => c.subs.some((s) => s.name === sub));
  if (!found) throw new Error(`No main category has ${sub}.`);
  return found;
}

/** The categories a product is in, by name: its main category and sub-category, Skin type and its skin types, Brands and its brand. */
export function beautyCategoriesOf(product: BeautyProduct): string[] {
  return [beautyMainOf(product.sub).name, product.sub, ...(product.skins.length ? [SKIN_TYPE_CATEGORY.name, ...product.skins] : []), BRANDS_CATEGORY.name, product.brand];
}

/** What a product's page tells besides its description: its facts, ingredients and how to use it, genuine (and cruelty-free), its expiry and its shades' colours. */
export function beautyDetails(product: BeautyProduct): ProductDetails {
  const badges: ProductBadge[] = ["genuine", ...(product.crueltyFree ? (["cruelty_free"] as const) : [])];
  return {
    facts: [
      { name: "Brand", value: product.brand },
      ...(product.skins.length ? [{ name: "Skin type", value: product.skins.length === ALL_SKIN.length ? "All skin types" : product.skins.join(", ") }] : []),
      ...product.facts.map(([name, value]) => ({ name, value })),
    ],
    info: [
      { kind: "ingredients", text: product.ingredients },
      { kind: "how_to_use", text: product.howToUse },
    ],
    badges,
    expiry: product.expiry,
    ...(product.shades ? { swatches: Object.fromEntries(product.shades.map(([value, hex]) => [value, hex])) } : {}),
  };
}

/**
 * A product's shades as its variations (91.5): each shade its own stock (a
 * few low, one gone, as a real shop's), the product's price; the middle
 * shade chosen when the page opens. None for a product without shades.
 */
export function beautyVariants(product: BeautyProduct, index: number): CatalogVariants | null {
  if (!product.shades) return null;
  const pattern = [8, 3, 12, 0, 6, 9, 2, 14, 5];
  const items: CatalogVariants["items"] = product.shades.map(([value], i) => ({
    id: i + 1,
    values: [value],
    priceCents: null,
    salePriceCents: null,
    stock: pattern[(i + index) % pattern.length]!,
    sku: `${product.sku}-${value.replaceAll(" ", "").toUpperCase()}`,
    active: true,
  }));
  // The foundation opens on 3W (the shade finder's pick), the others on their first shade in stock.
  const first = items.find((v) => v.values[0] === "3W" && v.stock !== 0) ?? items.find((v) => v.stock !== 0);
  return { attributes: [{ name: "Shade", values: product.shades.map(([value]) => value) }], items, ...(first ? { defaultId: first.id } : {}) };
}
