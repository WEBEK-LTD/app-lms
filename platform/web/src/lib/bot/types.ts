import type { ArabicTag, MatchedStep, PhraseLang } from "./intents";

/**
 * A change the team made to the bot's dictionary (Admin › Bot dictionary):
 * a phrase `added` to an intent, or a built-in phrase switched `off`.
 */
export interface BotPhrase {
  id: string;
  intent: string;
  lang: PhraseLang;
  /** As the team typed it. */
  text: string;
  /** lib/bot/normalize.ts: what a built-in phrase switched off is known by. */
  normalized: string;
  kind: "added" | "off";
  /** The admin who made the change (their email). */
  createdBy: string;
  createdAt: Date;
}

/** How long what the bot didn't understand is kept. */
export const BOT_UNMATCHED_DAYS = 180;

export type BotUnmatchedStatus = "open" | "mapped" | "ignored";

/**
 * Something an owner typed that the bot didn't understand, and the button
 * they then chose on the same question (`chosenIntent`), for the team to
 * teach the bot (Admin › Unmatched phrases). Who typed it is not kept; the
 * rows go after BOT_UNMATCHED_DAYS.
 */
export interface BotUnmatched {
  id: number;
  step: MatchedStep;
  /** As typed, cut to 200 characters. */
  text: string;
  normalized: string;
  /** The dashboard's language at the time. */
  dashLang: "en" | "ar" | "tr";
  dialect: ArabicTag | null;
  chosenIntent: string | null;
  status: BotUnmatchedStatus;
  /** The intent the team added it to. */
  mappedIntent: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}
