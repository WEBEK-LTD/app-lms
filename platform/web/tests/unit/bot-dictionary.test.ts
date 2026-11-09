import { describe, expect, it } from "vitest";
import { STEP_INTENTS } from "@/lib/bot/intents";
import { checkPhrase, dictionaryFor, effectivePhrases, isBuiltIn } from "@/lib/bot/dictionary";
import { matchOne } from "@/lib/bot/match";
import { normalizeText } from "@/lib/bot/normalize";
import { SEED_PHRASES } from "@/lib/bot/seed";
import type { BotPhrase } from "@/lib/bot/types";

const NOW = new Date("2026-11-09T10:00:00Z");

function change(patch: Partial<BotPhrase> & Pick<BotPhrase, "intent" | "text" | "kind">): BotPhrase {
  return { id: `${patch.kind}-${patch.intent}-${patch.text}`, lang: "ar-eg", normalized: normalizeText(patch.text), createdBy: "admin@yallapp.test", createdAt: NOW, ...patch };
}

describe("the bot's dictionary with the team's changes", () => {
  it("is the built-in phrases when nothing changed", () => {
    expect(effectivePhrases([])).toEqual(SEED_PHRASES);
  });

  it("adds the team's phrases, and the bot understands them", () => {
    const added = change({ intent: "kind.restaurant", text: "مطعم فول وطعمية وكشري بلدي", kind: "added" });
    expect(effectivePhrases([added])).toContainEqual({ intent: "kind.restaurant", lang: "ar-eg", text: added.text });
    const learned = change({ intent: "kind.bookings", text: "ميكب ارتست", kind: "added" });
    expect(matchOne(dictionaryFor([]), "ميكب ارتست", STEP_INTENTS.kind).kind).toBe("none");
    expect(matchOne(dictionaryFor([learned]), "أنا ميكب ارتست", STEP_INTENTS.kind)).toMatchObject({ kind: "sure", intent: "kind.bookings" });
  });

  it("leaves out the built-in phrases the team switched off, in any spelling", () => {
    const off = change({ intent: "kind.store", lang: "en", text: "PRODUCTS", kind: "off" });
    const phrases = effectivePhrases([off]);
    expect(phrases.some((p) => p.intent === "kind.store" && p.lang === "en" && p.text === "products")).toBe(false);
    expect(phrases.length).toBe(SEED_PHRASES.length - 1);
    expect(matchOne(dictionaryFor([off]), "products", STEP_INTENTS.kind).kind).toBe("none");
  });

  it("switches a phrase off for its intent and language only", () => {
    const off = change({ intent: "kind.restaurant", lang: "ar-gulf", text: "مطعم", kind: "off" });
    expect(effectivePhrases([off]).some((p) => p.intent === "kind.restaurant" && normalizeText(p.text) === "مطعم")).toBe(true);
  });

  it("never lists a phrase twice, nor one for an intent that's gone", () => {
    const same = change({ intent: "kind.restaurant", lang: "en", text: "Restaurant", kind: "added" });
    const gone = change({ intent: "kind.spaceship", lang: "en", text: "spaceship", kind: "added" });
    expect(effectivePhrases([same, gone]).length).toBe(SEED_PHRASES.length);
  });

  it("knows the built-in phrases", () => {
    expect(isBuiltIn("want", "ar-eg", "عايز")).toBe(true);
    expect(isBuiltIn("want", "ar-eg", "أبغى")).toBe(false);
    expect(isBuiltIn("want", "ar-gulf", "ابغي")).toBe(true);
  });

  it("is compiled again only when the changes are", () => {
    const a = dictionaryFor([]);
    expect(dictionaryFor([])).toBe(a);
    const b = dictionaryFor([change({ intent: "kind.news", text: "بودكاست", kind: "added" })]);
    expect(b).not.toBe(a);
  });
});

describe("a phrase the team adds", () => {
  it("is checked and tidied", () => {
    expect(checkPhrase({ intent: "kind.clinic", lang: "ar-eg", text: "  دكتور   أسنان " })).toEqual({ ok: true, intent: "kind.clinic", lang: "ar-eg", text: "دكتور أسنان", normalized: "دكتور اسنان" });
  });

  it.each([
    [{ intent: "kind.nothing", lang: "en", text: "x" }, "Choose one of the intents."],
    [{ intent: "kind.clinic", lang: "fr", text: "x" }, "Choose the phrase's language."],
    [{ intent: "kind.clinic", lang: "en", text: "   " }, "Type the phrase."],
    [{ intent: "kind.clinic", lang: "en", text: "x".repeat(81) }, "Keep the phrase to 80 characters."],
    [{ intent: "kind.clinic", lang: "en", text: "?!" }, "The phrase needs letters or numbers."],
  ])("is refused: %j", (input, error) => {
    expect(checkPhrase(input)).toEqual({ ok: false, error });
  });
});
