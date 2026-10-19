import { createHash } from "node:crypto";
import { PAGE_TEXTS_AR, SERVER_MESSAGES_AR } from "./ar";
import { PAGE_TEXTS_TR, SERVER_MESSAGES_TR } from "./tr";

/**
 * 43 Yallapp's own translations of the texts it writes in English, in the
 * languages it ships (Arabic and Turkish; the app's interface strings are
 * in the app itself, mobile/lib/l10n). Page texts (default tabs, page
 * titles, home blocks, the designs' sample texts, what a new block starts
 * with) are filled into a served layout where the owner hasn't written
 * their own translation (lib/pages/builtin.ts); the hosted API's messages
 * are answered in the asked language. Keys are the English texts exactly:
 * a text the owner changed is theirs, and isn't translated.
 */

interface Dictionary {
  exact: Map<string, string>;
  /** Keys with placeholders (`{app}`, `{0}`), as patterns. */
  patterns: { regex: RegExp; names: string[]; translation: string }[];
}

const PLACEHOLDER = /\{([a-z0-9_]+)\}/g;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compile(entries: Record<string, string>): Dictionary {
  const exact = new Map<string, string>();
  const patterns: Dictionary["patterns"] = [];
  for (const [key, translation] of Object.entries(entries)) {
    exact.set(key, translation);
    const names = [...key.matchAll(PLACEHOLDER)].map((m) => m[1]!);
    if (!names.length) continue;
    const source = key
      .split(PLACEHOLDER)
      .map((part, i) => (i % 2 === 1 ? "(.+?)" : escapeRegex(part)))
      .join("");
    patterns.push({ regex: new RegExp(`^${source}$`, "s"), names, translation });
  }
  return { exact, patterns };
}

const PAGE_TEXTS: Record<string, Dictionary> = { ar: compile(PAGE_TEXTS_AR), tr: compile(PAGE_TEXTS_TR) };
const SERVER_MESSAGES: Record<string, Dictionary> = { ar: compile(SERVER_MESSAGES_AR), tr: compile(SERVER_MESSAGES_TR) };

/** Languages with Yallapp's translations of its page texts and messages. */
export const DICTIONARY_LANGUAGES = Object.keys(PAGE_TEXTS);

/** Changes whenever a translation does: served layouts carry it in their version, so apps fetch the new texts. */
export const DICTIONARY_VERSION = createHash("sha256")
  .update(JSON.stringify([PAGE_TEXTS_AR, PAGE_TEXTS_TR, SERVER_MESSAGES_AR, SERVER_MESSAGES_TR]))
  .digest("hex")
  .slice(0, 8);

function lookup(dictionaries: Record<string, Dictionary>, text: string, lang: string): string | null {
  const dictionary = dictionaries[lang];
  if (!dictionary || !text) return null;
  const found = dictionary.exact.get(text);
  if (found !== undefined) return found;
  for (const { regex, names, translation } of dictionary.patterns) {
    const match = regex.exec(text);
    if (!match) continue;
    let out = translation;
    names.forEach((name, i) => {
      let value = match[i + 1] ?? "";
      // An app without a name yet is "our app", in the language too.
      if (name === "app" && value === "our app") value = dictionary.exact.get("our app") ?? value;
      out = out.replaceAll(`{${name}}`, value);
    });
    return out;
  }
  return null;
}

/** Yallapp's translation of a page text it wrote, or null (the owner's own text, or a language without them). */
export function builtInText(text: string, lang: string): string | null {
  return lookup(PAGE_TEXTS, text, lang);
}

/** The hosted API's message in the language, or null to keep it in English. */
export function serverMessage(text: string, lang: string): string | null {
  return lookup(SERVER_MESSAGES, text, lang);
}

/** The language an app asks in (`Accept-Language`: the app sends the one in use), as a code: "ar" for "ar-EG". */
export function requestLanguage(acceptLanguage: string | null | undefined): string | null {
  const first = (acceptLanguage ?? "").split(",")[0]?.split(";")[0]?.trim().toLowerCase() ?? "";
  const code = first.split(/[-_]/)[0] ?? "";
  return /^[a-z]{2,3}$/.test(code) ? code : null;
}

/** An error body (`{ code, message }`) with its message in `lang` when Yallapp has it. */
export function localizedError<T>(body: T, lang: string | null): T {
  if (!lang || !body || typeof body !== "object" || Array.isArray(body)) return body;
  const message = (body as Record<string, unknown>).message;
  if (typeof message !== "string") return body;
  const translated = serverMessage(message, lang);
  return translated === null ? body : { ...body, message: translated };
}

/** Whether Yallapp wrote this text (it has a translation in every language it ships). */
export function isYallappText(text: string): boolean {
  return DICTIONARY_LANGUAGES.every((lang) => builtInText(text, lang) !== null);
}
