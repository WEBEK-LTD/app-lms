"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DashKey } from "@/i18n/dashboard";
import { recordStaffChange } from "@/lib/admin/audit";
import { MAX_APPS_PER_CLIENT } from "@/lib/app/label";
import { chooseApp, clientFor, mayUseDashboard } from "@/lib/auth/session";
import { readAnswers, type AnswerError } from "@/lib/bot/answers";
import { makeFromAnswers } from "@/lib/bot/create";
import { dictionaryFor } from "@/lib/bot/dictionary";
import { isMatchedStep, STEP_INTENTS, type ArabicTag } from "@/lib/bot/intents";
import { detectDialect, matchAll, matchOne } from "@/lib/bot/match";
import { normalizeText } from "@/lib/bot/normalize";
import { hmacSha256, safeEqual } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { appPlan } from "@/lib/entitlements";
import { sessionSecret } from "@/lib/env";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { SectionWord } from "@/lib/studio/sections";
import { appTypeOn, getSwitches } from "@/lib/switches";

/**
 * The app-builder bot (/dashboard/builder): what a typed answer means, the
 * button chosen after one it didn't understand, and making the app.
 */

async function requireBotClient() {
  const context = await clientFor("apps");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  return context;
}

export interface BotReply {
  /** One answer: `sure` of `intents[0]`, or `choices`; several (languages, features): `many`; nothing: `none`. */
  kind: "sure" | "choices" | "many" | "none";
  intents: string[];
  /** Turned down ("no chat"). */
  negated: string[];
  dialect: ArabicTag | null;
  /** When it wasn't understood: what the bot sends back with the button chosen next. */
  ticket: string | null;
  /** Too many messages for now. */
  limited?: boolean;
}

/** The longest answer read. */
const TEXT_MAX = 200;

const NONE: BotReply = { kind: "none", intents: [], negated: [], dialect: null, ticket: null };

function ticketOf(id: number, clientId: string): string {
  return `${id}.${hmacSha256(sessionSecret(), `bot-unmatched:${id}:${clientId}`).slice(0, 32)}`;
}

function readTicket(ticket: unknown, clientId: string): number | null {
  if (typeof ticket !== "string") return null;
  const [id, mac] = ticket.split(".");
  const n = Number(id);
  if (!Number.isSafeInteger(n) || n < 1 || !mac) return null;
  return safeEqual(ticketOf(n, clientId), ticket) ? n : null;
}

/** What the owner typed on one of the bot's questions means. What it didn't understand is kept for the team (without who typed it). */
export async function botUnderstandAction(step: string, typed: string): Promise<BotReply> {
  const context = await requireBotClient();
  if (!isMatchedStep(step) || typeof typed !== "string") return NONE;
  const text = typed.trim().slice(0, TEXT_MAX);
  const normalized = normalizeText(text);
  if (!normalized) return NONE;
  const store = await getStore();
  if (!(await hitRateLimit(store, RATE_LIMITS.botText, context.client.id)).allowed) return { ...NONE, limited: true };
  const dictionary = dictionaryFor(await store.listBotPhrases());
  const dialect = detectDialect(dictionary, text);
  const intents = STEP_INTENTS[step];
  let reply: BotReply;
  if (step === "languages" || step === "features") {
    const found = matchAll(dictionary, text, intents);
    reply = found.length
      ? { kind: "many", intents: found.filter((m) => !m.negated).map((m) => m.intent), negated: found.filter((m) => m.negated).map((m) => m.intent), dialect, ticket: null }
      : { ...NONE, dialect };
  } else {
    const found = matchOne(dictionary, text, intents);
    reply = found.kind === "none" ? { ...NONE, dialect } : { kind: found.kind, intents: found.kind === "sure" ? [found.intent] : found.intents, negated: [], dialect, ticket: null };
  }
  if (reply.kind !== "none") return reply;
  const { lang } = await dashboardText();
  const id = await store.addBotUnmatched({
    step,
    text,
    normalized: normalized.slice(0, TEXT_MAX),
    dashLang: lang,
    dialect,
    chosenIntent: null,
    status: "open",
    mappedIntent: null,
    createdAt: new Date(),
    resolvedAt: null,
    resolvedBy: null,
  });
  return { ...reply, ticket: ticketOf(id, context.client.id) };
}

/** The button the owner chose after an answer the bot didn't understand: what the team maps that answer to. */
export async function botChoiceAction(ticket: string, intent: string): Promise<void> {
  const context = await requireBotClient();
  const id = readTicket(ticket, context.client.id);
  if (!id) return;
  const store = await getStore();
  const row = await store.getBotUnmatched(id);
  if (!row || !STEP_INTENTS[row.step].includes(intent)) return;
  await store.setBotUnmatchedChoice(id, intent);
}

export type BotCreateError = AnswerError | "limit" | "unavailable" | "failed";

/**
 * Makes the app from the bot's answers, with the same checks as the app
 * type step and Studio's new project (switches, the number of apps), and
 * the plan's (lib/bot/create.ts), then opens its editor.
 */
export async function botCreateAction(answers: unknown): Promise<{ error: BotCreateError }> {
  const context = await requireBotClient();
  const read = readAnswers(answers);
  if (!read.ok) return { error: read.error };
  const { kind, value } = read;
  if (context.apps.length >= MAX_APPS_PER_CLIENT) return { error: "limit" };
  const store = await getStore();
  // The account's first app may have its plan already; an added app has none until it's paid.
  const license = context.apps.length ? null : context.license;
  // 11.5 A type the team switched off can't be chosen.
  if (!appTypeOn(await getSwitches(store), kind.engine, license?.plan ?? null)) return { error: "unavailable" };
  if (value.logoAssetId) {
    const asset = await store.getAsset(value.logoAssetId);
    if (!asset || asset.clientId !== context.client.id || asset.kind !== "logo") return { error: "logo" };
  }
  const now = new Date();
  const { t, lang } = await dashboardText();
  let open: string;
  try {
    const made = await makeFromAnswers(
      store,
      {
        clientId: context.client.id,
        plan: await appPlan(store, license, now),
        words: (word: SectionWord) => t(`studio.w_${word}` as DashKey, { app: value.name }),
        lang,
      },
      value,
      kind,
      now,
    );
    await chooseApp(made.app.id);
    await recordStaffChange({ ...context, app: made.app }, `Made an app with the guide: ${kind.name}`, { appType: null }, { appType: kind.engine, vertical: kind.vertical, section: made.app.section ?? "regular" });
    open = made.open;
  } catch (error) {
    console.error(`[bot] ${error instanceof Error ? error.message : String(error)}`);
    return { error: "failed" };
  }
  revalidatePath("/dashboard", "layout");
  revalidatePath("/studio", "layout");
  redirect(open);
}
