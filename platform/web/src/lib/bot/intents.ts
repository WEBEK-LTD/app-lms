import { KINDS } from "../app/kinds";
import { LOCALES } from "../i18n/locales";

/**
 * The app-builder bot's intents: what an answer can mean. The
 * dictionary (seed.ts, and the phrases the team adds in the admin) gives
 * each intent the words people use for it, and the matcher (match.ts) finds
 * them in what the owner types. Each question of the bot only listens for
 * its own intents (`STEP_INTENTS`).
 */

/** The bot's questions, in order. */
export const BOT_STEPS = ["kind", "name", "colour", "logo", "languages", "features", "website"] as const;
export type BotStep = (typeof BOT_STEPS)[number];
/** The questions whose typed answers go through the dictionary (a name or an address never does). */
export const MATCHED_STEPS = ["kind", "colour", "logo", "languages", "features", "website"] as const satisfies readonly BotStep[];
export type MatchedStep = (typeof MATCHED_STEPS)[number];

export function isMatchedStep(value: unknown): value is MatchedStep {
  return typeof value === "string" && (MATCHED_STEPS as readonly string[]).includes(value);
}

/**
 * The dictionary's languages: English, Turkish, Modern Standard Arabic and
 * the Arabic dialects, and `other` for language names in their own script.
 */
export const PHRASE_LANGS = ["en", "tr", "ar", "ar-eg", "ar-gulf", "ar-lev", "ar-iq", "ar-maghreb", "ar-sd", "other"] as const;
export type PhraseLang = (typeof PHRASE_LANGS)[number];
export type ArabicTag = Extract<PhraseLang, `ar${string}`>;
/** The Arabic tags, MSA first: a tie in telling the dialect goes to the earlier one. */
export const ARABIC_TAGS: readonly ArabicTag[] = ["ar", "ar-eg", "ar-gulf", "ar-lev", "ar-iq", "ar-maghreb", "ar-sd"];

export const PHRASE_LANG_LABEL: Record<PhraseLang, string> = {
  en: "English",
  tr: "Turkish",
  ar: "Arabic (Modern Standard)",
  "ar-eg": "Arabic: Egyptian",
  "ar-gulf": "Arabic: Gulf / Saudi",
  "ar-lev": "Arabic: Levantine",
  "ar-iq": "Arabic: Iraqi",
  "ar-maghreb": "Arabic: Maghrebi (Moroccan, Algerian, Tunisian)",
  "ar-sd": "Arabic: Sudanese",
  other: "Language names in their own script",
};

export function isPhraseLang(value: unknown): value is PhraseLang {
  return typeof value === "string" && (PHRASE_LANGS as readonly string[]).includes(value);
}

/** Kinds of business: every kind of app (lib/app/kinds.ts), and a university (a school in university mode). */
export const KIND_INTENTS = [...KINDS.map((k) => `kind.${k.id}`), "kind.university"] as const;

/** What a kind intent makes: the kind, and for a university the school's university template. */
export function kindOfIntent(intent: string): { kind: string; template: string | null } | null {
  if (intent === "kind.university") return { kind: "school", template: "university" };
  const id = intent.startsWith("kind.") ? intent.slice(5) : "";
  return KINDS.some((k) => k.id === id) ? { kind: id, template: null } : null;
}

/** The features the bot can turn on or tell about (the plan decides: lib/bot/features.ts). */
export const FEATURES = ["chat", "loyalty", "ratings", "notifications", "payments", "ios"] as const;
export type BotFeature = (typeof FEATURES)[number];
export const FEATURE_INTENTS = FEATURES.map((f) => `feature.${f}`);

/** The colours the bot offers, as the app's main colour. */
export const COLOURS = {
  red: "#D32F2F",
  orange: "#EF6C00",
  yellow: "#F9A825",
  green: "#2E7D32",
  teal: "#00897B",
  blue: "#1E63E9",
  navy: "#1A2B5F",
  purple: "#6A1B9A",
  pink: "#D81B60",
  brown: "#6D4C41",
  black: "#111111",
  gray: "#616161",
  gold: "#B8860B",
} as const;
export type BotColour = keyof typeof COLOURS;
export const COLOUR_INTENTS = (Object.keys(COLOURS) as BotColour[]).map((c) => `color.${c}`);

export function colourOfIntent(intent: string): string | null {
  const name = intent.startsWith("color.") ? intent.slice(6) : "";
  return name in COLOURS ? COLOURS[name as BotColour] : null;
}

/** Every language an app can have (lib/i18n/locales.ts). */
export const LANGUAGE_INTENTS = LOCALES.map((l) => `lang.${l.code}`);

export function languageOfIntent(intent: string): string | null {
  const code = intent.startsWith("lang.") ? intent.slice(5) : "";
  return LOCALES.some((l) => l.code === code) ? code : null;
}

/** Yes, no, not now, that's all. */
export const ANSWER_INTENTS = ["answer.yes", "answer.no", "answer.skip", "answer.done"] as const;

/**
 * "I want" in each dialect. Never an answer: it tells which Arabic the owner
 * writes (the bot may then echo Egyptian-friendly words), and it is left out
 * of what the bot didn't understand.
 */
export const WANT_INTENT = "want";

/** Each question's intents. */
export const STEP_INTENTS: Record<MatchedStep, readonly string[]> = {
  kind: KIND_INTENTS,
  colour: [...COLOUR_INTENTS, "answer.skip"],
  logo: ["answer.yes", "answer.skip", "answer.no"],
  languages: [...LANGUAGE_INTENTS, "answer.done"],
  features: [...FEATURE_INTENTS, "answer.done", "answer.no"],
  website: ["answer.yes", "answer.no"],
};

/** Every intent there is. */
export const ALL_INTENTS: readonly string[] = [...new Set([...Object.values(STEP_INTENTS).flat(), WANT_INTENT])];

export function isIntent(value: unknown): value is string {
  return typeof value === "string" && ALL_INTENTS.includes(value);
}

/** The intent in plain English, for the admin. */
export function intentLabel(intent: string): string {
  const kind = KINDS.find((k) => `kind.${k.id}` === intent);
  if (kind) return `Business: ${kind.name}`;
  if (intent === "kind.university") return "Business: University";
  if (intent.startsWith("feature.")) return `Feature: ${FEATURE_LABEL[intent.slice(8) as BotFeature] ?? intent.slice(8)}`;
  if (intent.startsWith("color.")) return `Colour: ${intent.slice(6)}`;
  const lang = LOCALES.find((l) => `lang.${l.code}` === intent);
  if (lang) return `Language: ${lang.name}`;
  return ANSWER_LABEL[intent] ?? intent;
}

const FEATURE_LABEL: Record<BotFeature, string> = {
  chat: "Chat",
  loyalty: "Loyalty points",
  ratings: "Ask for store ratings",
  notifications: "Push notifications",
  payments: "Card payments",
  ios: "iPhone app",
};

const ANSWER_LABEL: Record<string, string> = {
  "answer.yes": "Answer: yes",
  "answer.no": "Answer: no / none",
  "answer.skip": "Answer: skip / later",
  "answer.done": "Answer: that's all",
  want: "\"I want\" (tells the dialect, never an answer)",
};
