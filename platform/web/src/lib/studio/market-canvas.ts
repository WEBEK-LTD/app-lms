import type { StudioMarket } from "../pages/types";

/**
 * The marketplace's sections as the editor's canvas draws them (a `market`
 * element, components/studio/market.tsx): the same data the app's home
 * shows (mobile/lib/modules/market/data/market_providers.dart
 * `marketHomeProvider`), read from the project's places, offers, cuisines
 * and orders (lib/studio/market-canvas-data.ts). A list the project has
 * nothing in shows the app's own samples
 * (mobile/lib/modules/market/data/market_samples.dart), in the language
 * being edited, so the canvas is the approved market home and never a box.
 */

export type MarketVendorKind = "restaurant" | "grocery" | "shop";

export interface MarketCanvasVendor {
  id: string;
  kind: MarketVendorKind;
  name: string;
  coverUrl: string;
  logoUrl: string;
  tags: string[];
  rating: number | null;
  ratings: number;
  etaMin: number | null;
  etaMax: number | null;
  /** "EGP 15.00", as the server writes it. */
  deliveryFee: string | null;
  freeDelivery: boolean;
  minOrder: string | null;
  deliveredBy: "app" | "vendor";
  state: "open" | "busy" | "closed";
  promo: string | null;
  club: boolean;
  clubBenefit: string | null;
  distanceKm: number | null;
  /** "09:00". */
  opensAt: string | null;
}

/** A kind's tile: the samples' own words, or the project's kind with how many places (words from the app's). */
export interface MarketCanvasKind {
  id: string;
  kind: MarketVendorKind | null;
  title: string | null;
  subtitle: string | null;
  /** The project's: how many places of this kind, for "2 places". */
  places?: number;
  imageUrl: string;
  badge: string | null;
}

export interface MarketCanvasOffer {
  id: string;
  title: string;
  text: string;
  imageUrl: string;
  from: string;
  to: string;
  code: string | null;
}

export interface MarketCanvasCuisine {
  id: string;
  name: string;
  imageUrl: string;
}

export interface MarketCanvasReorder {
  vendor: Pick<MarketCanvasVendor, "id" | "name" | "logoUrl">;
  summary: string;
  total: string;
  /** The samples' words ("Last Friday"), or the day it was ordered (`at`). */
  when: string | null;
  at?: string;
}

export interface MarketCanvas {
  address: string | null;
  kinds: MarketCanvasKind[];
  offers: MarketCanvasOffer[];
  cuisines: MarketCanvasCuisine[];
  vendors: MarketCanvasVendor[];
  reorders: MarketCanvasReorder[];
}

type Lang = "en" | "ar" | "tr";
const langOf = (lang: string): Lang => (lang === "ar" || lang === "tr" ? lang : "en");

/** The app's own words for the marketplace's sections (mobile/lib/l10n/app_*.arb, `market…`). */
const WORDS = {
  en: {
    deliverTo: "Deliver to",
    chooseAddress: "Choose your address",
    searchHint: "Restaurants, dishes or groceries",
    seeAll: "See all",
    freeDelivery: "Free delivery",
    deliveryFee: "{fee} delivery",
    minOrder: "Min. {amount}",
    eta: "{min}–{max} min",
    newPlace: "New",
    club: "Club",
    clubMember: "You're a member",
    joinClub: "Join",
    clubFree: "Free with Club",
    code: "Code {code}",
    km: "{km} km",
    busy: "Busy",
    closed: "Closed",
    closedOpens: "Closed · opens {time}",
    orderAgain: "Order again",
    restaurant: "Food",
    grocery: "Market",
    shop: "Shops",
  },
  ar: {
    deliverTo: "التوصيل إلى",
    chooseAddress: "اختر عنوانك",
    searchHint: "مطاعم أو أطباق أو بقالة",
    seeAll: "عرض الكل",
    freeDelivery: "توصيل مجاني",
    deliveryFee: "توصيل {fee}",
    minOrder: "الحد الأدنى {amount}",
    eta: "{min}–{max} د",
    newPlace: "جديد",
    club: "النادي",
    clubMember: "أنت عضو",
    joinClub: "انضم",
    clubFree: "مجاني مع النادي",
    code: "الكود {code}",
    km: "{km} كم",
    busy: "مشغول",
    closed: "مغلق",
    closedOpens: "مغلق · يفتح {time}",
    orderAgain: "اطلب مرة أخرى",
    restaurant: "الطعام",
    grocery: "الماركت",
    shop: "المتاجر",
  },
  tr: {
    deliverTo: "Teslimat adresi",
    chooseAddress: "Adresinizi seçin",
    searchHint: "Restoran, yemek veya market",
    seeAll: "Tümü",
    freeDelivery: "Ücretsiz teslimat",
    deliveryFee: "{fee} teslimat",
    minOrder: "En az {amount}",
    eta: "{min}–{max} dk",
    newPlace: "Yeni",
    club: "Kulüp",
    clubMember: "Üyesiniz",
    joinClub: "Katıl",
    clubFree: "Kulüp ile ücretsiz",
    code: "Kod {code}",
    km: "{km} km",
    busy: "Yoğun",
    closed: "Kapalı",
    closedOpens: "Kapalı · {time} açılır",
    orderAgain: "Tekrar sipariş ver",
    restaurant: "Yemek",
    grocery: "Market",
    shop: "Mağazalar",
  },
} as const;

export type MarketWords = { [K in keyof (typeof WORDS)["en"]]: string } & { places: (count: number) => string };

/** "1 place", "2 places" (`marketPlaces`). */
function placesIn(lang: Lang, count: number): string {
  if (lang === "tr") return `${count} yer`;
  if (lang === "en") return count === 1 ? "1 place" : `${count} places`;
  if (count === 0) return "لا أماكن";
  if (count === 1) return "مكان واحد";
  if (count === 2) return "مكانان";
  return new Intl.PluralRules("ar").select(count) === "few" ? `${count} أماكن` : `${count} مكانًا`;
}

/** The app's words in the language being edited (English for the languages the samples don't speak). */
export function marketWords(lang: string): MarketWords {
  const l = langOf(lang);
  return { ...WORDS[l], places: (count: number) => placesIn(l, count) };
}

/** A word with its `{name}` filled. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
}

/** An amount or a code kept left to right inside Arabic (`ltrRun`). */
export function ltrRun(text: string, lang: string): string {
  return lang === "ar" && text ? `⁦${text}⁩` : text;
}

/** "2.4k" for 2400 ratings (`marketCount`). */
export function marketCount(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}

/**
 * Dart's `String.hashCode` on the app (the Dart VM's string hash), so a
 * place's mark and a picture's tint are the colours the app gives them.
 */
export function dartHash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h + text.charCodeAt(i)) >>> 0;
    h = (h + (h << 10)) >>> 0;
    h = (h ^ (h >>> 6)) >>> 0;
  }
  h = (h + (h << 3)) >>> 0;
  h = (h ^ (h >>> 11)) >>> 0;
  h = (h + (h << 15)) >>> 0;
  h &= (1 << 30) - 1;
  return h === 0 ? 1 : h;
}

/** The places a section of places shows, as the app picks them (`_pick`): kind, free delivery and tag, open ones first, sorted, at most `limit`. */
export function pickVendors(all: readonly MarketCanvasVendor[], market: StudioMarket): MarketCanvasVendor[] {
  const kind = market.kind ?? "all";
  const picked = all.filter((v) => (kind === "all" || (kind === "restaurant") === (v.kind === "restaurant")) && (!market.free_delivery || v.freeDelivery) && (!market.tag || v.tags.includes(market.tag)));
  const open = (v: MarketCanvasVendor) => (v.state === "closed" ? 1 : 0);
  const key = (v: MarketCanvasVendor): number =>
    market.sort === "fastest" ? (v.etaMin ?? 999) : market.sort === "rating" ? -(v.rating ?? 0) : market.sort === "nearest" ? (v.distanceKm ?? 99) : 0;
  const sorted = picked.map((v, i) => ({ v, i })).sort((a, b) => open(a.v) - open(b.v) || key(a.v) - key(b.v) || a.i - b.i);
  return sorted.slice(0, Math.min(40, Math.max(1, market.limit ?? 10))).map(({ v }) => v);
}

/** Yallapp's drawn pictures (public/design-pictures), as the app's samples use them. */
const picture = (name: string) => `/design-pictures/${name}`;

type Words3 = readonly [en: string, ar: string, tr: string];
const say = (lang: Lang, words: Words3) => words[lang === "en" ? 0 : lang === "ar" ? 1 : 2];

interface SampleVendor extends Omit<MarketCanvasVendor, "tags" | "promo" | "clubBenefit" | "logoUrl" | "deliveryFee" | "freeDelivery" | "minOrder" | "deliveredBy" | "state" | "club" | "opensAt" | "rating"> {
  rating: number;
  tags: readonly Words3[];
  promo?: Words3;
  club?: boolean;
  deliveryFee?: string;
  freeDelivery?: boolean;
  minOrder: string;
  deliveredBy?: "vendor";
  state?: "busy" | "closed";
  opensAt?: string;
}

const T = {
  burgers: ["Burgers", "برجر", "Burger"],
  grills: ["Grills", "مشويات", "Izgara"],
  desserts: ["Desserts", "حلويات", "Tatlı"],
  cakes: ["Cakes", "كيك", "Pasta"],
  wraps: ["Wraps", "راب", "Dürüm"],
  healthy: ["Healthy", "صحي", "Sağlıklı"],
  breakfast: ["Breakfast", "فطور", "Kahvaltı"],
  eggs: ["Eggs", "بيض", "Yumurta"],
  sweets: ["Sweets", "حلويات شرقية", "Şerbetli tatlı"],
  oriental: ["Oriental", "شرقي", "Geleneksel"],
  soups: ["Soups", "شوربة", "Çorba"],
  home: ["Home food", "أكل بيتي", "Ev yemeği"],
  coffee: ["Coffee", "قهوة", "Kahve"],
  drinks: ["Drinks", "مشروبات", "İçecek"],
  supermarket: ["Supermarket", "سوبرماركت", "Süpermarket"],
  fruitVeg: ["Fruit & veg", "فاكهة وخضار", "Meyve ve sebze"],
  bakery: ["Bakery", "مخبوزات", "Fırın"],
  greengrocer: ["Greengrocer", "خضار وفاكهة", "Manav"],
  coffeeTea: ["Coffee & tea", "قهوة وشاي", "Kahve ve çay"],
} as const satisfies Record<string, Words3>;

const SAMPLE_VENDORS: readonly SampleVendor[] = [
  { id: "ember-bun", kind: "restaurant", name: "Ember & Bun", coverUrl: picture("art-dish-burger.png"), tags: [T.burgers, T.grills], rating: 4.8, ratings: 2400, etaMin: 20, etaMax: 30, freeDelivery: true, minOrder: "EGP 150.00", promo: ["20% off your first order", "خصم 20% على أول طلب", "İlk siparişe %20 indirim"], club: true, distanceKm: 1.2 },
  { id: "layers", kind: "restaurant", name: "Layers Bakehouse", coverUrl: picture("art-dish-cheesecake.png"), tags: [T.desserts, T.cakes], rating: 4.9, ratings: 3100, etaMin: 15, etaMax: 25, deliveryFee: "EGP 15.00", minOrder: "EGP 100.00", promo: ["Free slice over EGP 400", "قطعة مجانية فوق EGP 400", "EGP 400 üzerine bir dilim bedava"], club: true, distanceKm: 0.8 },
  { id: "wrap-lab", kind: "restaurant", name: "Wrap Lab", coverUrl: picture("art-dish-wrap.png"), tags: [T.wraps, T.healthy], rating: 4.6, ratings: 980, etaMin: 20, etaMax: 35, deliveryFee: "EGP 15.00", minOrder: "EGP 100.00", distanceKm: 2.1 },
  { id: "sunny-side", kind: "restaurant", name: "Sunny Side", coverUrl: picture("art-dish-breakfast.png"), tags: [T.breakfast, T.eggs], rating: 4.7, ratings: 1200, etaMin: 25, etaMax: 35, freeDelivery: true, minOrder: "EGP 120.00", deliveredBy: "vendor", promo: ["Coffee on us before 11:00", "القهوة علينا قبل 11:00", "11:00'den önce kahve bizden"], distanceKm: 2.6 },
  { id: "golden-tray", kind: "restaurant", name: "Golden Tray", coverUrl: picture("art-dish-baklava.png"), tags: [T.sweets, T.oriental], rating: 4.8, ratings: 1700, etaMin: 30, etaMax: 45, deliveryFee: "EGP 20.00", minOrder: "EGP 150.00", distanceKm: 3.4 },
  { id: "bowl-spoon", kind: "restaurant", name: "Bowl & Spoon", coverUrl: picture("art-dish-soup.png"), tags: [T.soups, T.home], rating: 4.5, ratings: 640, etaMin: 35, etaMax: 50, deliveryFee: "EGP 10.00", minOrder: "EGP 80.00", state: "busy", distanceKm: 3.9 },
  { id: "bean-street", kind: "restaurant", name: "Bean Street", coverUrl: picture("art-drink-latte.png"), tags: [T.coffee, T.drinks], rating: 4.7, ratings: 2050, etaMin: 10, etaMax: 20, freeDelivery: true, minOrder: "EGP 60.00", club: true, distanceKm: 0.5 },
  { id: "fresh-basket", kind: "grocery", name: "Fresh Basket", coverUrl: picture("art-item-fruit.png"), tags: [T.supermarket, T.fruitVeg], rating: 4.8, ratings: 5200, etaMin: 15, etaMax: 25, freeDelivery: true, minOrder: "EGP 200.00", promo: ["Up to 30% off fruit", "خصم حتى 30% على الفاكهة", "Meyvede %30'a varan indirim"], club: true, distanceKm: 1.0 },
  { id: "daily-bread", kind: "grocery", name: "Daily Bread", coverUrl: picture("art-item-bread.png"), tags: [T.bakery], rating: 4.7, ratings: 860, etaMin: 15, etaMax: 20, deliveryFee: "EGP 10.00", minOrder: "EGP 50.00", deliveredBy: "vendor", distanceKm: 0.7 },
  { id: "green-corner", kind: "grocery", name: "Green Corner", coverUrl: picture("art-item-veg.png"), tags: [T.greengrocer], rating: 4.6, ratings: 430, etaMin: 20, etaMax: 30, deliveryFee: "EGP 10.00", minOrder: "EGP 100.00", distanceKm: 1.8 },
  { id: "roastery", kind: "grocery", name: "The Roastery", coverUrl: picture("art-product-coffee.png"), tags: [T.coffeeTea], rating: 4.9, ratings: 710, etaMin: 25, etaMax: 40, freeDelivery: true, minOrder: "EGP 150.00", state: "closed", opensAt: "09:00", distanceKm: 4.2 },
];

/** The app's samples (`MarketSamples.home`), in the language being edited. */
export function marketSamples(lang: string): MarketCanvas {
  const l = langOf(lang);
  const w = marketWords(l);
  const vendors: MarketCanvasVendor[] = SAMPLE_VENDORS.map((v) => ({
    ...v,
    logoUrl: "",
    tags: v.tags.map((t) => say(l, t)),
    promo: v.promo ? say(l, v.promo) : null,
    club: v.club ?? false,
    clubBenefit: v.club ? w.clubFree : null,
    deliveryFee: v.deliveryFee ?? null,
    freeDelivery: v.freeDelivery ?? false,
    deliveredBy: v.deliveredBy ?? "app",
    state: v.state ?? "open",
    opensAt: v.opensAt ?? null,
  }));
  const byId = (id: string) => vendors.find((v) => v.id === id)!;
  return {
    address: say(l, ["Home · 9 Road 233, Maadi", "المنزل · 9 شارع 233، المعادي", "Ev · 9 Road 233, Maadi"]),
    kinds: [
      { id: "food", kind: "restaurant", title: w.restaurant, subtitle: say(l, ["120+ restaurants", "+120 مطعم", "120+ restoran"]), imageUrl: picture("art-dish-burger.png"), badge: null },
      { id: "market", kind: "grocery", title: w.grocery, subtitle: say(l, ["Groceries in 20 min", "البقالة في 20 دقيقة", "20 dakikada market"]), imageUrl: picture("art-item-fruit.png"), badge: w.newPlace },
      { id: "sweets", kind: null, title: say(l, ["Sweets", "حلويات", "Tatlı"]), subtitle: null, imageUrl: picture("art-dish-baklava.png"), badge: null },
      { id: "coffee", kind: null, title: say(l, T.coffee), subtitle: null, imageUrl: picture("art-drink-latte.png"), badge: null },
      { id: "bakery", kind: null, title: say(l, T.bakery), subtitle: null, imageUrl: picture("art-item-bread.png"), badge: null },
    ],
    offers: [
      { id: "lunch", title: say(l, ["Up to 40% off", "خصم حتى 40%", "%40'a varan indirim"]), text: say(l, ["Lunch from 30 restaurants near you, until 4 pm.", "الغداء من 30 مطعمًا قريبًا منك، حتى 4 مساءً.", "Yakınındaki 30 restorandan öğle yemeği, 16.00'ya kadar."]), imageUrl: picture("art-dish-wrap.png"), from: "#FF8A3D", to: "#E4472B", code: "LUNCH40" },
      { id: "weekend", title: w.freeDelivery, text: say(l, ["Every order this weekend, from every shop.", "كل طلب في نهاية هذا الأسبوع، من كل المتاجر.", "Bu hafta sonu her mağazadan her sipariş."]), imageUrl: picture("art-banner-delivery.png"), from: "#2C6CDB", to: "#143B8F", code: null },
      { id: "market", title: say(l, ["Fresh market week", "أسبوع السوق الطازج", "Taze pazar haftası"]), text: say(l, ["Fruit and vegetables at their best prices.", "الفاكهة والخضار بأفضل أسعارها.", "Meyve ve sebze en iyi fiyatlarla."]), imageUrl: picture("art-item-veg.png"), from: "#2E9B62", to: "#156B43", code: null },
    ],
    cuisines: [
      { id: "burgers", name: say(l, T.burgers), imageUrl: picture("art-dish-burger.png") },
      { id: "breakfast", name: say(l, T.breakfast), imageUrl: picture("art-dish-breakfast.png") },
      { id: "wraps", name: say(l, T.wraps), imageUrl: picture("art-dish-wrap.png") },
      { id: "desserts", name: say(l, T.desserts), imageUrl: picture("art-dish-cheesecake.png") },
      { id: "soups", name: say(l, T.soups), imageUrl: picture("art-dish-soup.png") },
      { id: "coffee", name: say(l, T.coffee), imageUrl: picture("art-drink-coffee.png") },
      { id: "bakery", name: say(l, T.bakery), imageUrl: picture("art-dish-simit.png") },
    ],
    vendors,
    reorders: [
      { vendor: byId("ember-bun"), summary: say(l, ["2× Smoked double, fries", "2× سموكد دبل، بطاطس", "2× Füme duble, patates"]), total: "EGP 640.00", when: say(l, ["Last Friday", "الجمعة الماضية", "Geçen cuma"]) },
      { vendor: byId("fresh-basket"), summary: say(l, ["Weekly basket · 14 items", "سلة الأسبوع · 14 صنفًا", "Haftalık sepet · 14 ürün"]), total: "EGP 1,185.00", when: say(l, ["3 days ago", "منذ 3 أيام", "3 gün önce"]) },
    ],
  };
}

/**
 * What the canvas draws: the project's own lists, and the app's samples for
 * each list it has nothing in (and for every list where the canvas has no
 * project, like a template's thumbnail).
 */
export function canvasData(project: MarketCanvas | null | undefined, lang: string): MarketCanvas {
  const samples = marketSamples(lang);
  if (!project) return samples;
  return {
    address: project.address,
    kinds: project.kinds.length ? project.kinds : samples.kinds,
    offers: project.offers.length ? project.offers : samples.offers,
    cuisines: project.cuisines.length ? project.cuisines : samples.cuisines,
    vendors: project.vendors.length ? project.vendors : samples.vendors,
    reorders: project.reorders.length ? project.reorders : samples.reorders,
  };
}
