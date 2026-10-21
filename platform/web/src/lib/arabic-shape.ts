/**
 * 55, 62 Arabic text for the share images (components/og-image.tsx). The
 * image renderer draws text left to right, one glyph after another, and
 * doesn't run the bidirectional algorithm, so Arabic would come out in the
 * wrong order with its letters apart. Here a line is prepared the way a text
 * engine would before drawing it:
 *
 * 1. Shaping: each Arabic letter takes its contextual form (Unicode Arabic
 *    Presentation Forms, which IBM Plex Sans Arabic has) by the Unicode
 *    joining types: dual-joining letters join on both sides, right-joining
 *    ones (alef, dal, reh, waw…) only to the letter before them; marks
 *    (harakat, shadda, superscript alef, Quranic signs) are transparent, so a
 *    letter joins across them and they stay with it; tatweel and ZWJ cause
 *    joining, ZWNJ stops it; lam with an alef is one ligature. The Persian and
 *    Urdu letters (پ چ ژ ک گ ی) and alef wasla are shaped too.
 * 2. Order: the Unicode Bidirectional Algorithm for a right-to-left paragraph
 *    without embeddings (rules W1–W7, N1–N2, I1–I2, L2–L4): Latin words and
 *    numbers (1,000, 3.5, 50%, Arabic-Indic digits) keep reading left to
 *    right inside the Arabic, brackets are mirrored, and a mark comes just
 *    before its letter (L3): the renderer draws a zero-width mark over the
 *    glyph that follows it.
 *
 * `rtlWords` gives a line as units for a right-to-left row that can wrap
 * (first unit = rightmost); `visualLine` the whole line as drawn left to right.
 */

/** isolated, final, initial, medial; right-joining letters have no initial or medial form. */
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
  // Alef wasla, and the Persian and Urdu letters (Arabic Presentation Forms-A).
  "ٱ": [0xfb50, 0xfb51],
  "پ": [0xfb56, 0xfb57, 0xfb58, 0xfb59],
  "چ": [0xfb7a, 0xfb7b, 0xfb7c, 0xfb7d],
  "ژ": [0xfb8a, 0xfb8b],
  "ک": [0xfb8e, 0xfb8f, 0xfb90, 0xfb91],
  "گ": [0xfb92, 0xfb93, 0xfb94, 0xfb95],
  "ی": [0xfbfc, 0xfbfd, 0xfbfe, 0xfbff],
};

/** Lam followed by an alef: one ligature (isolated, final). */
const LAM_ALEF: Record<string, [number, number]> = {
  "آ": [0xfef5, 0xfef6],
  "أ": [0xfef7, 0xfef8],
  "إ": [0xfef9, 0xfefa],
  "ا": [0xfefb, 0xfefc],
};

const TATWEEL = "ـ";
const ZWJ = "‍";
const ZWNJ = "‌";

/** Arabic marks: transparent for joining, kept with their letter (bidi class NSM). */
const MARK = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭ̀-ͯ︠-︯]/;
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

type Joining = "D" | "R" | "U" | "C" | "T";

function joiningOf(c: string | undefined): Joining {
  if (c === undefined) return "U";
  if (MARK.test(c)) return "T";
  if (c === TATWEEL || c === ZWJ) return "C";
  const forms = FORMS[c];
  if (!forms || c === "ء") return "U";
  return forms[2] !== undefined ? "D" : "R";
}

/** The next character that isn't a mark, from `i` on. */
function nextBase(chars: string[], i: number): number {
  let j = i;
  while (j < chars.length && MARK.test(chars[j]!)) j++;
  return j;
}

/** Whether the letter before `i` (skipping marks) joins forward to it. */
function joinsBefore(chars: string[], i: number): boolean {
  let j = i - 1;
  while (j >= 0 && MARK.test(chars[j]!)) j--;
  const type = joiningOf(chars[j]);
  return type === "D" || type === "C";
}

/** A text with its Arabic letters in their contextual forms, still in reading order. ZWJ and ZWNJ do their work and go. */
export function shapeArabic(text: string): string {
  const chars = [...text.normalize("NFC")];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    if (c === ZWJ || c === ZWNJ) continue;
    const forms = FORMS[c];
    if (!forms) {
      out += c;
      continue;
    }
    const joinPrev = c !== "ء" && joinsBefore(chars, i);
    const n = nextBase(chars, i + 1);
    const next = chars[n];
    if (c === "ل" && next && LAM_ALEF[next]) {
      // Marks on the lam (and on the alef) follow the ligature.
      out += String.fromCodePoint(LAM_ALEF[next]![joinPrev ? 1 : 0]);
      out += chars.slice(i + 1, n).join("");
      i = n;
      continue;
    }
    const nextType = joiningOf(next);
    const joinNext = joiningOf(c) === "D" && (nextType === "D" || nextType === "R" || nextType === "C");
    const code = joinPrev && joinNext ? forms[3]! : joinPrev ? forms[1] : joinNext ? forms[2]! : forms[0];
    out += String.fromCodePoint(code);
  }
  return out;
}

// --- The bidirectional algorithm, for a paragraph without embeddings (71: left-to-right paragraphs too).

type BidiClass = "L" | "R" | "AL" | "EN" | "ES" | "ET" | "AN" | "CS" | "NSM" | "WS" | "ON";

const ARABIC_DIGIT = /[٠-٩٫٬]/;
const EUROPEAN_DIGIT = /[0-9۰-۹]/;

function classOf(c: string): BidiClass {
  if (MARK.test(c)) return "NSM";
  if (ARABIC_DIGIT.test(c)) return "AN";
  if (EUROPEAN_DIGIT.test(c)) return "EN";
  if (c === "،") return "CS";
  if (c === "٪") return "ET";
  if (ARABIC.test(c) || c === TATWEEL) return "AL";
  if (/[֐-׿יִ-ﭏ]/.test(c)) return "R";
  if (/\s/.test(c)) return "WS";
  if (c === "+" || c === "-" || c === "−") return "ES";
  if (/[#$%°¢£¤¥₺€₹‰‱‰-‴₠-⃏]/.test(c)) return "ET";
  if (/[,.:/ ]/.test(c)) return "CS";
  if (/\p{L}|\p{M}/u.test(c)) return "L";
  return "ON";
}

const MIRROR: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<", "«": "»", "»": "«", "‹": "›", "›": "‹" };

/**
 * Bidi levels of a paragraph's characters. Right to left (`e` "R"): 1 for
 * right to left, 2 for left to right (Latin, numbers). 71 Left to right
 * (`e` "L"): 0 for left to right, 1 for right to left, 2 for numbers inside
 * right-to-left text.
 */
function levelsOf(chars: string[], e: "L" | "R" = "R", forcedL: boolean[] = []): number[] {
  const types = chars.map((c, i) => (forcedL[i] ? "L" : classOf(c)));
  const n = types.length;
  // W1: a mark takes the type of what it's on (the paragraph's direction at the start).
  for (let i = 0; i < n; i++) if (types[i] === "NSM") types[i] = i === 0 ? e : types[i - 1]!;
  // W2, W3: a European number after Arabic letters is an Arabic number; AL is R.
  let strong: BidiClass = e;
  for (let i = 0; i < n; i++) {
    const t = types[i]!;
    if (t === "L" || t === "R" || t === "AL") strong = t;
    else if (t === "EN" && strong === "AL") types[i] = "AN";
  }
  for (let i = 0; i < n; i++) if (types[i] === "AL") types[i] = "R";
  // W4: one separator between two numbers of a kind joins them ("1,000", "3.5").
  for (let i = 1; i < n - 1; i++) {
    const [a, t, b] = [types[i - 1], types[i], types[i + 1]];
    if (t === "ES" && a === "EN" && b === "EN") types[i] = "EN";
    else if (t === "CS" && a === b && (a === "EN" || a === "AN")) types[i] = a!;
  }
  // W5: currency and percent signs next to a European number belong to it.
  for (let i = 0; i < n; i++) {
    if (types[i] !== "ET") continue;
    let j = i;
    while (j < n && types[j] === "ET") j++;
    if ((i > 0 && types[i - 1] === "EN") || (j < n && types[j] === "EN")) for (let k = i; k < j; k++) types[k] = "EN";
    i = j - 1;
  }
  // W6: other separators and terminators are neutral.
  for (let i = 0; i < n; i++) if (types[i] === "ES" || types[i] === "ET" || types[i] === "CS") types[i] = "ON";
  // W7: a European number after Latin text reads as Latin.
  strong = e;
  for (let i = 0; i < n; i++) {
    const t = types[i]!;
    if (t === "L" || t === "R") strong = t;
    else if (t === "EN" && strong === "L") types[i] = "L";
  }
  const direction = (t: BidiClass): "L" | "R" | null => (t === "L" ? "L" : t === "R" || t === "EN" || t === "AN" ? "R" : null);
  // N0: a pair of brackets takes the paragraph's direction when it holds text in that direction, else the direction around it.
  const open: { at: number; close: string }[] = [];
  const pairs: [number, number][] = [];
  const CLOSE: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  for (let i = 0; i < n; i++) {
    if (types[i] !== "ON") continue;
    const c = chars[i]!;
    if (CLOSE[c]) open.push({ at: i, close: CLOSE[c]! });
    else if (c === ")" || c === "]" || c === "}") {
      const k = open.map((o) => o.close).lastIndexOf(c);
      if (k >= 0) {
        pairs.push([open[k]!.at, i]);
        open.length = k;
      }
    }
  }
  for (const [from, to] of pairs.sort((x, y) => x[0] - y[0])) {
    const inside = types.slice(from + 1, to).map(direction);
    const other = e === "R" ? "L" : "R";
    let resolved: "L" | "R" | null = null;
    if (inside.includes(e)) resolved = e;
    else if (inside.includes(other)) {
      let j = from - 1;
      while (j >= 0 && direction(types[j]!) === null) j--;
      resolved = j < 0 ? e : direction(types[j]!)!;
    }
    if (resolved) types[from] = types[to] = resolved;
  }
  // N1, N2: neutrals between two of the same direction (numbers count as right to left) take it; others the paragraph's.
  for (let i = 0; i < n; i++) {
    if (direction(types[i]!) !== null) continue;
    let j = i;
    while (j < n && direction(types[j]!) === null) j++;
    const before = i === 0 ? e : direction(types[i - 1]!);
    const after = j === n ? e : direction(types[j]!);
    const resolved: BidiClass = before === after ? before! : e;
    for (let k = i; k < j; k++) types[k] = resolved;
    i = j - 1;
  }
  // I1, I2 on an odd (right-to-left) paragraph level, or 71 an even one.
  if (e === "L") return types.map((t) => (t === "L" ? 0 : t === "R" ? 1 : 2));
  return types.map((t) => (t === "R" ? 1 : 2));
}

/** Characters with their marks after them, as units that move together. */
function clusters(chars: string[], levels: number[]): { text: string; level: number }[] {
  const out: { text: string; level: number }[] = [];
  chars.forEach((c, i) => {
    const last = out[out.length - 1];
    if (last && MARK.test(c)) last.text += c;
    else out.push({ text: c, level: levels[i]! });
  });
  return out;
}

/** The line's units (a letter with its marks) in visual order, left to right, with their levels. */
function visualUnits(text: string): { text: string; level: number }[] {
  const chars = [...shapeArabic(text)];
  const units = clusters(chars, levelsOf(chars));
  // L4: mirrored brackets in right-to-left runs.
  for (const unit of units) if (unit.level === 1 && MIRROR[unit.text]) unit.text = MIRROR[unit.text]!;
  // L2: from the highest level down, reverse each run at that level or higher.
  for (const level of [2, 1]) {
    for (let i = 0; i < units.length; i++) {
      if (units[i]!.level < level) continue;
      let j = i;
      while (j < units.length && units[j]!.level >= level) j++;
      units.splice(i, j - i, ...units.slice(i, j).reverse());
      i = j - 1;
    }
  }
  // L3: the renderer draws a zero-width mark over the glyph that comes after it, so in right-to-left runs a letter's marks go just before it.
  for (const unit of units) {
    if (unit.level !== 1 || unit.text.length < 2) continue;
    const [base, ...marks] = [...unit.text];
    unit.text = marks.join("") + base;
  }
  return units;
}

const isRtl = (text: string) => [...text].some((c) => ARABIC.test(c) || classOf(c) === "R");

/** A line as drawn left to right: Arabic shaped and in visual order, Latin and numbers reading left to right, brackets mirrored. */
export function visualLine(text: string): string {
  if (!isRtl(text)) return text;
  return visualUnits(text)
    .map((u) => u.text)
    .join("");
}

/** One word as drawn left to right. */
export function visualWord(word: string): string {
  return visualLine(word);
}

/**
 * A line of Arabic as the units of a right-to-left row that can wrap
 * (first unit first, drawn rightmost): the line in visual order, cut at the
 * spaces between right-to-left words, so each Arabic word stands alone while
 * Latin words and numbers next to each other stay together in their own
 * order ("Google Play", "Android (APK").
 */
export function rtlWords(text: string): string[] {
  const line = text.split(/\s+/).filter(Boolean).join(" ");
  if (!line) return [];
  if (!isRtl(line)) return [line];
  const words: string[] = [];
  let current = "";
  for (const unit of visualUnits(line)) {
    if (unit.level === 1 && /^\s$/.test(unit.text)) {
      if (current) words.push(current);
      current = "";
    } else current += unit.text;
  }
  if (current) words.push(current);
  return words.reverse();
}

export function hasArabic(text: string): boolean {
  return ARABIC.test(text);
}

/** 71 A stretch of a line in one direction: its text in reading order, drawn right to left when `rtl`. */
export interface BidiRun {
  text: string;
  rtl: boolean;
}

/**
 * 71 A line as runs in visual order, left to right, for a renderer that
 * shapes each run itself (the receipts' PDF, lib/receipts/pdf.ts: its font
 * engine joins the letters with the font's own forms and lays a
 * right-to-left run out from its end). Each run keeps its text in reading
 * order and unshaped; the line's direction (`base`) decides where neutral
 * characters go. The rules are `visualLine`'s (W1–W7, N0–N2, I1–I2, L2).
 * Text between LRI and PDI (`ltrSpan`: a phone number, an email, an amount)
 * reads left to right as one piece, its spaces and signs included; the marks
 * themselves aren't drawn.
 */
export function bidiRuns(text: string, base: "rtl" | "ltr"): BidiRun[] {
  const chars: string[] = [];
  const forced: boolean[] = [];
  let depth = 0;
  for (const c of text.normalize("NFC")) {
    if (c === LRI) depth++;
    else if (c === PDI) depth = Math.max(0, depth - 1);
    else {
      chars.push(c);
      forced.push(depth > 0);
    }
  }
  if (!chars.length) return [];
  const levels = levelsOf(chars, base === "rtl" ? "R" : "L", forced);
  const runs: { text: string; level: number }[] = [];
  chars.forEach((c, i) => {
    const last = runs[runs.length - 1];
    // A mark stays with its letter.
    const level = last && MARK.test(c) ? last.level : levels[i]!;
    if (last && last.level === level) last.text += c;
    else runs.push({ text: c, level });
  });
  // L2: from the highest level down to 1, reverse each sequence of runs at that level or higher.
  for (let level = Math.max(...runs.map((r) => r.level)); level >= 1; level--) {
    for (let i = 0; i < runs.length; i++) {
      if (runs[i]!.level < level) continue;
      let j = i;
      while (j < runs.length && runs[j]!.level >= level) j++;
      runs.splice(i, j - i, ...runs.slice(i, j).reverse());
      i = j - 1;
    }
  }
  return runs.map((r) => ({ text: r.text, rtl: r.level % 2 === 1 }));
}

const LRI = "\u2066";
const PDI = "\u2069";

/** 71 Text that reads left to right as one piece inside a line of either direction (`bidiRuns`). */
export function ltrSpan(text: string): string {
  return `${LRI}${text}${PDI}`;
}

/** 71 A character as drawn in a right-to-left run: "(" is drawn ")". */
export function mirrored(c: string): string {
  return MIRROR[c] ?? c;
}
