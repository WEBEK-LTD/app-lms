/** 175 What Studio's samples need of the shop (lib/studio/shop-sample.ts), for the browser. */
export interface ShopSample {
  currency: string;
  /** E£ to the shop's currency at the day's rate; null without one (the numbers kept). */
  rate: number | null;
  country: { en: string; ar: string; tr: string } | null;
  city: { en: string; ar: string; tr: string } | null;
  /** Tomorrow in the shop's time zone, YYYY-MM-DD. */
  tomorrow: string;
}
