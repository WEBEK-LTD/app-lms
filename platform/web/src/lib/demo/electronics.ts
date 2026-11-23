import type { CatalogCurrency, CatalogOptionGroup, CatalogSettings, CatalogVariants, ProductSpec, TradeInSettings } from "../data/types";
import { SPEC_NAMES, type SpecKey } from "../selling/specs";
import type { ElectronicsPhotoName } from "./shop-photos";

/**
 * 211 Madar (مدار), the electronics shop: the demo of Studio's electronics
 * type (lib/studio/shop-types.ts) and its two Signature looks (A MADAR, clean
 * white with one deep blue; B NABD, lime on near black over warm stone,
 * lib/studio/demo-designs/electronics-signature.ts). An all-in-one store in
 * Riyadh: phones, laptops, tablets and watches, TVs, audio, cameras and
 * drones, gaming, home appliances and accessories, each product with its
 * specifications (keyed, so the app names them in its language, compares
 * and filters by them), its colours and storages as the store's variations
 * with a price for each storage, its warranty, and for the phones and
 * laptops more cover to add (options). Matching accessories, trade-in of an
 * old phone, the deal of the day and exchanges within 14 days. The shop,
 * its brands (ZENRA, ARCLINE, VELLO, KOVA, AUREL, LUMORA, RYOKU, HAUSEN),
 * products and prices are invented; its photos are real, CC0
 * (public/electronics-photos/CREDITS.md).
 */

export const ELECTRONICS_CURRENCY: CatalogCurrency = "SAR";
export const ELECTRONICS_SHIPPING_CENTS = 30_00;
export const ELECTRONICS_FREE_SHIPPING_OVER_CENTS = 300_00;

/** Its trade-in: the phones it takes, each storage's top price (like new) in SAR cents, and each grade's share. */
export const ELECTRONICS_TRADE_IN: TradeInSettings = {
  models: [
    { name: "ZENRA X9 Pro", storages: [{ label: "256 GB", cents: 1_800_00 }, { label: "512 GB", cents: 2_100_00 }] },
    { name: "ZENRA X9", storages: [{ label: "128 GB", cents: 1_250_00 }, { label: "256 GB", cents: 1_450_00 }] },
    { name: "VELLO Edge 2", storages: [{ label: "128 GB", cents: 950_00 }, { label: "256 GB", cents: 1_100_00 }] },
    { name: "VELLO S7", storages: [{ label: "64 GB", cents: 450_00 }, { label: "128 GB", cents: 600_00 }] },
    { name: "KOVA One", storages: [{ label: "128 GB", cents: 520_00 }] },
  ],
  grades: { like_new: 100, good: 85, fair: 65, broken: 30 },
};

/** Its settings besides money: exchanges and returns within 14 days (the accessories' category and trade-in are set once the categories exist, lib/demo/electronics-entries.ts). */
export const ELECTRONICS_COMMERCE: Pick<CatalogSettings, "returnDays"> = { returnDays: 14 };

/** The flash sale: a few products a share off for 30 hours (made again each day), 40 at that price and 26 gone. */
export const ELECTRONICS_FLASH_SALE = { title: "Deal of the day", titles: { ar: "صفقات اليوم", tr: "Günün fırsatları" }, percent: 18, hours: 30, limit: 40, sold: 26, skus: ["EL-501", "EL-511", "EL-311", "EL-911"] } as const;

/** The code shown in the app: 10% off a first order from 1,000 SAR. */
export const ELECTRONICS_COUPON = { code: "MADAR10", percent: 10, minOrderCents: 1_000_00 } as const;

export interface ElectronicsCategory {
  name: string;
  names: { ar: string; tr: string };
  subs: readonly { name: string; names: { ar: string; tr: string } }[];
}

const named = (name: string, ar: string, tr: string) => ({ name, names: { ar, tr } });

/** The main category whose products are offered as matching accessories. */
export const ELECTRONICS_ACCESSORIES = "Accessories";

/** The main categories in the shop's order, each with its sub-categories. */
export const ELECTRONICS_CATEGORIES: readonly ElectronicsCategory[] = [
  { ...named("Phones", "الجوالات", "Telefonlar"), subs: [named("Flagship phones", "الرائدة", "Amiral telefonlar"), named("Everyday phones", "للاستخدام اليومي", "Günlük telefonlar")] },
  { ...named("Laptops", "اللابتوبات", "Dizüstü bilgisayarlar"), subs: [named("Thin & light", "خفيفة ونحيفة", "İnce ve hafif"), named("Pro laptops", "احترافية", "Profesyonel")] },
  { ...named("Tablets & watches", "التابلت والساعات", "Tablet ve saatler"), subs: [named("Tablets", "تابلت", "Tabletler"), named("Smartwatches", "ساعات ذكية", "Akıllı saatler")] },
  { ...named("TVs & screens", "الشاشات", "TV ve ekranlar"), subs: [named("OLED TVs", "شاشات OLED", "OLED TV'ler")] },
  { ...named("Audio", "الصوتيات", "Ses"), subs: [named("Headphones", "سماعات رأس", "Kulaklıklar"), named("Earbuds", "سماعات لاسلكية", "Kablosuz kulaklıklar")] },
  { ...named("Cameras & drones", "الكاميرات والدرون", "Kamera ve dronlar"), subs: [named("Cameras", "كاميرات", "Kameralar"), named("Lenses", "عدسات", "Objektifler"), named("Drones", "درون", "Dronlar")] },
  { ...named("Gaming", "الألعاب", "Oyun"), subs: [named("Controllers", "أذرع التحكم", "Oyun kumandaları"), named("VR", "الواقع الافتراضي", "Sanal gerçeklik")] },
  { ...named("Home appliances", "الأجهزة المنزلية", "Ev aletleri"), subs: [named("Kitchen", "المطبخ", "Mutfak"), named("Laundry", "الغسيل", "Çamaşır"), named("Smart home", "المنزل الذكي", "Akıllı ev")] },
  { ...named(ELECTRONICS_ACCESSORIES, "الملحقات", "Aksesuarlar"), subs: [named("Keyboards", "لوحات المفاتيح", "Klavyeler"), named("Storage", "التخزين", "Depolama")] },
];

/** A spec in the shop's words (English), keyed. */
const s = (key: SpecKey, value: string): ProductSpec => ({ key, label: SPEC_NAMES[key].en, value });

/** A choice of the product's variations: its name and each value with its own price (SAR, null: the product's). */
type Choice = { name: string; values: readonly (string | readonly [string, number])[] };

export interface ElectronicsProduct {
  sku: string;
  brand: string;
  name: string;
  /** Its sub-category, by name (its main category follows). */
  sub: string;
  priceCents: number;
  salePriceCents: number | null;
  photos: readonly ElectronicsPhotoName[];
  featured: boolean;
  description: string;
  specs: readonly ProductSpec[];
  /** Its colour and storage (or size, memory) as variations; the first priced one sets the price of each. */
  choices: readonly Choice[];
  /** More cover to add (an option group). */
  cover: boolean;
}

const p = (sku: string, brand: string, name: string, sub: string, price: number, sale: number | null, photos: readonly ElectronicsPhotoName[], specs: readonly ProductSpec[], choices: readonly Choice[], description: string, extra: { featured?: boolean; cover?: boolean } = {}): ElectronicsProduct => ({
  sku,
  brand,
  name: `${brand} ${name}`,
  sub,
  priceCents: price * 100,
  salePriceCents: sale === null ? null : sale * 100,
  photos,
  featured: extra.featured ?? false,
  description,
  specs,
  choices,
  cover: extra.cover ?? false,
});

const colour = (...values: string[]): Choice => ({ name: "Colour", values });
const storage = (...values: (readonly [string, number])[]): Choice => ({ name: "Storage", values });
const W2 = s("warranty", "2 years, agent");
const W1 = s("warranty", "1 year, agent");

/** The shop's products, newest first as the demo lists them. */
export const ELECTRONICS_PRODUCTS: readonly ElectronicsProduct[] = [
  // ——— Phones ———
  p("EL-101", "ZENRA", "X1 Pro", "Flagship phones", 4899, null, ["phone-camera", "phone-black", "phone-wood", "phone-unbox"], [s("screen", "6.7″ OLED, 120 Hz"), s("cpu", "Z3, 3 nm"), s("ram", "12 GB"), s("storage", "256 GB to 1 TB"), s("camera", "50 + 50 + 12 MP"), s("front_camera", "32 MP, 4K"), s("battery", "5,000 mAh"), s("charging", "65 W wired, 25 W wireless"), s("os", "ZenOS 5"), s("water", "IP68"), s("weight", "204 g"), W2], [colour("Titanium", "Black", "Silver", "Sand", "Blue"), storage(["256 GB", 4899], ["512 GB", 5599], ["1 TB", 6399])], "A pro camera in your pocket: three 50-megapixel-class lenses that hold detail at night, a 5× periscope zoom and the Z3 chip that keeps the battery going for two days of ordinary use.\n\nA titanium frame, a 6.7-inch OLED screen at 120 Hz and fast charging at 65 W.", { featured: true, cover: true }),
  p("EL-102", "ZENRA", "X1", "Flagship phones", 3299, null, ["phone-table", "phone-black"], [s("screen", "6.3″ OLED, 120 Hz"), s("cpu", "Z3, 3 nm"), s("ram", "8 GB"), s("storage", "128 GB or 256 GB"), s("camera", "48 + 12 MP"), s("front_camera", "12 MP"), s("battery", "4,400 mAh"), s("charging", "45 W wired, 15 W wireless"), s("os", "ZenOS 5"), s("water", "IP68"), s("weight", "182 g"), W2], [colour("Black", "Silver", "Blue"), storage(["128 GB", 3299], ["256 GB", 3799])], "The X1's chip and screen in a smaller phone that sits well in one hand, with a main camera that shoots 4K at 60 frames.", { featured: true, cover: true }),
  p("EL-103", "VELLO", "Edge", "Flagship phones", 3499, 3150, ["phone-hand", "phone-wood"], [s("screen", "6.6″ curved OLED, 120 Hz"), s("cpu", "Octa-core, 4 nm"), s("ram", "12 GB"), s("storage", "256 GB"), s("camera", "64 + 13 MP"), s("front_camera", "32 MP"), s("battery", "4,800 mAh"), s("charging", "80 W wired"), s("os", "Vello OS 4"), s("water", "IP67"), s("weight", "189 g"), W2], [colour("Violet", "Graphite")], "A curved screen that runs edge to edge, charging from empty to full in about half an hour, and a slim body that weighs under 190 grams.", { cover: true }),
  p("EL-104", "VELLO", "Lite 5G", "Everyday phones", 1499, null, ["phone-wood", "phone-buds"], [s("screen", "6.5″ AMOLED, 90 Hz"), s("cpu", "Octa-core, 6 nm"), s("ram", "8 GB"), s("storage", "128 GB"), s("camera", "50 + 8 MP"), s("battery", "5,000 mAh"), s("charging", "33 W wired"), s("os", "Vello OS 4"), s("weight", "178 g"), W1], [colour("Black", "Mint")], "5G, a bright AMOLED screen and a battery that lasts two days, at a price that makes sense for every day."),
  // ——— Laptops ———
  p("EL-201", "ARCLINE", "Air 14", "Thin & light", 4299, null, ["laptop-plant", "laptop-table", "laptop-wood"], [s("screen", "14″ 2.8K, 90 Hz"), s("cpu", "Arc X2, 10 cores"), s("gpu", "Integrated, 10 cores"), s("ram", "16 GB"), s("storage", "512 GB SSD"), s("battery", "Up to 18 hours"), s("os", "Arcline OS"), s("weight", "1.2 kg"), W2], [colour("Silver", "Space grey"), { name: "Memory and storage", values: [["16 GB · 512 GB", 4299], ["16 GB · 1 TB", 4899], ["32 GB · 1 TB", 5799]] }], "A laptop you forget is in your bag: 1.2 kg, a quiet fanless design and up to 18 hours on a charge, with a sharp 2.8K screen for work and films.", { featured: true, cover: true }),
  p("EL-202", "ARCLINE", "Pro 16", "Pro laptops", 9799, 8999, ["laptop-chart", "laptop-close", "laptop-glow"], [s("screen", "16″ Mini-LED, 120 Hz"), s("cpu", "Arc X2 Max, 16 cores"), s("gpu", "40-core graphics"), s("ram", "32 GB"), s("storage", "1 TB SSD"), s("battery", "Up to 22 hours"), s("connectivity", "3 × USB-C, HDMI, SD card"), s("os", "Arcline OS"), s("weight", "2.1 kg"), W2], [colour("Space grey", "Silver"), { name: "Memory and storage", values: [["32 GB · 1 TB", 9799], ["48 GB · 2 TB", 12499]] }], "Performance that never slows down: the Arc X2 Max for editing 8K video and big builds, a Mini-LED screen with deep blacks and a battery that lasts a working day and more.", { featured: true, cover: true }),
  p("EL-203", "ARCLINE", "Pro 14", "Pro laptops", 7299, null, ["laptop-silver", "laptop-sun"], [s("screen", "14″ Mini-LED, 120 Hz"), s("cpu", "Arc X2 Pro, 12 cores"), s("gpu", "19-core graphics"), s("ram", "18 GB"), s("storage", "512 GB SSD"), s("battery", "Up to 18 hours"), s("os", "Arcline OS"), s("weight", "1.6 kg"), W2], [colour("Silver", "Space grey")], "The Pro's power in a 14-inch body, for photographers and developers on the move.", { cover: true }),
  p("EL-204", "ARCLINE", "Night 15", "Thin & light", 5799, null, ["laptop-night", "laptop-desk"], [s("screen", "15.3″ 2.8K"), s("cpu", "Arc X2, 10 cores"), s("gpu", "Integrated, 10 cores"), s("ram", "16 GB"), s("storage", "1 TB SSD"), s("battery", "Up to 18 hours"), s("os", "Arcline OS"), s("weight", "1.5 kg"), W2], [colour("Midnight", "Starlight")], "A bigger screen without the weight: 15 inches, 1.5 kg and a keyboard that lights up softly at night."),
  p("EL-205", "ARCLINE", "Slate 13", "Thin & light", 3499, null, ["laptop-wood", "laptop-desk"], [s("screen", "13.6″ IPS"), s("cpu", "Arc X1, 8 cores"), s("ram", "8 GB"), s("storage", "256 GB SSD"), s("battery", "Up to 15 hours"), s("os", "Arcline OS"), s("weight", "1.1 kg"), W1], [colour("Silver", "Gold")], "Light and simple, for study and the everyday: a 13.6-inch screen and a whole day on one charge."),
  // ——— Tablets & watches ———
  p("EL-301", "VELLO", "Tab 11 Pro", "Tablets", 3799, null, ["tablet-pen", "tablet-phone"], [s("screen", "11″ OLED, 120 Hz"), s("cpu", "Octa-core, 4 nm"), s("ram", "8 GB"), s("storage", "256 GB"), s("battery", "10,000 mAh"), s("charging", "45 W"), s("os", "Vello OS 4"), s("weight", "480 g"), W2], [colour("Graphite", "Silver"), storage(["256 GB", 3799], ["512 GB", 4399])], "A tablet for drawing and taking notes: the pen is in the box, the OLED screen answers it without delay, and the battery goes all week.", { featured: true }),
  p("EL-302", "VELLO", "Tab Air", "Tablets", 2499, null, ["tablet-phone"], [s("screen", "10.9″ LCD, 90 Hz"), s("cpu", "Octa-core, 6 nm"), s("ram", "6 GB"), s("storage", "128 GB"), s("battery", "8,000 mAh"), s("os", "Vello OS 4"), s("weight", "460 g"), W1], [colour("Silver", "Blue")], "A light tablet for films, reading and video calls with the family."),
  p("EL-311", "KOVA", "S3 · 45 mm", "Smartwatches", 1699, 1499, ["watch-grey", "watch-white", "watch-phone"], [s("screen", "1.9″ AMOLED, always on"), s("battery", "Up to 3 days"), s("water", "5 ATM"), s("connectivity", "Bluetooth, Wi-Fi, NFC"), s("weight", "38 g"), W2], [colour("Graphite", "Silver", "Blush")], "Your health on your wrist: heart rate, sleep, blood oxygen and over a hundred sports, with a screen bright enough for the midday sun.", { featured: true }),
  p("EL-312", "KOVA", "S3 · 41 mm", "Smartwatches", 1399, null, ["watch-blush", "watch-lens"], [s("screen", "1.7″ AMOLED, always on"), s("battery", "Up to 2 days"), s("water", "5 ATM"), s("connectivity", "Bluetooth, Wi-Fi, NFC"), s("weight", "32 g"), W2], [colour("Blush", "Graphite")], "The S3 in a smaller size, light on the wrist all day and all night."),
  p("EL-313", "KOVA", "S3 Cellular", "Smartwatches", 1799, null, ["watch-phone", "watch-lens"], [s("screen", "1.9″ AMOLED, always on"), s("battery", "Up to 2 days"), s("water", "5 ATM"), s("connectivity", "eSIM, Bluetooth, Wi-Fi, NFC"), s("weight", "39 g"), W2], [colour("Graphite")], "Calls and messages without the phone, with its own eSIM, for runs and swims."),
  // ——— TVs ———
  p("EL-401", "LUMORA", "OLED C5", "OLED TVs", 10499, 8999, ["tv-room", "screen-wave"], [s("screen", "65″ OLED, 4K, HDR"), s("refresh", "120 Hz"), s("cpu", "Lumora α8 processor"), s("connectivity", "4 × HDMI 2.1, Wi-Fi 6"), s("os", "Lumora TV OS"), s("weight", "18.5 kg"), s("warranty", "3 years, agent")], [{ name: "Size", values: [["55″", 7499], ["65″", 10499], ["77″", 14499]] }], "True black and colours that don't fade: every pixel lights itself, so a night scene stays a night scene. 120 Hz for games, and wall mounting free in Riyadh.", { featured: true }),
  // ——— Audio ———
  p("EL-501", "AUREL", "Studio ANC", "Headphones", 1399, 1149, ["hp-studio", "hp-dark"], [s("battery", "Up to 40 hours"), s("charging", "USB-C, 10 min for 5 hours"), s("connectivity", "Bluetooth 5.3, multipoint"), s("weight", "250 g"), W2], [colour("Black", "White")], "Active noise cancelling that quiets a plane cabin, a warm sound tuned in the studio and 40 hours of music between charges.", { featured: true }),
  p("EL-502", "AUREL", "Heritage", "Headphones", 1299, null, ["hp-leather"], [s("battery", "Up to 30 hours"), s("connectivity", "Bluetooth 5.3, 3.5 mm"), s("weight", "290 g"), W2], [colour("Tan leather")], "Natural leather and polished aluminium, a hi-fi sound with or without the cable."),
  p("EL-503", "AUREL", "One", "Headphones", 899, null, ["hp-white"], [s("battery", "Up to 40 hours"), s("connectivity", "Bluetooth 5.2"), s("weight", "220 g"), W1], [colour("Black")], "Light, foldable wireless headphones for every day, with 40 hours on a charge."),
  p("EL-504", "AUREL", "Studio Pro", "Headphones", 1599, null, ["hp-dark", "hp-studio"], [s("battery", "Up to 50 hours"), s("connectivity", "Bluetooth 5.4, lossless over USB-C"), s("weight", "260 g"), W2], [colour("Black")], "The Studio with lossless sound over the cable and a sharper noise cancelling."),
  p("EL-511", "AUREL", "Buds Pro", "Earbuds", 949, 799, ["buds-carpet", "buds-plant"], [s("battery", "8 hours, 30 with the case"), s("charging", "USB-C and wireless"), s("water", "IP54"), s("connectivity", "Bluetooth 5.3"), W2], [colour("White")], "Noise cancelling in earbuds that disappear in the ear, with a case that charges on any wireless pad.", { featured: true }),
  p("EL-512", "AUREL", "Buds Air", "Earbuds", 549, null, ["buds-plant"], [s("battery", "6 hours, 24 with the case"), s("water", "IPX4"), s("connectivity", "Bluetooth 5.3"), W1], [colour("White")], "Light earbuds for calls and music, a tap to answer."),
  // ——— Cameras & drones ———
  p("EL-601", "RYOKU", "R7 mirrorless", "Cameras", 10299, 9499, ["camera-night", "lens-top"], [s("camera", "33 MP full-frame"), s("screen", "3.2″ tilting touch screen"), s("connectivity", "Wi-Fi, Bluetooth, USB-C"), s("battery", "Up to 580 shots"), s("weight", "658 g"), W2], [{ name: "Kit", values: [["Body only", 10299], ["With 24–70 mm", 15299]] }], "A full-frame camera for photos and 4K video, with autofocus that follows eyes, animals and cars, and stabilisation in the body.", { featured: true }),
  p("EL-602", "RYOKU", "35 mm f/1.4 lens", "Lenses", 3299, null, ["lens-gold"], [s("weight", "524 g"), W2], [], "A bright lens for portraits and the street, soft behind and sharp where it matters."),
  p("EL-603", "RYOKU", "24–70 mm f/2.8 lens", "Lenses", 5499, null, ["lens-top"], [s("weight", "886 g"), W2], [], "The one zoom for weddings, travel and everything between."),
  p("EL-604", "RYOKU", "50 mm f/1.8 lens", "Lenses", 1299, null, ["lens-white"], [s("weight", "186 g"), W1], [], "A small, light prime for the first step beyond the kit lens."),
  p("EL-611", "RYOKU", "Mini 4 drone", "Drones", 2999, null, ["drone-mini", "drone-sky"], [s("camera", "48 MP, 4K at 60 fps"), s("battery", "Up to 34 minutes"), s("weight", "249 g"), W1], [], "Under 250 grams, 4K video and 34 minutes in the air, folded into a pocket."),
  p("EL-612", "RYOKU", "Air 3 drone", "Drones", 4999, null, ["drone-sky", "drone-mini"], [s("camera", "Two 48 MP cameras, 4K HDR"), s("battery", "Up to 46 minutes"), s("weight", "720 g"), W1], [], "Two cameras, a wide and a 3× zoom, and 46 minutes of flight for the long shots."),
  // ——— Gaming ———
  p("EL-701", "KOVA", "Pulse controller", "Controllers", 349, null, ["gamepad-blue", "gamepad-hands"], [s("battery", "Up to 30 hours"), s("connectivity", "Bluetooth, USB-C"), W1], [colour("Midnight blue", "White")], "A wireless controller with a soft grip and a light bar, for the console and the PC."),
  p("EL-702", "KOVA", "Pulse Edge controller", "Controllers", 699, null, ["gamepad-hands"], [s("battery", "Up to 20 hours"), s("connectivity", "Bluetooth, USB-C"), W1], [], "Back paddles, swappable sticks and triggers you can set shorter, for competitive play."),
  p("EL-711", "VELLO", "Vision VR headset", "VR", 2199, null, ["vr-headset"], [s("screen", "2 × 2K LCD, 120 Hz"), s("storage", "256 GB"), s("battery", "Up to 2.5 hours"), s("weight", "515 g"), W1], [], "Games, films and workouts all around you, with no cable and no computer."),
  // ——— Home appliances ———
  p("EL-801", "HAUSEN", "Barista automatic espresso machine", "Kitchen", 3799, 3299, ["espresso"], [s("connectivity", "Wi-Fi, the Hausen app"), s("weight", "9.4 kg"), s("warranty", "2 years, at home")], [colour("Steel", "Black")], "From bean to cup in a touch: espresso, cappuccino and a flat white, its milk frothed by the machine, the beans ground fresh each time.", { featured: true }),
  p("EL-802", "HAUSEN", "10 kg steam washer", "Laundry", 3299, 2899, ["washer"], [s("connectivity", "Wi-Fi, the Hausen app"), s("weight", "72 kg"), s("warranty", "10 years on the motor, 2 years on the rest")], [], "A gentle steam cycle that takes out creases and allergens, 10 kg in one load, energy class A+++. Delivery and installation free in Riyadh."),
  p("EL-803", "HAUSEN", "Combi microwave", "Kitchen", 1199, null, ["microwave"], [s("weight", "15 kg"), s("warranty", "2 years, at home")], [colour("White", "Steel")], "A microwave, a grill and a fan oven in one, 32 litres."),
  p("EL-804", "HAUSEN", "Built-in oven", "Kitchen", 2699, null, ["oven"], [s("connectivity", "Wi-Fi, the Hausen app"), s("weight", "34 kg"), s("warranty", "2 years, at home")], [], "A 71-litre oven with steam, a meat probe and a self-cleaning cycle. Installation free in Riyadh."),
  p("EL-811", "KOVA", "Home Cam 360", "Smart home", 399, null, ["home-cam"], [s("camera", "2K, 360° pan, night vision"), s("connectivity", "Wi-Fi"), W1], [], "See every corner of the room from your phone, with alerts when something moves."),
  // ——— Accessories ———
  p("EL-901", "ARCLINE", "Slim wireless keyboard", "Keyboards", 459, null, ["keyboard-slim"], [s("battery", "Up to 3 months"), s("connectivity", "Bluetooth, three devices"), W1], [colour("Graphite", "Silver")], "Quiet, low keys and three devices at once: switch from the laptop to the tablet in a tap."),
  p("EL-902", "KOVA", "Glow RGB keyboard", "Keyboards", 529, null, ["keyboard-rgb"], [s("connectivity", "USB-C and 2.4 GHz"), W1], [], "A backlit low-profile keyboard in every colour you like, for the desk and for games."),
  p("EL-911", "ARCLINE", "Portable SSD", "Storage", 649, null, ["storage-kit"], [s("storage", "1 TB or 2 TB"), s("connectivity", "USB-C, 1,050 MB/s"), s("weight", "58 g"), W2], [storage(["1 TB", 649], ["2 TB", 999])], "A whole library of photos in your pocket, copied at over a gigabyte a second."),
];

/** The main category a sub-category is in. */
export function electronicsMainOf(sub: string): ElectronicsCategory {
  const found = ELECTRONICS_CATEGORIES.find((c) => c.subs.some((x) => x.name === sub));
  if (!found) throw new Error(`No main category has ${sub}.`);
  return found;
}

/**
 * A product's colours and storages (or sizes, kits) as its variations
 * (91.5): each combination its own stock, its price the storage's (SAR
 * cents, converted by `money`), a few low; none for a product with none to
 * choose. The first combination is chosen when the page opens.
 */
export function electronicsVariants(product: ElectronicsProduct, index: number, money: (cents: number) => number): CatalogVariants | null {
  const choices = product.choices.filter((c) => c.values.length > 1);
  if (!choices.length) return null;
  const attributes = choices.map((c) => ({ name: c.name, values: c.values.map((v) => (typeof v === "string" ? v : v[0])) }));
  const pattern = [8, 3, 12, 0, 6, 2, 9, 5];
  const items: CatalogVariants["items"] = [];
  let id = 1;
  const combos: (string | readonly [string, number])[][] = choices.reduce<(string | readonly [string, number])[][]>((all, c) => all.flatMap((a) => c.values.map((v) => [...a, v])), [[]]);
  for (const combo of combos) {
    const priced = combo.find((v): v is readonly [string, number] => typeof v !== "string");
    const price = priced ? money(priced[1] * 100) : null;
    // On sale, every storage keeps the same share off.
    const sale = price !== null && product.salePriceCents !== null ? Math.round((price * product.salePriceCents) / product.priceCents / 100) * 100 : null;
    const values = combo.map((v) => (typeof v === "string" ? v : v[0]));
    items.push({ id: id++, values, priceCents: price, salePriceCents: sale, stock: pattern[(id + index) % pattern.length]!, sku: `${product.sku}-${values.join("-").replace(/[^A-Za-z0-9]+/g, "").toUpperCase()}`, active: true });
  }
  const first = items.find((v) => v.stock !== 0);
  return { attributes, items, ...(first ? { defaultId: first.id } : {}) };
}

/** The phones' and laptops' cover to add: a year more with Madar Care, and a screen and liquid cover. */
export function electronicsCover(money: (cents: number) => number): CatalogOptionGroup[] {
  return [
    {
      id: "cover",
      name: "Warranty and protection",
      min: 0,
      max: 2,
      options: [
        { id: "care", name: "Madar Care: one more year", priceDeltaCents: money(299_00) },
        { id: "screen", name: "Screen and liquid cover, 2 years", priceDeltaCents: money(449_00) },
      ],
    },
  ];
}
