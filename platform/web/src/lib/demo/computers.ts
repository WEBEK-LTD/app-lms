import type { CatalogCurrency, CatalogSettings, CatalogVariants, PcPart, ProductSpec } from "../data/types";
import { specKeyOf, SPEC_NAMES, type SpecKey } from "../selling/specs";
import type { ComputersPhotoName } from "./shop-photos";

/**
 * 211 Nawah (نواة), the computers and gaming shop: the demo of Studio's
 * computers type (lib/studio/shop-types.ts) and its two Signature looks (A
 * NAWAH, white and one strong blue; B SILICA, deep green on warm stone,
 * lib/studio/demo-designs/computers-signature.ts). A shop in Jeddah:
 * laptops, desktops and ready builds, monitors, the parts to build a PC,
 * keyboards and mice, headsets and microphones, and gaming gear, each with
 * its specifications (the table on its page, the filters by processor,
 * memory, storage and graphics, the compare sheet); the laptops and builds
 * configured (memory and storage as options, each with its price); the
 * parts with what Build your PC checks (the socket, the memory type, the
 * power and the size), so a build goes together or says why not. The shop,
 * its brands (VANTA, ORBIT, KESTREL, LUMEN, ECHO and Nawah's own), its
 * products and prices are invented; its photos are real, CC0
 * (public/computers-photos/CREDITS.md).
 */

export const COMPUTERS_CURRENCY: CatalogCurrency = "SAR";
export const COMPUTERS_SHIPPING_CENTS = 35_00;
export const COMPUTERS_FREE_SHIPPING_OVER_CENTS = 300_00;

/** Its settings besides money: returns within 14 days (its parts: Build your PC and the accessories, set once its categories exist). */
export const COMPUTERS_COMMERCE: Pick<CatalogSettings, "returnDays"> = { returnDays: 14 };

/** The hour deals: a few parts and accessories a share off for a little over a day (made again each day by the daily job), 40 at that price and 29 gone. */
export const COMPUTERS_FLASH_SALE = { title: "Hour deals", titles: { ar: "صفقات الساعة", tr: "Saatin fırsatları" }, percent: 20, hours: 26, limit: 40, sold: 29, skus: ["PC-421", "PC-441", "PC-451", "PC-601"] } as const;

/** The code shown in the app: 10% off a first order from 1,000 SAR. */
export const COMPUTERS_COUPON = { code: "NAWAH10", percent: 10, minOrderCents: 1000_00 } as const;

export interface ComputersCategory {
  name: string;
  names: { ar: string; tr: string };
  subs: readonly { name: string; names: { ar: string; tr: string } }[];
}

const named = (name: string, ar: string, tr: string) => ({ name, names: { ar, tr } });

/** The main categories in the shop's order, each with its sub-categories. */
export const COMPUTERS_CATEGORIES: readonly ComputersCategory[] = [
  { ...named("Laptops", "اللابتوبات", "Dizüstü bilgisayarlar"), subs: [named("Gaming laptops", "لابتوبات ألعاب", "Oyun dizüstüleri"), named("Thin & light", "نحيفة وخفيفة", "İnce ve hafif"), named("Creator laptops", "لابتوبات للمبدعين", "İçerik üretici dizüstüleri")] },
  { ...named("Desktops & builds", "أجهزة مكتبية وتجميعات", "Masaüstü ve toplamalar"), subs: [named("Gaming builds", "تجميعات ألعاب", "Oyun toplamaları"), named("Workstations", "محطات إبداع", "İş istasyonları")] },
  { ...named("Monitors", "الشاشات", "Monitörler"), subs: [named("Gaming monitors", "شاشات ألعاب", "Oyun monitörleri"), named("Design monitors", "شاشات للتصميم", "Tasarım monitörleri")] },
  {
    ...named("PC parts", "القطع والمكونات", "Bilgisayar parçaları"),
    subs: [
      named("Processors", "المعالجات", "İşlemciler"),
      named("Motherboards", "اللوحات الأم", "Anakartlar"),
      named("Memory", "الذاكرة", "Bellekler"),
      named("Graphics cards", "كروت الشاشة", "Ekran kartları"),
      named("Storage", "التخزين", "Depolama"),
      named("Coolers", "التبريد", "Soğutucular"),
      named("Power supplies", "مزوّدات الطاقة", "Güç kaynakları"),
      named("Cases", "الصناديق", "Kasalar"),
    ],
  },
  { ...named("Keyboards & mice", "الكيبورد والماوس", "Klavye ve fare"), subs: [named("Keyboards", "كيبوردات", "Klavyeler"), named("Mice", "ماوس", "Fareler")] },
  { ...named("Audio & streaming", "السماعات والبث", "Ses ve yayın"), subs: [named("Headsets", "سماعات", "Kulaklıklar"), named("Microphones", "مايكات", "Mikrofonlar")] },
  { ...named("Gaming gear", "عالم الألعاب", "Oyun ekipmanı"), subs: [named("Controllers", "أذرع التحكم", "Oyun kolları"), named("Arcade sticks", "أذرع آركيد", "Arcade kolları")] },
];

/** Build your PC: each part's sub-category, in its order; the cooler and the case may be left out. */
export const COMPUTERS_PC_STEPS: readonly { part: PcPart; sub: string; required: boolean }[] = [
  { part: "cpu", sub: "Processors", required: true },
  { part: "board", sub: "Motherboards", required: true },
  { part: "ram", sub: "Memory", required: true },
  { part: "gpu", sub: "Graphics cards", required: true },
  { part: "storage", sub: "Storage", required: true },
  { part: "cooler", sub: "Coolers", required: false },
  { part: "psu", sub: "Power supplies", required: true },
  { part: "case", sub: "Cases", required: false },
];

/** The category whose products a product's page offers as matching accessories. */
export const COMPUTERS_ACCESSORIES = "Keyboards & mice";

/** A laptop's or build's options: memory and storage, each step up its own price (in SAR). */
export interface ComputersOptions {
  ram: readonly [string, number][];
  storage: readonly [string, number][];
}

export interface ComputersProduct {
  sku: string;
  name: string;
  /** Its sub-category, by name (its main category follows). */
  sub: string;
  priceCents: number;
  salePriceCents: number | null;
  /** Its photos, the first its cover. */
  photos: readonly ComputersPhotoName[];
  featured: boolean;
  description: string;
  /** Its specifications as the owner writes them ("Label: value"), the known ones keyed. */
  specs: ProductSpec[];
  /** Its options (configure: memory and storage); null: none. */
  options: ComputersOptions | null;
}

/** "Label: value" lines read as specs: each label a key Yallapp knows gets it (lib/selling/specs.ts). */
function specs(pairs: readonly [SpecKey | string, string][]): ProductSpec[] {
  return pairs.map(([label, value]) => {
    const known = (Object.keys(SPEC_NAMES) as SpecKey[]).includes(label as SpecKey) ? (label as SpecKey) : null;
    const words = known ? SPEC_NAMES[known].en : label;
    const key = known ?? specKeyOf(label);
    return { ...(key ? { key } : {}), label: words, value };
  });
}

const p = (sku: string, name: string, sub: string, price: number, sale: number | null, photos: readonly ComputersPhotoName[], spec: readonly [SpecKey | string, string][], description: string, extra: { featured?: boolean; options?: ComputersOptions } = {}): ComputersProduct => ({
  sku,
  name,
  sub,
  priceCents: price * 100,
  salePriceCents: sale === null ? null : sale * 100,
  photos,
  featured: extra.featured ?? false,
  description,
  specs: specs(spec),
  options: extra.options ?? null,
});

const LAPTOP_OPTIONS: ComputersOptions = { ram: [["16 GB", 0], ["32 GB", 600]], storage: [["512 GB", 0], ["1 TB", 450]] };
const PRO_OPTIONS: ComputersOptions = { ram: [["32 GB", 0], ["64 GB", 1200]], storage: [["1 TB", 0], ["2 TB", 700]] };
const BUILD_OPTIONS: ComputersOptions = { ram: [["32 GB", 0], ["64 GB", 900]], storage: [["2 TB", 0], ["4 TB", 1100]] };
const WARRANTY = "3 years, Nawah service";

/** The shop's products, newest first as the demo lists them. */
export const COMPUTERS_PRODUCTS: readonly ComputersProduct[] = [
  // ——— Laptops ———
  p(
    "PC-101",
    "Ofuq 16 Pro",
    "Gaming laptops",
    7499,
    6990,
    ["lap-chart", "lap-glow"],
    [["cpu", "N9 · 16 cores, up to 5.4 GHz"], ["gpu", "GX 470 · 12 GB"], ["ram", "32 GB DDR5"], ["storage", "1 TB SSD"], ["screen", "16″ 2.5K IPS"], ["refresh", "165 Hz"], ["battery", "90 Wh · up to 9 hours"], ["weight", "2.3 kg"], ["os", "Windows 11"], ["warranty", WARRANTY]],
    "A 16-inch gaming laptop that stays quiet under load: the N9 and the GX 470 cooled by a vapour chamber, a 165 Hz screen and a keyboard lit key by key.\n\nTwo memory slots and two SSD slots, easy to open.",
    { featured: true, options: PRO_OPTIONS },
  ),
  p(
    "PC-102",
    "Vanta Blade 15",
    "Gaming laptops",
    6290,
    null,
    ["lap-glow", "lap-night"],
    [["cpu", "N7 · 12 cores, up to 5.0 GHz"], ["gpu", "GX 450 · 8 GB"], ["ram", "16 GB DDR5"], ["storage", "512 GB SSD"], ["screen", "15.6″ FHD IPS"], ["refresh", "240 Hz"], ["battery", "80 Wh · up to 7 hours"], ["weight", "2.0 kg"], ["os", "Windows 11"], ["warranty", WARRANTY]],
    "A slim aluminium gaming laptop with a 240 Hz screen for fast shooters, and room to add memory and storage later.",
    { options: LAPTOP_OPTIONS },
  ),
  p(
    "PC-103",
    "Kestrel GX 17",
    "Gaming laptops",
    8990,
    null,
    ["lap-desk-dark"],
    [["cpu", "K9 · 16 cores, up to 5.6 GHz"], ["gpu", "GX 490 · 16 GB"], ["ram", "32 GB DDR5"], ["storage", "2 TB SSD"], ["screen", "17.3″ QHD IPS"], ["refresh", "240 Hz"], ["battery", "99 Wh · up to 6 hours"], ["weight", "3.0 kg"], ["os", "Windows 11"], ["warranty", WARRANTY]],
    "A desktop in a laptop: the K9 and the GX 490 on a 17-inch QHD screen, for 4K editing and the heaviest games.",
  ),
  p(
    "PC-111",
    "Ofuq 14 Air",
    "Thin & light",
    4899,
    null,
    ["lap-plant", "lap-top"],
    [["cpu", "N5 · 8 cores, up to 4.9 GHz"], ["gpu", "Integrated Arc graphics"], ["ram", "16 GB LPDDR5"], ["storage", "512 GB SSD"], ["screen", "14″ 2.8K OLED"], ["refresh", "120 Hz"], ["battery", "70 Wh · up to 18 hours"], ["weight", "1.2 kg"], ["os", "Windows 11"], ["warranty", WARRANTY]],
    "Light enough to forget in the bag, with an OLED screen and a battery that lasts a long day of study or work.",
    { featured: true, options: LAPTOP_OPTIONS },
  ),
  p(
    "PC-112",
    "Lumen Slate 13",
    "Thin & light",
    3990,
    null,
    ["lap-top"],
    [["cpu", "N5 · 8 cores, up to 4.6 GHz"], ["gpu", "Integrated graphics"], ["ram", "16 GB LPDDR5"], ["storage", "512 GB SSD"], ["screen", "13.3″ FHD IPS"], ["refresh", "60 Hz"], ["battery", "60 Wh · up to 14 hours"], ["weight", "1.1 kg"], ["os", "Windows 11"], ["warranty", "2 years"]],
    "A 13-inch everyday laptop in a matte silver shell, with a backlit keyboard and a fingerprint reader.",
  ),
  p(
    "PC-113",
    "Orbit Book 14",
    "Thin & light",
    3490,
    3190,
    ["lap-wood"],
    [["cpu", "N3 · 6 cores, up to 4.4 GHz"], ["gpu", "Integrated graphics"], ["ram", "16 GB DDR5"], ["storage", "512 GB SSD"], ["screen", "14″ FHD IPS"], ["refresh", "60 Hz"], ["battery", "57 Wh · up to 12 hours"], ["weight", "1.4 kg"], ["os", "Windows 11"], ["warranty", "2 years"]],
    "A dependable laptop for school and the office, with a full set of ports so no adapter is needed.",
  ),
  p(
    "PC-121",
    "Nawah Studio 16",
    "Creator laptops",
    7299,
    null,
    ["lap-code", "lap-hands"],
    [["cpu", "N9 · 16 cores, up to 5.4 GHz"], ["gpu", "GX 470 · 12 GB"], ["ram", "32 GB DDR5"], ["storage", "1 TB SSD"], ["screen", "16″ 3.2K mini-LED, 100% DCI-P3"], ["refresh", "165 Hz"], ["battery", "99 Wh · up to 11 hours"], ["weight", "2.1 kg"], ["os", "Windows 11"], ["warranty", WARRANTY]],
    "Nawah's own laptop for creators: a colour-calibrated mini-LED screen, a fast card reader and the power to edit 4K on the go.",
    { featured: true, options: PRO_OPTIONS },
  ),
  p(
    "PC-122",
    "Lumen Pro 15 Creator",
    "Creator laptops",
    6890,
    null,
    ["lap-blue"],
    [["cpu", "N7 · 12 cores, up to 5.0 GHz"], ["gpu", "GX 450 · 8 GB"], ["ram", "32 GB DDR5"], ["storage", "1 TB SSD"], ["screen", "15.6″ 4K OLED"], ["refresh", "60 Hz"], ["battery", "86 Wh · up to 10 hours"], ["weight", "1.9 kg"], ["os", "Windows 11"], ["warranty", "2 years"]],
    "A 4K OLED screen with true blacks, made for photographers and designers.",
  ),
  p(
    "PC-123",
    "Orbit Canvas 14",
    "Creator laptops",
    5490,
    null,
    ["lap-glass", "lap-bw"],
    [["cpu", "N7 · 12 cores, up to 4.8 GHz"], ["gpu", "Integrated Arc graphics"], ["ram", "16 GB LPDDR5"], ["storage", "1 TB SSD"], ["screen", "14″ 2.8K OLED touch"], ["refresh", "120 Hz"], ["battery", "75 Wh · up to 15 hours"], ["weight", "1.3 kg"], ["os", "Windows 11"], ["warranty", "2 years"]],
    "A touch screen that folds back flat, with a pen in the box, for sketching and notes.",
    { options: LAPTOP_OPTIONS },
  ),
  // ——— Desktops & builds ———
  p(
    "PC-201",
    "Nawah Arena 1440p build",
    "Gaming builds",
    6490,
    null,
    ["setup-purple", "socket-gold"],
    [["cpu", "N7 · 12 cores"], ["gpu", "GX 470 · 12 GB"], ["ram", "32 GB DDR5"], ["storage", "2 TB NVMe"], ["psu_watts", "750 W Gold"], ["form_factor", "ATX"], ["os", "Windows 11"], ["warranty", WARRANTY]],
    "Built and tested in our Jeddah workshop: 165 frames a second in today's games at 1440p, cables tidied, ready to plug in.\n\nEvery build is stress-tested for 24 hours before it ships.",
    { featured: true, options: BUILD_OPTIONS },
  ),
  p(
    "PC-202",
    "Nawah Core 1080p build",
    "Gaming builds",
    4290,
    null,
    ["desk-city"],
    [["cpu", "N5 · 8 cores"], ["gpu", "GX 450 · 8 GB"], ["ram", "16 GB DDR5"], ["storage", "1 TB NVMe"], ["psu_watts", "550 W Bronze"], ["form_factor", "Micro-ATX"], ["os", "Windows 11"], ["warranty", WARRANTY]],
    "Our first build for new players: 120 frames a second at 1080p, quiet and small enough for any desk.",
  ),
  p(
    "PC-203",
    "Nawah Apex 4K build",
    "Gaming builds",
    9890,
    null,
    ["desk-terrarium"],
    [["cpu", "K9 · 16 cores"], ["gpu", "GX 490 · 16 GB"], ["ram", "64 GB DDR5"], ["storage", "4 TB NVMe"], ["psu_watts", "1000 W Platinum"], ["form_factor", "ATX"], ["os", "Windows 11"], ["warranty", WARRANTY]],
    "Our most powerful build: 4K at high frame rates, liquid-cooled, in a glass case that shows it off.",
  ),
  p(
    "PC-211",
    "Nawah Studio workstation",
    "Workstations",
    8490,
    null,
    ["desk-coder"],
    [["cpu", "K9 · 16 cores"], ["gpu", "GX 470 · 12 GB"], ["ram", "64 GB DDR5"], ["storage", "2 TB NVMe + 4 TB HDD"], ["psu_watts", "850 W Gold"], ["form_factor", "ATX"], ["os", "Windows 11 Pro"], ["warranty", WARRANTY]],
    "For video, 3D and code: many cores, plenty of memory and fast storage, quiet enough for a studio.",
    { options: BUILD_OPTIONS },
  ),
  // ——— Monitors ———
  p(
    "PC-301",
    "Lumen 27″ 5K Studio",
    "Design monitors",
    5990,
    null,
    ["monitor-studio"],
    [["screen", "27″ 5K IPS, 600 nits"], ["refresh", "60 Hz"], ["connectivity", "USB-C 96 W, DisplayPort, HDMI"], ["weight", "5.4 kg"], ["warranty", "3 years"]],
    "Pin-sharp 5K with professional colour, charging your laptop over one USB-C cable.",
    { featured: true },
  ),
  p(
    "PC-302",
    "Vanta 32″ curved 165 Hz",
    "Gaming monitors",
    2490,
    2190,
    ["desk-mouse"],
    [["screen", "32″ QHD VA, curved 1000R"], ["refresh", "165 Hz"], ["connectivity", "DisplayPort, 2 × HDMI"], ["weight", "6.8 kg"], ["warranty", "3 years"]],
    "A wide curve that fills your view, with a fast panel and adaptive sync for smooth games.",
  ),
  p(
    "PC-303",
    "Orbit 27″ QHD 240 Hz",
    "Gaming monitors",
    1890,
    null,
    ["chair-mesh"],
    [["screen", "27″ QHD IPS"], ["refresh", "240 Hz"], ["connectivity", "DisplayPort, 2 × HDMI"], ["weight", "5.9 kg"], ["warranty", "3 years"]],
    "A 240 Hz QHD panel with 1 ms response, on a stand that turns, tilts and rises.",
  ),
  // ——— PC parts: the socket, the memory type, the power and the size are what Build your PC checks ———
  p("PC-401", "Nawah N7 12-core processor", "Processors", 1690, null, ["socket-gold"], [["socket", "AM-X"], ["cpu", "12 cores · 24 threads, up to 5.4 GHz"], ["watts", "120 W"], ["memory_type", "DDR5"], ["warranty", "3 years"]], "Twelve fast cores for games and streaming at once, on the AM-X socket.", { featured: true }),
  p("PC-402", "Nawah N5 8-core processor", "Processors", 1050, 899, ["socket-blue"], [["socket", "AM-X"], ["cpu", "8 cores · 16 threads, up to 4.9 GHz"], ["watts", "65 W"], ["memory_type", "DDR5"], ["warranty", "3 years"]], "The sweet spot for a gaming build: eight cores that sip power, on the AM-X socket."),
  p("PC-403", "Kestrel K9 16-core processor", "Processors", 2390, null, ["socket-silver"], [["socket", "LG-18"], ["cpu", "16 cores · 32 threads, up to 5.6 GHz"], ["watts", "170 W"], ["memory_type", "DDR4 / DDR5"], ["warranty", "3 years"]], "Sixteen cores for heavy rendering and code, on the LG-18 socket."),
  p("PC-411", "Orbit X-Arc ATX motherboard", "Motherboards", 1290, null, ["mb-cpu"], [["socket", "AM-X"], ["memory_type", "DDR5"], ["form_factor", "ATX"], ["connectivity", "Wi-Fi 7, 2.5 Gb Ethernet, 4 × M.2"], ["warranty", "3 years"]], "A full-size AM-X board with four M.2 slots, Wi-Fi 7 and a clean white heatsink."),
  p("PC-412", "Orbit B-Lite Micro-ATX motherboard", "Motherboards", 790, null, ["mb-board"], [["socket", "AM-X"], ["memory_type", "DDR5"], ["form_factor", "Micro-ATX"], ["connectivity", "Wi-Fi 6E, 2 × M.2"], ["warranty", "3 years"]], "A compact AM-X board with everything a gaming build needs, for smaller cases."),
  p("PC-413", "Vanta Z18 Pro ATX motherboard", "Motherboards", 1150, null, ["heatsink-purple"], [["socket", "LG-18"], ["memory_type", "DDR4"], ["form_factor", "ATX"], ["connectivity", "2.5 Gb Ethernet, 3 × M.2"], ["warranty", "3 years"]], "An LG-18 board for DDR4 memory: a good way to keep the memory you already have."),
  p("PC-421", "Nawah Swift 32 GB DDR5-6000 kit", "Memory", 720, 549, ["ram-dark"], [["ram", "32 GB (2 × 16 GB)"], ["memory_type", "DDR5"], ["Speed", "6000 MHz · CL30"], ["warranty", "Lifetime"]], "Two low-profile 16 GB sticks tuned for AM-X processors, with a matte black heat spreader."),
  p("PC-422", "Kestrel 32 GB DDR4-3600 kit", "Memory", 399, null, ["ram-slots"], [["ram", "32 GB (2 × 16 GB)"], ["memory_type", "DDR4"], ["warranty", "Lifetime"]], "Fast DDR4 for LG-18 and older boards."),
  p("PC-423", "Flux 16 GB DDR5-5600 laptop memory", "Memory", 349, 279, ["ram-studio"], [["ram", "16 GB"], ["memory_type", "DDR5 SO-DIMM"], ["warranty", "Lifetime"]], "A laptop stick to double your memory in minutes."),
  p("PC-431", "GX 470 12 GB graphics card", "Graphics cards", 3250, 2890, ["heatsink-purple", "cooler"], [["gpu", "GX 470 · 12 GB GDDR6X"], ["watts", "220 W"], ["connectivity", "PCIe 4.0 · 3 × DisplayPort, HDMI"], ["warranty", "3 years"]], "The card for 1440p at high frame rates, with three quiet fans.", { featured: true }),
  p("PC-432", "GX 490 16 GB graphics card", "Graphics cards", 4690, null, ["cooler"], [["gpu", "GX 490 · 16 GB GDDR6X"], ["watts", "320 W"], ["connectivity", "PCIe 4.0 · 3 × DisplayPort, HDMI"], ["warranty", "3 years"]], "For 4K and ray tracing: our fastest card, which wants a strong power supply."),
  p("PC-441", "Archive 2 TB portable SSD", "Storage", 799, 649, ["ssd-kit"], [["storage", "2 TB"], ["connectivity", "USB-C 10 Gbps"], ["weight", "58 g"], ["warranty", "3 years"]], "Pocket-sized, aluminium, and fast enough to edit from."),
  p("PC-442", "Nawah 2 TB NVMe Gen4 SSD", "Storage", 899, null, ["ram-macro"], [["storage", "2 TB NVMe M.2"], ["connectivity", "PCIe 4.0 · 7000 MB/s"], ["warranty", "5 years"]], "Games load in seconds: a fast Gen4 drive for your build.", { featured: true }),
  p("PC-443", "Orbit pocket drive set", "Storage", 189, null, ["usb-kit"], [["storage", "256 GB drive + 128 GB card"], ["connectivity", "USB-A and USB-C"], ["warranty", "2 years"]], "A small flash drive and a fast memory card, with a reader for both."),
  p("PC-451", "Tayyar Pro air cooler", "Coolers", 379, null, ["cooler"], [["socket", "AM-X, LG-18"], ["Cooling", "Up to 250 W"], ["Fan", "120 mm"], ["warranty", "3 years"]], "Six heat pipes and a 120 mm fan: quiet, and fits both sockets."),
  p("PC-461", "Nawah 550 W Bronze power supply", "Power supplies", 329, null, ["server"], [["psu_watts", "550 W"], ["connectivity", "80 Plus Bronze"], ["warranty", "5 years"]], "Enough for a 1080p build with an 8-core processor."),
  p("PC-462", "Nawah 750 W Gold power supply", "Power supplies", 549, null, ["server"], [["psu_watts", "750 W"], ["connectivity", "80 Plus Gold · modular"], ["warranty", "10 years"]], "Fully modular, quiet, and enough for a GX 470 build."),
  p("PC-463", "Nawah 1000 W Platinum power supply", "Power supplies", 899, null, ["server"], [["psu_watts", "1000 W"], ["connectivity", "80 Plus Platinum · modular"], ["warranty", "10 years"]], "For the GX 490 and the K9 together, with room to spare."),
  p("PC-471", "Orbit Air ATX case", "Cases", 490, null, ["usb-ports"], [["form_factor", "ATX"], ["connectivity", "USB-C front port, 3 fans"], ["warranty", "2 years"]], "A white mid-tower with a mesh front, room for long cards and three fans in the box."),
  p("PC-472", "Orbit Mini Micro-ATX case", "Cases", 340, null, ["usb-ports"], [["form_factor", "Micro-ATX"], ["connectivity", "USB-C front port, 2 fans"], ["warranty", "2 years"]], "A small case that still fits a full-size graphics card."),
  // ——— Keyboards & mice (the matching accessories) ———
  p("PC-501", "Vanta mechanical RGB keyboard", "Keyboards", 459, null, ["kb-rgb"], [["connectivity", "USB-C · wireless 2.4 GHz"], ["battery", "Up to 80 hours"], ["weight", "980 g"], ["warranty", "2 years"]], "Quiet linear switches, keys lit one by one, and a volume wheel.", { featured: true }),
  p("PC-502", "Vanta Low wireless keyboard", "Keyboards", 460, 389, ["kb-black"], [["connectivity", "Bluetooth · 3 devices"], ["battery", "Up to 3 months"], ["weight", "620 g"], ["warranty", "2 years"]], "Low keys that type softly, switching between three devices at a tap."),
  p("PC-503", "Kestrel TKL pro keyboard", "Keyboards", 649, null, ["kb-macro", "kb-keys"], [["connectivity", "USB-C · 8000 Hz"], ["weight", "850 g"], ["warranty", "2 years"]], "A compact tenkeyless board for competitive play, with a polling rate of 8000 Hz."),
  p("PC-504", "Kestrel backlit keyboard", "Keyboards", 529, null, ["kb-backlit"], [["connectivity", "Wireless · 6-month battery"], ["weight", "700 g"], ["warranty", "2 years"]], "A white-lit aluminium keyboard for late work."),
  p("PC-511", "Orbit Ergo mouse", "Mice", 249, null, ["desk-mouse"], [["connectivity", "USB-C · Bluetooth"], ["Sensor", "8000 DPI"], ["battery", "Up to 70 days"], ["warranty", "2 years"]], "Shaped for the hand, with a fast scroll wheel and silent clicks."),
  // ——— Audio & streaming ———
  p("PC-601", "Orbit Studio headset", "Headsets", 349, null, ["hp-side", "hp-white"], [["connectivity", "3.5 mm · detachable cable"], ["weight", "260 g"], ["warranty", "2 years"]], "Closed-back studio sound with a detachable cable, light enough for long sessions."),
  p("PC-602", "Orbit ANC wireless headset", "Headsets", 629, 529, ["hp-white"], [["connectivity", "Bluetooth 5.3 · 2.4 GHz"], ["battery", "Up to 40 hours"], ["weight", "280 g"], ["warranty", "2 years"]], "Active noise cancelling for the office and a low-latency link for games.", { featured: true }),
  p("PC-603", "Kestrel pro gaming headset", "Headsets", 449, null, ["hp-dark"], [["connectivity", "USB-C · 7.1 sound"], ["weight", "310 g"], ["warranty", "2 years"]], "Directional sound to hear every step, and a clear detachable mic."),
  p("PC-611", "Echo broadcast microphone", "Microphones", 459, null, ["mic-studio", "mic-dark"], [["connectivity", "USB-C · XLR"], ["Pattern", "Cardioid"], ["warranty", "2 years"]], "A broadcast mic for streams and podcasts, by USB or XLR."),
  // ——— Gaming gear ———
  p("PC-701", "Madar pro controller", "Controllers", 340, 289, ["pad-white", "pad-hands"], [["connectivity", "Wireless · USB-C"], ["battery", "Up to 40 hours"], ["warranty", "1 year"]], "Fine vibration, back buttons and a 40-hour battery, for the computer and the console.", { featured: true }),
  p("PC-702", "Madar Duo controller pack", "Controllers", 590, null, ["pad-duo", "pad-blue"], [["connectivity", "Wireless · USB-C"], ["battery", "Up to 30 hours each"], ["warranty", "1 year"]], "Two controllers and a charging stand, for playing side by side."),
  p("PC-711", "Arcade fight stick", "Arcade sticks", 420, null, ["arcade", "pad-buttons"], [["connectivity", "USB-C"], ["weight", "2.2 kg"], ["warranty", "1 year"]], "Arcade buttons and a ball-top stick on a heavy base that doesn't move."),
];

/** The main category a sub-category is in. */
export function computersMainOf(sub: string): ComputersCategory {
  const found = COMPUTERS_CATEGORIES.find((c) => c.subs.some((s) => s.name === sub));
  if (!found) throw new Error(`No main category has ${sub}.`);
  return found;
}

/**
 * A laptop's or build's options as its variations (91.5): each memory with
 * each storage, its price the product's with each step up's (its sale
 * price lowered the same); the first chosen when the page opens, the top one
 * sold out (228.7). None for a product without options.
 */
export function computersVariants(product: ComputersProduct): CatalogVariants | null {
  const o = product.options;
  if (!o) return null;
  const items: CatalogVariants["items"] = [];
  let id = 1;
  for (const [ram, ramUp] of o.ram) {
    for (const [storage, storageUp] of o.storage) {
      const up = (ramUp + storageUp) * 100;
      items.push({
        id: id++,
        values: [ram, storage],
        priceCents: product.priceCents + up,
        salePriceCents: product.salePriceCents === null ? null : product.salePriceCents + up,
        stock: id === 5 ? 2 : 8,
        sku: `${product.sku}-${ram.replaceAll(" ", "")}-${storage.replaceAll(" ", "")}`.toUpperCase(),
        active: true,
      });
    }
  }
  // 228.7 The top memory with the top storage sold out where there are three or more, as a real shop's: "Notify me" shows there, never on the first.
  if (items.length >= 3) items[items.length - 1]!.stock = 0;
  return { attributes: [{ name: "Memory", values: o.ram.map(([v]) => v) }, { name: "Storage", values: o.storage.map(([v]) => v) }], items, defaultId: 1 };
}
