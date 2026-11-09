/**
 * The app-builder bot's text normalisation (no AI: plain rules). Both the
 * dictionary's phrases and what the owner types go through it, so they meet
 * in one spelling:
 *
 * - Arabic: diacritics and tatweel removed; أ إ آ ٱ → ا, ة → ه, ى → ي,
 *   ؤ → و, ئ → ي; Persian and dialect letters (ی ک گ چ پ ڤ) to their usual
 *   Arabic letters; Arabic-Indic digits to 0-9.
 * - Turkish: ı İ → i, ş → s, ğ → g, ç → c, ö → o, ü → u (and other Latin
 *   accents: é → e).
 * - Any language: lower case, punctuation as spaces, a letter typed three
 *   times or more kept once ("yesss", "تمااام").
 *
 * `tokenVariants` adds what a word can be without its Arabic clitics (ال،
 * وال، بال، لل، و، ب) and short endings (ي، ه، ها، ات، ين…), or an English or
 * Turkish word without its plural; the matcher compares those too.
 */

const LETTERS: Record<string, string> = {
  "ٱ": "ا", // ٱ
  "ة": "ه", // ة → ه
  "ى": "ي", // ى → ي
  "ی": "ي", // ی (Persian yeh) → ي
  "ے": "ي", // ے
  "ک": "ك", // ک (keheh) → ك
  "گ": "ك", // گ (Iraqi g) → ك
  "چ": "ج", // چ → ج
  "پ": "ب", // پ → ب
  "ڤ": "ف", // ڤ → ف
  "ڢ": "ف", // ڢ (Maghrebi feh) → ف
  "ڧ": "ق", // ڧ (Maghrebi qaf) → ق
  "ı": "i", // ı
  "ß": "ss",
  "ـ": "", // tatweel
};

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

function digit(c: string): string {
  const code = c.charCodeAt(0);
  return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
}

/** One spelling for comparing: see the module's comment. */
export function normalizeText(text: string): string {
  let s = text.normalize("NFKC").replace(/İ/g, "i").toLowerCase();
  // Decomposed, the hamza and madda over alef, waw and yeh, the Arabic
  // diacritics and the Latin accents are marks, which go.
  s = s.normalize("NFD").replace(/\p{M}/gu, "");
  s = s.replace(/[ٱةىیےکگچپڤڢڧıßـ]/g, (c) => LETTERS[c] ?? c);
  s = s.replace(ARABIC_DIGITS, digit);
  // The standalone hamza is often left out: "شيء" and "شي" alike.
  s = s.replace(/ء/g, "");
  s = s.replace(/[^\p{L}\p{N}]+/gu, " ");
  // "yesss", "تماااام": a letter typed three times or more counts once.
  s = s.replace(/(\p{L})\1{2,}/gu, "$1");
  return s.trim().replace(/\s+/g, " ");
}

/** The words of a normalised text. */
export function tokensOf(normalized: string): string[] {
  return normalized ? normalized.split(" ") : [];
}

export function isArabicWord(token: string): boolean {
  return /[؀-ۿ]/.test(token);
}

/** Clitics at the start of an Arabic word, longest first; what is left must keep two letters (three after a single letter). */
const AR_PREFIXES = ["وال", "بال", "فال", "كال", "لل", "ال", "و", "ب", "ف", "ل"];
/** Short endings: my/his/her/our, plurals. What is left keeps three letters. */
const AR_SUFFIXES = ["ات", "ين", "ون", "ها", "نا", "كم", "ي", "ه", "ك"];
/** English and Turkish plural endings. */
const LATIN_SUFFIXES = ["es", "s", "ler", "lar"];

function withoutPrefixes(token: string): string[] {
  const out: string[] = [];
  for (const prefix of AR_PREFIXES) {
    if (!token.startsWith(prefix)) continue;
    const rest = token.slice(prefix.length);
    if (rest.length >= (prefix.length === 1 ? 3 : 2)) out.push(rest);
  }
  // و + ال: "والمطعم" was taken above; "وبال" etc. are rare enough.
  return out;
}

/**
 * The forms a word is compared in: itself, then without its Arabic clitics
 * and endings, or without an English or Turkish plural. The word itself is
 * always first.
 */
export function tokenVariants(token: string): string[] {
  const out = new Set<string>([token]);
  if (isArabicWord(token)) {
    const stems = [token, ...withoutPrefixes(token)];
    for (const stem of [...stems, ...stems.flatMap(withoutPrefixes)]) {
      out.add(stem);
      for (const suffix of AR_SUFFIXES) {
        if (stem.endsWith(suffix) && stem.length - suffix.length >= 3) out.add(stem.slice(0, -suffix.length));
      }
    }
  } else {
    for (const suffix of LATIN_SUFFIXES) {
      if (token.endsWith(suffix) && token.length - suffix.length >= 3) out.add(token.slice(0, -suffix.length));
    }
  }
  return [...out];
}

/**
 * The optimal string alignment distance (Damerau–Levenshtein without
 * repeated edits): a letter added, left out, changed, or two swapped.
 * Stops early past `max`.
 */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) rows.push(new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) rows[i]![0] = i;
  for (let j = 0; j <= b.length; j++) rows[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(rows[i - 1]![j]! + 1, rows[i]![j - 1]! + 1, rows[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, rows[i - 2]![j - 2]! + 1);
      rows[i]![j] = d;
      if (d < best) best = d;
    }
    if (best > max) return max + 1;
  }
  return rows[a.length]![b.length]!;
}

/** The typos a word of this length may have: none up to three letters, one up to six, two from seven. */
export function typosAllowed(length: number): number {
  return length >= 7 ? 2 : length >= 4 ? 1 : 0;
}
