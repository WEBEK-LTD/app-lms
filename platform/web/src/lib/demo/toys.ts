import type { CatalogCurrency, CatalogSettings, ProductBadge, ProductDetails } from "../data/types";
import type { ToysPhotoName } from "./shop-photos";

/**
 * 209 Toot (تُوت), the toy shop: the demo of Studio's toys type
 * (lib/studio/shop-types.ts) and its two Signature looks (A Toot, playful
 * and colourful; B Mukaab, calm and educational, lib/studio/demo-designs/
 * toys-signature.ts). A toy shop in Dubai: its main categories by the type
 * of toy with their sub-categories (the category menu's rows), "By age"
 * (every toy also in the ages it is for) and "Birthday gifts"; each toy's
 * age, safety and materials (its details, lib/catalog/details.ts), gift
 * wrapping and a birthday card as add-ons, the card's message at checkout
 * and returns within 30 days. The shop, its toys, names and prices are
 * invented; its photos are real, CC0 (public/toys-photos/CREDITS.md).
 */

export const TOYS_CURRENCY: CatalogCurrency = "AED";
export const TOYS_SHIPPING_CENTS = 20_00;
export const TOYS_FREE_SHIPPING_OVER_CENTS = 200_00;
/** The "gifts under a price" rows: at that price or under, in the shop's currency. */
export const TOYS_GIFT_PRICES = [100, 200] as const;

/** The card's beginnings to tap at checkout, for a birthday, in the demo's three languages. */
export const TOYS_GIFT_BEGINNINGS = {
  en: ["Happy birthday!", "Happy birthday, little one!", "For the best big brother", "For the best big sister", "With love from all of us", "Welcome to the world!"],
  ar: ["عيد ميلاد سعيد!", "عيد ميلاد سعيد يا صغيري!", "إلى أجمل أخ كبير", "إلى أجمل أخت كبيرة", "مع حبّنا جميعًا", "أهلًا بك في الدنيا!"],
  tr: ["Doğum günün kutlu olsun!", "Doğum günün kutlu olsun, minik!", "En iyi ağabeye", "En iyi ablaya", "Hepimizden sevgilerle", "Dünyaya hoş geldin!"],
} as const;

/** Its settings besides money: returns within 30 days, and the birthday card's message at checkout (to someone else, with a beginning to tap). */
export const TOYS_COMMERCE: Pick<CatalogSettings, "returnDays" | "gifts"> = {
  returnDays: 30,
  gifts: { checkout: "standard", message: true, maxLength: 200, starters: [...TOYS_GIFT_BEGINNINGS.en], starterTexts: { ar: [...TOYS_GIFT_BEGINNINGS.ar], tr: [...TOYS_GIFT_BEGINNINGS.tr] }, recipient: true, anonymous: false },
};

/** The flash sale: three toys a quarter off for 30 hours (made again each day), 24 at that price and 15 gone. */
export const TOYS_FLASH_SALE = { title: "Toy of the day", titles: { ar: "لعبة اليوم", tr: "Günün oyuncağı" }, percent: 25, hours: 30, limit: 24, sold: 15, skus: ["TY-302", "TY-502", "TY-601"] } as const;

/** The code shown in the app: 10% off a first order from 200 AED. */
export const TOYS_COUPON = { code: "TOOT10", percent: 10, minOrderCents: 200_00 } as const;

export interface ToysCategory {
  name: string;
  names: { ar: string; tr: string };
  subs: readonly { name: string; names: { ar: string; tr: string } }[];
}

const named = (name: string, ar: string, tr: string) => ({ name, names: { ar, tr } });

/**
 * The ages, "By age"'s sub-categories, from (months) and to (months, not
 * included; null: and up). Their names are the looks' words for them
 * (lib/studio/app-words.ts tyAge0…tyAge9), so the home's tiles and the gift
 * finder's results open them in every language.
 */
export const TOYS_AGES = [
  { ...named("0–12 months", "0\u200e–\u200e12 شهرًا", "0–12 ay"), from: 0, to: 12 },
  { ...named("1–2 years", "1\u200e–\u200e2 سنة", "1–2 yaş"), from: 12, to: 36 },
  { ...named("3–5 years", "3\u200e–\u200e5 سنوات", "3–5 yaş"), from: 36, to: 72 },
  { ...named("6–8 years", "6\u200e–\u200e8 سنوات", "6–8 yaş"), from: 72, to: 108 },
  { ...named("9+ years", "9\u200e+\u200e سنوات", "9+ yaş"), from: 108, to: null },
] as const;
export const TOYS_BY_AGE = "By age";
export const TOYS_BIRTHDAY = "Birthday gifts";

/** The main categories in the shop's order, each with its sub-categories: the types of toy, then the ages and the birthday gifts. */
export const TOYS_CATEGORIES: readonly ToysCategory[] = [
  { ...named("Wooden toys", "الألعاب الخشبية", "Ahşap oyuncaklar"), subs: [named("Figures & houses", "شخصيات وبيوت", "Figürler ve evler"), named("Wooden blocks", "مكعبات خشبية", "Ahşap bloklar"), named("Sorting & stacking", "ألعاب الفرز", "Ayırma ve dizme"), named("Wooden vehicles", "مركبات خشبية", "Ahşap araçlar")] },
  { ...named("Building", "البناء والتركيب", "Yapı oyuncakları"), subs: [named("Building bricks", "مكعبات تركيب", "Yapı tuğlaları"), named("Big boxes", "علب كبيرة", "Büyük kutular")] },
  { ...named("Plush", "الدُمى المحشوّة", "Pelüş oyuncaklar"), subs: [named("Bears", "دببة", "Ayıcıklar"), named("Bunnies", "أرانب", "Tavşanlar"), named("Sleep buddies", "رفقاء النوم", "Uyku arkadaşları"), named("Seasonal friends", "شخصيات موسمية", "Mevsim dostları")] },
  { ...named("Puzzles & games", "الألغاز والألعاب", "Bulmaca ve oyunlar"), subs: [named("Board games", "ألعاب لوحية", "Kutu oyunları"), named("Chess", "شطرنج", "Satranç"), named("Letters & numbers", "حروف وأرقام", "Harfler ve sayılar"), named("Family games", "ألعاب عائلية", "Aile oyunları")] },
  { ...named("Science & STEM", "العلوم والاستكشاف", "Bilim ve keşif"), subs: [named("Astronomy", "الفلك", "Astronomi"), named("Geography", "الجغرافيا", "Coğrafya"), named("Explorer tools", "أدوات المستكشف", "Kâşif araçları")] },
  { ...named("Arts & music", "الفنون والموسيقى", "Sanat ve müzik"), subs: [named("Drawing & colouring", "رسم وتلوين", "Çizim ve boyama"), named("Beads & crafts", "خرز وحِرف", "Boncuk ve el işi"), named("Musical instruments", "آلات موسيقية", "Müzik aletleri")] },
  { ...named("Outdoor", "الألعاب الخارجية", "Açık hava"), subs: [named("Kites", "طائرات ورقية", "Uçurtmalar"), named("Bubbles", "فقاعات", "Köpükler"), named("Balls & sport", "كرات ورياضة", "Top ve spor"), named("Ride-ons", "دراجات", "Bisikletler"), named("Play tents", "خيام لعب", "Oyun çadırları")] },
  { ...named("Baby & toddler", "الرضّع والصغار", "Bebek ve küçükler"), subs: [named("Crib mobiles", "معلّقات المهد", "Beşik dönenceleri"), named("Activity toys", "ألعاب النشاط", "Aktivite oyuncakları")] },
  { ...named(TOYS_BY_AGE, "حسب العمر", "Yaşa göre"), subs: TOYS_AGES.map((a) => named(a.name, a.names.ar, a.names.tr)) },
  { ...named(TOYS_BIRTHDAY, "هدايا أعياد الميلاد", "Doğum günü hediyeleri"), subs: [named("Gift boxes", "صناديق الهدايا", "Hediye kutuları"), named("Birthday favourites", "مفضّلات أعياد الميلاد", "Doğum günü favorileri")] },
];

export interface ToysProduct {
  sku: string;
  name: string;
  /** Its sub-category by the type of toy (or the birthday's gift boxes), by name: its main category follows. */
  sub: string;
  priceCents: number;
  salePriceCents: number | null;
  /** Its photos, the first its cover. */
  photos: readonly ToysPhotoName[];
  featured: boolean;
  description: string;
  /** The ages it is for, in months (`max` null: and up). */
  ageMonths: { min: number; max: number | null };
  /** In "Birthday gifts" too (its favourites; a gift box is there already). */
  birthday: boolean;
  details: ProductDetails;
}

/**
 * 209 A gift add-on: a wrap or the card, offered with every toy as "Add a
 * little more", never listed on its own (lib/demo/flowers.ts's add-ons).
 */
export interface ToysAddon {
  sku: string;
  name: string;
  priceCents: number;
  photo: ToysPhotoName;
  description: string;
}

/** What every toy promises: tested for children's safety, gift wrapping on offer. */
const PROMISED: ProductBadge[] = ["safety_tested", "gift_wrap"];

interface ToyFacts {
  material: string;
  size: string;
  pieces?: string;
  /** None needed when missing. */
  batteries?: string;
  /** How it is safe: its own words (the choking warning is added for small parts). */
  safety: string;
  materials: string;
  care?: string;
  box?: string;
  /** Small parts: not for under 3s (the warning). */
  smallParts?: boolean;
  badges?: ProductBadge[];
}

/** A toy's age as its page says it ("3+ years", "0–12 months"). */
export function ageLabel(age: { min: number; max: number | null }): string {
  const inMonths = (m: number) => m < 12 || (m < 24 && m % 12 !== 0);
  if (age.max === null) {
    if (age.min === 0) return "From birth";
    return inMonths(age.min) ? `${age.min}+ months` : `${age.min / 12}+ ${age.min === 12 ? "year" : "years"}`;
  }
  if (inMonths(age.max) || age.max === 12) return `${age.min}–${age.max} months`;
  return `${Math.floor(age.min / 12)}–${age.max / 12} years`;
}

function detailsOf(age: { min: number; max: number | null }, f: ToyFacts): ProductDetails {
  const warning = f.smallParts ? " Warning: not suitable for children under 3 years. Small parts: choking hazard. Adult supervision recommended." : "";
  return {
    facts: [
      { name: "Age", value: ageLabel(age) },
      { name: "Material", value: f.material },
      ...(f.pieces ? [{ name: "Pieces", value: f.pieces }] : []),
      { name: "Size", value: f.size },
      { name: "Batteries", value: f.batteries ?? "None needed" },
    ],
    info: [
      { kind: "safety", text: `${f.safety}${warning}` },
      { kind: "materials", text: f.materials },
      ...(f.care ? [{ kind: "care" as const, text: f.care }] : []),
      ...(f.box ? [{ kind: "in_the_box" as const, text: f.box }] : []),
    ],
    badges: [...PROMISED, ...(f.badges ?? [])],
    ageMonths: { ...age },
  };
}

const WOOD_SAFETY = "Tested to EN 71 and ASTM F963 for children's toys. Water-based, non-toxic paints and smooth, rounded edges.";
const PLUSH_SAFETY = "Tested to EN 71 for children's toys. Embroidered eyes and nose, no buttons or small parts: safe from birth.";
const WIPE = "Wipe clean with a damp cloth; do not soak in water.";
const WASH = "Hand wash cold or machine wash on a gentle cycle in a laundry bag; dry flat.";

const toy = (
  sku: string,
  name: string,
  sub: string,
  price: number,
  sale: number | null,
  photos: readonly ToysPhotoName[],
  age: [number, number | null],
  facts: ToyFacts,
  description: string,
  extra: { featured?: boolean; birthday?: boolean } = {},
): ToysProduct => {
  const ageMonths = { min: age[0], max: age[1] };
  return {
    sku,
    name,
    sub,
    priceCents: price * 100,
    salePriceCents: sale === null ? null : sale * 100,
    photos,
    featured: extra.featured ?? false,
    description,
    ageMonths,
    birthday: extra.birthday ?? false,
    details: detailsOf(ageMonths, facts),
  };
};

/** The shop's toys, newest first as the demo lists them. */
export const TOYS_PRODUCTS: readonly ToysProduct[] = [
  // Plush
  toy("TY-301", "Zahr linen bunny", "Bunnies", 149, null, ["bunny-knit"], [0, null], { material: "Organic cotton and linen", size: "32 cm", safety: PLUSH_SAFETY, materials: "Organic cotton and linen outside, a soft recycled fibre filling inside. Hand-finished scarf.", care: WASH, badges: ["organic", "handmade"] }, "A floppy-eared bunny in soft linen with a knitted scarf, the first friend for a newborn.\n\nMade by hand in small batches.", { featured: true, birthday: true }),
  toy("TY-302", "Lulu classic bear, 40 cm", "Bears", 139, null, ["bear-mint"], [0, null], { material: "Soft plush", size: "40 cm", safety: PLUSH_SAFETY, materials: "Soft plush outside, a hypoallergenic fibre filling inside, a satin bow sewn on.", care: WASH }, "Our classic bear, soft as a cloud, with a red bow and a sweet face.", { featured: true, birthday: true }),
  toy("TY-305", "Teddy in a blue jumper", "Bears", 159, null, ["bear-sweater"], [0, null], { material: "Mohair-look plush and wool", size: "30 cm", safety: PLUSH_SAFETY, materials: "A golden plush bear in a hand-knitted wool jumper you can take off.", care: WASH, badges: ["handmade"] }, "A golden bear in a cosy hand-knitted jumper, made to be carried everywhere.", { birthday: true }),
  toy("TY-303", "Hazel bear with a bow, 30 cm", "Bears", 119, null, ["bear-bow"], [12, null], { material: "Brown velvet plush", size: "30 cm", safety: PLUSH_SAFETY, materials: "Velvet plush outside, fibre filling inside, a red ribbon bow stitched in place.", care: WASH }, "A small brown bear in velvet plush with a red bow, just the size for little arms."),
  toy("TY-306", "Big cuddle bear, sleep buddy", "Sleep buddies", 189, null, ["cuddly-bear"], [12, null], { material: "Long-pile plush", size: "55 cm", safety: PLUSH_SAFETY, materials: "Long-pile plush and a soft fibre filling, weighted lightly at the feet so it sits up.", care: WASH }, "A big, soft bear for bedtime: long fur, heavy paws and a hug that lasts all night."),
  toy("TY-304", "Thalouj knitted snowman", "Seasonal friends", 95, null, ["snowman-plush"], [36, null], { material: "Knitted wool and felt", size: "28 cm", safety: "Tested to EN 71 for children's toys.", materials: "Knitted wool body, felt patches and wooden buttons sewn on firmly.", care: "Spot clean with a damp cloth.", smallParts: true, badges: ["handmade"] }, "A cheerful knitted snowman with a pink scarf and wooden buttons, for the winter shelf and for play."),
  // Wooden toys
  toy("TY-101", "Forest family wooden figures", "Figures & houses", 265, null, ["wooden-figures"], [36, null], { material: "Beech wood", pieces: "6 figures", size: "Up to 12 cm tall", safety: WOOD_SAFETY, materials: "Solid beech from sustainably managed forests, painted with water-based colours.", care: WIPE, smallParts: true }, "Six wooden figures, a whole family to play out stories with, turned and painted by hand.", { featured: true, birthday: true }),
  toy("TY-102", "Rainbow wooden blocks, 48 pieces", "Wooden blocks", 230, 185, ["blocks-close", "block-tower"], [12, null], { material: "Natural wood", pieces: "48", size: "Blocks of 3 to 9 cm, in a cotton bag", safety: WOOD_SAFETY, materials: "Natural lime wood, sanded smooth and dipped in water-based colours.", care: WIPE, box: "48 blocks in 8 shapes and a cotton storage bag." }, "Forty-eight blocks in eight shapes and soft rainbow colours: towers, bridges and houses, again and again.", { featured: true, birthday: true }),
  toy("TY-103", "Arnoub bunny sorting set", "Sorting & stacking", 119, null, ["bunny-eggs"], [18, null], { material: "Beech wood", pieces: "4", size: "Bunny 12 cm, eggs 6 cm", safety: WOOD_SAFETY, materials: "Solid beech eggs and a painted bunny, finished with beeswax.", care: WIPE }, "A yellow bunny and three wooden eggs to sort, count and hide: a first game of sizes."),
  toy("TY-104", "Sirb wooden plane", "Wooden vehicles", 89, null, ["plane"], [24, null], { material: "Painted beech", size: "14 cm wingspan", safety: WOOD_SAFETY, materials: "Beech wood painted in water-based red, with wheels that turn.", care: WIPE }, "A little red plane with a spinning propeller and wheels that roll across the table."),
  toy("TY-105", "Little architect tower, 36 pieces", "Wooden blocks", 210, null, ["block-tower"], [24, null], { material: "Natural and painted wood", pieces: "36", size: "Tower up to 45 cm", safety: WOOD_SAFETY, materials: "Lime wood blocks with arches and windows, painted with water-based colours.", care: WIPE }, "Arches, windows and columns to build towers taller than a two-year-old."),
  // Building
  toy("TY-201", "Mawj building set, 620 bricks", "Building bricks", 340, 289, ["bricks-teal", "bricks-pile"], [72, null], { material: "ABS plastic, free of BPA", pieces: "620", size: "Box 38 × 26 cm", safety: "Tested to EN 71 and ASTM F963. Free of BPA and phthalates.", materials: "Food-grade ABS plastic bricks in sea blues, compatible with the leading brick systems.", care: "Wash in warm soapy water in a laundry bag; dry in the air.", box: "620 bricks, a building guide with 3 models and a storage box.", smallParts: true }, "Six hundred and twenty bricks in the colours of the sea: a harbour, a lighthouse and a boat to build, then anything at all.", { featured: true, birthday: true }),
  toy("TY-202", "Big box of bricks, 1,000 pieces", "Big boxes", 395, null, ["bricks-pile", "lego-kid"], [48, null], { material: "ABS plastic, free of BPA", pieces: "1,000", size: "Box 40 × 30 cm", safety: "Tested to EN 71 and ASTM F963. Free of BPA and phthalates.", materials: "Food-grade ABS plastic bricks in 12 colours, compatible with the leading brick systems.", care: "Wash in warm soapy water in a laundry bag; dry in the air.", smallParts: true }, "A thousand bricks in twelve colours, wheels, windows and doors included: enough for the whole family to build together."),
  // Puzzles & games
  toy("TY-401", "Family backgammon, walnut", "Board games", 395, 340, ["backgammon"], [72, null], { material: "Walnut wood", pieces: "30 counters, 2 dice", size: "Open 48 × 38 cm", safety: "Tested to EN 71 for children's toys.", materials: "A walnut board inlaid by hand, wooden counters, a brass clasp and handle.", care: WIPE, smallParts: true }, "A real walnut backgammon set for the whole family, closing into its own case."),
  toy("TY-402", "Knights chess set", "Chess", 420, null, ["chess"], [84, null], { material: "Carved wood", pieces: "32", size: "Board 40 × 40 cm, king 9 cm", safety: "Tested to EN 71 for children's toys.", materials: "Hand-carved pieces in two woods on a folding wooden board.", care: WIPE, smallParts: true }, "Carved knights, castles and kings on a folding board: the first chess set to keep for life.", { birthday: true }),
  toy("TY-106", "Wooden letter stamps, 56 letters", "Letters & numbers", 155, null, ["letters"], [48, null], { material: "Beech wood and rubber", pieces: "56 stamps, 2 ink pads", size: "Stamps 3 cm", safety: "Tested to EN 71. Plant-based, washable inks.", materials: "Beech stamps with natural rubber letters; inks made from plants.", care: WIPE, smallParts: true }, "Fifty-six wooden stamps, Arabic and Latin letters and numbers, to print names, cards and first words."),
  toy("TY-403", "Dice games box", "Family games", 79, null, ["dice"], [60, null], { material: "Resin dice and a cotton bag", pieces: "10 dice, a book of 12 games", size: "Dice 16 mm", safety: "Tested to EN 71 for children's toys.", materials: "Smooth resin dice and a cotton bag to keep them.", smallParts: true }, "Ten dice and twelve games to play at the table, in the car or on holiday."),
  // Science & STEM
  toy("TY-501", "Madar beginner's telescope", "Astronomy", 749, 649, ["telescope-globe", "telescope-globe-wide"], [96, null], { material: "Aluminium and glass", size: "70 mm lens, tripod up to 120 cm", safety: "Tested to EN 71. Never look at the sun through it.", materials: "Coated glass optics in an aluminium tube, on an adjustable aluminium tripod.", care: "Keep the lens caps on; clean the lens with the cloth provided.", box: "A telescope, a tripod, two eyepieces (up to 90×), a moon map and a cloth." }, "A real telescope sized for young astronomers: the moon's craters and Saturn's rings from the balcony."),
  toy("TY-502", "Atlas globe", "Geography", 215, null, ["globes"], [72, null], { material: "Printed paper on a metal stand", size: "25 cm across", safety: "Tested to EN 71 for children's toys.", materials: "A printed globe on a turned metal stand.", care: WIPE }, "A classic globe that turns on its stand, the countries and seas in calm colours, for questions at the dinner table."),
  toy("TY-503", "Brass explorer's compass", "Explorer tools", 120, null, ["compass"], [84, null], { material: "Brass and glass", size: "5 cm", safety: "Tested to EN 71 for children's toys.", materials: "A solid brass case with a glass face and a liquid-free needle.", smallParts: true }, "A brass compass that closes with a click, for walks, maps and treasure hunts.", { birthday: true }),
  toy("TY-504", "Explorer's kit", "Explorer tools", 185, null, ["compass", "globes"], [72, null], { material: "Brass, paper and canvas", pieces: "4", size: "Canvas bag 25 × 18 cm", safety: "Tested to EN 71 for children's toys.", materials: "A brass compass, a folding map, a field notebook and a canvas bag.", box: "A compass, a map, a notebook, a pencil and a canvas bag.", smallParts: true }, "A compass, a map and a field notebook in a canvas bag: everything a young explorer packs."),
  // Arts & music
  toy("TY-601", "Tayf colouring pencils, 24 colours", "Drawing & colouring", 75, null, ["crayons-pastel"], [36, null], { material: "Wood and pigment", pieces: "24", size: "17.5 cm", safety: "Tested to EN 71 and free of lead and heavy metals.", materials: "Cedar pencils with soft, bright leads made from non-toxic pigments.", box: "24 pencils in a tin." }, "Twenty-four soft, bright pencils in a tin, for drawings that pop."),
  toy("TY-602", "Bead art kit", "Beads & crafts", 120, 95, ["beads-kid"], [60, null], { material: "Plastic beads and pegboards", pieces: "3,000 beads, 4 boards", size: "Box 30 × 22 cm", safety: "Tested to EN 71.", materials: "Fuse beads in 24 colours, four pegboards and ironing paper.", box: "3,000 beads, 4 pegboards, ironing paper and 20 patterns.", smallParts: true }, "Three thousand beads in twenty-four colours to make coasters, keyrings and pictures."),
  toy("TY-603", "Nagham beginner's ukulele", "Musical instruments", 260, null, ["ukulele"], [60, null], { material: "Mahogany and nylon strings", size: "53 cm (soprano)", safety: "Tested to EN 71 for children's toys.", materials: "A mahogany body and neck with nylon strings, tuned like a real ukulele.", care: "Keep away from heat and damp; wipe the strings after playing.", box: "A ukulele, a soft case and a chord chart." }, "A real soprano ukulele sized for small hands, with a chord chart to play the first song today.", { birthday: true }),
  // Outdoor
  toy("TY-701", "Rainbow kite", "Kites", 110, null, ["kite", "kite-wide"], [60, null], { material: "Ripstop nylon and fibreglass", size: "120 × 70 cm", safety: "Tested to EN 71. Fly away from power lines and roads, with an adult.", materials: "Ripstop nylon sail, fibreglass rods and a 30 m line on a winder." }, "A big rainbow kite that flies in a light breeze, easy to put together on the beach."),
  toy("TY-702", "Giant bubble wand set", "Bubbles", 65, null, ["bubbles-girl", "bubbles-girl-wide"], [36, null], { material: "Wood and cotton rope", pieces: "2 wands, 1 tray", size: "Wands 45 cm", safety: "Tested to EN 71. The bubble mix is non-toxic; keep out of eyes and mouth.", materials: "Wooden wands with cotton rope, a tray and a concentrate for 2 litres of bubble mix." }, "Two wooden wands for bubbles as big as the child, and the mix to start with."),
  toy("TY-703", "Classic leather football, size 3", "Balls & sport", 85, null, ["football-boy"], [36, null], { material: "Stitched leather", size: "Size 3, 58 cm around", safety: "Tested to EN 71 for children's toys.", materials: "Hand-stitched leather panels around a soft bladder." }, "A hand-stitched ball, the right size and weight for young players."),
  toy("TY-704", "Red tricycle", "Ride-ons", 450, null, ["tricycle"], [24, 60], { material: "Steel and rubber", size: "Seat 45 cm high", safety: "Tested to EN 71. Always ride with a helmet and an adult nearby.", materials: "A powder-coated steel frame, rubber tyres and a padded seat.", care: "Wipe clean; keep indoors when it rains.", box: "A tricycle, a bell and the tools to put it together." }, "A red tricycle with a bell and an adjustable seat: the first ride to the park."),
  toy("TY-705", "Cotton play tent", "Play tents", 520, null, ["teepee"], [36, null], { material: "Cotton canvas and pine poles", size: "160 cm tall, 120 cm wide", safety: "Tested to EN 71. Fabric meets the flammability standard for toys.", materials: "Cotton canvas in a grey pattern on five pine poles, with a padded floor mat.", care: "Spot clean the canvas; the floor mat's cover is machine washable.", box: "Canvas, 5 poles, a floor mat and a storage bag." }, "A cotton teepee for a reading corner, a hideaway or a night of stories with a torch.", { featured: true }),
  // Baby & toddler
  toy("TY-801", "Ghaima crib mobile, hand-knitted", "Crib mobiles", 229, null, ["crib-mobile"], [0, 12], { material: "Merino wool and beech", size: "Hangs 60 cm", safety: "Tested to EN 71. Hang out of the baby's reach; remove when the baby can sit up.", materials: "Hand-knitted merino lambs on a beech frame.", care: "Dust gently; spot clean the lambs.", badges: ["handmade"] }, "Three soft lambs knitted by hand, turning slowly above the crib.", { featured: true, birthday: true }),
  toy("TY-802", "Rolling bead maze", "Activity toys", 135, null, ["bead-maze"], [12, null], { material: "Wood and steel wire", size: "30 × 20 cm", safety: WOOD_SAFETY, materials: "A beech base, coated steel wires and wooden beads that never come off.", care: WIPE }, "Bright beads to slide along the loops, for little hands learning to grip and follow."),
  // Birthday gifts: the gift boxes
  toy("TY-901", "Newborn gift box, 4 pieces", "Gift boxes", 499, 399, ["gift-kraft", "crib-mobile", "bear-mint"], [0, 12], { material: "Wool, plush and wood", pieces: "4", size: "Box 40 × 30 cm", safety: PLUSH_SAFETY, materials: "The crib mobile, the Lulu bear, the bead maze and a kraft gift box with a card.", box: "Ghaima crib mobile, Lulu bear, a rolling bead maze and a card in your words.", badges: ["handmade"] }, "Four pieces for the first months, wrapped in kraft and pink with a card in your words.", { featured: true }),
  toy("TY-902", "Little explorer birthday box", "Gift boxes", 450, null, ["gift-white", "globes"], [72, null], { material: "Paper, brass and canvas", pieces: "3", size: "Box 35 × 25 cm", safety: "Tested to EN 71 for children's toys.", materials: "The Atlas globe, the brass compass and the field notebook in a white gift box.", box: "Atlas globe, brass compass, field notebook and a card in your words.", smallParts: true }, "A globe, a compass and a field notebook in a white gift box with a gold ribbon and a card."),
  toy("TY-903", "Builder's birthday box", "Gift boxes", 520, null, ["gift-black", "bricks-teal"], [72, null], { material: "ABS plastic and wood", pieces: "3", size: "Box 40 × 30 cm", safety: "Tested to EN 71 and ASTM F963. Free of BPA and phthalates.", materials: "The Mawj building set, the architect tower and a black gift box with a gold ribbon.", box: "Mawj building set, little architect tower and a card in your words.", smallParts: true }, "For the child who builds: the Mawj set and the architect tower in a black and gold gift box."),
];

/** The wraps and the card: add-ons offered with every toy. */
export const TOYS_ADDONS: readonly ToysAddon[] = [
  { sku: "TY-951", name: "Kraft and blush gift wrap", priceCents: 10_00, photo: "gift-kraft", description: "Kraft paper, a blush ribbon and a sprig of dried flowers." },
  { sku: "TY-952", name: "Black and gold gift wrap", priceCents: 15_00, photo: "gift-black", description: "A black box with a gold satin ribbon." },
  { sku: "TY-953", name: "White celebration wrap", priceCents: 10_00, photo: "gift-white", description: "A white box, a ribbon and confetti inside." },
  { sku: "TY-954", name: "Birthday card in your words", priceCents: 8_00, photo: "gift-white-wide", description: "A folded card with your message written in it by hand." },
];

/** The main category a sub-category is in. */
export function toysMainOf(sub: string): ToysCategory {
  const found = TOYS_CATEGORIES.find((c) => c.subs.some((s) => s.name === sub));
  if (!found) throw new Error(`No main category has ${sub}.`);
  return found;
}

/** The ages a toy is for: each age whose span meets the toy's (up to four years from its first age when it has no last). */
export function toysAgesOf(age: { min: number; max: number | null }): string[] {
  const to = age.max ?? age.min + 48;
  return TOYS_AGES.filter((a) => a.from < to && (a.to === null || a.to > age.min)).map((a) => a.name);
}
