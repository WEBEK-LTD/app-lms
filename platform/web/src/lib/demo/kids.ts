import type { CatalogCurrency, CatalogSettings, CatalogVariants, ProductBadge, ProductDetails, SizeChart } from "../data/types";
import type { KidsPhotoName } from "./shop-photos";

/**
 * 209 Toota (توتة), the kids' clothes shop: the demo of Studio's kids'
 * clothes type (lib/studio/shop-types.ts) and its two Signature looks (A
 * TOOTA's soft pastels, B MINIMO's bright navy, lib/studio/demo-designs/
 * kids-signature.ts). Clothes for children from birth to 12 in Cairo: its
 * main categories (baby and newborn, girls, boys, shoes, accessories,
 * newborn gifts and ready sets) and their sub-categories (the category
 * menu's rows), its pieces in sizes by age (0–3 months to 11–12 years, the
 * stock of each size and colour its own), its size chart by age with the
 * height, weight and chest of each, the newborn gift boxes with gift
 * wrapping and a greeting card to add (add-ons) and the card's message at
 * checkout, the ready-made sets with their pieces, what each piece is made
 * of and how to wash it, exchanges within 30 days, the weekend's flash sale
 * and its code. The shop, its clothes, names and prices are invented; its
 * photos are real, CC0 (public/kids-photos/CREDITS.md).
 */

export const KIDS_CURRENCY: CatalogCurrency = "EGP";
export const KIDS_SHIPPING_CENTS = 60_00;
export const KIDS_FREE_SHIPPING_OVER_CENTS = 1500_00;

/** The sizes by age, youngest first: the size chart's first column and the pieces' sizes. */
export const KIDS_AGE_SIZES = ["0–3M", "3–6M", "6–12M", "12–18M", "18–24M", "2–3Y", "3–4Y", "4–5Y", "5–6Y", "7–8Y", "9–10Y", "11–12Y"] as const;
export type KidsAgeSize = (typeof KIDS_AGE_SIZES)[number];

/** Each age size's months (from, to). */
export const KIDS_AGE_MONTHS: Record<KidsAgeSize, readonly [number, number]> = {
  "0–3M": [0, 3],
  "3–6M": [3, 6],
  "6–12M": [6, 12],
  "12–18M": [12, 18],
  "18–24M": [18, 24],
  "2–3Y": [24, 36],
  "3–4Y": [36, 48],
  "4–5Y": [48, 60],
  "5–6Y": [60, 72],
  "7–8Y": [84, 96],
  "9–10Y": [108, 120],
  "11–12Y": [132, 144],
};

/** The shop's size chart by age: the height and chest in cm, the weight in kg; its titles in Arabic and Turkish too. */
export const KIDS_SIZE_CHART: SizeChart = {
  headers: ["Age", "Height", "Weight (kg)", "Chest"],
  rows: [
    ["0–3M", "56–62", "3.5–6", "40–42"],
    ["3–6M", "62–68", "6–8", "42–44"],
    ["6–12M", "68–80", "8–10.5", "44–47"],
    ["12–18M", "80–86", "10.5–12", "47–49"],
    ["18–24M", "86–92", "12–13.5", "49–51"],
    ["2–3Y", "92–98", "13.5–15", "51–53"],
    ["3–4Y", "98–104", "15–17", "53–55"],
    ["4–5Y", "104–110", "17–19", "55–57"],
    ["5–6Y", "110–116", "19–21", "57–59"],
    ["7–8Y", "122–128", "23–26", "61–64"],
    ["9–10Y", "134–140", "28–33", "66–69"],
    ["11–12Y", "146–152", "36–42", "72–75"],
  ],
  unit: "cm",
  translations: { ar: ["العمر", "الطول", "الوزن (كغ)", "الصدر"], tr: ["Yaş", "Boy", "Kilo (kg)", "Göğüs"] },
};

/** The beginnings of a card's message a customer can tap, in English, Arabic (Modern Standard) and Turkish. */
const KIDS_CARD_BEGINNINGS = [
  { en: "Welcome to the world, little one!", ar: "أهلًا بك في الدنيا أيها الصغير!", tr: "Dünyaya hoş geldin minik!" },
  { en: "Congratulations on your new baby!", ar: "مبارك المولود الجديد!", tr: "Yeni bebeğiniz hayırlı olsun!" },
  { en: "Happy birthday!", ar: "عيد ميلاد سعيد!", tr: "Doğum günün kutlu olsun!" },
  { en: "With all our love", ar: "مع كلِّ حبّنا", tr: "Tüm sevgimizle" },
  { en: "Eid Mubarak!", ar: "عيد مبارك!", tr: "Bayramın mübarek olsun!" },
] as const;

/**
 * Its settings besides money: exchanges within 30 days, the size chart by
 * age and "Complete the look", and the card's message at checkout (the
 * customer's own words, or a beginning to tap) for the gifts.
 */
export const KIDS_COMMERCE: Pick<CatalogSettings, "returnDays" | "fashion" | "gifts"> = {
  returnDays: 30,
  fashion: { sizeChart: KIDS_SIZE_CHART, completeLook: true },
  gifts: {
    checkout: "standard",
    message: true,
    maxLength: 200,
    starters: KIDS_CARD_BEGINNINGS.map((b) => b.en),
    starterTexts: { ar: KIDS_CARD_BEGINNINGS.map((b) => b.ar), tr: KIDS_CARD_BEGINNINGS.map((b) => b.tr) },
    recipient: false,
    anonymous: false,
  },
};

/** The weekend's flash sale: a few pieces at their share off for 30 hours (made again each day), 24 at that price and 15 gone. */
export const KIDS_FLASH_SALE = { title: "Weekend deals", titles: { ar: "عروض نهاية الأسبوع", tr: "Hafta sonu fırsatları" }, percent: 30, hours: 30, limit: 24, sold: 15, skus: ["KD-301", "KD-208", "KD-504"] } as const;

/** The code shown in the app: 10% off a first order from 1,000 EGP. */
export const KIDS_COUPON = { code: "TOOTA10", percent: 10, minOrderCents: 1000_00 } as const;

export interface KidsCategory {
  name: string;
  names: { ar: string; tr: string };
  subs: readonly { name: string; names: { ar: string; tr: string } }[];
}

const named = (name: string, ar: string, tr: string) => ({ name, names: { ar, tr } });

/** The main categories in the shop's order, each with its sub-categories (a sub-category's name is the shop's own, once). */
export const KIDS_CATEGORIES: readonly KidsCategory[] = [
  { ...named("Baby & newborn", "البيبي والمواليد", "Bebek ve yenidoğan"), subs: [named("Newborn sets", "أطقم الولادة", "Yenidoğan setleri"), named("Bodysuits & rompers", "بودي وأوفرول", "Body ve tulumlar"), named("Sleepwear", "ملابس النوم", "Uyku giyimi"), named("Blankets & swaddles", "بطانيات ولفّات", "Battaniye ve kundaklar")] },
  { ...named("Girls", "البنات", "Kız çocuk"), subs: [named("Dresses", "فساتين", "Elbiseler"), named("Girls' knitwear", "تريكو", "Triko"), named("Pyjamas & robes", "بيجامات وأرواب", "Pijama ve bornozlar"), named("Coats", "معاطف", "Montlar")] },
  { ...named("Boys", "الأولاد", "Erkek çocuk"), subs: [named("Hoodies & knitwear", "هوديز وتريكو", "Kapüşonlu ve triko"), named("Jackets", "جاكيتات", "Ceketler"), named("Shirts", "قمصان", "Gömlekler"), named("Jeans & overalls", "جينز وأوفرول", "Kot ve salopetler")] },
  { ...named("Shoes", "الأحذية", "Ayakkabılar"), subs: [named("Sneakers", "أحذية رياضية", "Spor ayakkabılar"), named("First steps", "الخطوة الأولى", "İlk adımlar"), named("Slippers", "شباشب منزلية", "Ev terlikleri")] },
  { ...named("Accessories", "الإكسسوارات", "Aksesuarlar"), subs: [named("Hats", "قبعات", "Şapkalar"), named("Socks & tights", "جوارب", "Çorap ve külotlu çoraplar"), named("Mittens", "قفازات", "Eldivenler")] },
  { ...named("Newborn gifts", "هدايا المواليد", "Yenidoğan hediyeleri"), subs: [named("Gift boxes", "صناديق الهدايا", "Hediye kutuları"), named("Soft toys", "دمى ناعمة", "Peluş oyuncaklar")] },
  { ...named("Ready sets", "أطقم جاهزة", "Hazır takımlar"), subs: [named("Everyday sets", "أطقم يومية", "Günlük takımlar"), named("Occasion sets", "أطقم المناسبات", "Özel gün takımları")] },
];

/** The add-ons' own category (gift wrapping and the card): never listed in the app, as it holds add-ons only. */
export const KIDS_ADDON_CATEGORY = named("Gift wrapping & cards", "التغليف والبطاقات", "Hediye paketi ve kartlar");
/** The main category the add-ons are offered with. */
export const KIDS_GIFTS_CATEGORY = "Newborn gifts";
/** The main category of the ready-made sets. */
export const KIDS_SETS_CATEGORY = "Ready sets";

/** What a piece is made of and how it is washed, in its own words. */
type Care = "cotton" | "knit" | "outer" | "shoes" | "toy";
const CARE: Record<Care, string> = {
  cotton: "Machine wash at 30°C, inside out, with similar colours. Dry flat in the shade; iron on low.",
  knit: "Hand wash cold or on the wool cycle. Dry flat and never hang; no bleach.",
  outer: "Machine wash at 30°C with the zip closed. Hang to dry; do not iron.",
  shoes: "Wipe clean with a damp cloth and let them dry away from heat.",
  toy: "Surface wash with a damp cloth and mild soap; dry in the air.",
};

export interface KidsProduct {
  sku: string;
  name: string;
  /** Its sub-category, by name (its main category follows). */
  sub: string;
  /** Another sub-category it also sits in (a set in Ready sets and in Girls), by name; its main category follows too. */
  also?: string;
  priceCents: number;
  salePriceCents: number | null;
  /** Its photos, the first its cover; none: a card drawn without one. */
  photos: readonly KidsPhotoName[];
  featured: boolean;
  description: string;
  /** Its sizes: ages (the size chart's), or shoes' EU sizes; empty: one size. */
  sizes: readonly string[];
  /** Its colours, each with its swatch; one: no colour to choose. */
  colours: readonly (readonly [string, string])[];
  /** The fabric and the fit, shown as facts. */
  fabric: string;
  fit: string | null;
  care: Care;
  /** Organic cotton, made by hand, tested for children's safety, gift wrapping on offer. */
  badges?: readonly ProductBadge[];
  /** What is in the box or the set. */
  inTheBox?: string;
  /** Its safety words (a soft toy's). */
  safety?: string;
  /** The ages it is for in months when its sizes don't tell (shoes, hats, gifts). */
  ages?: { min: number; max: number | null };
  /** A gift wrapping or a card: offered with the newborn gifts, never listed alone. */
  addon?: boolean;
}

type Extra = Partial<Pick<KidsProduct, "also" | "badges" | "inTheBox" | "safety" | "ages" | "featured" | "addon">>;

const p = (sku: string, name: string, sub: string, price: number, sale: number | null, photos: readonly KidsPhotoName[], sizes: readonly string[], colours: readonly (readonly [string, string])[], fabric: string, fit: string | null, care: Care, description: string, extra: Extra = {}): KidsProduct => ({
  sku,
  name,
  sub,
  priceCents: price * 100,
  salePriceCents: sale === null ? null : sale * 100,
  photos,
  featured: false,
  description,
  sizes,
  colours,
  fabric,
  fit,
  care,
  ...extra,
});

const NEWBORN = ["0–3M", "3–6M"] as const;
const BABY = ["0–3M", "3–6M", "6–12M", "12–18M", "18–24M"] as const;
const TODDLER = ["12–18M", "18–24M", "2–3Y", "3–4Y"] as const;
const LITTLE = ["2–3Y", "3–4Y", "4–5Y", "5–6Y"] as const;
const KID = ["3–4Y", "4–5Y", "5–6Y", "7–8Y", "9–10Y"] as const;
const BIG = ["5–6Y", "7–8Y", "9–10Y", "11–12Y"] as const;

/** The shop's pieces, newest first as the demo lists them. */
export const KIDS_PRODUCTS: readonly KidsProduct[] = [
  p("KD-306", "Merino sweater with wooden buttons", "Hoodies & knitwear", 1450, 1150, ["rust-sweater"], ["12–18M", "18–24M", "2–3Y", "3–4Y", "4–5Y"], [["Rust", "#B4643F"], ["Oat", "#E6D8C3"]], "Soft merino wool", "Relaxed, room to grow", "knit", "A fine merino knit that keeps them warm without the itch, with wooden buttons at the shoulder so it goes on easily.", { featured: true }),
  p("KD-201", "Tiered cotton dress", "Dresses", 980, null, ["tiered-dress"], LITTLE, [["Rainbow", "#E58FA0"], ["Pink", "#E7B8B4"]], "Organic cotton", "Loose and twirly", "cotton", "Light tiers of organic cotton in sunny colours, with a soft lined bodice and buttons at the back.", { featured: true, badges: ["organic"] }),
  p("KD-307", "Hooded raincoat", "Jackets", 1190, null, ["yellow-raincoat"], ["4–5Y", "5–6Y", "7–8Y", "9–10Y"], [["Yellow", "#E9C239"], ["Navy", "#27457A"]], "Waterproof shell, cotton lining", "Room for a sweater underneath", "outer", "A raincoat with taped seams, a deep hood and press studs small hands can manage.", { also: "Coats" }),
  p("KD-101", "Organic newborn set, 3 pieces", "Newborn sets", 820, null, ["newborn-knit", "knit-feet"], NEWBORN, [["Oat", "#E6D8C3"], ["Mint", "#BFDCCB"]], "Organic Pima cotton", "Soft and roomy", "cotton", "A bodysuit, footed trousers and a knotted hat in the softest organic cotton, for the first weeks at home.", { featured: true, badges: ["organic"], inTheBox: "A long-sleeved bodysuit, footed trousers and a knotted hat." }),
  p("KD-302", "Padded check jacket", "Jackets", 1450, null, ["plaid-jacket"], LITTLE, [["Navy check", "#2B3148"], ["Red check", "#8B3A3A"]], "Wool-blend check, padded lining", "Regular", "outer", "A warm check jacket with a light padding, a stand-up collar and two deep pockets.", { featured: true }),
  p("KD-205", "Cream cable cardigan", "Girls' knitwear", 1350, null, ["cream-knit"], LITTLE, [["Cream", "#EFE6D8"], ["Pink", "#E7B8B4"]], "Cotton and cashmere", "Relaxed", "knit", "A chunky cable cardigan in cotton with a touch of cashmere, buttoned all the way down."),
  p("KD-208", "Hooded terry bathrobe", "Pyjamas & robes", 690, null, ["robe-b"], ["2–3Y", "3–4Y", "4–5Y", "5–6Y", "7–8Y"], [["White", "#F4F1EA"]], "100% Egyptian cotton terry", "Long, with a belt", "cotton", "A thick terry robe with a hood and a belt, warm straight out of the bath."),
  p("KD-203", "Pink striped pyjamas", "Pyjamas & robes", 900, 720, ["pink-pajamas"], ["3–4Y", "4–5Y", "5–6Y", "7–8Y"], [["Pink", "#E7B8B4"], ["Blue", "#BFD2E6"]], "Cotton poplin", "Relaxed", "cotton", "Classic pyjamas with piping, a button front and an elastic waist, in a fine cotton that breathes."),
  p("KD-103", "Printed bodysuit and sun hat", "Bodysuits & rompers", 540, null, ["romper-hat"], ["3–6M", "6–12M", "12–18M", "18–24M"], [["Cream", "#EFE6D8"], ["Pink", "#E7B8B4"]], "Pima cotton", "Snug", "cotton", "A short-sleeved bodysuit with poppers underneath and a matching sun hat with a wide brim.", { inTheBox: "A bodysuit and a sun hat." }),
  p("KD-204", "Velvet winter coat", "Coats", 1690, null, ["girls-coats"], BIG, [["Plum", "#5A2F48"], ["Navy", "#2F3C5C"]], "Cotton velvet, quilted lining", "Regular", "outer", "A warm coat in a soft cotton velvet with a quilted lining and covered buttons."),
  p("KD-301", "Grey fleece hoodie", "Hoodies & knitwear", 950, 760, ["grey-hoodie"], KID, [["Grey", "#9EA3A8"], ["Navy", "#2B3148"]], "Brushed cotton fleece", "Relaxed", "cotton", "A brushed fleece hoodie with a kangaroo pocket and ribbed cuffs, for school mornings and the park."),
  p("KD-207", "Summer play dress", "Dresses", 760, null, ["summer-outfit"], TODDLER, [["Pink", "#E58FA0"], ["Yellow", "#F2C14E"]], "Cotton jersey", "Loose", "cotton", "An easy jersey dress for running around in, with bloomers to match."),
  p("KD-104", "Striped sleepsuit", "Sleepwear", 480, null, ["sleep-striped"], BABY, [["Grey stripe", "#B8B8B2"], ["Blue stripe", "#A9BED6"]], "Organic cotton rib", "Snug, footed", "cotton", "A footed sleepsuit in a soft rib with a two-way zip, so night changes stay quiet.", { badges: ["organic"] }),
  p("KD-303", "Denim jacket", "Jackets", 1190, null, ["denim-jacket"], ["3–4Y", "4–5Y", "5–6Y", "7–8Y"], [["Indigo", "#2F3F66"]], "Soft washed denim", "Regular", "outer", "A classic denim jacket in a washed, soft denim with chest pockets and metal buttons."),
  p("KD-304", "Check flannel shirt", "Shirts", 620, null, ["plaid-shirt"], LITTLE, [["Brown check", "#8A6A4E"]], "Brushed cotton flannel", "Regular", "cotton", "A brushed flannel shirt that layers over a tee, with snap buttons."),
  p("KD-305", "Soft denim overalls", "Jeans & overalls", 860, null, ["overalls"], ["12–18M", "18–24M", "2–3Y", "3–4Y", "4–5Y"], [["Light blue", "#9DB6D3"]], "Stretch cotton denim", "Relaxed, adjustable straps", "cotton", "Overalls with adjustable straps and poppers on the legs for quick changes."),
  p("KD-105", "Knitted baby blanket", "Blankets & swaddles", 750, null, ["knit-blanket"], [], [["Ivory", "#F2ECE0"]], "Organic cotton knit", null, "knit", "A soft cable-knit blanket, 80 × 100 cm, for the pram, the cot and the first photos.", { badges: ["organic", "handmade"], ages: { min: 0, max: 24 } }),
  p("KD-106", "Muslin swaddles, pack of 2", "Blankets & swaddles", 420, 340, ["foot-muslin"], [], [["White", "#F7F5F0"], ["Sand", "#E3D3BC"]], "Cotton muslin", null, "cotton", "Two airy muslin squares, 120 × 120 cm, to swaddle, to shade the pram and to cuddle.", { ages: { min: 0, max: 12 }, inTheBox: "Two muslin swaddles." }),
  p("KD-107", "Knit footed leggings", "Bodysuits & rompers", 380, null, ["knit-feet"], ["0–3M", "3–6M", "6–12M"], [["Grey", "#B8B8B2"]], "Cotton knit", "Snug", "knit", "Soft footed leggings with a wide waistband that sits gently over the tummy."),
  p("KD-108", "Baby soft romper", "Bodysuits & rompers", 450, null, ["baby-legs"], ["3–6M", "6–12M", "12–18M"], [["White", "#F7F5F0"]], "Pima cotton", "Loose", "cotton", "A light romper with poppers between the legs, cool for the warm months."),
  p("KD-202", "White party dress", "Dresses", 1250, null, ["white-dresses"], BIG, [["White", "#F7F5F0"]], "Cotton with a tulle skirt", "Fitted waist, full skirt", "cotton", "A party dress with a cotton bodice and a soft tulle skirt, for Eid and every celebration."),
  p("KD-401", "Sparkle sneakers", "Sneakers", 1090, null, ["sparkle-sneakers"], ["26", "28", "30", "32", "34"], [["Silver", "#D8D8D8"]], "Glitter upper, rubber sole", "True to size", "shoes", "Sneakers that sparkle, with a flexible non-slip sole and laces that stay tied.", { ages: { min: 36, max: 120 } }),
  p("KD-402", "First-steps canvas shoes", "First steps", 590, null, ["baby-shoes"], ["18", "19", "20", "21"], [["Grey", "#9EA3A8"]], "Cotton canvas, soft sole", "True to size", "shoes", "Light canvas shoes with a soft, bendy sole for the very first steps.", { ages: { min: 9, max: 24 } }),
  p("KD-403", "Bunny house slippers", "Slippers", 390, null, ["slippers"], ["24", "26", "28", "30"], [["Pink", "#E7B8B4"]], "Faux fur, non-slip sole", "True to size", "shoes", "Fluffy bunny slippers with a non-slip sole for the stairs.", { ages: { min: 12, max: 72 } }),
  p("KD-501", "Pom-pom wool beanie", "Hats", 320, null, ["pom-beanie"], [], [["Light grey", "#B9C8CF"], ["Cream", "#E9DFCF"]], "Wool blend, fleece lining", null, "knit", "A warm beanie with a big pom-pom and a fleece lining around the ears.", { ages: { min: 24, max: 96 } }),
  p("KD-502", "Green knit hat", "Hats", 290, null, ["knit-hat-green"], [], [["Green", "#6E8B5E"], ["Grey", "#9EA3A8"]], "Cotton knit", null, "knit", "A snug knit hat with two pom-poms, for the first cold mornings.", { ages: { min: 12, max: 60 } }),
  p("KD-503", "Straw sun hat", "Hats", 340, null, ["straw-hat"], [], [["Natural", "#D9C08F"]], "Natural straw, cotton band", null, "toy", "A light straw hat with a wide brim and a chin strap that holds in the wind.", { ages: { min: 24, max: 120 } }),
  p("KD-504", "Striped wool socks, pack of 3", "Socks & tights", 190, null, ["knit-socks"], [], [["Stripes", "#8A6A4E"]], "Wool and cotton", null, "knit", "Three pairs of warm striped socks with a soft cuff that doesn't pinch.", { ages: { min: 24, max: 96 }, inTheBox: "Three pairs of socks." }),
  p("KD-505", "Striped tights, pack of 2", "Socks & tights", 260, null, ["striped-tights"], ["2–3Y", "4–5Y", "7–8Y"], [["Red and black", "#8B3A3A"]], "Cotton with a little stretch", "Snug", "cotton", "Two pairs of soft cotton tights in bold stripes.", { inTheBox: "Two pairs of tights." }),
  p("KD-506", "Knitted mittens", "Mittens", 280, null, ["mittens"], [], [["Grey", "#9EA3A8"]], "Wool blend", null, "knit", "Warm mittens on a cord, so neither one goes missing.", { ages: { min: 24, max: 60 } }),
  p("KD-601", "First newborn gift box", "Gift boxes", 1450, null, ["gift-kraft", "newborn-knit"], [], [], "Organic cotton pieces", null, "cotton", "Our favourite gift for a new baby: four soft pieces in a kraft box tied with a ribbon. Add gift wrapping and a card with your message.", { featured: true, badges: ["organic", "gift_wrap"], ages: { min: 0, max: 6 }, inTheBox: "A bodysuit, a knotted hat, a knitted blanket and a soft toy." }),
  p("KD-602", "Pink welcome-baby box", "Gift boxes", 1290, null, ["gift-pink", "romper-hat"], [], [], "Organic cotton pieces", null, "cotton", "A pink box of first things: a sleepsuit, a muslin swaddle and a bib, with a card in it.", { badges: ["organic", "gift_wrap"], ages: { min: 0, max: 6 }, inTheBox: "A sleepsuit, a muslin swaddle, a bib and a card." }),
  p("KD-603", "Cosy winter gift box", "Gift boxes", 690, null, ["mittens", "knit-socks"], [], [], "Wool blend knits", null, "knit", "Everything for a warm winter: a hat, mittens and socks, boxed and ready to give.", { badges: ["gift_wrap"], ages: { min: 12, max: 60 }, inTheBox: "A knitted hat, mittens and a pair of socks." }),
  p("KD-604", "Teddy in a knit jumper", "Soft toys", 450, null, ["teddy-sweater"], [], [], "Plush with a cotton knit jumper", null, "toy", "A cuddly teddy in a hand-knitted jumper, a friend from the very first day.", { badges: ["safety_tested", "handmade", "gift_wrap"], ages: { min: 0, max: null }, safety: "Embroidered eyes and nose, no small parts that come off. Suitable from birth." }),
  p("KD-701", "Weekend set: check jacket, beanie and overalls", "Everyday sets", 2390, null, ["plaid-jacket", "pom-beanie", "overalls"], LITTLE, [], "Wool blend, cotton denim", "Regular", "outer", "The whole weekend look, sold as one: the padded check jacket, the pom-pom beanie and the soft denim overalls, in the same size.", { also: "Jackets", featured: true, inTheBox: "The padded check jacket, the pom-pom beanie and the denim overalls." }),
  p("KD-702", "Party set: tiered dress and tights", "Occasion sets", 1090, null, ["tiered-dress", "striped-tights"], LITTLE, [], "Organic cotton", "Loose and twirly", "cotton", "A party outfit, sold as one: the tiered cotton dress with a pair of striped tights.", { also: "Dresses", badges: ["organic"], inTheBox: "The tiered cotton dress and a pair of striped tights." }),
  p("KD-703", "Eid set: white dress and hair bow", "Occasion sets", 1450, null, ["white-dresses"], BIG, [], "Cotton with a tulle skirt", "Fitted waist, full skirt", "cotton", "The white party dress with a satin hair bow, ready for Eid morning.", { also: "Dresses", inTheBox: "The white party dress and a satin hair bow." }),
  p("KD-704", "Home-coming set, 5 pieces", "Everyday sets", 1190, null, ["newborn-knit", "knit-feet", "foot-muslin"], NEWBORN, [], "Organic Pima cotton", "Soft and roomy", "cotton", "Everything for the first day home: a bodysuit, footed trousers, a hat, mittens and a muslin swaddle.", { also: "Newborn sets", badges: ["organic"], inTheBox: "A bodysuit, footed trousers, a knotted hat, scratch mittens and a muslin swaddle." }),
  p("KD-705", "School-day set: sweater and shirt", "Everyday sets", 1790, null, ["rust-sweater", "plaid-shirt"], ["2–3Y", "3–4Y", "4–5Y"], [], "Merino wool, cotton flannel", "Relaxed", "knit", "The merino sweater over the check flannel shirt, sold together for a warm school day.", { also: "Hoodies & knitwear", inTheBox: "The merino sweater and the check flannel shirt." }),
  // The add-ons offered with the newborn gifts (never listed on their own).
  p("KD-901", "Gift wrapping", KIDS_ADDON_CATEGORY.name, 60, null, ["gift-kraft"], [], [], "Kraft paper and a cotton ribbon", null, "toy", "Wrapped by hand in kraft paper with a cotton ribbon and a sprig.", { addon: true }),
  p("KD-902", "Greeting card", KIDS_ADDON_CATEGORY.name, 35, null, [], [], [], "Recycled card", null, "toy", "A folded card with your message written in it by hand.", { addon: true }),
];

/** The main category a sub-category is in. */
export function kidsMainOf(sub: string): KidsCategory {
  const found = KIDS_CATEGORIES.find((c) => c.subs.some((s) => s.name === sub));
  if (!found) throw new Error(`No main category has ${sub}.`);
  return found;
}

/** The categories a piece sits in, by name: its main one and its sub-category, and another pair when it is in two (a set). The add-ons: their own. */
export function kidsCategoriesOf(product: KidsProduct): string[] {
  if (product.addon) return [KIDS_ADDON_CATEGORY.name];
  const pair = (sub: string) => [kidsMainOf(sub).name, sub];
  return [...new Set([...pair(product.sub), ...(product.also ? pair(product.also) : [])])];
}

/** The ages a piece is for, in months: its own, else from its first and last age size. */
export function kidsAgesOf(product: KidsProduct): { min: number; max: number | null } | null {
  if (product.ages) return product.ages;
  const ages = product.sizes.filter((s): s is KidsAgeSize => s in KIDS_AGE_MONTHS);
  if (!ages.length) return null;
  return { min: KIDS_AGE_MONTHS[ages[0]!][0], max: KIDS_AGE_MONTHS[ages[ages.length - 1]!][1] };
}

/** What a piece's page tells besides its description: its fabric and fit, what it is made of, how to wash it, what is in the box or the set, its badges, its ages and its colours' swatches. */
export function kidsDetails(product: KidsProduct): ProductDetails | null {
  if (product.addon) return null;
  const facts = [{ name: "Fabric", value: product.fabric }, ...(product.fit ? [{ name: "Fit", value: product.fit }] : []), ...(product.sizes.length ? [{ name: "Sizes", value: `${product.sizes[0]} to ${product.sizes[product.sizes.length - 1]}` }] : [])];
  const info: NonNullable<ProductDetails["info"]> = [
    { kind: "materials", text: `${product.fabric}.${product.badges?.includes("organic") ? " Grown without pesticides and dyed with dyes kind to a baby's skin." : ""}` },
    { kind: "care", text: CARE[product.care] },
    ...(product.inTheBox ? [{ kind: "in_the_box" as const, text: product.inTheBox }] : []),
    ...(product.safety ? [{ kind: "safety" as const, text: product.safety }] : []),
  ];
  const ages = kidsAgesOf(product);
  return {
    facts,
    info,
    ...(product.badges?.length ? { badges: [...product.badges] } : {}),
    ...(ages ? { ageMonths: ages } : {}),
    ...(product.colours.length > 1 ? { swatches: Object.fromEntries(product.colours) } : {}),
  };
}

/**
 * A piece's sizes and colours as its variations (91.5): each colour in each
 * size, its stock its own (the smallest and largest sizes low, one gone in
 * some, as a real shop's); the product's price (none of its own); none for
 * one size in one colour. The middle size chosen when the page opens.
 */
export function kidsVariants(product: KidsProduct, index: number): CatalogVariants | null {
  const sizes = product.sizes.length ? product.sizes : null;
  const colours = product.colours.length > 1 ? product.colours.map(([name]) => name) : null;
  if (!sizes && !colours) return null;
  const attributes = [...(sizes ? [{ name: "Size", values: [...sizes] }] : []), ...(colours ? [{ name: "Colour", values: [...colours] }] : [])];
  const pattern = [3, 7, 9, 5, 0, 6, 2, 8];
  const items: CatalogVariants["items"] = [];
  let id = 1;
  for (const [si, size] of (sizes ?? [null]).entries()) {
    for (const [ci, colour] of (colours ?? [null]).entries()) {
      const stock = pattern[(si + ci * 3 + index) % pattern.length]!;
      const code = [size, colour]
        .filter(Boolean)
        .join("-")
        .replaceAll("–", "-")
        .replace(/[^A-Za-z0-9-]/g, "")
        .toUpperCase();
      items.push({ id: id++, values: [...(size ? [size] : []), ...(colour ? [colour] : [])], priceCents: null, salePriceCents: null, stock, sku: `${product.sku}-${code}`, active: true });
    }
  }
  const middle = sizes ? sizes[Math.floor((sizes.length - 1) / 2)] : null;
  const first = items.find((v) => (middle === null || v.values[0] === middle) && v.stock !== 0);
  return { attributes, items, ...(first ? { defaultId: first.id } : {}) };
}
