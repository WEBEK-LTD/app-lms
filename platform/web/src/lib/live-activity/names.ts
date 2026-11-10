/**
 * How a person is named on the website's live activity card: their first
 * name and the initial of their last name ("Ahmed M.", "أحمد م."), never
 * the full last name. Anything that doesn't look like a name (an email, a
 * number, a company's "Ltd") gives no name, and then no card.
 */

/** One word of letters, with the marks, apostrophes and hyphens names have ("O'Neil", "Jean-Luc", "عبدالله"). */
const NAME_WORD = /^\p{L}[\p{L}\p{M}'’-]*$/u;
const FIRST_NAME_MAX = 20;

/** The first name as typed (its first word), or null when it isn't one. */
export function cleanFirstName(value: string | null | undefined): string | null {
  const word = (value ?? "").trim().split(/\s+/)[0] ?? "";
  if (!word || word.length > FIRST_NAME_MAX || !NAME_WORD.test(word)) return null;
  return word;
}

/** The last name's initial, upper case ("m" → "M"), or null. */
export function initialOf(value: string | null | undefined): string | null {
  const first = [...(value ?? "").trim()][0];
  return first && /\p{L}/u.test(first) ? first.toLocaleUpperCase() : null;
}

/** A first name and a last name's initial: "Ahmed M."; the first name alone without an initial; null without a first name. */
export function maskedName(firstName: string | null | undefined, lastInitial: string | null | undefined): string | null {
  const first = cleanFirstName(firstName);
  if (!first) return null;
  const initial = initialOf(lastInitial);
  return initial ? `${first} ${initial}.` : first;
}

/**
 * A full name as an account holds it ("Ahmed Mahmoud Saleh"): the first
 * word, and the last word's initial. Null when the first word isn't a name.
 */
export function maskFullName(name: string | null | undefined): string | null {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const last = words.length > 1 ? words[words.length - 1]! : null;
  // A last word that isn't a name ("Ltd.", "2") gives no initial.
  return maskedName(words[0], last && NAME_WORD.test(last) ? last : null);
}
