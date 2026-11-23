import { giftBeginningsIn } from "../../selling/gift-starters";
import type { KitProduct, ShopKit } from "../shop-kit";

/**
 * 210 Ghurza (غُرزة, "a stitch"), crochet and handmade: a crochet workshop
 * in Cairo. Its pieces are made by hand to order, each with the days it
 * takes to make (cardigans, scarves and beanies in their sizes and
 * colours, blankets, amigurumi toys, summer hats and bags, cup cozies);
 * yarn and tools are sold ready to ship (cotton, merino and raffia yarn in
 * their colours, hooks and starter kits); a gift wrap with a handwritten
 * card goes with any piece; its workshops are sold as seats (products of
 * its Workshops category, their stock the seats left). Look A is Ghurza's warm handmade, look B
 * Habka's colours (lib/studio/demo-designs/crochet-signature.ts). The shop,
 * its pieces, names and prices are invented; the photos are real, CC0
 * (public/crochet-photos/CREDITS.md).
 */

const named = (name: string, ar: string, tr: string) => ({ name, names: { ar, tr } });

const SIZES = { name: "Size", values: ["S", "M", "L"] } as const;
const colour = (...values: string[]) => ({ name: "Colour", values });

/** Made to order: from `min` to `max` days. */
const days = (min: number, max: number) => ({ min, max });

const PRODUCTS: readonly KitProduct[] = [
  // ——— Clothing ———
  { sku: "CR-101", name: "Dafa cardigan", sub: "Cardigans & sweaters", priceCents: 1980_00, salePriceCents: null, photos: ["cozy-sweater", "sweater-wood"], featured: true, description: "A chunky merino cardigan crocheted in one piece, with deep pockets and wooden buttons. Made to your size in the colour you choose.", choices: [SIZES, colour("Cream", "Oat", "Plum")], makeDays: days(7, 10) },
  { sku: "CR-102", name: "Ghaba Nordic sweater", sub: "Cardigans & sweaters", priceCents: 1980_00, salePriceCents: null, photos: ["green-sweater"], featured: true, description: "A Nordic pattern sweater in forest green and cream, warm without being heavy.", choices: [SIZES, colour("Forest", "Navy")], makeDays: days(8, 10) },
  { sku: "CR-103", name: "Rimal waffle sweater", sub: "Cardigans & sweaters", priceCents: 1650_00, salePriceCents: 1390_00, photos: ["sweater-shoulder", "sweater-wood"], featured: false, description: "A soft waffle-stitch sweater in sand, in a relaxed fit with dropped shoulders.", choices: [SIZES, colour("Sand", "Cream")], makeDays: days(6, 8) },
  { sku: "CR-104", name: "Hekaya chunky cardigan", sub: "Cardigans & sweaters", priceCents: 2150_00, salePriceCents: null, photos: ["knit-flatlay"], featured: false, description: "An oversized cardigan in a thick taupe yarn, long enough to wear over a dress.", choices: [SIZES, colour("Taupe", "Charcoal")], makeDays: days(9, 12) },
  { sku: "CR-111", name: "Qirfa ribbed scarf", sub: "Scarves", priceCents: 950_00, salePriceCents: null, photos: ["red-scarf"], featured: true, description: "A long ribbed scarf in merino, 180 cm, in cinnamon or olive.", choices: [colour("Cinnamon", "Olive", "Sand")], dimensions: { width: 30, height: 180, depth: null }, makeDays: days(3, 4) },
  { sku: "CR-112", name: "Layali fringe scarf", sub: "Scarves", priceCents: 780_00, salePriceCents: null, photos: ["scarves-stack"], featured: false, description: "A light scarf with a long fringe, crocheted in a soft cotton blend.", choices: [colour("Lime", "Grey", "Cream")], makeDays: days(3, 4) },
  { sku: "CR-121", name: "Bunn pom-pom beanie", sub: "Beanies", priceCents: 650_00, salePriceCents: null, photos: ["beanie-girl"], featured: true, description: "A ribbed beanie with a big faux-fur pom-pom, snug and warm.", choices: [colour("Olive", "Cream", "Plum")], makeDays: days(2, 3) },
  { sku: "CR-122", name: "Talj slouchy beanie", sub: "Beanies", priceCents: 520_00, salePriceCents: null, photos: ["pom-beanie"], featured: false, description: "A slouchy beanie in an ice-blue wool, with a yarn pom-pom.", choices: [colour("Ice blue", "Grey")], makeDays: days(2, 3) },
  { sku: "CR-131", name: "Mudfi'a striped socks", sub: "Socks & mittens", priceCents: 380_00, salePriceCents: null, photos: ["socks"], featured: false, description: "Thick striped house socks in soft wool, made to your shoe size.", choices: [colour("Grey stripe", "Brown stripe")], makeDays: days(2, 3) },
  { sku: "CR-132", name: "Hodn mittens", sub: "Socks & mittens", priceCents: 520_00, salePriceCents: null, photos: ["mittens-snow", "mittens-coffee"], featured: true, description: "Cable mittens in a soft brushed wool, warm enough for a winter morning.", choices: [colour("Light grey", "Cream")], makeDays: days(3, 4) },
  { sku: "CR-133", name: "Shita Nordic slippers", sub: "Socks & mittens", priceCents: 690_00, salePriceCents: null, photos: ["slippers"], featured: false, description: "Nordic pattern slipper socks with a soft cuff and a non-slip sole.", choices: [colour("Navy & red", "Cream & grey")], makeDays: days(4, 5) },
  // ——— Blankets & throws ———
  { sku: "CR-201", name: "Zaytoon throw set", sub: "Throws", priceCents: 2900_00, salePriceCents: null, photos: ["scarves-stack"], featured: true, description: "Three throws in olive, grey and cream, crocheted to go together on a sofa or a bed.", choices: [colour("Olive set", "Grey set")], dimensions: { width: 120, height: 150, depth: null }, makeDays: days(8, 10) },
  { sku: "CR-202", name: "Chunky stitch blanket", sub: "Throws", priceCents: 3200_00, salePriceCents: null, photos: ["knit-flatlay", "knit-textures"], featured: false, description: "A big blanket in a chunky stitch, 120 by 150 cm, in the colour of your room.", choices: [colour("Plum", "Taupe", "Charcoal")], dimensions: { width: 120, height: 150, depth: null }, makeDays: days(10, 14) },
  { sku: "CR-203", name: "Ghaim baby blanket", sub: "Baby blankets", priceCents: 1450_00, salePriceCents: null, photos: ["fluffy-blanket"], featured: false, description: "A soft baby blanket in a gentle cotton, washable and light. Add the baby's name in a stitch.", choices: [colour("Blush", "Cream", "Sky")], dimensions: { width: 80, height: 100, depth: null }, makeDays: days(5, 7) },
  // ——— Amigurumi toys ———
  { sku: "CR-301", name: "Bundu teddy bear", sub: "Bears", priceCents: 1150_00, salePriceCents: null, photos: ["teddy-sweater"], featured: true, description: "An amigurumi bear in a soft cotton, in his own blue sweater. 30 cm tall, safe eyes stitched on.", choices: [colour("Honey", "Caramel")], dimensions: { width: 18, height: 30, depth: 12 }, makeDays: days(4, 5) },
  { sku: "CR-311", name: "Jazara bunny", sub: "Bunnies & animals", priceCents: 1050_00, salePriceCents: 890_00, photos: ["bunny-knit"], featured: true, description: "A linen-look bunny with a sage bow, crocheted by hand and filled with soft fibre.", dimensions: { width: 15, height: 32, depth: 12 }, makeDays: days(3, 4), stock: null },
  { sku: "CR-321", name: "Winter gnomes, set of three", sub: "Seasonal", priceCents: 840_00, salePriceCents: null, photos: ["gnomes"], featured: false, description: "Three little gnomes in red and cream hats, for the shelf or the table in winter.", makeDays: days(4, 6) },
  { sku: "CR-322", name: "Thalj snowman", sub: "Seasonal", priceCents: 560_00, salePriceCents: null, photos: ["snowman-plush"], featured: false, description: "A soft snowman with a pink scarf and a hat, a gift for the little ones.", makeDays: days(3, 4) },
  // ——— Bags & hats ———
  { sku: "CR-401", name: "Sahil raffia sun hat", sub: "Summer hats", priceCents: 890_00, salePriceCents: null, photos: ["straw-hat"], featured: false, description: "A wide-brim sun hat crocheted in natural raffia, with a black cord.", choices: [colour("Natural", "Sand")], makeDays: days(4, 5) },
  { sku: "CR-402", name: "Two-tone raffia hat", sub: "Summer hats", priceCents: 940_00, salePriceCents: null, photos: ["straw-close"], featured: false, description: "A raffia hat in cream and coffee, light and soft enough to fold.", choices: [colour("Cream & coffee")], makeDays: days(4, 5) },
  { sku: "CR-411", name: "Souk basket bag", sub: "Bags & baskets", priceCents: 1250_00, salePriceCents: null, photos: ["basket-room"], featured: false, description: "A sturdy basket bag in jute and cotton, for the market or for blankets at home.", choices: [colour("Natural & black")], dimensions: { width: 35, height: 40, depth: 35 }, makeDays: days(5, 6) },
  // ——— Home pieces ———
  { sku: "CR-501", name: "Mug cozy, set of two", sub: "Cup cozies", priceCents: 280_00, salePriceCents: null, photos: ["mittens-coffee"], featured: false, description: "Two cable cozies for your mugs, to keep the coffee warm a little longer.", choices: [colour("Grey", "Cream", "Terracotta")], makeDays: days(1, 2) },
  { sku: "CR-502", name: "Waffle cushion cover", sub: "Cushions", priceCents: 720_00, salePriceCents: null, photos: ["sweater-wood"], featured: false, description: "A waffle-stitch cushion cover with buttons at the back, 45 by 45 cm.", choices: [colour("Cream", "Oat")], dimensions: { width: 45, height: 45, depth: null }, makeDays: days(3, 5) },
  // ——— Yarn & tools (ready to ship) ———
  { sku: "CR-601", name: "Egyptian cotton yarn, 100 g", sub: "Cotton yarn", priceCents: 85_00, salePriceCents: null, photos: ["yarn-ball-white"], featured: true, description: "Soft Egyptian cotton, easy to wash: for summer tops, baby blankets and amigurumi. 100 g, about 170 m.", choices: [colour("Natural", "Blush", "Sage", "Sand")] },
  { sku: "CR-602", name: "Cotton yarn, pack of five", sub: "Cotton yarn", priceCents: 390_00, salePriceCents: 340_00, photos: ["yarn-ball-white"], featured: false, description: "Five balls of Egyptian cotton in one colour, enough for a baby blanket.", choices: [colour("Natural", "Blush", "Sage")] },
  { sku: "CR-611", name: "Merino wool, 50 g", sub: "Merino & wool", priceCents: 140_00, salePriceCents: null, photos: ["yarn-balls"], featured: true, description: "A warm, light merino that doesn't itch: for scarves, beanies and cardigans. 50 g, about 120 m.", choices: [colour("Chestnut", "Navy", "Red", "Grey")] },
  { sku: "CR-612", name: "Chunky wool, 200 g", sub: "Merino & wool", priceCents: 260_00, salePriceCents: null, photos: ["knit-textures"], featured: false, description: "A thick wool for blankets that grow quickly. 200 g, about 80 m.", choices: [colour("Charcoal", "Ivory", "Plum")] },
  { sku: "CR-621", name: "Natural raffia, 100 g", sub: "Raffia", priceCents: 120_00, salePriceCents: null, photos: ["straw-close"], featured: false, description: "Paper raffia for hats and bags, strong and light. 100 g, about 80 m.", choices: [colour("Natural", "Coffee", "Black")] },
  { sku: "CR-631", name: "Wooden needles and hooks", sub: "Hooks & tools", priceCents: 240_00, salePriceCents: null, photos: ["hoop-yarn"], featured: false, description: "Bamboo needles and hooks in four sizes, light in the hand.", choices: [colour("3 mm", "4 mm", "5 mm", "6 mm")] },
  { sku: "CR-632", name: "Sewing thread, ten colours", sub: "Hooks & tools", priceCents: 150_00, salePriceCents: null, photos: ["spools"], featured: false, description: "Ten spools of strong thread to sew your pieces together.", stock: 24 },
  { sku: "CR-633", name: "Wooden buttons, 30 pieces", sub: "Hooks & tools", priceCents: 95_00, salePriceCents: null, photos: ["buttons"], featured: false, description: "Thirty buttons in wood and resin, mixed sizes, for cardigans and bags.", stock: 40 },
  { sku: "CR-641", name: "Scarf starter kit", sub: "Kits", priceCents: 420_00, salePriceCents: null, photos: ["blue-yarn"], featured: true, description: "Everything you need for your first scarf: yarn, needles and a pattern in Arabic and English. For beginners.", choices: [colour("Ocean", "Plum", "Olive")] },
  { sku: "CR-642", name: "Amigurumi bear kit", sub: "Kits", priceCents: 480_00, salePriceCents: null, photos: ["teddy-sweater"], featured: false, description: "The yarn, a hook, safety eyes, filling and the pattern to make your own little bear.", stock: 15 },
  // ——— Workshops: a seat is a product (its stock the seats left); a store app has no courses of its own ———
  { sku: "CR-701", name: "Crochet basics for beginners", sub: "In the studio", priceCents: 650_00, salePriceCents: null, photos: ["knit-coffee"], featured: false, description: "Your first stitches in three hours at the studio in Zamalek, every first Saturday at 4 pm. Yarn, hook and tea included; you leave with your first coaster.", stock: 4 },
  { sku: "CR-702", name: "Amigurumi toys", sub: "Online classes", priceCents: 480_00, salePriceCents: null, photos: ["bunny-knit"], featured: false, description: "Two online evenings to crochet your first little toy, for those who know the basic stitches. The kit is delivered before the class.", stock: 12 },
  { sku: "CR-703", name: "A chunky blanket in a day", sub: "In the studio", priceCents: 1200_00, salePriceCents: null, photos: ["knit-flatlay"], featured: false, description: "A whole day at the studio to make a chunky blanket with your hands; the wool and lunch are included.", stock: 2 },
  // ——— The gift wrap, offered with every piece ———
  { sku: "CR-901", name: "Gift wrap with a handwritten card", sub: "Home pieces", priceCents: 60_00, salePriceCents: null, photos: ["hoop-yarn"], featured: false, description: "Your piece wrapped by hand in cotton paper and tied with yarn, with a card written by the maker.", addon: { categories: [] } },
];

export const CROCHET_KIT: ShopKit = {
  demo: "crochet",
  photos: {
    dir: "crochet-photos",
    prefix: "cr-",
    names: [
      "basket-room",
      "beanie-girl",
      "blue-yarn",
      "bunny-knit",
      "buttons",
      "cozy-sweater",
      "fluffy-blanket",
      "gnomes",
      "green-sweater",
      "hero",
      "hoop-yarn",
      "knit-coffee",
      "knit-flatlay",
      "knit-textures",
      "mittens-coffee",
      "mittens-snow",
      "pom-beanie",
      "red-scarf",
      "scarves-stack",
      "slippers",
      "snowman-plush",
      "socks",
      "spools",
      "straw-close",
      "straw-hat",
      "sweater-shoulder",
      "sweater-wood",
      "teddy-sweater",
      "wide-cozy-sweater",
      "wide-hoop-yarn",
      "wide-knit-coffee",
      "wide-knit-flatlay",
      "wide-mittens-coffee",
      "wide-red-scarf",
      "wide-scarves-stack",
      "yarn-ball-white",
      "yarn-balls",
    ],
  },
  currency: "EGP",
  shippingCents: 60_00,
  freeShippingOverCents: 1500_00,
  categories: [
    { ...named("Clothing", "ملابس", "Giyim"), subs: [named("Cardigans & sweaters", "كارديغان وكنزات", "Hırka ve kazaklar"), named("Scarves", "أوشحة", "Atkılar"), named("Beanies", "قبعات صوف", "Bereler"), named("Socks & mittens", "جوارب وقفازات", "Çorap ve eldivenler")] },
    { ...named("Blankets & throws", "بطانيات ومفارش", "Battaniye ve şallar"), subs: [named("Throws", "رميات", "Koltuk şalları"), named("Baby blankets", "بطانيات أطفال", "Bebek battaniyeleri")] },
    { ...named("Amigurumi toys", "دمى أميغورومي", "Amigurumi oyuncaklar"), subs: [named("Bears", "دببة", "Ayıcıklar"), named("Bunnies & animals", "أرانب وحيوانات", "Tavşan ve hayvanlar"), named("Seasonal", "شخصيات موسمية", "Sezonluk figürler")] },
    { ...named("Bags & hats", "حقائب وقبعات", "Çanta ve şapkalar"), subs: [named("Summer hats", "قبعات صيفية", "Yazlık şapkalar"), named("Bags & baskets", "حقائب وسلال", "Çanta ve sepetler")] },
    { ...named("Home pieces", "قطع للبيت", "Ev parçaları"), subs: [named("Cup cozies", "أغطية أكواب", "Kupa kılıfları"), named("Cushions", "وسائد", "Kırlentler")] },
    { ...named("Yarn & tools", "خيوط وأدوات", "İp ve malzemeler"), subs: [named("Cotton yarn", "خيوط قطن", "Pamuk ipler"), named("Merino & wool", "صوف وميرينو", "Merinos ve yün"), named("Raffia", "رافيا", "Rafya"), named("Hooks & tools", "إبر وأدوات", "Tığ ve aletler"), named("Kits", "عُدد جاهزة", "Başlangıç setleri")] },
    { ...named("Workshops", "ورش", "Atölyeler"), subs: [named("In the studio", "ورش حضورية", "Atölyede"), named("Online classes", "دروس عبر الإنترنت", "Çevrim içi dersler")] },
  ],
  products: PRODUCTS,
  flashSale: { title: "Weekend stitches", titles: { ar: "غُرز نهاية الأسبوع", tr: "Hafta sonu ilmekleri" }, percent: 20, hours: 30, limit: 18, sold: 11, skus: ["CR-121", "CR-501", "CR-611"] },
  coupon: { code: "GHURZA10", percent: 10, minOrderCents: 800_00 },
  commerce: {
    returnDays: 7,
    // The card in the customer's words, written by hand by the maker.
    gifts: { checkout: "standard", message: true, maxLength: 200, starters: giftBeginningsIn("en"), starterTexts: { ar: giftBeginningsIn("ar"), tr: giftBeginningsIn("tr") }, recipient: false, anonymous: false },
  },
};
