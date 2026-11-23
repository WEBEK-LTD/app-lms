import type { ShopKit } from "../shop-kit";

/** 210 (stub, filled in with the type) */
export const CROCHET_KIT: ShopKit = {
  demo: "crochet",
  photos: { dir: "crochet-photos", prefix: "cr-", names: [] },
  currency: "SAR",
  shippingCents: 0,
  freeShippingOverCents: null,
  categories: [],
  products: [],
  flashSale: { title: "Weekend offers", titles: { ar: "عروض نهاية الأسبوع", tr: "Hafta sonu fırsatları" }, percent: 20, hours: 30, limit: 20, sold: 9, skus: [] },
  coupon: { code: "CROCHET10", percent: 10, minOrderCents: 0 },
  commerce: {},
};
