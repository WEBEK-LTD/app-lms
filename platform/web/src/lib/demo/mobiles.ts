import type { CatalogCurrency, CatalogSettings, CatalogVariants, ProductSpec, TradeInSettings } from "../data/types";
import { specKeyOf } from "../selling/specs";
import type { MobilesPhotoName } from "./shop-photos";

/**
 * 211 Nova (نوفا), the mobiles shop: the demo of Studio's mobiles type
 * (lib/studio/shop-types.ts) and its two Signature looks (A white, ink and
 * cobalt; B deep green on warm stone, lib/studio/demo-designs/
 * mobiles-signature.ts). A phone shop in Cairo: new phones in their
 * storages and colours (each storage its own price), some with a local or
 * an international warranty to choose; certified used phones and tablets
 * with their grade and battery health; tablets, smart watches, earbuds and
 * headphones, and the accessories offered with every phone. Every device
 * has its specs (the table, the compare sheet). Trade-in: the models the
 * shop takes and what each grade is worth. The shop, its devices, their
 * brands (Veyra, Orbit, Lumen, Kaira, Zenta), names and prices are
 * invented; its photos are real, CC0 (public/mobiles-photos/CREDITS.md).
 */

export const MOBILES_CURRENCY: CatalogCurrency = "EGP";
export const MOBILES_SHIPPING_CENTS = 75_00;
export const MOBILES_FREE_SHIPPING_OVER_CENTS = 5_000_00;

/** Trade-in: the devices the shop takes, each storage's top price (like new, EGP), and each grade's share. */
export const MOBILES_TRADE_IN: TradeInSettings = {
  models: [
    { name: "Veyra X2 Pro", storages: [{ label: "128 GB", cents: 12_500_00 }, { label: "256 GB", cents: 13_600_00 }, { label: "512 GB", cents: 14_500_00 }] },
    { name: "Veyra X1", storages: [{ label: "128 GB", cents: 8_200_00 }, { label: "256 GB", cents: 9_100_00 }] },
    { name: "Orbit Eight Pro", storages: [{ label: "128 GB", cents: 10_400_00 }, { label: "256 GB", cents: 11_300_00 }] },
    { name: "Orbit Seven", storages: [{ label: "128 GB", cents: 6_100_00 }, { label: "256 GB", cents: 6_800_00 }] },
    { name: "Lumen 11", storages: [{ label: "128 GB", cents: 7_400_00 }, { label: "256 GB", cents: 8_100_00 }] },
    { name: "Lumen 10", storages: [{ label: "64 GB", cents: 4_600_00 }, { label: "128 GB", cents: 5_200_00 }] },
    { name: "Veyra Tab 9", storages: [{ label: "64 GB", cents: 5_300_00 }, { label: "256 GB", cents: 6_400_00 }] },
  ],
  grades: { like_new: 100, good: 85, fair: 65, broken: 30 },
};

/** Its settings besides money: returns within 14 days, and trade-in (the accessories' category is set once the categories are made). */
export const MOBILES_COMMERCE: Pick<CatalogSettings, "returnDays"> = { returnDays: 14 };

/** The deal of the day: earbuds, a watch and headphones a share off for 30 hours (made again each day), 24 at that price and 15 gone. */
export const MOBILES_FLASH_SALE = { title: "Deal of the day", titles: { ar: "عروض اليوم", tr: "Günün fırsatları" }, percent: 30, hours: 30, limit: 24, sold: 15, skus: ["MB-503", "MB-402", "MB-502"] } as const;

/** The code shown in the app: 10% off a first order from 3,000 EGP. */
export const MOBILES_COUPON = { code: "NOVA10", percent: 10, minOrderCents: 3_000_00 } as const;

export interface MobilesCategory {
  name: string;
  names: { ar: string; tr: string };
  subs: readonly { name: string; names: { ar: string; tr: string } }[];
}

const named = (name: string, ar: string, tr: string) => ({ name, names: { ar, tr } });

/** The main category whose products a product's page offers with it ("Goes with it"). */
export const MOBILES_ACCESSORIES = "Accessories";

/** The main categories in the shop's order, each with its sub-categories. */
export const MOBILES_CATEGORIES: readonly MobilesCategory[] = [
  { ...named("Phones", "الهواتف", "Telefonlar"), subs: [named("Flagship phones", "الفئة الرائدة", "Amiral telefonlar"), named("Everyday phones", "الفئة المتوسطة", "Günlük telefonlar")] },
  { ...named("Certified used", "مستعمل مضمون", "Garantili ikinci el"), subs: [named("Used phones", "هواتف مستعملة", "İkinci el telefonlar"), named("Used tablets", "تابلت مستعمل", "İkinci el tabletler")] },
  { ...named("Tablets", "التابلت", "Tabletler"), subs: [named("Large tablets", "شاشات كبيرة", "Büyük tabletler"), named("Compact tablets", "مقاس صغير", "Kompakt tabletler")] },
  { ...named("Smart watches", "الساعات الذكية", "Akıllı saatler"), subs: [named("Watches", "ساعات ذكية", "Saatler"), named("Fitness bands", "أساور رياضية", "Fitness bantları")] },
  { ...named("Audio", "السماعات", "Kulaklıklar"), subs: [named("Earbuds", "سماعات لاسلكية", "Kablosuz kulaklıklar"), named("Headphones", "سماعات رأس", "Kafa üstü kulaklıklar")] },
  { ...named(MOBILES_ACCESSORIES, "الإكسسوارات", "Aksesuarlar"), subs: [named("Chargers", "الشواحن", "Şarj cihazları"), named("Cases", "الجرابات", "Kılıflar"), named("Cables & earphones", "كابلات وسماعات سلكية", "Kablolar ve kulaklıklar")] },
];

export interface MobilesProduct {
  sku: string;
  name: string;
  /** Its sub-category, by name (its main category follows). */
  sub: string;
  priceCents: number;
  salePriceCents: number | null;
  photos: readonly MobilesPhotoName[];
  featured: boolean;
  description: string;
  /** Its storages, each its own price (the first the product's); empty: one. */
  storages: readonly (readonly [string, number])[];
  /** Its colours; one: none to choose. */
  colours: readonly string[];
  /** A local or an international warranty to choose (international this much less). */
  warrantyChoice: number | null;
  specs: ProductSpec[];
}

/** "Label: value" lines as specs, each keyed when Yallapp knows its label. */
function specs(...lines: string[]): ProductSpec[] {
  return lines.map((line) => {
    const at = line.indexOf(":");
    const label = line.slice(0, at).trim();
    const value = line.slice(at + 1).trim();
    const key = specKeyOf(label);
    return { ...(key ? { key } : {}), label, value };
  });
}

interface Seed {
  sale?: number | null;
  storages?: readonly (readonly [string, number])[];
  colours?: readonly string[];
  warranty?: number | null;
}

const p = (sku: string, name: string, sub: string, price: number, photos: readonly MobilesPhotoName[], description: string, spec: ProductSpec[], o: Seed = {}): MobilesProduct => ({
  sku,
  name,
  sub,
  priceCents: (o.storages?.[0]?.[1] ?? price) * 100,
  salePriceCents: o.sale ? o.sale * 100 : null,
  photos,
  // The certified used devices are the shop's featured ones: its looks list them as "Certified used".
  featured: sub.startsWith("Used "),
  description,
  storages: o.storages ?? [],
  colours: o.colours ?? [],
  warrantyChoice: o.warranty ?? null,
  specs: spec,
});

/** The shop's devices, newest first as the demo lists them. */
export const MOBILES_PRODUCTS: readonly MobilesProduct[] = [
  // ——— Flagship phones ———
  p("MB-101", "Veyra X3 Pro", "Flagship phones", 54_999, ["phone-cam", "phone-vintage", "box-1"], "A camera to carry everywhere: a 200 MP main sensor, a 5x periscope and night shots that keep their colour.\n\nA titanium frame, a 6.7″ display that reaches 2,600 nits outdoors, and a battery that lasts two days of ordinary use.", specs("Screen: 6.7″ OLED, 2,600 nits", "Processor: Veyra V9, 3 nm", "RAM: 12 GB", "Storage: 256 GB", "Main camera: 200 MP + 50 MP 5x + 12 MP", "Front camera: 32 MP", "Battery: 5,000 mAh", "Charging: 65 W wired, 25 W wireless", "System: Veyra OS 6", "Refresh rate: 120 Hz LTPO", "Water resistance: IP68", "Weight: 218 g", "Warranty: 2 years, local agent"), { storages: [["256 GB", 54_999], ["512 GB", 61_999], ["1 TB", 69_999]], colours: ["Titanium", "Black", "Silver", "Blue"], warranty: 2_500 }),
  p("MB-102", "Orbit Nine 5G", "Flagship phones", 41_999, ["phone-earbuds", "phone-earbuds-wide"], "A slim phone with a big battery: 5,500 mAh, 80 W charging from flat to full in 35 minutes.\n\nA bright, flat 6.6″ screen and a camera tuned for portraits.", specs("Screen: 6.6″ AMOLED, 120 Hz", "Processor: Orbit Core 8, 4 nm", "RAM: 12 GB", "Storage: 256 GB", "Main camera: 108 MP + 12 MP + 8 MP", "Front camera: 20 MP", "Battery: 5,500 mAh", "Charging: 80 W wired", "System: Orbit UI 5", "Refresh rate: 120 Hz", "Water resistance: IP67", "Weight: 196 g", "Warranty: 2 years, local agent"), { sale: 38_499, storages: [["256 GB", 41_999], ["512 GB", 45_999]], colours: ["Deep blue", "Black", "Silver"] }),
  p("MB-103", "Lumen 12 Pro", "Flagship phones", 47_900, ["phone-dark", "phone-dark-wide"], "Lumen's best screen yet, a 6.8″ panel with a matte finish that keeps reflections away, and a pen that slides into the frame.", specs("Screen: 6.8″ OLED, matte", "Processor: Lumen L3, 3 nm", "RAM: 16 GB", "Storage: 512 GB", "Main camera: 200 MP + 50 MP + 12 MP", "Front camera: 12 MP", "Battery: 5,000 mAh", "Charging: 45 W wired, 15 W wireless", "System: Lumen OS 14", "Refresh rate: 120 Hz LTPO", "Water resistance: IP68", "Weight: 228 g", "Warranty: 2 years, local agent"), { storages: [["512 GB", 47_900], ["1 TB", 54_900]], colours: ["Titanium", "Graphite"], warranty: 2_000 }),
  p("MB-104", "Veyra X3", "Flagship phones", 42_999, ["phone-bokeh"], "Everything that makes the X3 Pro a pleasure, in a lighter phone that fits one hand.", specs("Screen: 6.1″ OLED, 2,000 nits", "Processor: Veyra V9, 3 nm", "RAM: 8 GB", "Storage: 128 GB", "Main camera: 50 MP + 12 MP", "Front camera: 12 MP", "Battery: 4,100 mAh", "Charging: 45 W wired, 15 W wireless", "System: Veyra OS 6", "Refresh rate: 120 Hz", "Water resistance: IP68", "Weight: 172 g", "Warranty: 2 years, local agent"), { storages: [["128 GB", 42_999], ["256 GB", 46_999]], colours: ["Black", "Silver", "Blue"], warranty: 2_000 }),
  p("MB-105", "Orbit Eight Pro", "Flagship phones", 33_999, ["phone-wood", "phone-wood-wide"], "Last year's flagship at a new price: the same 50 MP camera trio and a curved 6.7″ screen.", specs("Screen: 6.7″ AMOLED, curved", "Processor: Orbit Core 7, 4 nm", "RAM: 12 GB", "Storage: 256 GB", "Main camera: 50 MP + 50 MP + 10 MP", "Front camera: 32 MP", "Battery: 4,800 mAh", "Charging: 67 W wired", "System: Orbit UI 5", "Refresh rate: 120 Hz", "Water resistance: IP68", "Weight: 204 g", "Warranty: 2 years, local agent"), { storages: [["256 GB", 33_999], ["512 GB", 37_499]], colours: ["Black", "Green"] }),
  // ——— Everyday phones ———
  p("MB-106", "Lumen 12", "Everyday phones", 24_999, ["phone-hand-grey"], "A clean, light phone with a camera that does the work for you and an update promise of five years.", specs("Screen: 6.4″ OLED, 120 Hz", "Processor: Lumen L2, 4 nm", "RAM: 8 GB", "Storage: 128 GB", "Main camera: 50 MP + 12 MP", "Front camera: 12 MP", "Battery: 4,600 mAh", "Charging: 33 W wired", "System: Lumen OS 14", "Refresh rate: 120 Hz", "Water resistance: IP67", "Weight: 181 g", "Warranty: 2 years, local agent"), { storages: [["128 GB", 24_999], ["256 GB", 27_499]], colours: ["Grey", "Mint", "Black"] }),
  p("MB-107", "Kaira A5", "Everyday phones", 12_999, ["phone-desk", "phone-desk-wide"], "A big battery, a bright screen and a fair price: the phone to give a parent or a student.", specs("Screen: 6.5″ LCD, 90 Hz", "Processor: Kaira K5, 6 nm", "RAM: 6 GB", "Storage: 128 GB", "Main camera: 50 MP + 2 MP", "Front camera: 8 MP", "Battery: 6,000 mAh", "Charging: 25 W wired", "System: Kaira OS 4", "Refresh rate: 90 Hz", "Water resistance: IP54", "Weight: 199 g", "Warranty: 1 year, local agent"), { colours: ["Black", "Blue"] }),
  p("MB-108", "Zenta Note 7", "Everyday phones", 16_499, ["phone-sea", "phone-sea-wide"], "A 6.7″ screen for films and reading, stereo speakers and a battery for long days out.", specs("Screen: 6.7″ AMOLED, 120 Hz", "Processor: Zenta Z7, 6 nm", "RAM: 8 GB", "Storage: 256 GB", "Main camera: 64 MP + 8 MP", "Front camera: 16 MP", "Battery: 5,200 mAh", "Charging: 45 W wired", "System: Zenta OS 3", "Refresh rate: 120 Hz", "Water resistance: IP54", "Weight: 190 g", "Warranty: 1 year, local agent"), { sale: 14_999, colours: ["Midnight", "Sky"] }),
  p("MB-109", "Orbit Nine Lite", "Everyday phones", 19_999, ["phone-sunset"], "The Nine's look and its 5G in a lighter phone, with a night mode for evening skies.", specs("Screen: 6.5″ AMOLED, 120 Hz", "Processor: Orbit Core 6, 5 nm", "RAM: 8 GB", "Storage: 256 GB", "Main camera: 64 MP + 8 MP", "Front camera: 16 MP", "Battery: 5,000 mAh", "Charging: 45 W wired", "System: Orbit UI 5", "Refresh rate: 120 Hz", "Water resistance: IP54", "Weight: 182 g", "Warranty: 2 years, local agent"), { colours: ["Sunset", "Black"] }),
  // ——— Certified used ———
  p("MB-201", "Orbit Eight Pro, certified used", "Used phones", 33_999, ["box-3", "phone-wood"], "Checked at 72 points by our technicians, cleaned and reset, with a new charger in the box and a 12-month warranty.", specs("Condition: Certified used", "Grade: A+ · Like new", "Battery health: 96%", "Storage: 256 GB", "Screen: 6.7″ AMOLED, curved", "Processor: Orbit Core 7, 4 nm", "RAM: 12 GB", "Main camera: 50 MP + 50 MP + 10 MP", "Warranty: 12 months, Nova"), { sale: 24_750, colours: ["Black"] }),
  p("MB-202", "Lumen 11, certified used", "Used phones", 22_500, ["phone-desk"], "A few fine marks on the frame, a flawless screen; tested, reset and guaranteed for 12 months.", specs("Condition: Certified used", "Grade: A · Excellent", "Battery health: 91%", "Storage: 128 GB", "Screen: 6.4″ OLED", "Processor: Lumen L1, 5 nm", "RAM: 8 GB", "Main camera: 50 MP + 12 MP", "Warranty: 12 months, Nova"), { sale: 16_400, colours: ["Graphite"] }),
  p("MB-203", "Veyra X2 Pro, certified used", "Used phones", 38_000, ["phone-cam"], "The X2 Pro's camera at a far lower price: a near-new phone, checked and guaranteed for 12 months.", specs("Condition: Certified used", "Grade: A+ · Like new", "Battery health: 94%", "Storage: 256 GB", "Screen: 6.7″ OLED", "Processor: Veyra V8, 4 nm", "RAM: 12 GB", "Main camera: 108 MP + 48 MP 5x + 12 MP", "Warranty: 12 months, Nova"), { sale: 27_900, colours: ["Titanium"] }),
  p("MB-204", "Orbit Seven, certified used", "Used phones", 15_000, ["phone-hand-grey"], "Light signs of use on the back, everything working as new; a fair phone at a fair price.", specs("Condition: Certified used", "Grade: B · Very good", "Battery health: 87%", "Storage: 128 GB", "Screen: 6.4″ AMOLED", "Processor: Orbit Core 5, 6 nm", "RAM: 8 GB", "Main camera: 64 MP + 8 MP", "Warranty: 12 months, Nova"), { sale: 9_900, colours: ["Blue"] }),
  p("MB-205", "Veyra Tab 10, certified used", "Used tablets", 21_000, ["tab-marble"], "A tablet for the family, checked and reset, with a new cable and a 12-month warranty.", specs("Condition: Certified used", "Grade: B · Very good", "Battery health: 88%", "Storage: 64 GB", "Screen: 10.9″ LCD", "Processor: Veyra V6", "Warranty: 12 months, Nova"), { sale: 13_900, colours: ["Silver"] }),
  // ——— Tablets ———
  p("MB-301", "Veyra Tab 11", "Large tablets", 24_999, ["tab-pen", "tab-coffee"], "An 11″ screen at 120 Hz and a pen in the box: notes, drawings and films on one light tablet.", specs("Screen: 11″ LCD, 120 Hz", "Processor: Veyra V8", "RAM: 8 GB", "Storage: 256 GB", "Main camera: 12 MP", "Front camera: 12 MP, wide", "Battery: 8,600 mAh", "Charging: 33 W wired", "System: Veyra OS 6", "Weight: 482 g", "Warranty: 2 years, local agent"), { storages: [["128 GB", 22_999], ["256 GB", 24_999]], colours: ["Grey", "Silver"] }),
  p("MB-302", "Orbit Pad Air", "Large tablets", 18_999, ["tab-coffee"], "A thin tablet with a sharp 11.5″ screen and four speakers, made for study and series.", specs("Screen: 11.5″ LCD, 90 Hz", "Processor: Orbit Core 6", "RAM: 6 GB", "Storage: 128 GB", "Main camera: 8 MP", "Front camera: 8 MP", "Battery: 7,700 mAh", "Charging: 33 W wired", "System: Orbit UI 5", "Weight: 465 g", "Warranty: 2 years, local agent"), { colours: ["Grey"] }),
  p("MB-303", "Lumen Tab Mini", "Compact tablets", 15_499, ["tab-stand", "tab-stand-wide"], "An 8.7″ tablet that slips into a bag, for reading, recipes and calls on the stand.", specs("Screen: 8.7″ LCD", "Processor: Lumen L1", "RAM: 4 GB", "Storage: 64 GB", "Front camera: 5 MP", "Battery: 5,100 mAh", "System: Lumen OS 14", "Weight: 339 g", "Warranty: 2 years, local agent"), { colours: ["Silver", "Graphite"] }),
  // ——— Smart watches ———
  p("MB-401", "Orbit Watch 4", "Watches", 8_999, ["watch-fabric", "watch-white"], "GPS, heart rate and sleep in a 44 mm aluminium case, with two days between charges.", specs("Screen: 1.4″ AMOLED", "Connectivity: GPS, Bluetooth 5.3", "Battery: 2 days", "Water resistance: 5 ATM", "Weight: 33 g", "Warranty: 2 years, local agent"), { sale: 7_650, colours: ["Midnight", "Silver"] }),
  p("MB-402", "Veyra Watch S", "Watches", 8_999, ["watch-pink"], "A rounded square watch with a soft band, made to wear every day and every night.", specs("Screen: 1.9″ OLED", "Connectivity: Bluetooth 5.3, NFC", "Battery: 36 hours", "Water resistance: 5 ATM", "Weight: 31 g", "Warranty: 2 years, local agent"), { colours: ["Midnight", "Rose"] }),
  p("MB-403", "Lumen Trail Pro", "Watches", 11_200, ["watch-rugged"], "A rugged watch for hikes and the sea: two-band GPS, maps and 14 days on a charge.", specs("Screen: 1.3″ transflective", "Connectivity: Dual-band GPS, Bluetooth", "Battery: 14 days", "Water resistance: 10 ATM", "Weight: 52 g", "Warranty: 2 years, local agent"), { colours: ["Black"] }),
  p("MB-404", "Orbit Watch 4 Sport", "Watches", 7_499, ["watch-white", "watch-man"], "The Watch 4 with a sport band that breathes, for runs, the gym and the pool.", specs("Screen: 1.4″ AMOLED", "Connectivity: GPS, Bluetooth 5.3", "Battery: 2 days", "Water resistance: 5 ATM", "Weight: 30 g", "Warranty: 2 years, local agent"), { colours: ["Black", "White"] }),
  p("MB-405", "Kaira Band 3", "Fitness bands", 2_299, ["tracker-rail", "tracker-crouch"], "Steps, heart rate and sleep on a light band you forget you are wearing, for two weeks a charge.", specs("Screen: 1.1″ AMOLED", "Connectivity: Bluetooth 5.2", "Battery: 14 days", "Water resistance: 5 ATM", "Weight: 18 g", "Warranty: 1 year, local agent"), { colours: ["Lime", "Black"] }),
  // ——— Audio ———
  p("MB-501", "Lumen Buds Pro", "Earbuds", 4_299, ["buds-purple"], "Noise cancelling that follows the room, clear calls and 30 hours with the case.", specs("Connectivity: Bluetooth 5.3, multipoint", "Battery: 7 h, 30 h with the case", "Charging: USB-C, wireless", "Water resistance: IPX4", "Weight: 5 g each", "Warranty: 1 year, local agent"), { colours: ["White"] }),
  p("MB-502", "Veyra Buds 2", "Earbuds", 4_299, ["buds-fabric"], "Light, open-fit earbuds with spatial sound and a case that charges on any pad.", specs("Connectivity: Bluetooth 5.3", "Battery: 6 h, 28 h with the case", "Charging: USB-C, wireless", "Water resistance: IPX4", "Weight: 4.3 g each", "Warranty: 1 year, local agent"), { colours: ["White"] }),
  p("MB-503", "Orbit Studio headphones", "Headphones", 6_499, ["hp-black", "hp-woman"], "Over-ear headphones with deep, quiet noise cancelling, soft memory foam and 40 hours of music.", specs("Connectivity: Bluetooth 5.3, 3.5 mm", "Battery: 40 h", "Charging: USB-C, 10 min for 5 h", "Weight: 254 g", "Warranty: 1 year, local agent"), { colours: ["Black", "Sand"] }),
  p("MB-504", "Lumen Air headphones", "Headphones", 4_549, ["hp-white"], "Folding wireless headphones, light enough for the whole day.", specs("Connectivity: Bluetooth 5.2", "Battery: 50 h", "Charging: USB-C", "Weight: 220 g", "Warranty: 1 year, local agent"), { colours: ["Black", "White"] }),
  // ——— Accessories ———
  p("MB-601", "Lumen wireless charging pad", "Chargers", 1_150, ["wireless-pad", "wireless-pad-wide"], "A cork and aluminium pad that charges a phone or earbuds at 15 W, with its cable and plug.", specs("Charging: 15 W wireless", "Connectivity: USB-C in", "Weight: 96 g", "Warranty: 1 year, local agent")),
  p("MB-602", "Veyra leather folio case", "Cases", 899, ["case-red", "case-red-wide"], "A natural leather folio with a pocket for two cards, for the Veyra X3 and X3 Pro.", specs("Connectivity: Fits the Veyra X3 and X3 Pro", "Weight: 48 g"), { colours: ["Red", "Black"] }),
  p("MB-603", "Veyra USB-C earphones", "Cables & earphones", 650, ["flatlay-white"], "Wired earphones with a remote and a microphone, for phones without a headphone jack.", specs("Connectivity: USB-C", "Weight: 12 g", "Warranty: 1 year, local agent")),
  p("MB-604", "Orbit 65 W charger and cable", "Chargers", 1_290, ["box-2"], "A compact 65 W charger with a braided USB-C cable: a phone from 0 to 70% in half an hour.", specs("Charging: 65 W USB-C PD", "Weight: 110 g", "Warranty: 1 year, local agent")),
];

/** The main category a sub-category is in. */
export function mobilesMainOf(sub: string): MobilesCategory {
  const found = MOBILES_CATEGORIES.find((c) => c.subs.some((s) => s.name === sub));
  if (!found) throw new Error(`No main category has ${sub}.`);
  return found;
}

/**
 * A device's storages, colours and warranty as its variations (91.5): each
 * storage its own price (the international warranty that much less), each
 * combination's stock its own (a few low, one gone, as a real shop's); none
 * for a device in one storage and one colour.
 */
export function mobilesVariants(product: MobilesProduct, index: number): CatalogVariants | null {
  const storages = product.storages.length > 1 ? product.storages : null;
  const colours = product.colours.length > 1 ? product.colours : null;
  const warranty = product.warrantyChoice !== null ? (["Local", "International"] as const) : null;
  if (!storages && !colours && !warranty) return null;
  const attributes = [
    ...(storages ? [{ name: "Storage", values: storages.map(([s]) => s) }] : []),
    ...(colours ? [{ name: "Colour", values: [...colours] }] : []),
    ...(warranty ? [{ name: "Warranty", values: [...warranty] }] : []),
  ];
  const pattern = [6, 3, 9, 0, 4, 7, 2, 5];
  const items: CatalogVariants["items"] = [];
  let id = 1;
  for (const [si, storage] of (storages ?? [null]).entries()) {
    for (const [ci, colour] of (colours ?? [null]).entries()) {
      for (const [wi, w] of (warranty ?? [null]).entries()) {
        const base = storage ? storage[1] * 100 : product.priceCents;
        const priceCents = w === "International" ? base - product.warrantyChoice! * 100 : base;
        const stock = pattern[(si * 2 + ci * 3 + wi + index) % pattern.length]!;
        const values = [...(storage ? [storage[0]] : []), ...(colour ? [colour] : []), ...(w ? [w] : [])];
        items.push({ id: id++, values, priceCents: priceCents === product.priceCents ? null : priceCents, salePriceCents: null, stock, sku: `${product.sku}-${values.join("-").replaceAll(" ", "").toUpperCase()}`, active: true });
      }
    }
  }
  const first = items.find((v) => v.stock !== 0);
  return { attributes, items, ...(first ? { defaultId: first.id } : {}) };
}
