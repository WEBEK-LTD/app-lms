import type { CmLang } from "./words";

/**
 * 233 The academy's buying words, on the website only: the admin sets each
 * course's price, and members buy on the website through Yallapp's
 * checkout. Kept here, apart from every other word, so the "no payments"
 * guard (tests/unit/community-site.test.ts) can allow exactly the academy's
 * checkout and nothing else. The app never shows a price or a buy button.
 */
const en = {
  buyCourse: "Buy for {price}",
  signInToBuy: "Log in to buy",
  coursePrice: "Price",
  courseLocked: "Buy the course to open this lesson.",
};

export type AcademyWords = typeof en;

const ar: AcademyWords = {
  buyCourse: "اشترِ بـ {price}",
  signInToBuy: "سجّل الدخول للشراء",
  coursePrice: "السعر",
  courseLocked: "اشترِ الدورة لفتح هذا الدرس.",
};

const tr: AcademyWords = {
  buyCourse: "{price} karşılığında al",
  signInToBuy: "Satın almak için giriş yap",
  coursePrice: "Fiyat",
  courseLocked: "Bu dersi açmak için kursu satın al.",
};

export const ACADEMY_WORDS: Record<CmLang, AcademyWords> = { en, ar, tr };
