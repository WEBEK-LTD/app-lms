/**
 * 210 A shop type's words for its looks, pages and ready sections, in its
 * own file (lib/studio/app-words.ts spreads them in): English, then Modern
 * Standard Arabic and Turkish with the same keys. `{app}` is the app's name;
 * the owner's words are in [brackets].
 */
export function typeWords<const E extends Record<string, string>>(words: { en: E; ar: Record<keyof E, string>; tr: Record<keyof E, string> }) {
  return words;
}
