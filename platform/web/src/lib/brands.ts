import {
  siApple,
  siAppgallery,
  siFirebase,
  siGoogleplay,
  siSalla,
  siSamsung,
  siShopify,
  siWhatsapp,
  siWix,
  siWoocommerce,
  siWordpress,
  siXiaomi,
  type SimpleIcon,
} from "simple-icons";
import { APP_STORES, STORE_FACTS, type AppStore, type StoreFacts } from "./stores";

/**
 * 41 The brands Yallapp really works with, for the "Works with" strip, the
 * store marks on the plans and the publishing texts. Marks are the CC0 paths
 * of the simple-icons package, unaltered (only the view box is fitted to a
 * wordmark); a brand without one there is shown as its name, never as a
 * made-up logo. The names and marks are their owners' trademarks
 * (docs/BRAND.md, "Third-party brand marks").
 */

export interface BrandMark {
  /** The SVG path, in the view box below. */
  path: string;
  viewBox: string;
  /** Width ÷ height of the view box, to size the mark without a layout shift. */
  ratio: number;
  /** The brand's color, shown on hover. */
  hex: string;
}

export interface Brand {
  id: string;
  /** The accessible name and, unless the mark is a wordmark, the text next to it. */
  name: string;
  /** Shorter text next to the mark, when the name is long ("Galaxy Store" next to Samsung's wordmark). */
  label?: string;
  mark?: BrandMark;
  /** The mark already spells the name (WooCommerce, Wix): no text next to it. */
  wordmark?: boolean;
}

/** A simple-icons mark, its view box fitted to the drawn area when the mark is a wide wordmark. */
function mark(icon: SimpleIcon, box: [number, number, number, number] = [0, 0, 24, 24]): BrandMark {
  return { path: icon.path, viewBox: box.join(" "), ratio: box[2] / box[3], hex: `#${icon.hex}` };
}

// The drawn areas of the wordmarks (getBBox of each path, rounded outwards).
const SAMSUNG = mark(siSamsung, [0, 10.1, 24, 3.8]);
const WOOCOMMERCE = mark(siWoocommerce, [0, 9.5, 24, 5]);
const WIX = mark(siWix, [0, 7.3, 24, 9.4]);

export interface StoreInfo extends StoreFacts, Brand {
  id: AppStore;
}

const STORE_MARKS: Record<AppStore, BrandMark> = {
  google_play: mark(siGoogleplay),
  app_store: mark(siApple),
  galaxy_store: SAMSUNG,
  appgallery: mark(siAppgallery),
  getapps: mark(siXiaomi),
};

/** 41 Each store with its mark: Apple's, Google Play's, Samsung's, Huawei AppGallery's and Xiaomi's. */
export const STORES = Object.fromEntries(
  APP_STORES.map((id) => [id, { ...STORE_FACTS[id], label: STORE_FACTS[id].short, mark: STORE_MARKS[id] }]),
) as Record<AppStore, StoreInfo>;

/** A row of the "Works with" strip. */
export interface BrandRow {
  id: string;
  /** Names the row for assistive technology. */
  label: string;
  brands: Brand[];
}

/**
 * 41 The "Works with" strip: the five stores, payments and messaging, then
 * the platforms an app's content comes from (the Integrations page,
 * lib/marketing.ts). Only what Yallapp really connects to: sign-in codes go
 * out on WhatsApp (lib/hosted/otp-sender.ts), push through Firebase.
 */
export const WORKS_WITH_ROWS: BrandRow[] = [
  {
    id: "stores",
    label: "App stores, payments and messaging",
    brands: [
      ...APP_STORES.map((id) => STORES[id]),
      { id: "firebase", name: "Firebase", mark: mark(siFirebase) },
      { id: "whatsapp", name: "WhatsApp", mark: mark(siWhatsapp) },
      { id: "iyzico", name: "iyzico" },
      { id: "kashier", name: "Kashier" },
      { id: "fawaterk", name: "Fawaterk" },
    ],
  },
  {
    id: "platforms",
    label: "Websites and platforms",
    brands: [
      { id: "wordpress", name: "WordPress", mark: mark(siWordpress) },
      { id: "woocommerce", name: "WooCommerce", mark: WOOCOMMERCE, wordmark: true },
      { id: "shopify", name: "Shopify", mark: mark(siShopify) },
      { id: "wix", name: "Wix", mark: WIX, wordmark: true },
      { id: "salla", name: "Salla", mark: mark(siSalla) },
      { id: "zid", name: "Zid" },
      { id: "ikas", name: "ikas" },
      { id: "ticimax", name: "Ticimax" },
      { id: "ideasoft", name: "IdeaSoft" },
      { id: "tutor-lms", name: "Tutor LMS" },
      { id: "learnpress", name: "LearnPress" },
      { id: "learndash", name: "LearnDash" },
      { id: "lifterlms", name: "LifterLMS" },
      { id: "masterstudy", name: "MasterStudy LMS" },
      { id: "sensei", name: "Sensei LMS" },
      { id: "masteriyo", name: "Masteriyo" },
      { id: "teachable", name: "Teachable" },
      { id: "thinkific", name: "Thinkific" },
      { id: "amelia", name: "Amelia" },
      { id: "bookingpress", name: "BookingPress" },
      { id: "latepoint", name: "LatePoint" },
      { id: "simplybook", name: "SimplyBook.me" },
    ],
  },
];

/** Every brand in the strip, once. */
export const WORKS_WITH_BRANDS: Brand[] = WORKS_WITH_ROWS.flatMap((row) => row.brands);

/** 41 The small print under the strip and the store marks. */
export const TRADEMARK_NOTE = "The names and logos shown are trademarks of their owners and don't mean they endorse Yallapp.";

/** WhatsApp's mark, on the buttons and links that open a WhatsApp chat with Yallapp (docs/BRAND.md). */
export const WHATSAPP_MARK: BrandMark = mark(siWhatsapp);

/** 41 The marks on the Integrations page's cards, by the card's name (lib/marketing.ts); the others show their name only. */
export function integrationMark(name: string): BrandMark | undefined {
  const byName: Record<string, BrandMark | undefined> = {
    "Google Play Console": STORES.google_play.mark,
    "App Store Connect": STORES.app_store.mark,
    "Samsung Galaxy Store": STORES.galaxy_store.mark,
    "Huawei AppGallery": STORES.appgallery.mark,
    "Xiaomi GetApps": STORES.getapps.mark,
    "WordPress posts": mark(siWordpress),
  };
  return byName[name] ?? WORKS_WITH_BRANDS.find((b) => b.name === name && !b.wordmark)?.mark;
}
