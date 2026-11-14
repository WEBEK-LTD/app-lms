import type { DataStore } from "../data/store";
import type { App, GiftOccasion, GiftTemplate } from "../data/types";
import { GIFT_OCCASION_KEYS, GIFT_OCCASIONS, GIFT_STARTERS, type GiftOccasionKey } from "./gift-starters";
import { cleanLine, cleanMessage, GIFT_LIMITS, giftsOf } from "./gifts";

/**
 * 131 The card messages the owner manages (Store › Gift messages): by
 * occasion, each message in each of the app's languages, added, edited,
 * reordered, hidden and deleted. A store that never opened them gets
 * Yallapp's starters (lib/selling/gift-starters.ts), copied into the store
 * the first time the owner does. The app asks for them in its language
 * (`GET /store/gift-messages`): on the hosted API for every source; a
 * WordPress site gets them with its license status, as Studio's screens,
 * and its plugin serves them.
 */

export const GIFT_MESSAGE_LIMITS = { occasions: 30, templates: 12, name: 40 } as const;

/** A built-in occasion's key, or null. */
export function occasionKey(value: unknown): GiftOccasionKey | null {
  return typeof value === "string" && (GIFT_OCCASION_KEYS as readonly string[]).includes(value) ? (value as GiftOccasionKey) : null;
}

/** Yallapp's starters as a store's occasions (not saved). */
export function starterOccasions(appId: string, now: Date): GiftOccasion[] {
  return GIFT_OCCASION_KEYS.map((key, i) => ({
    id: -(i + 1),
    appId,
    key,
    names: { ...GIFT_OCCASIONS[key].name },
    icon: GIFT_OCCASIONS[key].icon,
    position: i,
    hidden: false,
    templates: GIFT_STARTERS[key].map((words, n) => ({ id: `t${n + 1}`, texts: { ...words }, hidden: false })),
    createdAt: now,
    updatedAt: now,
  }));
}

/** The store's occasions: its own once it has opened them, else Yallapp's starters. */
export async function giftOccasionsOf(store: DataStore, app: Pick<App, "id" | "catalogSettings" | "vertical">, now: Date): Promise<GiftOccasion[]> {
  if (!giftsOf(app).messagesSeeded) return starterOccasions(app.id, now);
  return store.listGiftOccasions(app.id);
}

/** Copies the starters into the store, once; its occasions after that. */
export async function seedGiftOccasions(store: DataStore, app: App, now: Date): Promise<GiftOccasion[]> {
  if (giftsOf(app).messagesSeeded) return store.listGiftOccasions(app.id);
  const existing = await store.listGiftOccasions(app.id);
  if (existing.length === 0) {
    for (const o of starterOccasions(app.id, now)) {
      const { id: _id, ...rest } = o;
      void _id;
      await store.createGiftOccasion(rest);
    }
  }
  const settings = app.catalogSettings ?? null;
  await store.updateApp(
    app.id,
    { catalogSettings: { ...(settings ?? { currency: "TRY", shippingCents: 0, freeShippingOverCents: null, payment: null }), gifts: { ...giftsOf(app), messagesSeeded: true } } },
    now,
  );
  return store.listGiftOccasions(app.id);
}

/** A text in the language asked for, else the app's default language, else English, else any. */
function pick(texts: Record<string, string>, lang: string, def: string): string | null {
  return texts[lang]?.trim() || texts[def]?.trim() || texts.en?.trim() || Object.values(texts).find((t) => t.trim())?.trim() || null;
}

/** An occasion's name in a language: the owner's, else a built-in one's own words. */
export function occasionName(o: Pick<GiftOccasion, "key" | "names">, lang: string, def: string): string {
  const own = pick(o.names, lang, def);
  const builtIn = occasionKey(o.key);
  if (o.names[lang]?.trim()) return o.names[lang]!.trim();
  if (builtIn) {
    const words = GIFT_OCCASIONS[builtIn].name;
    return (words as Record<string, string>)[lang] ?? own ?? words.en;
  }
  return own ?? "";
}

/** The API's `id` of an occasion: a built-in one's key, else `c<id>`. */
export function occasionApiId(o: Pick<GiftOccasion, "key" | "id">): string {
  return occasionKey(o.key) ?? `c${o.id}`;
}

/** `GET /store/gift-messages`: the shown occasions with their shown messages, in the language asked for. */
export function giftMessagesJson(occasions: GiftOccasion[], lang: string, def: string) {
  return {
    occasions: occasions
      .filter((o) => !o.hidden)
      .map((o) => ({
        id: occasionApiId(o),
        name: occasionName(o, lang, def),
        icon: o.icon,
        templates: o.templates
          .filter((t) => !t.hidden)
          .map((t) => ({ id: t.id, text: pick(t.texts, lang, def) }))
          .filter((t): t is { id: string; text: string } => Boolean(t.text)),
      }))
      .filter((o) => o.name !== "" && o.templates.length > 0),
  };
}

/** The license status's `gift_messages` for a WordPress site: every language, for its plugin to pick from. */
export function giftMessagesStatus(occasions: GiftOccasion[], def: string) {
  return {
    default_language: def,
    occasions: occasions
      .filter((o) => !o.hidden)
      .map((o) => ({
        id: occasionApiId(o),
        icon: o.icon,
        names: Object.fromEntries(
          [...new Set([...Object.keys(o.names), ...(occasionKey(o.key) ? ["en", "ar", "tr"] : [])])].map((lang) => [lang, occasionName(o, lang, def)]),
        ),
        templates: o.templates.filter((t) => !t.hidden).map((t) => ({ id: t.id, texts: t.texts })),
      }))
      .filter((o) => o.templates.length > 0),
  };
}

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/** The dashboard's occasion form: its name in each language (`name_<lang>`) and its icon. */
export function parseOccasionForm(v: Record<string, string>, languages: string[]): Parsed<{ names: Record<string, string> }> {
  const names: Record<string, string> = {};
  for (const lang of languages) {
    const name = cleanLine(v[`name_${lang}`], GIFT_MESSAGE_LIMITS.name);
    if (name) names[lang] = name;
  }
  if (Object.keys(names).length === 0) return { ok: false, errors: { name: "Write the occasion's name." } };
  if (Object.values(names).some((n) => [...n].length > GIFT_MESSAGE_LIMITS.name)) return { ok: false, errors: { name: `A name can be at most ${GIFT_MESSAGE_LIMITS.name} characters.` } };
  return { ok: true, value: { names } };
}

/** The dashboard's message form: its words in each language (`text_<lang>`), the default language's at least. */
export function parseTemplateForm(v: Record<string, string>, languages: string[], def: string): Parsed<{ texts: Record<string, string> }> {
  const texts: Record<string, string> = {};
  for (const lang of languages) {
    const text = cleanMessage(v[`text_${lang}`]);
    if (text) texts[lang] = text;
  }
  const errors: Record<string, string> = {};
  if (!texts[def]) errors[`text_${def}`] = "Write the message in the app's main language.";
  for (const [lang, text] of Object.entries(texts)) {
    if ([...text].length > GIFT_LIMITS.message) errors[`text_${lang}`] = `A message can be at most ${GIFT_LIMITS.message} characters.`;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { texts } };
}

/** A new message's id in its occasion. */
export function nextTemplateId(templates: GiftTemplate[]): string {
  let n = templates.length + 1;
  while (templates.some((t) => t.id === `t${n}`)) n += 1;
  return `t${n}`;
}

/** The occasions after one moved up (-1) or down (+1): their new positions. */
export function moved<T extends { id: number; position: number }>(list: T[], id: number, by: -1 | 1): { id: number; position: number }[] {
  const sorted = [...list].sort((a, b) => a.position - b.position || a.id - b.id);
  const at = sorted.findIndex((o) => o.id === id);
  const to = at + by;
  if (at < 0 || to < 0 || to >= sorted.length) return sorted.map((o, i) => ({ id: o.id, position: i }));
  [sorted[at], sorted[to]] = [sorted[to]!, sorted[at]!];
  return sorted.map((o, i) => ({ id: o.id, position: i }));
}
