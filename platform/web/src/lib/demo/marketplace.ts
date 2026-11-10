import type { DataStore } from "../data/store";
import type {
  App,
  ComplaintReason,
  Cuisine,
  DeliverySettings,
  Dish,
  HostedUser,
  MarketComplaint,
  MarketCouponInput,
  MarketOrder,
  MarketOrderInput,
  MarketOrderStage,
  MarketOrderStatus,
  MarketProductInput,
  MarketUnit,
  MenuSection,
  OpeningPeriod,
  Restaurant,
  RestaurantInput,
  RestaurantMenu,
  ShipmentPlace,
  VendorDelivery,
  VendorKind,
  VendorRole,
} from "../data/types";
import { addDays, localToUtc, utcToLocal } from "../bookings/time";
import { deliverySettingsOf } from "../delivery/settings";
import { stage } from "../delivery/service";
import { priceMarketCart, repriceFor, type Cart } from "../market/cart";
import { collectedByOf } from "../market/flow";
import { marketOrderReference } from "../market/json";
import { DEFAULT_MARKET_SETTINGS } from "../market/settings";
import { createVendorCoupon } from "../market/vendor-coupons";
import { DEMO_RETENTION_HOURS, DEMO_SIGN_IN, DEMO_USER_NAME } from "./constants";
import { readOnce, unchanged } from "./rows";
import type { Art } from "./art";
import { DESIGN_ART } from "./design-art";
import type { PictureSize } from "./picture-assets";
import { PICTURES } from "./pictures";

/**
 * 115.15 Zad, Studio's multi-vendor demo: two restaurants (one delivers
 * itself, one with the app's couriers) and a supermarket with departments,
 * aisles and products sold by the item or by the kilo, in Cairo. The owner's
 * coupon, an automatic offer and the places' own offers; the club and the
 * wallet. The demo number is a customer with orders in every state (one on
 * its way, its courier driving from the clock; one for tomorrow; one waiting
 * for pick-up) and complaints in every state, the supermarket's owner in its
 * My store tab, and a courier (the store review courier, 104.7).
 *
 * Its places, and the dishes and products a drawing fits, show the drawn
 * pictures the app's marketplace samples use (`ZadPicture`); nothing here is
 * a photo or a generated picture. Milk, rice, oil or soap have no drawing,
 * so the demo doesn't require photos (`requirePhotos` off).
 *
 * Its activity is made again every day (the daily job, like Nakhla School's
 * day): the seeded orders, their complaints and refunds are deleted and made
 * again from the clock, what visitors ordered is deleted after a day, and
 * the supermarket's catalog, offers, staff and club go back to the demo's.
 */

export const MARKET_TIMEZONE = "Africa/Cairo";
const CURRENCY = "EGP";

type VendorKey = "grill" | "pizza" | "market";

interface DemoChoice {
  name: string;
  min: number;
  max: number;
  options: [name: string, extra: number][];
}

/**
 * Zad's pictures: the drawn ones the app's marketplace samples show
 * (public/design-pictures/art-<name>.png, lib/demo/design-art.ts), saved as
 * the account's files like every demo's. No photos, nothing generated.
 */
export type ZadPicture = "dish-wrap" | "dish-soup" | "dish-cheesecake" | "dish-breakfast" | "item-fruit" | "item-veg" | "item-bread" | "product-tea" | "drink-juice";

/** A Zad picture's drawing. */
export function zadArt(name: ZadPicture): Art {
  return (PICTURES as Record<string, Art>)[name] ?? DESIGN_ART[`art-${name}.png`]!.art;
}

interface DemoMenuDish {
  name: string;
  description: string;
  price: number;
  popular?: boolean;
  choices?: DemoChoice;
  picture?: ZadPicture;
}

interface DemoVendor {
  key: VendorKey;
  name: string;
  kind: VendorKind;
  description: string;
  cuisines: string[];
  area: string;
  address: ShipmentPlace;
  prepMinutes: number;
  minOrder: number;
  maxKm: number | null;
  commissionBp: number;
  delivery: VendorDelivery;
  /** Its cover picture. */
  cover: ZadPicture;
  menu?: { name: string; dishes: DemoMenuDish[] }[];
}

const SIZES: DemoChoice = { name: "Size", min: 1, max: 1, options: [["Regular", 0], ["Large", 45_00]] };

export const MARKET_VENDORS: DemoVendor[] = [
  {
    key: "grill",
    cover: "dish-wrap",
    name: "Bab El Sharq Grill",
    kind: "restaurant",
    description: "Charcoal grills, kofta and fresh mezze from Zamalek. Our own drivers bring them hot.",
    cuisines: ["grill", "egyptian"],
    area: "Zamalek",
    address: { address: "26 July Street, Zamalek", details: null, lat: 30.0609, lng: 31.2197 },
    prepMinutes: 25,
    minOrder: 100_00,
    maxKm: 8,
    commissionBp: 1200,
    // It delivers itself: its own fee, free from EGP 400; pick-up and orders for later.
    delivery: { by: "vendor", feeKind: "fixed", fee: 20_00, perKm: 0, freeOver: 400_00, minItems: null, maxItems: null, pickup: true, scheduling: true },
    menu: [
      {
        name: "Grills",
        dishes: [
          { name: "Mixed grill", description: "Kofta, shish tawook and lamb chops with rice, tahini and salad.", price: 320_00, popular: true, choices: { name: "For", min: 1, max: 1, options: [["One", 0], ["Two", 290_00]] } },
          { name: "Kofta", description: "Half a kilo of charcoal kofta with grilled tomatoes and onions.", price: 190_00, choices: { name: "Weight", min: 1, max: 1, options: [["Half a kilo", 0], ["A kilo", 170_00]] } },
          { name: "Shish tawook", description: "Marinated chicken skewers with garlic sauce and fries.", price: 170_00 },
        ],
      },
      {
        name: "Sandwiches",
        dishes: [
          { name: "Kofta sandwich", description: "In baladi bread with tahini and pickles.", price: 75_00, popular: true, picture: "dish-wrap" },
          { name: "Alexandrian liver", description: "Spicy liver with green peppers in a soft roll.", price: 60_00, picture: "dish-wrap" },
        ],
      },
      {
        name: "Mezze",
        dishes: [
          { name: "Tahini", description: "With lemon and cumin.", price: 25_00 },
          { name: "Baba ghanoush", description: "Smoked aubergine with olive oil.", price: 35_00 },
          { name: "Vermicelli rice", description: "Egyptian rice with toasted vermicelli.", price: 30_00 },
        ],
      },
    ],
  },
  {
    key: "pizza",
    cover: "dish-soup",
    name: "Nile Pizza Co.",
    kind: "restaurant",
    description: "Stone-baked pizza and pasta from Dokki, delivered by Zad's couriers.",
    cuisines: ["pizza"],
    area: "Dokki",
    address: { address: "Tahrir Street, Dokki", details: null, lat: 30.0384, lng: 31.2108 },
    prepMinutes: 20,
    minOrder: 0,
    maxKm: null,
    commissionBp: 1000,
    delivery: { by: "app", feeKind: "fixed", fee: 0, perKm: 0, freeOver: null, minItems: null, maxItems: null, pickup: true, scheduling: true },
    menu: [
      {
        name: "Pizza",
        dishes: [
          { name: "Margherita", description: "Tomato, mozzarella and basil.", price: 150_00, popular: true, choices: SIZES },
          { name: "Pepperoni", description: "Beef pepperoni and mozzarella.", price: 190_00, choices: SIZES },
          { name: "Garden vegetables", description: "Peppers, olives, mushrooms and onions.", price: 165_00, choices: SIZES },
        ],
      },
      {
        name: "Pasta",
        dishes: [
          { name: "Penne arrabbiata", description: "Spicy tomato sauce and parmesan.", price: 120_00 },
          { name: "Chicken alfredo", description: "Fettuccine in a creamy sauce with grilled chicken.", price: 145_00 },
        ],
      },
      { name: "Desserts", dishes: [{ name: "Chocolate brownie", description: "Warm, with a scoop of vanilla.", price: 65_00, picture: "dish-cheesecake" }] },
    ],
  },
  {
    key: "market",
    cover: "item-fruit",
    name: "Zad Market",
    kind: "grocery",
    description: "The neighbourhood supermarket in Mohandessin: fruit and vegetables by the kilo, dairy, bread, pantry and home.",
    cuisines: [],
    area: "Mohandessin",
    address: { address: "Gameat El Dewal Street, Mohandessin", details: null, lat: 30.0561, lng: 31.2016 },
    prepMinutes: 30,
    minOrder: 50_00,
    maxKm: null,
    commissionBp: 800,
    delivery: { by: "app", feeKind: "fixed", fee: 0, perKm: 0, freeOver: null, minItems: null, maxItems: null, pickup: true, scheduling: true },
  },
];

interface DemoProduct {
  sku: string;
  name: string;
  price: number;
  wasPrice?: number;
  unit?: MarketUnit;
  step?: number;
  inStock?: boolean;
  stock?: number;
  tags?: string[];
  /** Its own picture, over its aisle's. */
  picture?: ZadPicture;
}

/** Zad Market's departments, their aisles and their products (prices a kilo for those sold by weight). */
/** Departments and aisles with a drawing that fits show it on their products; the others stay without (no drawing of milk, rice or soap). */
export const MARKET_CATALOG: { name: string; picture?: ZadPicture; aisles: { name: string; picture?: ZadPicture; products: DemoProduct[] }[] }[] = [
  {
    name: "Fruit & vegetables",
    picture: "item-fruit",
    aisles: [
      {
        name: "Fresh fruit",
        picture: "item-fruit",
        products: [
          { sku: "FRT-BAN", name: "Bananas", price: 35_00, unit: "kg", step: 0.5 },
          { sku: "FRT-ORA", name: "Oranges", price: 25_00, unit: "kg", step: 0.5 },
          { sku: "FRT-APL", name: "Red apples", price: 90_00, wasPrice: 110_00, unit: "kg", step: 0.5, tags: ["Offer"] },
          { sku: "FRT-MNG", name: "Mangoes", price: 70_00, unit: "kg", step: 0.5, inStock: false },
        ],
      },
      {
        name: "Vegetables",
        picture: "item-veg",
        products: [
          { sku: "VEG-TOM", name: "Tomatoes", price: 18_00, unit: "kg", step: 0.5 },
          { sku: "VEG-CUC", name: "Cucumbers", price: 20_00, unit: "kg", step: 0.5 },
          { sku: "VEG-POT", name: "Potatoes", price: 15_00, unit: "kg", step: 0.5 },
          { sku: "VEG-ONI", name: "Onions", price: 14_00, unit: "kg", step: 0.5 },
          { sku: "VEG-LEM", name: "Lemons", price: 40_00, unit: "kg", step: 0.25 },
        ],
      },
    ],
  },
  {
    name: "Dairy & eggs",
    picture: "dish-breakfast",
    aisles: [
      {
        name: "Milk & yoghurt",
        products: [
          { sku: "DAI-MLK", name: "Full-cream milk, 1 l", price: 45_00 },
          { sku: "DAI-YOG", name: "Plain yoghurt, 4 cups", price: 38_00 },
          { sku: "DAI-RAY", name: "Laban rayeb, 1 l", price: 40_00 },
        ],
      },
      {
        name: "Cheese & eggs",
        picture: "dish-breakfast",
        products: [
          { sku: "DAI-WCH", name: "White cheese", price: 160_00, unit: "kg", step: 0.25 },
          { sku: "DAI-RCH", name: "Roumi cheese", price: 380_00, unit: "kg", step: 0.25 },
          { sku: "DAI-EGG", name: "Eggs, 30", price: 165_00, stock: 40 },
        ],
      },
    ],
  },
  {
    name: "Bakery",
    picture: "item-bread",
    aisles: [
      {
        name: "Bread",
        picture: "item-bread",
        products: [
          { sku: "BAK-BAL", name: "Baladi bread, 5 loaves", price: 10_00 },
          { sku: "BAK-TST", name: "Toast bread", price: 30_00 },
          { sku: "BAK-CRS", name: "Butter croissants, 4", price: 55_00, wasPrice: 65_00, tags: ["Offer"] },
        ],
      },
    ],
  },
  {
    name: "Pantry",
    aisles: [
      {
        name: "Rice, pasta & pulses",
        products: [
          { sku: "PAN-RIC", name: "Egyptian rice, 1 kg", price: 38_00 },
          { sku: "PAN-PST", name: "Penne pasta, 400 g", price: 18_00 },
          { sku: "PAN-LEN", name: "Yellow lentils, 1 kg", price: 55_00 },
        ],
      },
      {
        name: "Oil, tea & spices",
        products: [
          { sku: "PAN-OIL", name: "Sunflower oil, 1.5 l", price: 95_00 },
          { sku: "PAN-TEA", name: "Black tea, 250 g", price: 60_00, picture: "product-tea" },
          { sku: "PAN-CUM", name: "Ground cumin, 100 g", price: 25_00 },
        ],
      },
    ],
  },
  {
    name: "Drinks",
    picture: "drink-juice",
    aisles: [
      {
        name: "Water & juice",
        products: [
          { sku: "DRK-WAT", name: "Mineral water, 1.5 l", price: 8_00 },
          { sku: "DRK-ORJ", name: "Orange juice, 1 l", price: 50_00, picture: "drink-juice" },
          { sku: "DRK-SPK", name: "Sparkling water, 6 bottles", price: 75_00 },
        ],
      },
    ],
  },
  {
    name: "Home",
    aisles: [
      {
        name: "Cleaning",
        products: [
          { sku: "HOM-DSH", name: "Dish soap, 750 ml", price: 45_00 },
          { sku: "HOM-LAU", name: "Laundry powder, 2.5 kg", price: 210_00 },
          { sku: "HOM-TWL", name: "Kitchen towels, 2 rolls", price: 40_00 },
        ],
      },
    ],
  },
];

/** The places' staff (the demo number is Zad Market's owner) and the seeded courier, on numbers nobody has. */
const SEEDED_STAFF: { vendor: VendorKey; name: string; phone: string; role: VendorRole }[] = [
  { vendor: "market", name: DEMO_USER_NAME, phone: DEMO_SIGN_IN.e164, role: "owner" },
  { vendor: "market", name: "Samir Fawzy", phone: "+12025550172", role: "picker" },
  { vendor: "grill", name: "Hassan Nabil", phone: "+12025550173", role: "owner" },
  { vendor: "pizza", name: "Dina Mourad", phone: "+12025550174", role: "owner" },
];
export const MARKET_COURIER = { name: "Karim Adel", phone: "+12025550171", vehicle: "Motorbike" };

/** Where the demo number's orders go. */
export const DEMO_HOME: ShipmentPlace = { address: "8 Kasr El Ainy Street, Garden City", details: "Building 8, 3rd floor, flat 6", lat: 30.0349, lng: 31.2316 };

export const OWNER_COUPON = "ZAD20";
export const MARKET_COUPON = "FRESH10";
const PIZZA_OFFER = "Free delivery from Nile Pizza Co. over EGP 250";
const GRILL_OFFER = "Free delivery on grills over EGP 300";
const WELCOME_KEY = "demo:welcome";

export const CLUB_PLANS = [
  { name: "Zad Club", period: "month" as const, price: 49_00, description: "Free delivery from the app's couriers on orders over EGP 150.", perks: ["Members' offers first"] },
  { name: "Zad Club yearly", period: "year" as const, price: 490_00, description: "Two months free, with the same free delivery.", perks: ["Members' offers first", "Two months free"] },
];

type Who = "me" | { name: string; phone: string };

interface SeedOrder {
  vendor: VendorKey;
  who: Who;
  status: MarketOrderStatus;
  /** Placed this long ago. */
  minutesAgo: number;
  lines: [name: string, quantity: number, choices?: string[]][];
  pickup?: boolean;
  /** For later: tomorrow at this local time. */
  tomorrowAt?: string;
  coupon?: string;
  notes?: string;
  rating?: { vendor: number; courier: number | null; comment: string | null };
  /** A complaint on it. */
  complaint?: SeedComplaint;
}

interface SeedComplaint {
  status: MarketComplaint["status"];
  reason: ComplaintReason;
  text: string;
  /** Lines it names, by product or dish name. */
  lines: string[];
  replies: { from: "customer" | "support"; text: string }[];
  decision?: { outcome: "partial_refund" | "no_refund"; amount: number | null; reason: string };
}

const OTHER_CUSTOMERS = {
  mona: { name: "Mona Fathy", phone: "+12025550181" },
  hany: { name: "Hany Said", phone: "+12025550182" },
  salma: { name: "Salma Adel", phone: "+12025550183" },
  tarek: { name: "Tarek Gamal", phone: "+12025550184" },
} as const;

const OTHER_PLACES: Record<keyof typeof OTHER_CUSTOMERS, ShipmentPlace> = {
  mona: { address: "15 Shehab Street, Mohandessin", details: null, lat: 30.0574, lng: 31.1986 },
  hany: { address: "4 Ahmed Orabi Street, Agouza", details: null, lat: 30.0601, lng: 31.2089 },
  salma: { address: "22 Mosaddak Street, Dokki", details: null, lat: 30.0412, lng: 31.2069 },
  tarek: { address: "9 Brazil Street, Zamalek", details: null, lat: 30.0652, lng: 31.2181 },
};

const DAY = 24 * 60;

/** The demo's orders, oldest first: the demo number's in every state, and other customers' for the places' panels and statements. */
export const SEED_ORDERS: SeedOrder[] = [
  { vendor: "pizza", who: "me", status: "cancelled", minutesAgo: 6 * DAY, lines: [["Margherita", 1, ["Large"]]] },
  { vendor: "market", who: OTHER_CUSTOMERS.salma, status: "delivered", minutesAgo: 6 * DAY - 120, lines: [["Eggs, 30", 1], ["Full-cream milk, 1 l", 2], ["Bananas", 1.5]] },
  { vendor: "grill", who: OTHER_CUSTOMERS.tarek, status: "delivered", minutesAgo: 5 * DAY, lines: [["Mixed grill", 1, ["Two"]], ["Tahini", 2]] },
  { vendor: "market", who: OTHER_CUSTOMERS.hany, status: "delivered", minutesAgo: 4 * DAY - 300, lines: [["Egyptian rice, 1 kg", 2], ["Sunflower oil, 1.5 l", 1], ["Tomatoes", 2], ["Onions", 1]] },
  {
    vendor: "grill",
    who: "me",
    status: "picked_up",
    minutesAgo: 4 * DAY,
    pickup: true,
    lines: [["Kofta", 1, ["Half a kilo"]], ["Baba ghanoush", 1]],
    complaint: {
      status: "in_review",
      reason: "quality",
      text: "The kofta was cold and dry when I picked it up.",
      lines: ["Kofta"],
      replies: [{ from: "support", text: "Sorry about that. We've asked Bab El Sharq Grill what happened and will come back to you today." }],
    },
  },
  {
    vendor: "pizza",
    who: "me",
    status: "delivered",
    minutesAgo: 3 * DAY,
    lines: [["Pepperoni", 1, ["Regular"]], ["Chocolate brownie", 2]],
    rating: { vendor: 4, courier: 5, comment: "Hot and on time." },
    complaint: {
      status: "rejected",
      reason: "late",
      text: "It took longer than the app said.",
      lines: [],
      replies: [{ from: "support", text: "Thanks for telling us. The order arrived 6 minutes after the time shown, within what we promise, so there's no refund this time." }],
      decision: { outcome: "no_refund", amount: null, reason: "Delivered within the time shown." },
    },
  },
  { vendor: "market", who: OTHER_CUSTOMERS.mona, status: "rejected", minutesAgo: 2 * DAY + 60, lines: [["Roumi cheese", 0.5], ["Toast bread", 1]] },
  {
    vendor: "grill",
    who: "me",
    status: "delivered",
    minutesAgo: 2 * DAY,
    lines: [["Mixed grill", 1, ["One"]], ["Kofta sandwich", 2], ["Tahini", 1]],
    complaint: {
      status: "waiting_for_customer",
      reason: "missing_items",
      text: "One of the kofta sandwiches wasn't in the bag.",
      lines: ["Kofta sandwich"],
      replies: [{ from: "support", text: "Sorry! Could you tell us whether the tahini was there? Then we'll put the missing sandwich back in your wallet." }],
    },
  },
  {
    vendor: "market",
    who: "me",
    status: "delivered",
    minutesAgo: DAY + 120,
    coupon: OWNER_COUPON,
    lines: [["Tomatoes", 2], ["Cucumbers", 1], ["White cheese", 0.5], ["Baladi bread, 5 loaves", 2], ["Full-cream milk, 1 l", 2], ["Black tea, 250 g", 1]],
    rating: { vendor: 5, courier: 5, comment: null },
    complaint: {
      status: "resolved",
      reason: "damaged",
      text: "Half of the tomatoes were squashed.",
      lines: ["Tomatoes"],
      replies: [
        { from: "support", text: "Sorry about the tomatoes. We've put the kilo back in your wallet: EGP 18, to use on your next order." },
        { from: "customer", text: "Thank you!" },
      ],
      decision: { outcome: "partial_refund", amount: 18_00, reason: "Damaged tomatoes, refunded to your wallet." },
    },
  },
  { vendor: "pizza", who: OTHER_CUSTOMERS.salma, status: "delivered", minutesAgo: DAY, lines: [["Margherita", 2, ["Regular"]], ["Penne arrabbiata", 1]] },
  {
    vendor: "market",
    who: "me",
    status: "delivered",
    minutesAgo: 300,
    lines: [["Bananas", 1], ["Plain yoghurt, 4 cups", 1], ["Butter croissants, 4", 1], ["Orange juice, 1 l", 1]],
    complaint: {
      status: "open",
      reason: "wrong_items",
      text: "I got apple juice instead of orange juice.",
      lines: ["Orange juice, 1 l"],
      replies: [],
    },
  },
  { vendor: "pizza", who: "me", status: "on_the_way", minutesAgo: 32, lines: [["Margherita", 1, ["Large"]], ["Garden vegetables", 1, ["Regular"]]], notes: "Please ring the bell twice." },
  { vendor: "market", who: OTHER_CUSTOMERS.hany, status: "picking", minutesAgo: 14, lines: [["Potatoes", 2], ["Eggs, 30", 1], ["Laundry powder, 2.5 kg", 1], ["Lemons", 0.5]] },
  { vendor: "grill", who: "me", status: "ready", minutesAgo: 30, pickup: true, lines: [["Shish tawook", 1], ["Vermicelli rice", 1]] },
  { vendor: "market", who: OTHER_CUSTOMERS.mona, status: "placed", minutesAgo: 3, lines: [["Red apples", 1], ["Full-cream milk, 1 l", 2], ["Toast bread", 1], ["Mineral water, 1.5 l", 6]] },
  { vendor: "market", who: "me", status: "scheduled", minutesAgo: 45, tomorrowAt: "10:00", lines: [["Egyptian rice, 1 kg", 1], ["Yellow lentils, 1 kg", 1], ["Sunflower oil, 1.5 l", 1], ["Onions", 1], ["Dish soap, 750 ml", 1]] },
];

const ALL_DAY: OpeningPeriod[] = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((day) => ({ day, opens: "00:00", closes: "23:59" }));

/** The marketplace's settings: Egypt, prices with 14% VAT in them, cash, pick-up, orders for later, the club and the wallet, and no photos needed. */
export function marketplaceDeliverySettings(saved: DeliverySettings): DeliverySettings {
  return {
    ...saved,
    currency: CURRENCY,
    pricing: "fixed",
    fixedCents: 25_00,
    zones: [],
    maxKm: null,
    cash: true,
    card: false,
    tracking: "live",
    assignment: "open",
    courierApp: "same",
    cuisines: [
      { id: "grill", name: "Grill" },
      { id: "egyptian", name: "Egyptian" },
      { id: "pizza", name: "Pizza" },
    ],
    foodCourierJob: "accepted",
    timezone: MARKET_TIMEZONE,
    marketApp: {
      ...DEFAULT_MARKET_SETTINGS,
      country: "EG",
      currency: null,
      tax: { ratePercent: 14, included: true, onDelivery: false, label: "VAT" },
      payment: { gateway: null, cash: true, cashMax: null, applePay: false, googlePay: false },
      pickup: true,
      scheduling: { enabled: true, daysAhead: 3 },
      club: true,
      wallet: true,
      weightTolerancePercent: 10,
      vendorApp: "same",
      // 115.15 Not every product has a drawing (milk, rice, soap): those show without a picture.
      requirePhotos: false,
      vendorCoupons: { enabled: true, maxPercent: 30 },
    },
  };
}

function menuOf(vendor: DemoVendor, money: (cents: number) => number = (c) => c, pictures: ReadonlyMap<string, string | null> = new Map()): RestaurantMenu {
  let next = 1;
  const id = () => next++;
  const sections: MenuSection[] = (vendor.menu ?? []).map((section) => ({
    id: id(),
    name: section.name,
    dishes: section.dishes.map(
      (dish): Dish => ({
        id: id(),
        name: dish.name,
        description: dish.description,
        imageAssetId: pictures.get(dish.name) ?? null,
        priceCents: money(dish.price),
        available: true,
        popular: dish.popular ?? false,
        choiceGroups: dish.choices
          ? [{ id: id(), name: dish.choices.name, min: dish.choices.min, max: dish.choices.max, choices: dish.choices.options.map(([name, extraCents]) => ({ id: id(), name, extraCents: money(extraCents), available: true })) }]
          : [],
      }),
    ),
  }));
  return { sections, nextId: next };
}

async function demoUser(store: DataStore, appId: string, now: Date): Promise<HostedUser> {
  const found = await store.getHostedUserByPhone(appId, DEMO_SIGN_IN.e164);
  if (found) return found;
  const made = await store.createHostedUser({ appId, phone: DEMO_SIGN_IN.e164, name: DEMO_USER_NAME, email: null, city: null, now });
  const user = made ?? (await store.getHostedUserByPhone(appId, DEMO_SIGN_IN.e164));
  if (!user) throw new Error("The demo account couldn't be made.");
  return user;
}

/**
 * How Zad's places and products are made: as the demo has them, or
 * (templates = demos) as samples of an app started from Zad, each place
 * marked `sample`, after the app's own, with prices in its currency and the
 * cuisines it has under its own IDs. Nothing of the owner's is changed.
 */
export interface MarketMaking {
  sample: boolean;
  money: (cents: number) => number;
  cuisines: Map<string, string>;
  /** A Zad picture's asset; null (or missing) when it can't be had, and the entries keep the pictures they have. */
  picture?: (name: ZadPicture, size: PictureSize) => Promise<string | null>;
}

const AS_THE_DEMO: MarketMaking = { sample: false, money: (c) => c, cuisines: new Map() };

/** Each picture looked up once a run, however many products show it. */
function once(picture: MarketMaking["picture"]): MarketMaking["picture"] {
  if (!picture) return undefined;
  const seen = new Map<string, Promise<string | null>>();
  return (name, size) => {
    const key = `${name}:${size}`;
    if (!seen.has(key)) seen.set(key, picture(name, size));
    return seen.get(key)!;
  };
}

/** Zad's cuisines (the marketplace's settings). */
export function marketCuisines(): Cuisine[] {
  return marketplaceDeliverySettings(deliverySettingsOf(null)).cuisines ?? [];
}

/** The three places, as the demo has them (a place a visitor paused or set busy opens again). */
async function syncVendors(store: DataStore, app: Pick<App, "id">, now: Date, making: MarketMaking = AS_THE_DEMO): Promise<Map<VendorKey, Restaurant>> {
  const existing = await store.listRestaurants(app.id);
  const vendors = new Map<VendorKey, Restaurant>();
  const after = making.sample ? Math.max(0, ...existing.map((r) => r.position)) : 0;
  const { money } = making;
  const picture = async (name: ZadPicture | undefined, size: PictureSize, had: string | null | undefined): Promise<string | null> => (name && making.picture ? ((await making.picture(name, size)) ?? had ?? null) : (had ?? null));
  for (const [position, v] of MARKET_VENDORS.entries()) {
    const found = making.sample ? undefined : existing.find((r) => r.name === v.name);
    const input: RestaurantInput = {
      appId: app.id,
      name: v.name,
      description: v.description,
      logoAssetId: null,
      coverAssetId: await picture(v.cover, "home", found?.coverAssetId),
      cuisines: v.cuisines.map((c) => making.cuisines.get(c) ?? c),
      address: { ...v.address },
      phone: null,
      hours: ALL_DAY,
      prepMinutes: v.prepMinutes,
      minOrderCents: money(v.minOrder),
      maxKm: v.maxKm,
      commissionBp: v.commissionBp,
      active: true,
      position: after + position + 1,
      kind: v.kind,
      delivery: { ...v.delivery, fee: money(v.delivery.fee), perKm: money(v.delivery.perKm), freeOver: v.delivery.freeOver === null ? null : money(v.delivery.freeOver) },
      commissionFixed: null,
      taxRateBp: null,
      paused: false,
      area: v.area,
    };
    const dishPictures = new Map<string, string | null>();
    // Without a way to have the pictures (the daily job), the dishes keep theirs.
    const had = found && v.menu && !making.picture ? await store.getRestaurantMenu(app.id, found.id) : null;
    for (const dish of (v.menu ?? []).flatMap((m) => m.dishes)) {
      const before = had?.sections.flatMap((m) => m.dishes).find((d) => d.name === dish.name)?.imageAssetId;
      dishPictures.set(dish.name, await picture(dish.picture, "product", before));
    }
    const menu = menuOf(v, money, dishPictures);
    if (making.sample) {
      vendors.set(v.key, await store.createRestaurant({ ...input, sample: true }, menu, now));
      continue;
    }
    if (found) {
      if (!unchanged(found, { ...input, busyUntil: null })) await store.updateRestaurant(app.id, found.id, { ...input, busyUntil: null }, now);
      if (v.menu) await store.saveRestaurantMenu(app.id, found.id, menu, now);
    } else {
      await store.createRestaurant(input, menu, now);
    }
  }
  if (making.sample) return vendors;
  for (const r of await store.listRestaurants(app.id)) {
    const v = MARKET_VENDORS.find((x) => x.name === r.name);
    if (v) vendors.set(v.key, r);
  }
  return vendors;
}

/** Zad Market's departments, aisles and products; what a visitor added or changed in its panel goes back to the demo's. */
async function syncCatalog(store: DataStore, appId: string, market: Restaurant, now: Date, making: MarketMaking = AS_THE_DEMO): Promise<void> {
  const departments = await store.listMarketDepartments(appId, market.id);
  // Every aisle of the place in one list; a department or aisle already as the demo has it isn't saved again.
  const allAisles = await store.listMarketAisles(appId, market.id);
  const keepDepartments = new Set<number>();
  const rows: Omit<MarketProductInput, "appId" | "vendorId">[] = [];
  // The pictures they have stay when no picture can be had (the daily job draws none).
  const before = making.sample ? [] : await allProducts(store, appId, market.id);
  const picture = async (name: ZadPicture | undefined, had: string | null | undefined): Promise<string | null> => (name && making.picture ? ((await making.picture(name, "product")) ?? had ?? null) : (had ?? null));
  for (const [d, department] of MARKET_CATALOG.entries()) {
    const foundDepartment = departments.find((x) => x.name === department.name);
    const wantedDepartment = { appId, vendorId: market.id, name: department.name, imageAssetId: await picture(department.picture, foundDepartment?.imageAssetId), position: d + 1 };
    const savedDepartment = foundDepartment && unchanged(foundDepartment, wantedDepartment) ? foundDepartment : await store.saveMarketDepartment({ id: foundDepartment?.id ?? null, ...wantedDepartment });
    if (!savedDepartment) throw new Error(`The department ${department.name} couldn't be saved.`);
    keepDepartments.add(savedDepartment.id);
    const aisles = allAisles.filter((x) => x.departmentId === savedDepartment.id);
    const keepAisles = new Set<number>();
    for (const [a, aisle] of department.aisles.entries()) {
      const wantedAisle = { appId, vendorId: market.id, departmentId: savedDepartment.id, name: aisle.name, position: a + 1 };
      const foundAisle = aisles.find((x) => x.name === aisle.name);
      const savedAisle = foundAisle && unchanged(foundAisle, wantedAisle) ? foundAisle : await store.saveMarketAisle({ id: foundAisle?.id ?? null, ...wantedAisle });
      if (!savedAisle) throw new Error(`The aisle ${aisle.name} couldn't be saved.`);
      keepAisles.add(savedAisle.id);
      for (const p of aisle.products) {
        const imageAssetId = await picture(p.picture ?? aisle.picture, before.find((x) => x.sku === p.sku)?.imageAssetId);
        rows.push({
          departmentId: savedDepartment.id,
          aisleId: savedAisle.id,
          name: p.name,
          description: null,
          brand: null,
          sku: p.sku,
          barcode: null,
          imageAssetId,
          imageUrl: null,
          galleryAssetIds: null,
          photoError: null,
          price: making.money(p.price),
          wasPrice: p.wasPrice === undefined ? null : making.money(p.wasPrice),
          unit: p.unit ?? "item",
          step: p.step ?? 1,
          maxQuantity: null,
          stock: p.stock ?? null,
          inStock: p.inStock ?? true,
          tags: p.tags ?? [],
          position: rows.length + 1,
        });
      }
    }
    for (const aisle of aisles) if (!keepAisles.has(aisle.id)) await store.deleteMarketAisle(appId, market.id, aisle.id);
  }
  for (const department of departments) if (!keepDepartments.has(department.id)) await store.deleteMarketDepartment(appId, market.id, department.id);
  if (making.sample) {
    await store.upsertMarketProducts(appId, market.id, rows, now);
    return;
  }
  // Only the products not as the demo has them are saved; the ones it doesn't have (a visitor's) go.
  const products = before;
  const changed = rows.filter((row) => !products.some((p) => p.sku === row.sku && unchanged(p, row)));
  if (changed.length) await store.upsertMarketProducts(appId, market.id, changed, now);
  const skus = new Set(rows.map((r) => r.sku));
  for (const p of products) if (!p.sku || !skus.has(p.sku)) await store.deleteMarketProduct(appId, p.id);
}

async function allProducts(store: DataStore, appId: string, vendorId: number) {
  const items = [];
  for (let page = 1; ; page++) {
    const found = await store.listMarketProducts({ appId, vendorId, page, perPage: 200 });
    items.push(...found.items);
    if (items.length >= found.total || found.items.length === 0) return items;
  }
}

/** The places' staff: the demo number owns Zad Market; anyone a visitor added there is removed. */
async function syncStaff(store: DataStore, appId: string, vendors: Map<VendorKey, Restaurant>, now: Date): Promise<void> {
  const staff = await store.listRestaurantStaff(appId);
  const seeded = new Set(SEEDED_STAFF.map((s) => s.phone));
  for (const s of SEEDED_STAFF) {
    const vendor = vendors.get(s.vendor)!;
    const found = staff.find((x) => x.phone === s.phone);
    if (found && found.restaurantId === vendor.id && (found.role ?? "manager") === s.role) {
      if (!unchanged(found, { name: s.name, email: null, active: true })) await store.updateRestaurantStaff(appId, found.id, { name: s.name, email: null, active: true }, now);
      continue;
    }
    if (found) await store.deleteRestaurantStaff(appId, found.id);
    await store.createRestaurantStaff({ appId, restaurantId: vendor.id, name: s.name, phone: s.phone, email: null, active: true, role: s.role }, now);
  }
  for (const s of staff) if (!s.phone || !seeded.has(s.phone)) await store.deleteRestaurantStaff(appId, s.id);
}

/** The owner's code, its automatic offer, and the places' own offers (made as they make them, in their panel). */
async function syncOffers(store: DataStore, appId: string, vendors: Map<VendorKey, Restaurant>, now: Date): Promise<void> {
  const again = { active: true, ownerPaused: false, startsAt: null, endsAt: null, updatedAt: now };
  const owner: MarketCouponInput[] = [
    {
      appId,
      code: OWNER_COUPON,
      title: "20% off your basket",
      kind: "percent",
      value: 20,
      maxDiscount: 50_00,
      minOrder: 200_00,
      currency: CURRENCY,
      paidBy: "owner",
      firstOrderOnly: false,
      vendorIds: [],
      vendorKinds: [],
      departmentIds: [],
      productIds: [],
      createdByVendorId: null,
      ownerPaused: false,
      usesLimit: null,
      perUserLimit: null,
      startsAt: null,
      endsAt: null,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      appId,
      code: null,
      title: PIZZA_OFFER,
      kind: "free_delivery",
      value: 0,
      maxDiscount: null,
      minOrder: 250_00,
      currency: CURRENCY,
      paidBy: "owner",
      firstOrderOnly: false,
      vendorIds: [vendors.get("pizza")!.id],
      vendorKinds: [],
      departmentIds: [],
      productIds: [],
      createdByVendorId: null,
      ownerPaused: false,
      usesLimit: null,
      perUserLimit: null,
      startsAt: null,
      endsAt: null,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
  const coupons = await store.listMarketCoupons(appId);
  for (const c of owner) {
    const found = coupons.find((x) => (c.code ? x.code === c.code : x.code === null && x.title === c.title));
    const { appId: _app, createdAt: _created, ...patch } = c;
    void _app;
    void _created;
    if (found) await store.updateMarketCoupon(appId, found.id, patch);
    else await store.createMarketCoupon(c);
  }
  // The places' own: Zad Market's code on fruit and vegetables, the grill's free delivery (it delivers itself).
  const market = vendors.get("market")!;
  const grill = vendors.get("grill")!;
  const fruit = (await store.listMarketDepartments(appId, market.id)).find((d) => d.name === MARKET_CATALOG[0]!.name)!;
  const own: { vendor: Restaurant; form: Record<string, string>; match: (c: (typeof coupons)[number]) => boolean }[] = [
    {
      vendor: market,
      form: { title: "10% off fruit and vegetables", code: MARKET_COUPON, kind: "percent", value: "10", min_order: "100", [`group_${fruit.id}`]: "1" },
      match: (c) => c.code === MARKET_COUPON,
    },
    {
      vendor: grill,
      form: { title: GRILL_OFFER, code: "", kind: "free_delivery", min_order: "300" },
      match: (c) => c.code === null && c.title === GRILL_OFFER && c.createdByVendorId === grill.id,
    },
  ];
  for (const o of own) {
    const found = coupons.find(o.match);
    if (found) {
      // Back to the demo's, limited to the department again.
      await store.updateMarketCoupon(appId, found.id, { ...again, ...(o.vendor.id === market.id ? { departmentIds: [fruit.id], productIds: [] } : {}) });
      continue;
    }
    const made = await createVendorCoupon({ store, appId, vendor: o.vendor, currency: CURRENCY }, o.form, now);
    if (!made.ok) throw new Error(`${o.vendor.name}'s offer: ${made.error}`);
  }
}

/** The club's plans, and the demo number a member of the monthly one. */
async function syncClub(store: DataStore, appId: string, user: HostedUser, now: Date): Promise<void> {
  const plans = await store.listMarketClubPlans(appId);
  let monthly: number | null = null;
  for (const [position, p] of CLUB_PLANS.entries()) {
    const input = { appId, name: p.name, description: p.description, period: p.period, price: p.price, currency: CURRENCY, freeDeliveryOver: 150_00, deliveryDiscountPercent: null, perks: [...p.perks], active: true, position: position + 1, createdAt: now, updatedAt: now };
    const found = plans.find((x) => x.name === p.name);
    let id: number;
    if (found) {
      const { appId: _app, createdAt: _created, ...patch } = input;
      void _app;
      void _created;
      await store.updateMarketClubPlan(appId, found.id, patch);
      id = found.id;
    } else id = (await store.createMarketClubPlan(input)).id;
    if (p.period === "month") monthly = id;
  }
  const member = await store.getMarketClubMember(appId, user.id);
  await store.saveMarketClubMember(
    { appId, userId: user.id, planId: monthly, status: "active", renews: true, startedAt: new Date(now.getTime() - 10 * 86_400_000), paidUntil: new Date(now.getTime() + 20 * 86_400_000), paymentRef: "demo", saved: Math.max(member?.saved ?? 0, 75_00) },
    now,
  );
}

/** Each stage the order went through, from when it was placed; the first one is the demo's (`system`), which is how the daily refresh knows its own orders. */
function stagesOf(seed: SeedOrder, vendor: Restaurant, placed: Date, now: Date): MarketOrderStage[] {
  const at = (minutes: number) => new Date(Math.min(placed.getTime() + minutes * 60_000, now.getTime() - 1000)).toISOString();
  const first = (status: MarketOrderStatus): MarketOrderStage => ({ status, at: placed.toISOString(), by: "system" });
  if (seed.status === "scheduled" || seed.status === "placed") return [first(seed.status)];
  if (seed.status === "cancelled") return [first("placed"), { status: "cancelled", at: at(4), by: "customer" }];
  if (seed.status === "rejected") return [first("placed"), { status: "rejected", at: at(5), by: "vendor" }];
  const prep = vendor.prepMinutes;
  const grocery = (vendor.kind ?? "restaurant") !== "restaurant";
  const stages: MarketOrderStage[] = [first("placed"), { status: grocery ? "picking" : "accepted", at: at(3), by: "vendor" }];
  if (seed.status === "picking" || seed.status === "accepted") return stages;
  stages.push({ status: "ready", at: at(3 + prep), by: "vendor" });
  if (seed.status === "ready") return stages;
  if (seed.status === "picked_up") return [...stages, { status: "picked_up", at: at(3 + prep + 12), by: "vendor" }];
  const by = vendor.delivery?.by === "vendor" ? "vendor" : "courier";
  stages.push({ status: "on_the_way", at: at(3 + prep + 4), by });
  if (seed.status === "on_the_way") return stages;
  return [...stages, { status: "delivered", at: at(3 + prep + 22), by }];
}

/** The reads of pricing an order that the seeded orders, complaints and refunds don't change. */
const PRICING_READS = ["getRestaurant", "getRestaurantMenu", "getMarketProduct", "listMarketCoupons", "findMarketCouponByCode", "countMarketCouponUses", "getMarketClubMember", "getMarketClubPlan", "listMarketOrders", "walletBalance"] as const;

/** The seeded orders, complaints and refunds, from the clock. */
async function seedOrders(saved: DataStore, app: Pick<App, "id">, vendors: Map<VendorKey, Restaurant>, user: HostedUser, now: Date): Promise<number> {
  // What pricing reads and seeding doesn't change (the places, their menus and products, the offers and the club) is read once.
  const store = readOnce(saved, PRICING_READS, {
    // Whether it's the demo number's first order: until it has one delivered or picked up.
    createMarketOrder: (order: MarketOrderInput) => (order.userId !== null && (order.status === "delivered" || order.status === "picked_up") ? ["listMarketOrders"] : []),
    addWalletEntry: () => ["walletBalance"],
  });
  const delivery = deliverySettingsOf(await store.getDeliverySettings(app.id));
  const today = utcToLocal(now, MARKET_TIMEZONE).date;
  // Prices are checked with the places open: at the very end of the day (23:59), a minute earlier.
  const pricedAt = utcToLocal(now, MARKET_TIMEZONE).time >= "23:59" ? new Date(now.getTime() - 120_000) : now;
  const catalog = await allProducts(store, app.id, vendors.get("market")!.id);
  for (const p of catalog) store.remember("getMarketProduct", [app.id, p.id], p);
  const products = new Map(catalog.map((p) => [p.name, p.id]));
  const courier = await seededCourier(store, app.id, now);
  let made = 0;
  for (const seed of SEED_ORDERS) {
    const vendor = vendors.get(seed.vendor)!;
    const menu = (await store.getRestaurantMenu(app.id, vendor.id)) ?? { sections: [], nextId: 1 };
    const dishes = menu.sections.flatMap((s) => s.dishes);
    const mine = seed.who === "me";
    const dropoff = seed.pickup ? null : mine ? DEMO_HOME : OTHER_PLACES[(Object.keys(OTHER_CUSTOMERS) as (keyof typeof OTHER_CUSTOMERS)[]).find((k) => OTHER_CUSTOMERS[k] === seed.who)!];
    const cart: Cart = {
      vendorId: vendor.id,
      lines: seed.lines.map(([name, quantity, choices]) => {
        const dish = dishes.find((d) => d.name === name);
        const productId = dish?.id ?? products.get(name);
        if (productId === undefined) throw new Error(`${vendor.name} has no ${name}.`);
        const choiceIds = (choices ?? []).map((c) => dish?.choiceGroups.flatMap((g) => g.choices).find((x) => x.name === c)?.id ?? -1);
        return { productId, quantity, choices: choiceIds, note: null, ifMissing: "similar", substituteProductId: null };
      }),
      fulfilment: seed.pickup ? "pickup" : "delivery",
      dropoff,
      scheduledFor: seed.tomorrowAt ? localToUtc(addDays(today, 1), seed.tomorrowAt, MARKET_TIMEZONE) : null,
      couponCode: seed.coupon ?? null,
      useWallet: false,
      tip: 0,
    };
    const priced = await priceMarketCart(store, { appId: app.id, delivery, cart, userId: mine ? user.id : null, now: pricedAt });
    if (!priced.ok) throw new Error(`The demo's order from ${vendor.name} couldn't be priced: ${priced.refusal.error}`);
    const pr = priced.priced;
    const fulfilment = cart.fulfilment;
    const deliveryBy = fulfilment === "pickup" ? null : pr.delivery.by;
    const money = repriceFor(pr, cart, collectedByOf({ paymentMethod: "cash", fulfilment, deliveryBy }));
    const placed = new Date(now.getTime() - seed.minutesAgo * 60_000);
    const timeline = stagesOf(seed, vendor, placed, now);
    const last = timeline[timeline.length - 1]!;
    const done = seed.status === "delivered" || seed.status === "picked_up";
    const accepted = !["scheduled", "placed", "cancelled", "rejected"].includes(seed.status);
    const customer = mine ? { name: DEMO_USER_NAME, phone: DEMO_SIGN_IN.e164 } : (seed.who as { name: string; phone: string });
    const order = await store.createMarketOrder({
      appId: app.id,
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorKind: vendor.kind ?? "restaurant",
      userId: mine ? user.id : null,
      customerName: customer.name,
      customerPhone: customer.phone,
      fulfilment,
      deliveryBy,
      scheduledFor: cart.scheduledFor,
      lines: pr.lines,
      money,
      currency: CURRENCY,
      paymentMethod: "cash",
      paymentStatus: done ? "paid" : "unpaid",
      paymentRef: null,
      couponCode: pr.coupon?.code ?? null,
      status: seed.status,
      dropoff,
      distanceKm: pr.delivery.distanceKm,
      notes: seed.notes ?? null,
      pickupCode: fulfilment === "pickup" ? "4721" : null,
      prepMinutes: accepted ? vendor.prepMinutes : null,
      readyAt: accepted ? new Date(placed.getTime() + (3 + vendor.prepMinutes) * 60_000) : null,
      rejection: seed.status === "rejected" ? { reason: "too_busy", note: "Out of Roumi cheese until tomorrow." } : null,
      shipmentId: null,
      rating: seed.rating ? { ...seed.rating, at: last.at } : null,
      timeline,
      completedAt: done ? new Date(last.at) : null,
      lang: "en",
      createdAt: placed,
      updatedAt: new Date(last.at),
    });
    made++;
    // The order on its way with the app's courier: its job, picked up, the courier driving from the clock.
    if (seed.status === "on_the_way" && deliveryBy === "app" && order.dropoff) {
      const onTheWay = timeline.find((s) => s.status === "on_the_way")!.at;
      const job = await store.createShipment({
        appId: app.id,
        userId: order.userId,
        senderName: vendor.name,
        senderPhone: vendor.phone,
        serviceId: null,
        serviceName: null,
        pickup: vendor.address,
        dropoff: order.dropoff,
        zoneId: null,
        zoneName: null,
        distanceKm: order.distanceKm,
        packageSize: "small",
        packageDescription: `Order ${marketOrderReference(order)}`,
        recipientName: order.customerName,
        recipientPhone: order.customerPhone,
        notes: order.notes,
        priceCents: money.payNow,
        currency: delivery.currency,
        paymentMethod: "cash",
        paymentStatus: "unpaid",
        orderId: null,
        status: "picked_up",
        courierId: courier.id,
        courierName: courier.name,
        timeline: [stage("pending", new Date(timeline[1]!.at), "company"), stage("assigned", new Date(timeline[1]!.at), "courier"), stage("picked_up", new Date(onTheWay), "courier")],
        lang: "en",
        foodOrderId: null,
        createdAt: new Date(timeline[1]!.at),
        updatedAt: new Date(onTheWay),
      });
      await store.updateMarketOrder(app.id, order.id, { shipmentId: job.id });
    }
    if (seed.complaint) await seedComplaint(store, app.id, order, seed.complaint, user, now);
  }
  return made;
}

async function seedComplaint(store: DataStore, appId: string, order: MarketOrder, seed: SeedComplaint, user: HostedUser, now: Date): Promise<void> {
  const opened = new Date(Math.min((order.completedAt ?? order.createdAt).getTime() + 40 * 60_000, now.getTime() - 60_000));
  const at = (i: number) => new Date(Math.min(opened.getTime() + (i + 1) * 45 * 60_000, now.getTime() - (seed.replies.length - i) * 1000));
  const messages = [
    { id: 1, from: "customer" as const, text: seed.text, by: null, at: opened.toISOString() },
    ...seed.replies.map((r, i) => ({ id: i + 2, from: r.from, text: r.text, by: r.from === "support" ? "Zad support" : null, at: at(i).toISOString() })),
  ];
  const answered = [...messages].reverse().find((m) => m.from === "support");
  const decidedAt = seed.decision ? at(Math.max(0, seed.replies.length - 1)) : null;
  const complaint = await store.createMarketComplaint({
    appId,
    orderId: order.id,
    vendorId: order.vendorId,
    userId: user.id,
    reason: seed.reason,
    text: seed.text,
    lineIds: order.lines.filter((l) => seed.lines.includes(l.name)).map((l) => l.id),
    photoAssetIds: [],
    status: seed.status,
    assignee: seed.status === "open" ? null : "support@zad.example",
    sharedWithVendor: seed.status !== "open",
    messages,
    notes: seed.status === "in_review" ? [{ text: "Asked the grill about their pick-up times.", by: "support@zad.example", at: at(0).toISOString() }] : [],
    decision: seed.decision && decidedAt
      ? { outcome: seed.decision.outcome, amount: seed.decision.amount, to: seed.decision.amount ? "wallet" : null, couponCode: null, funder: "vendor", reason: seed.decision.reason, by: "support@zad.example", at: decidedAt }
      : null,
    answeredAt: answered ? new Date(answered.at) : null,
    createdAt: opened,
    updatedAt: new Date(messages[messages.length - 1]!.at),
  });
  if (seed.decision?.amount && decidedAt) {
    await store.addWalletEntry({ appId, userId: user.id, kind: "refund", amount: seed.decision.amount, label: `Refund for order ${marketOrderReference(order)}`, orderId: order.id, complaintId: complaint.id, key: `demo:refund:${complaint.id}`, createdAt: decidedAt });
  }
}

/** The courier who drives the seeded order: on no one's phone, so the demo moves them from the clock. */
async function seededCourier(store: DataStore, appId: string, now: Date) {
  const found = await store.findCourier(appId, { phone: MARKET_COURIER.phone, email: null });
  if (found) {
    await store.updateCourier(appId, found.id, { name: MARKET_COURIER.name, vehicle: MARKET_COURIER.vehicle, active: true, onDuty: false, lat: null, lng: null, locatedAt: null }, now);
    return { ...found, name: MARKET_COURIER.name };
  }
  const made = await store.createCourier({ appId, name: MARKET_COURIER.name, phone: MARKET_COURIER.phone, email: null, vehicle: MARKET_COURIER.vehicle, active: true }, now);
  if (made.ok) return made.courier;
  const again = await store.findCourier(appId, { phone: MARKET_COURIER.phone, email: null });
  if (!again) throw new Error("The demo's courier couldn't be made.");
  return again;
}

const seededOrder = (o: Pick<MarketOrder, "timeline">) => o.timeline[0]?.by === "system";

/** Every order of the app, page by page. */
async function allOrders(store: DataStore, appId: string): Promise<MarketOrder[]> {
  const items: MarketOrder[] = [];
  for (let offset = 0; ; offset += 200) {
    const found = await store.listMarketOrders({ appId, order: "oldest", limit: 200, offset });
    items.push(...found.items);
    if (items.length >= found.total || found.items.length === 0) return items;
  }
}

/**
 * Zad's content (the places, the supermarket's catalog, the offers, the
 * club and the places' staff) and its day: visitors' orders from more than
 * a day ago are deleted (their count returned), and the seeded orders,
 * complaints and refunds are made again from the clock when they are from
 * another day (or always, with `force`, when the demo is set up).
 */
export async function refreshMarketplaceDemo(store: DataStore, app: Pick<App, "id">, now: Date, options: { force?: boolean; picture?: MarketMaking["picture"] } = {}): Promise<number> {
  const before = now.getTime() - DEMO_RETENTION_HOURS * 3_600_000;
  const saved = deliverySettingsOf(await store.getDeliverySettings(app.id));
  await store.saveDeliverySettings(app.id, marketplaceDeliverySettings(saved), now);
  const user = await demoUser(store, app.id, now);
  const making: MarketMaking = { ...AS_THE_DEMO, picture: once(options.picture) };
  const vendors = await syncVendors(store, app, now, making);
  await syncCatalog(store, app.id, vendors.get("market")!, now, making);
  await syncStaff(store, app.id, vendors, now);
  await syncOffers(store, app.id, vendors, now);
  await syncClub(store, app.id, user, now);
  await store.addWalletEntry({ appId: app.id, userId: user.id, kind: "credit", amount: 100_00, label: "Welcome credit", orderId: null, complaintId: null, key: WELCOME_KEY, createdAt: now });

  const orders = await allOrders(store, app.id);
  const visitors = orders.filter((o) => !seededOrder(o) && o.createdAt.getTime() < before).map((o) => o.id);
  const deleted = await store.deleteMarketOrders(app.id, visitors);

  // The seeded day is made again once it is from another day.
  const seeded = orders.filter(seededOrder);
  const newest = seeded.reduce<MarketOrder | null>((a, o) => (!a || o.createdAt > a.createdAt ? o : a), null);
  const today = utcToLocal(now, MARKET_TIMEZONE).date;
  if (!options.force && newest && seeded.length === SEED_ORDERS.length && utcToLocal(newest.createdAt, MARKET_TIMEZONE).date === today) return deleted;
  for (const o of seeded) {
    if (o.shipmentId === null) continue;
    const job = await store.getShipment(app.id, o.shipmentId);
    if (job && job.status !== "delivered" && job.status !== "cancelled") await store.updateShipment(app.id, job.id, { status: "cancelled", timeline: [...job.timeline, stage("cancelled", now, "company")], updatedAt: now });
  }
  await store.deleteMarketOrders(app.id, seeded.map((o) => o.id));
  await seedOrders(store, app, vendors, user, now);
  return deleted;
}

/**
 * Templates = demos: Zad's three places, their menus and Zad Market's
 * departments, aisles and products, as samples of an app started from Zad
 * (lib/samples/demo.ts). Without the demo number, its orders, offers, club,
 * wallet and the daily refresh.
 */
export async function marketplaceSamples(store: DataStore, app: Pick<App, "id">, now: Date, making: Omit<MarketMaking, "sample">): Promise<number> {
  const sample: MarketMaking = { ...making, sample: true, picture: once(making.picture) };
  const vendors = await syncVendors(store, app, now, sample);
  const market = vendors.get("market");
  if (market) await syncCatalog(store, app.id, market, now, sample);
  return vendors.size;
}
