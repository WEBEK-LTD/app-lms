"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { addTeamPhrase, ignoreUnmatched, mapUnmatched, removeTeamPhrase, switchBuiltInPhrase, type PhraseOutcome } from "@/lib/bot/admin";
import { intentLabel, PHRASE_LANG_LABEL, type PhraseLang } from "@/lib/bot/intents";
import { getStore } from "@/lib/data";
import type { FormState } from "@/lib/forms";

/** Admin › Bot dictionary and Admin › Unmatched phrases: the team teaches the app-builder bot. */

function refresh() {
  revalidatePath("/admin/bot");
  revalidatePath("/admin/bot/unmatched");
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

function phraseOf(formData: FormData) {
  return { intent: field(formData, "intent"), lang: field(formData, "lang"), text: field(formData, "text") };
}

function said(outcome: PhraseOutcome, text: string, intent: string, lang: PhraseLang): string {
  const where = `${intentLabel(intent)} (${PHRASE_LANG_LABEL[lang]})`;
  if (outcome === "added") return `Added "${text}" to ${where}. The bot understands it now.`;
  if (outcome === "switched_on") return `"${text}" is built in to ${where}; it was switched off and is on again.`;
  return `"${text}" is already in ${where}.`;
}

/** A phrase the team adds to an intent, in one language or dialect. */
export async function addBotPhraseAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("bot.edit");
  const input = phraseOf(formData);
  const values = { lang: input.lang, text: input.text };
  const added = await addTeamPhrase(await getStore(), input, admin.email, new Date());
  if (!added.ok) return { errors: { text: added.error }, values };
  if (added.outcome !== "already") {
    const phrase = added.phrase!;
    await recordAudit({
      actor: admin,
      action: added.outcome === "added" ? "bot.phrase_add" : "bot.phrase_switch",
      target: { type: "bot_phrase", id: phrase.id },
      summary: `${added.outcome === "added" ? "Added" : "Switched on again"} "${phrase.text}" for ${intentLabel(phrase.intent)} (${PHRASE_LANG_LABEL[phrase.lang]})`,
      after: { intent: phrase.intent, lang: phrase.lang, text: phrase.text },
    });
    refresh();
  }
  const text = added.phrase?.text ?? input.text.trim();
  return { ok: true, message: said(added.outcome, text, input.intent, input.lang as PhraseLang), values: { lang: input.lang, text: "" } };
}

/** Removes a phrase the team added. */
export async function removeBotPhraseAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("bot.edit");
  const removed = await removeTeamPhrase(await getStore(), field(formData, "id"));
  if (!removed) return;
  await recordAudit({
    actor: admin,
    action: "bot.phrase_remove",
    target: { type: "bot_phrase", id: removed.id },
    summary: `Removed "${removed.text}" from ${intentLabel(removed.intent)} (${PHRASE_LANG_LABEL[removed.lang]})`,
    before: { intent: removed.intent, lang: removed.lang, text: removed.text },
  });
  refresh();
}

/** The phrase a button of an intent's form names: `{ lang, text, off }`, `off` true to switch it off. */
function switchOf(formData: FormData): { lang: unknown; text: unknown; off: boolean } | null {
  try {
    const value: unknown = JSON.parse(field(formData, "phrase"));
    if (!value || typeof value !== "object") return null;
    const { lang, text, off } = value as Record<string, unknown>;
    return { lang, text, off: off === true };
  } catch {
    return null;
  }
}

/** Switches a built-in phrase off, or on again: the button pressed in the intent's form names it. */
export async function switchBotPhraseAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("bot.edit");
  const chosen = switchOf(formData);
  if (!chosen) return;
  const off = chosen.off;
  const switched = await switchBuiltInPhrase(await getStore(), { intent: field(formData, "intent"), lang: chosen.lang, text: chosen.text }, off, admin.email, new Date());
  if (!switched.ok || !switched.changed) return;
  await recordAudit({
    actor: admin,
    action: "bot.phrase_switch",
    target: { type: "bot_phrase", id: `${switched.intent}:${switched.lang}` },
    summary: `Switched ${off ? "off" : "on again"} the built-in "${switched.text}" for ${intentLabel(switched.intent)} (${PHRASE_LANG_LABEL[switched.lang]})`,
    before: { on: off },
    after: { on: !off },
  });
  refresh();
}

/** One click: what owners typed goes into the dictionary under an intent of its question. */
export async function mapBotUnmatchedAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("bot.edit");
  const input = { step: field(formData, "step"), normalized: field(formData, "normalized"), ...phraseOf(formData) };
  const values = { intent: input.intent, lang: input.lang, text: input.text };
  const mapped = await mapUnmatched(await getStore(), input, admin.email, new Date());
  if (!mapped.ok) return { message: mapped.error, values };
  await recordAudit({
    actor: admin,
    action: "bot.unmatched_map",
    target: { type: "bot_unmatched", id: input.step },
    summary: `Added "${mapped.text}" (typed ${mapped.rows} ${mapped.rows === 1 ? "time" : "times"} on the ${input.step} question) to ${intentLabel(mapped.intent)} (${PHRASE_LANG_LABEL[mapped.lang]})`,
    after: { intent: mapped.intent, lang: mapped.lang, text: mapped.text, rows: mapped.rows, phrase: mapped.outcome },
  });
  refresh();
  return { ok: true, message: said(mapped.outcome, mapped.text, mapped.intent, mapped.lang), values };
}

/** Leaves what owners typed out of the open list, without adding it. */
export async function ignoreBotUnmatchedAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("bot.edit");
  const step = field(formData, "step");
  const rows = await ignoreUnmatched(await getStore(), { step, normalized: field(formData, "normalized") }, admin.email, new Date());
  if (!rows) return;
  await recordAudit({
    actor: admin,
    action: "bot.unmatched_ignore",
    target: { type: "bot_unmatched", id: step },
    summary: `Ignored "${field(formData, "text").slice(0, 200)}" (typed ${rows} ${rows === 1 ? "time" : "times"} on the ${step} question)`,
  });
  refresh();
}
