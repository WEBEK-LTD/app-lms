import type { CatalogCurrency, CatalogSettings, CatalogVariants, SizeChart } from "../data/types";
import type { ClothesPhotoName } from "./shop-photos";

/**
 * 208 Lujain (لجين), the clothes shop: the demo of Studio's clothes type
 * (lib/studio/shop-types.ts) and its two Signature looks (A the black and
 * white boutique, B NOUN's streetwear, lib/studio/demo-designs/
 * clothes-signature.ts). A women's fashion house in Riyadh: its main
 * categories and their sub-categories (the category menu's rows), its
 * clothes in sizes and colours with the stock of each size and colour (the
 * store's variations, 91.5), shoes in their sizes, bags and accessories in
 * one size; its size chart, "Complete the look" and exchanges within 14
 * days. The shop, its clothes, names and prices are invented; its photos
 * are real, CC0 (public/clothes-photos/CREDITS.md).
 */

export const CLOTHES_CURRENCY: CatalogCurrency = "SAR";
export const CLOTHES_SHIPPING_CENTS = 25_00;
export const CLOTHES_FREE_SHIPPING_OVER_CENTS = 500_00;

/** The shop's size chart, in cm: the bust, waist, hips and length of each size; its titles in Arabic and Turkish too. */
export const CLOTHES_SIZE_CHART: SizeChart = {
  headers: ["Size", "Bust", "Waist", "Hips", "Length"],
  rows: [
    ["XS", "80", "62", "86", "116"],
    ["S", "84", "66", "90", "118"],
    ["M", "88", "70", "94", "120"],
    ["L", "94", "76", "100", "122"],
    ["XL", "100", "82", "106", "124"],
  ],
  unit: "cm",
  translations: { ar: ["المقاس", "الصدر", "الخصر", "الورك", "الطول"], tr: ["Beden", "Göğüs", "Bel", "Kalça", "Boy"] },
};

/** Its settings besides money: exchanges and returns within 14 days, the size chart and "Complete the look". */
export const CLOTHES_COMMERCE: Pick<CatalogSettings, "returnDays" | "fashion"> = {
  returnDays: 14,
  fashion: { sizeChart: CLOTHES_SIZE_CHART, completeLook: true },
};

/** The flash sale: a few pieces at their share off for 30 hours (made again each day), 20 at that price and 13 gone. */
export const CLOTHES_FLASH_SALE = { title: "Deal of the day", titles: { ar: "عرض اليوم", tr: "Günün fırsatı" }, percent: 30, hours: 30, limit: 20, sold: 13, skus: ["CL-602", "CL-801", "CL-108"] } as const;

/** The code shown in the app: 10% off a first order from 400 SAR. */
export const CLOTHES_COUPON = { code: "LUJAIN10", percent: 10, minOrderCents: 400_00 } as const;

export interface ClothesCategory {
  name: string;
  names: { ar: string; tr: string };
  subs: readonly { name: string; names: { ar: string; tr: string } }[];
}

const named = (name: string, ar: string, tr: string) => ({ name, names: { ar, tr } });

/** The main categories in the shop's order, each with its sub-categories. */
export const CLOTHES_CATEGORIES: readonly ClothesCategory[] = [
  { ...named("Dresses", "فساتين", "Elbiseler"), subs: [named("Midi dresses", "ميدي", "Midi"), named("Maxi dresses", "ماكسي", "Maksi"), named("Mini dresses", "قصيرة", "Mini")] },
  { ...named("Abayas", "عبايات", "Abayalar"), subs: [named("Classic abayas", "كلاسيكية", "Klasik"), named("Kimono abayas", "كيمونو", "Kimono")] },
  { ...named("Coats & jackets", "معاطف وجاكيتات", "Mont ve ceketler"), subs: [named("Trench coats", "ترنش", "Trençkotlar"), named("Wool coats", "صوف", "Yün kabanlar"), named("Jackets", "جاكيتات", "Ceketler")] },
  { ...named("Tops & knitwear", "بلوزات وتريكو", "Bluz ve triko"), subs: [named("Tops", "بلوزات", "Bluzlar"), named("Knitwear", "تريكو", "Triko")] },
  { ...named("Denim", "دنيم", "Denim"), subs: [named("Jeans", "جينز", "Kot pantolonlar")] },
  { ...named("Shoes", "أحذية", "Ayakkabılar"), subs: [named("Heels", "كعب عالٍ", "Topuklular"), named("Sneakers", "سنيكرز", "Spor ayakkabılar")] },
  { ...named("Bags", "حقائب", "Çantalar"), subs: [named("Handbags", "حقائب يد", "El çantaları"), named("Backpacks", "حقائب ظهر", "Sırt çantaları")] },
  { ...named("Accessories", "إكسسوارات", "Aksesuarlar"), subs: [named("Sunglasses", "نظارات", "Güneş gözlükleri"), named("Jewellery", "مجوهرات", "Takılar")] },
];

export type ClothesSizes = "clothes" | "shoes" | null;
export const CLOTHES_SIZES = ["XS", "S", "M", "L", "XL"] as const;
export const SHOE_SIZES = ["36", "37", "38", "39", "40"] as const;

export interface ClothesProduct {
  sku: string;
  name: string;
  /** Its sub-category, by name (its main category follows). */
  sub: string;
  priceCents: number;
  salePriceCents: number | null;
  /** Its photos, the first its cover. */
  photos: readonly ClothesPhotoName[];
  featured: boolean;
  description: string;
  /** Its sizes (clothes XS to XL, shoes 36 to 40); null: one size. */
  sizes: ClothesSizes;
  /** Its colours; one: no colour to choose. */
  colours: readonly string[];
}

const p = (sku: string, name: string, sub: string, price: number, sale: number | null, photos: readonly ClothesPhotoName[], sizes: ClothesSizes, colours: readonly string[], description: string, featured = false): ClothesProduct => ({
  sku,
  name,
  sub,
  priceCents: price * 100,
  salePriceCents: sale === null ? null : sale * 100,
  photos,
  featured,
  description,
  sizes,
  colours,
});

/** The shop's pieces, newest first as the demo lists them. */
export const CLOTHES_PRODUCTS: readonly ClothesProduct[] = [
  p("CL-101", "Rust satin midi dress", "Midi dresses", 1490, 1190, ["rust-1", "rust-2", "rust-3", "rust-4"], "clothes", ["Rust", "Black", "Olive"], "Fluid satin that falls just below the knee, with fine straps you can tie shorter or longer.\n\nLined, with a hidden zip at the side.", true),
  p("CL-107", "Polka-dot A-line dress", "Mini dresses", 690, null, ["blue-dot"], "clothes", ["Blue", "Black"], "A light cotton dress with a fitted waist and a full skirt, polka dots in white on blue.", true),
  p("CL-104", "Cream tiered maxi dress", "Maxi dresses", 1290, null, ["cream-maxi"], "clothes", ["Cream"], "Soft tiers of cotton voile, a tie at the neck and room to move.", true),
  p("CL-110", "Little black dress", "Mini dresses", 1040, null, ["black-dress"], "clothes", ["Black", "Burgundy", "Navy"], "The dress every wardrobe needs: a clean neckline and a fitted cut, for the day and the evening."),
  p("CL-102", "Red front-slit midi dress", "Midi dresses", 960, null, ["red-dress"], "clothes", ["Red", "Black"], "A fitted midi in a stretch crepe with a slit at the front and a keyhole neckline."),
  p("CL-103", "Camel wrap midi dress", "Midi dresses", 1150, null, ["camel-dress"], "clothes", ["Camel"], "A wrap dress that moves with you, tied at the waist, in a soft crepe."),
  p("CL-108", "Black knit sweater dress", "Mini dresses", 820, 490, ["knit-dress"], "clothes", ["Black", "Grey"], "A chunky knit to wear on its own or over jeans, loose and warm."),
  p("CL-109", "Floral print romper", "Mini dresses", 640, null, ["floral-romper"], "clothes", ["Floral"], "Short sleeves, a belted waist and a print of flowers on black."),
  p("CL-111", "Sand knit dress", "Midi dresses", 780, null, ["beige-dress"], "clothes", ["Sand", "Brown", "Cream"], "A fine ribbed knit that follows the body, with long sleeves."),
  p("CL-106", "Burgundy velvet top dress", "Maxi dresses", 1240, null, ["velvet"], "clothes", ["Burgundy"], "Deep burgundy velvet with long sleeves, for the evening."),
  p("CL-201", "Sunset black abaya", "Classic abayas", 1350, null, ["abaya-sil", "abaya-road"], "clothes", ["Black"], "A flowing black abaya in a light crepe, open at the front with a tie.", true),
  p("CL-202", "Open-front black abaya", "Classic abayas", 1180, null, ["abaya-road"], "clothes", ["Black", "Charcoal"], "A long open abaya with wide sleeves, easy over everything."),
  p("CL-203", "Floral kimono abaya", "Kimono abayas", 990, null, ["long-floral"], "clothes", ["Floral"], "Kimono sleeves and a soft floral print, worn open or tied."),
  p("CL-301", "Olive button jacket", "Jackets", 1450, null, ["olive-jacket", "hero-trench"], "clothes", ["Olive", "Black"], "A structured jacket with a row of buttons down the front and a high collar.", true),
  p("CL-302", "Pink belted trench", "Trench coats", 1690, null, ["pink-trench"], "clothes", ["Pink", "Beige"], "A classic trench in a soft pink, belted, with deep pockets."),
  p("CL-303", "Mustard wool coat", "Wool coats", 1890, null, ["yellow-coat"], "clothes", ["Mustard"], "A long wool-blend coat in a warm mustard."),
  p("CL-304", "Short suede jacket, fur collar", "Jackets", 860, 690, ["camel-jacket", "brick-jacket"], "clothes", ["Camel", "Black", "Olive", "Rust"], "Soft faux suede, a faux fur collar and a cropped cut that sits at the waist.", true),
  p("CL-305", "Orange teddy coat", "Wool coats", 1290, null, ["orange-coat"], "clothes", ["Orange", "Cream"], "A cosy teddy coat in a bright orange, warm without the weight."),
  p("CL-306", "Black wool coat", "Wool coats", 1590, null, ["c-black-coat"], "clothes", ["Black"], "A long black coat with clean lines, made to last."),
  p("CL-307", "Long dark coat", "Trench coats", 1490, null, ["dark-coat"], "clothes", ["Black", "Navy"], "A long coat with a wide collar, belted."),
  p("CL-308", "Printed bomber jacket", "Jackets", 920, null, ["graffiti"], "clothes", ["Multi"], "A bold printed bomber with ribbed cuffs."),
  p("CL-401", "Black halter top", "Tops", 390, null, ["look"], "clothes", ["Black"], "A halter neck top with a fitted cut, in a soft stretch jersey."),
  p("CL-402", "Lace neck top", "Tops", 420, null, ["lace-top"], "clothes", ["Black"], "A fine lace neckline on a soft black top."),
  p("CL-403", "Ruffle cream blouse", "Tops", 450, null, ["turtleneck"], "clothes", ["Cream", "White"], "Ruffles at the shoulders and a high neck, in a light cream.", true),
  p("CL-404", "Black ribbed top", "Tops", 350, null, ["black-top"], "clothes", ["Black", "White"], "A close-fitting ribbed top to wear with everything."),
  p("CL-405", "Cream fleece pullover", "Knitwear", 520, null, ["fleece"], "clothes", ["Cream", "Grey"], "Soft fleece, a relaxed fit and a high collar."),
  p("CL-406", "Plaid flannel shirt", "Knitwear", 320, 240, ["flannel"], "clothes", ["Red plaid", "Green plaid"], "A brushed flannel shirt in a red and black check, loose to wear open."),
  p("CL-407", "Zip ribbed tank", "Tops", 290, null, ["braids"], "clothes", ["Black"], "A ribbed tank with a zip at the front."),
  p("CL-501", "Wide-leg jeans", "Jeans", 380, null, ["fence-jeans"], "clothes", ["Light blue", "Mid blue"], "High-waisted, wide-leg jeans in a light wash."),
  p("CL-502", "Classic blue jeans", "Jeans", 340, null, ["denim"], "clothes", ["Blue", "Dark blue"], "Straight-leg jeans in a mid wash, with a little stretch."),
  p("CL-601", "Nude ankle-strap sandals", "Heels", 890, null, ["nude-heels"], "shoes", ["Nude"], "Strappy sandals on a slim heel, with a strap at the ankle.", true),
  p("CL-602", "Black strappy heels", "Heels", 1090, null, ["black-heels"], "shoes", ["Black"], "Pointed heels with fine straps across the foot."),
  p("CL-603", "Red patent pumps", "Heels", 820, null, ["red-pumps"], "shoes", ["Red", "Black"], "Patent pumps on a high heel, in a bright red."),
  p("CL-604", "White leather sneakers", "Sneakers", 540, null, ["sneak-white"], "shoes", ["White"], "Clean white sneakers in a soft leather.", true),
  p("CL-605", "Canvas low sneakers", "Sneakers", 460, null, ["sneak-feet", "flatlay-sneak"], "shoes", ["White", "Black"], "Low canvas sneakers with a rubber sole."),
  p("CL-701", "Black leather handbag", "Handbags", 740, null, ["black-bag"], null, ["Black"], "A soft leather handbag with a zip top and a long strap."),
  p("CL-702", "Floral shoulder bag", "Handbags", 990, null, ["floral-bag"], null, ["Floral"], "A structured shoulder bag in a floral print, with a gold clasp.", true),
  p("CL-703", "Patent clutch", "Handbags", 650, null, ["patent-clutch"], null, ["Black"], "A glossy patent clutch for the evening."),
  p("CL-704", "Brown leather satchel", "Handbags", 1180, null, ["brown-bag"], null, ["Brown"], "A roomy leather satchel with buckles."),
  p("CL-705", "Cream mini backpack", "Backpacks", 460, null, ["white-backpack"], null, ["Cream"], "A small backpack in a soft cream, with a drawstring top."),
  p("CL-801", "Round black sunglasses", "Sunglasses", 640, 450, ["sunglasses"], null, ["Black"], "Round frames with dark lenses, UV400."),
  p("CL-802", "Tortoise sunglasses", "Sunglasses", 380, null, ["accessories"], null, ["Tortoise"], "Cat-eye frames in a tortoiseshell pattern."),
  p("CL-803", "Rose gold ring", "Jewellery", 320, null, ["ring"], null, ["Rose gold"], "A fine rose gold ring with a small stone."),
  p("CL-804", "Fine chain necklace", "Jewellery", 280, null, ["necklace"], null, ["Silver"], "A long fine chain with a small pendant."),
  p("CL-805", "Stacked bracelets", "Jewellery", 210, null, ["bracelets"], null, ["Gold"], "A set of thin bracelets to wear together."),
  p("CL-806", "Gold hand chain", "Jewellery", 260, null, ["hand-jewel"], null, ["Gold"], "A delicate chain from the wrist to the finger."),
];

/** The main category a sub-category is in. */
export function clothesMainOf(sub: string): ClothesCategory {
  const found = CLOTHES_CATEGORIES.find((c) => c.subs.some((s) => s.name === sub));
  if (!found) throw new Error(`No main category has ${sub}.`);
  return found;
}

/**
 * A piece's sizes and colours as its variations (91.5): each colour in each
 * size, its stock its own (a few sizes low, one gone, as a real shop's);
 * the product's price (none of its own); none for one size in one colour.
 */
export function clothesVariants(product: ClothesProduct, index: number): CatalogVariants | null {
  const sizes = product.sizes === "clothes" ? CLOTHES_SIZES : product.sizes === "shoes" ? SHOE_SIZES : null;
  const colours = product.colours.length > 1 ? product.colours : null;
  if (!sizes && !colours) return null;
  const attributes = [...(sizes ? [{ name: "Size", values: [...sizes] }] : []), ...(colours ? [{ name: "Colour", values: [...colours] }] : [])];
  // The stock of each size: most there, the smallest and largest low, one size gone in some colours.
  const pattern = [2, 6, 9, 4, 0, 5, 1, 7];
  const items: CatalogVariants["items"] = [];
  let id = 1;
  for (const [si, size] of (sizes ?? [null]).entries()) {
    for (const [ci, colour] of (colours ?? [null]).entries()) {
      const stock = pattern[(si + ci * 3 + index) % pattern.length]!;
      items.push({ id: id++, values: [...(size ? [size] : []), ...(colour ? [colour] : [])], priceCents: null, salePriceCents: null, stock, sku: `${product.sku}-${[size, colour].filter(Boolean).join("-").replaceAll(" ", "").toUpperCase()}`, active: true });
    }
  }
  // M in the first colour chosen when the page opens, when there is one.
  const first = items.find((v) => v.values[0] === "M" || v.values[0] === "38");
  return { attributes, items, ...(first && first.stock !== 0 ? { defaultId: first.id } : {}) };
}
