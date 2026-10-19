/**
 * 55 Arabic text for the share images (components/og-image.tsx). The image
 * renderer draws text left to right and measures letters in their isolated
 * form, so Arabic comes out in the wrong word order with gaps. Here each
 * Arabic word is written with the letters' contextual forms (Unicode Arabic
 * Presentation Forms-B, which IBM Plex Sans Arabic has) in visual order, and
 * a line is a list of words for a right-to-left row. Modern Standard Arabic
 * letters only; marks (harakat) are dropped.
 */

/** isolated, final, initial, medial; letters that don't join forward have no initial or medial form. */
const FORMS: Record<string, [number, number, number?, number?]> = {
  "ء": [0xfe80, 0xfe80],
  "آ": [0xfe81, 0xfe82],
  "أ": [0xfe83, 0xfe84],
  "ؤ": [0xfe85, 0xfe86],
  "إ": [0xfe87, 0xfe88],
  "ئ": [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c],
  "ا": [0xfe8d, 0xfe8e],
  "ب": [0xfe8f, 0xfe90, 0xfe91, 0xfe92],
  "ة": [0xfe93, 0xfe94],
  "ت": [0xfe95, 0xfe96, 0xfe97, 0xfe98],
  "ث": [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c],
  "ج": [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0],
  "ح": [0xfea1, 0xfea2, 0xfea3, 0xfea4],
  "خ": [0xfea5, 0xfea6, 0xfea7, 0xfea8],
  "د": [0xfea9, 0xfeaa],
  "ذ": [0xfeab, 0xfeac],
  "ر": [0xfead, 0xfeae],
  "ز": [0xfeaf, 0xfeb0],
  "س": [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4],
  "ش": [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8],
  "ص": [0xfeb9, 0xfeba, 0xfebb, 0xfebc],
  "ض": [0xfebd, 0xfebe, 0xfebf, 0xfec0],
  "ط": [0xfec1, 0xfec2, 0xfec3, 0xfec4],
  "ظ": [0xfec5, 0xfec6, 0xfec7, 0xfec8],
  "ع": [0xfec9, 0xfeca, 0xfecb, 0xfecc],
  "غ": [0xfecd, 0xfece, 0xfecf, 0xfed0],
  "ف": [0xfed1, 0xfed2, 0xfed3, 0xfed4],
  "ق": [0xfed5, 0xfed6, 0xfed7, 0xfed8],
  "ك": [0xfed9, 0xfeda, 0xfedb, 0xfedc],
  "ل": [0xfedd, 0xfede, 0xfedf, 0xfee0],
  "م": [0xfee1, 0xfee2, 0xfee3, 0xfee4],
  "ن": [0xfee5, 0xfee6, 0xfee7, 0xfee8],
  "ه": [0xfee9, 0xfeea, 0xfeeb, 0xfeec],
  "و": [0xfeed, 0xfeee],
  "ى": [0xfeef, 0xfef0],
  "ي": [0xfef1, 0xfef2, 0xfef3, 0xfef4],
};

/** Lam followed by an alef: one ligature (isolated, final). */
const LAM_ALEF: Record<string, [number, number]> = {
  "آ": [0xfef5, 0xfef6],
  "أ": [0xfef7, 0xfef8],
  "إ": [0xfef9, 0xfefa],
  "ا": [0xfefb, 0xfefc],
};

const MARKS = /[ً-ٰٟـ]/g;
const ARABIC = /[؀-ۿ]/;

const joinsForward = (c: string | undefined) => c !== undefined && FORMS[c]?.[2] !== undefined;
const isLetter = (c: string | undefined) => c !== undefined && FORMS[c] !== undefined;

/** An Arabic run in its contextual forms, still in reading order. */
function shapeRun(text: string): string {
  const chars = [...text.replace(MARKS, "")];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    const forms = FORMS[c];
    if (!forms) {
      out += c;
      continue;
    }
    const joinPrev = joinsForward(chars[i - 1]) && c !== "ء";
    const next = chars[i + 1];
    if (c === "ل" && next && LAM_ALEF[next]) {
      out += String.fromCodePoint(LAM_ALEF[next]![joinPrev ? 1 : 0]);
      i++;
      continue;
    }
    // Hamza on the line (ء) joins nothing.
    const joinNext = forms[2] !== undefined && isLetter(next) && next !== "ء";
    const code = joinPrev && joinNext ? forms[3]! : joinPrev ? forms[1] : joinNext ? forms[2]! : forms[0];
    out += String.fromCodePoint(code);
  }
  return out;
}

const MIRROR: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "«": "»", "»": "«" };

/** One word as drawn left to right: Arabic letters shaped and reversed, Latin and digits kept in order. */
export function visualWord(word: string): string {
  if (!ARABIC.test(word)) return word;
  const runs = word.match(/[؀-ۿ]+|[^؀-ۿ]+/g) ?? [];
  return runs
    .reverse()
    .map((run) => (ARABIC.test(run) ? [...shapeRun(run)].reverse().join("") : /^[\p{P}\s]+$/u.test(run) ? [...run].reverse().map((c) => MIRROR[c] ?? c).join("") : run))
    .join("");
}

/**
 * A line of Arabic as the words of a right-to-left row (first word first):
 * Arabic words shaped, and Latin words next to each other kept together in
 * their own order ("Google Play").
 */
export function rtlWords(text: string): string[] {
  const words: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = words[words.length - 1];
    if (last !== undefined && !ARABIC.test(word) && !ARABIC.test(last)) words[words.length - 1] = `${last} ${word}`;
    else words.push(word);
  }
  return words.map(visualWord);
}

export function hasArabic(text: string): boolean {
  return ARABIC.test(text);
}
