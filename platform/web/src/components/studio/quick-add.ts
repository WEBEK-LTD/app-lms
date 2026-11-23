/**
 * 193 The app's Add to cart under each product's card on Leqaa's looks (the
 * gift checkout): its words as the app's own (`addToCart` in
 * mobile/lib/l10n), for Studio's canvas in the layout's language.
 */
export const QUICK_ADD_WORDS: Readonly<Record<"en" | "ar" | "tr", string>> = {
  en: "Add to cart",
  ar: "أضف إلى السلة",
  tr: "Sepete ekle",
};

export function quickAddLabel(lang: string): string {
  return QUICK_ADD_WORDS[lang as keyof typeof QUICK_ADD_WORDS] ?? QUICK_ADD_WORDS.en;
}

/** Whether the app draws Add to cart under its product cards: a store on the gift checkout. */
export function quickAddOn(type: string, checkout: { look?: string | null; mode?: string | null } | null | undefined): boolean {
  return type === "store" && (checkout?.mode === "gift" || checkout?.look === "gift");
}
