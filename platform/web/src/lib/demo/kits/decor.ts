import { giftBeginningsIn } from "../../selling/gift-starters";
import type { KitCategory, KitName, KitProduct, ShopKit } from "../shop-kit";

/**
 * 210 Sakan (سكن), Studio's home decor type: a home decor house in Riyadh
 * (lib/studio/demo-designs/decor-signature.ts draws its two looks: A the
 * decor magazine, B Teen's warm earth tones). Its main categories are the
 * rooms of a home (the looks' "Shop by room" tiles are named like them, so
 * each opens its room), then the plants, the seasons (Ramadan, the new
 * year) and the gifts, each with its sub-categories; its pieces with their
 * size in cm, their colours and sizes (each with its own stock), a few on
 * sale, the weekend's offers, gift wrapping with a card as an add-on, its
 * code and returns within 14 days. The first three pieces are the ones in
 * the styled dining corner of "Shop the look" (its spots open them, in
 * this order). The house, its pieces, names and prices are invented; the
 * photos are real, CC0 (public/decor-photos/CREDITS.md).
 */

const named = (name: string, ar: string, tr: string): KitName => ({ name, names: { ar, tr } });

/** The main categories in the shop's order (the category menu's rows), each with its sub-categories. */
const CATEGORIES: readonly KitCategory[] = [
  { ...named("Living room", "غرفة المعيشة", "Oturma odası"), subs: [named("Vases & bowls", "مزهريات وأوعية", "Vazolar ve kâseler"), named("Cushions & throws", "وسائد ومفارش", "Yastıklar ve şallar"), named("Accent chairs", "كراسٍ مميزة", "Berjerler")] },
  { ...named("Bedroom", "غرفة النوم", "Yatak odası"), subs: [named("Bed linen", "مفارش الأسرّة", "Nevresim"), named("Table lamps", "مصابيح طاولة", "Masa lambaları"), named("Mirrors", "مرايا", "Aynalar")] },
  { ...named("Dining room", "غرفة الطعام", "Yemek odası"), subs: [named("Tableware", "أدوات المائدة", "Sofra takımları"), named("Pendant lights", "مصابيح معلّقة", "Sarkıt lambalar"), named("Tables & chairs", "طاولات وكراسٍ", "Masa ve sandalyeler")] },
  { ...named("Reading corner", "ركن القراءة", "Okuma köşesi"), subs: [named("Floor lamps", "مصابيح أرضية", "Lambaderler"), named("Side tables", "طاولات جانبية", "Yan sehpalar"), named("Storage", "تخزين", "Depolama")] },
  { ...named("Plants & terrariums", "نباتات وحدائق زجاجية", "Bitkiler ve teraryumlar"), subs: [named("Potted plants", "نباتات في أصص", "Saksı bitkileri"), named("Terrariums", "حدائق زجاجية", "Teraryumlar"), named("Dried stems", "أغصان مجففة", "Kuru dallar")] },
  { ...named("Seasons", "المواسم", "Mevsimler"), subs: [named("Ramadan", "رمضان", "Ramazan"), named("New year", "رأس السنة", "Yılbaşı")] },
  { ...named("Gifts", "هدايا", "Hediyeler"), subs: [named("Gift sets", "أطقم هدايا", "Hediye setleri"), named("Wrapping & cards", "التغليف والبطاقات", "Paket ve kartlar")] },
];

const cm = (width: number | null, depth: number | null, height: number | null) => ({ width, depth, height });

/** The pieces in the shop's order (the newest-first lists show them so); the first three are the styled dining corner's. */
const PRODUCTS: readonly KitProduct[] = [
  // The styled dining corner (Shop the look): the orchid, the table and the chairs.
  { sku: "DC-101", name: "Orchid in a white ceramic pot", sub: "Potted plants", priceCents: 165_00, salePriceCents: null, photos: ["orchid-planter"], featured: true, description: "A white phalaenopsis orchid with two flowering stems, in a glazed white ceramic pot. It flowers for weeks in bright, indirect light; water it once a week.", dimensions: cm(14, 14, 55), stock: 12 },
  { sku: "DC-102", name: "Blanc dining table", sub: "Tables & chairs", priceCents: 1190_00, salePriceCents: null, photos: ["dining-table", "room-dining"], featured: true, description: "A square table for two to four: a matte white top on a brushed steel frame. Made for a small dining corner or a kitchen nook.", choices: [{ name: "Size", values: ["80 × 80 cm", "120 × 80 cm"] }], dimensions: cm(80, 80, 75) },
  { sku: "DC-103", name: "Nord dining chair", sub: "Tables & chairs", priceCents: 390_00, salePriceCents: null, photos: ["white-chair"], featured: true, description: "A moulded shell seat on beech legs with black steel braces. Light to move, easy to wipe clean, and comfortable through a long dinner.", choices: [{ name: "Colour", values: ["White", "Black", "Sage"] }], dimensions: cm(46, 53, 81) },
  // The living room.
  { sku: "DC-201", name: "Reem armchair", sub: "Accent chairs", priceCents: 2350_00, salePriceCents: null, photos: ["armchair"], featured: true, description: "A deep armchair in a saffron jacquard on solid walnut legs, its seat sprung and its back cushion filled with feather.", choices: [{ name: "Colour", values: ["Saffron jacquard", "Olive", "Natural"] }], dimensions: cm(76, 80, 86) },
  { sku: "DC-202", name: "Hudoo lounge chair", sub: "Accent chairs", priceCents: 1650_00, salePriceCents: null, photos: ["lounge-chair"], featured: true, description: "A bentwood birch frame that gives a little as you lean back, with a thick removable cushion in a leaf-printed cotton.", choices: [{ name: "Colour", values: ["Leaf print", "Charcoal"] }], dimensions: cm(68, 82, 100) },
  { sku: "DC-203", name: "Tufted velvet armchair", sub: "Accent chairs", priceCents: 2900_00, salePriceCents: 2450_00, photos: ["tufted-chair"], featured: false, description: "A classic button-tufted armchair in a soft smoke velvet, its carved frame in dark stained beech.", dimensions: cm(72, 78, 105), stock: 3 },
  { sku: "DC-210", name: "Ribbed ceramic vase", sub: "Vases & bowls", priceCents: 165_00, salePriceCents: null, photos: ["ribbed-vase"], featured: true, description: "A tall matte vase with fine ribs, thrown in stoneware and glazed inside so it holds water for fresh stems.", choices: [{ name: "Size", values: ["Small", "Large"] }], dimensions: cm(14, 14, 28) },
  { sku: "DC-211", name: "Blush vase with pampas", sub: "Vases & bowls", priceCents: 185_00, salePriceCents: null, photos: ["pink-vase"], featured: true, description: "A blush ribbed vase in matte clay, sent with a bunch of dried pampas grass that keeps its colour for months.", dimensions: cm(13, 13, 22) },
  { sku: "DC-212", name: "Twin vases on an oak tray", sub: "Vases & bowls", priceCents: 210_00, salePriceCents: null, photos: ["twin-vases"], featured: false, description: "Two slim porcelain vases in soft white on a curved oak tray: a still life for a dining table or a shelf.", dimensions: cm(30, 12, 24) },
  { sku: "DC-214", name: "Matte bud vase", sub: "Vases & bowls", priceCents: 95_00, salePriceCents: null, photos: ["daisy-vase"], featured: false, description: "A small bud vase in matte porcelain for a single flower or a sprig, on a bedside table or a desk.", choices: [{ name: "Colour", values: ["White", "Sand"] }], dimensions: cm(9, 9, 20) },
  { sku: "DC-215", name: "White porcelain pitcher", sub: "Vases & bowls", priceCents: 120_00, salePriceCents: null, photos: ["pitcher"], featured: false, description: "A glossy porcelain pitcher with a generous spout, for water on the table or a few branches of eucalyptus.", dimensions: cm(16, 12, 24) },
  { sku: "DC-216", name: "Sage glazed bottle vases", sub: "Vases & bowls", priceCents: 260_00, salePriceCents: null, photos: ["sage-jars"], featured: true, description: "Bottle vases in a reactive sage glaze, each one a little different from the kiln. Beautiful on their own or in a group.", choices: [{ name: "Size", values: ["Small", "Medium", "Large"] }], dimensions: cm(15, 15, 30) },
  { sku: "DC-217", name: "Rose bud vase", sub: "Vases & bowls", priceCents: 85_00, salePriceCents: null, photos: ["rose-vase"], featured: false, description: "A round bud vase in a soft rose glaze, the right size for one garden rose.", dimensions: cm(10, 10, 14) },
  { sku: "DC-220", name: "Wave cushion covers, pair", sub: "Cushions & throws", priceCents: 180_00, salePriceCents: 150_00, photos: ["wave-cushions"], featured: false, description: "Two cushion covers in washed cotton with a woven wave pattern and a hidden zip. Inserts not included.", choices: [{ name: "Size", values: ["45 × 45 cm", "50 × 50 cm"] }], dimensions: cm(45, null, 45) },
  { sku: "DC-221", name: "Check cushion covers, pair", sub: "Cushions & throws", priceCents: 160_00, salePriceCents: null, photos: ["check-cushions"], featured: false, description: "Two brushed cotton covers in a grey and white check, soft enough for a reading sofa. Inserts not included.", dimensions: cm(45, null, 45) },
  // The bedroom.
  { sku: "DC-301", name: "Washed linen bedding set", sub: "Bed linen", priceCents: 690_00, salePriceCents: null, photos: ["linen-bedding"], featured: true, description: "A duvet cover and two pillowcases in stone-washed linen that gets softer with every wash; cool in summer, warm in winter.", choices: [{ name: "Size", values: ["Single", "Queen", "King"] }, { name: "Colour", values: ["White", "Sand", "Sage"] }] },
  { sku: "DC-302", name: "Nawwar desk lamp", sub: "Table lamps", priceCents: 690_00, salePriceCents: null, photos: ["desk-lamp"], featured: true, description: "A lamp with a long arm that turns and tilts, in matte black steel with a brass joint, for a desk or a bedside.", choices: [{ name: "Colour", values: ["Black and brass", "All black"] }], dimensions: cm(18, 45, 52) },
  { sku: "DC-303", name: "Baroque gold mirror", sub: "Mirrors", priceCents: 1480_00, salePriceCents: null, photos: ["gold-mirror"], featured: false, description: "An oval mirror in a hand-carved frame finished in antique gold leaf: one piece that sets the tone of a whole wall.", dimensions: cm(52, 4, 80), stock: 4 },
  { sku: "DC-304", name: "Round mirror on a leather strap", sub: "Mirrors", priceCents: 340_00, salePriceCents: null, photos: ["round-mirror"], featured: false, description: "A round mirror in a thin black steel frame, hung from a tan leather strap on a brass hook (included).", choices: [{ name: "Size", values: ["40 cm", "50 cm"] }], dimensions: cm(40, 2, 40) },
  // The dining room.
  { sku: "DC-401", name: "Patterned ceramic bowls, set of three", sub: "Tableware", priceCents: 350_00, salePriceCents: null, photos: ["bowls"], featured: true, description: "Three nesting bowls, each painted by hand with its own pattern in yellow, coral and blue. For salads, fruit or dates.", dimensions: cm(15, 15, 7) },
  { sku: "DC-403", name: "Scalloped white plates, set of four", sub: "Tableware", priceCents: 220_00, salePriceCents: null, photos: ["white-shelf"], featured: false, description: "Four dinner plates in white porcelain with a scalloped rim, safe in the dishwasher and the microwave.", dimensions: cm(27, 27, 3) },
  { sku: "DC-404", name: "Qamar macramé pendant", sub: "Pendant lights", priceCents: 890_00, salePriceCents: null, photos: ["pendant-macrame"], featured: true, description: "A brushed aluminium dome over a hand-knotted cotton macramé skirt, for the light over a dining table.", dimensions: cm(40, 40, 60) },
  { sku: "DC-405", name: "Cube linen pendant", sub: "Pendant lights", priceCents: 540_00, salePriceCents: null, photos: ["pendant"], featured: false, description: "A square linen shade that turns any bulb into a warm, even glow; its cord adjusts from 60 to 150 cm.", dimensions: cm(35, 35, 30) },
  { sku: "DC-406", name: "Fjord oak chair", sub: "Tables & chairs", priceCents: 1290_00, salePriceCents: null, photos: ["wishbone"], featured: true, description: "A solid oak chair with a curved back and a seat woven by hand in paper cord, oiled to keep the grain natural.", choices: [{ name: "Colour", values: ["Natural oak", "Smoked oak"] }], dimensions: cm(55, 51, 76) },
  // The reading corner.
  { sku: "DC-501", name: "Duha floor lamp", sub: "Floor lamps", priceCents: 690_00, salePriceCents: null, photos: ["floor-lamp"], featured: true, description: "A tall floor lamp with a tilting shade in matte charcoal steel: a pool of light over an armchair.", choices: [{ name: "Colour", values: ["Charcoal", "White"] }], dimensions: cm(30, 45, 155) },
  { sku: "DC-502", name: "Log side table", sub: "Side tables", priceCents: 280_00, salePriceCents: null, photos: ["log-table"], featured: false, description: "A slice of sealed acacia on three black hairpin legs: room for a book, a lamp and a cup of tea.", dimensions: cm(40, 40, 45) },
  { sku: "DC-503", name: "Gloss coffee table", sub: "Side tables", priceCents: 980_00, salePriceCents: null, photos: ["coffee-table"], featured: false, description: "A low square table in white high-gloss lacquer on a recessed base, so it seems to float above the rug.", dimensions: cm(90, 90, 35) },
  { sku: "DC-504", name: "Misk chest of six drawers", sub: "Storage", priceCents: 2150_00, salePriceCents: null, photos: ["drawers"], featured: false, description: "A small chest in solid oak with six drawers and hand-painted ceramic knobs, for a hallway or a reading corner.", dimensions: cm(42, 30, 60), stock: 5 },
  // Plants and terrariums.
  { sku: "DC-601", name: "Aloe in a woven basket", sub: "Potted plants", priceCents: 145_00, salePriceCents: null, photos: ["aloe-basket"], featured: false, description: "A healthy aloe in a woven seagrass basket with a waterproof liner. It loves sun and asks for little water.", dimensions: cm(20, 20, 45) },
  { sku: "DC-602", name: "Glass propagation vase", sub: "Potted plants", priceCents: 75_00, salePriceCents: null, photos: ["plant-glass"], featured: false, description: "A glass bulb in a light wooden stand for growing cuttings in water, so you can watch the roots grow.", dimensions: cm(12, 8, 15) },
  { sku: "DC-603", name: "Hanging glass terrarium", sub: "Terrariums", priceCents: 150_00, salePriceCents: null, photos: ["terrarium"], featured: true, description: "A hand-blown glass globe with air plants on a bed of moss, hung on a jute cord. A light mist once a week is all it needs.", choices: [{ name: "Size", values: ["15 cm", "20 cm"] }], dimensions: cm(20, 20, 20) },
  { sku: "DC-604", name: "Dried willow branches in glass", sub: "Dried stems", priceCents: 230_00, salePriceCents: null, photos: ["branch-vase"], featured: false, description: "Tall willow branches tied with raffia in a clear glass vase: a sculptural piece for a corner that never needs water.", dimensions: cm(18, 18, 90) },
  // The seasons.
  { sku: "DC-701", name: "Brass geometric lantern", sub: "Ramadan", priceCents: 260_00, salePriceCents: null, photos: ["brass-lantern"], featured: true, description: "A lantern of clear glass in a brushed brass frame for a candle or a string of lights: warm light for Ramadan evenings.", choices: [{ name: "Size", values: ["Small", "Large"] }], dimensions: cm(20, 20, 26) },
  { sku: "DC-702", name: "Harvest stoneware dinner set", sub: "New year", priceCents: 460_00, salePriceCents: null, photos: ["table-setting"], featured: false, description: "Twelve pieces in a cream speckled stoneware, four dinner plates, four side plates and four bowls, for a table set for the holidays.", dimensions: cm(27, 27, 3) },
  // Gifts.
  { sku: "DC-801", name: "Bud vase trio, gift boxed", sub: "Gift sets", priceCents: 140_00, salePriceCents: null, photos: ["flowers-glass"], featured: false, description: "Three clear glass bud vases of different heights in a linen-lined gift box, ready to give.", dimensions: cm(8, 8, 18) },
  { sku: "DC-901", name: "Gift wrapping with a card", sub: "Wrapping & cards", priceCents: 25_00, salePriceCents: null, photos: [], featured: false, description: "Your piece wrapped by hand in our olive paper with a linen ribbon, and a card with your message written inside.", addon: { categories: [] } },
];

export const DECOR_KIT: ShopKit = {
  demo: "decor",
  photos: {
    dir: "decor-photos",
    prefix: "dc-",
    names: [
      "aloe-basket",
      "armchair",
      "bowls",
      "branch-vase",
      "brass-lantern",
      "check-cushions",
      "coffee-table",
      "daisy-vase",
      "desk-lamp",
      "dining-table",
      "drawers",
      "floor-lamp",
      "flowers-glass",
      "gold-mirror",
      "hero",
      "hero-autumn",
      "hero-bedroom",
      "linen-bedding",
      "log-table",
      "lounge-chair",
      "oak-dining",
      "orchid-planter",
      "pendant",
      "pendant-macrame",
      "pink-vase",
      "pitcher",
      "plant-glass",
      "pottery-shelf",
      "reading-chair",
      "ribbed-vase",
      "room-bed",
      "room-dining",
      "room-living",
      "room-reading",
      "rose-vase",
      "round-mirror",
      "sage-jars",
      "table-setting",
      "terrarium",
      "tufted-chair",
      "twin-vases",
      "wave-cushions",
      "white-chair",
      "white-shelf",
      "wishbone",
    ],
  },
  currency: "SAR",
  shippingCents: 30_00,
  freeShippingOverCents: 1000_00,
  categories: CATEGORIES,
  products: PRODUCTS,
  // The weekend's offers: the bowls, the floor lamp and the sage vases a fifth off for 30 hours (made again each day), 20 at that price and 9 gone.
  flashSale: { title: "Weekend offers", titles: { ar: "عروض نهاية الأسبوع", tr: "Hafta sonu fırsatları" }, percent: 20, hours: 30, limit: 20, sold: 9, skus: ["DC-401", "DC-501", "DC-216"] },
  // 10% off a first order from 300 SAR.
  coupon: { code: "SAKAN10", percent: 10, minOrderCents: 300_00 },
  commerce: {
    returnDays: 14,
    // The card message with Yallapp's beginnings to tap; the usual checkout (a gift is wrapped with its card, sent to the buyer's address).
    gifts: { checkout: "standard", message: true, maxLength: 300, starters: giftBeginningsIn("en"), starterTexts: { ar: giftBeginningsIn("ar"), tr: giftBeginningsIn("tr") }, recipient: false, anonymous: false },
  },
};
