import { describe, expect, it } from "vitest";
import {
  addTeamPhrase,
  dictionaryView,
  groupUnmatched,
  ignoreUnmatched,
  mapUnmatched,
  openUnmatchedGroups,
  phraseLangOf,
  removeTeamPhrase,
  stepsOfIntent,
  switchBuiltInPhrase,
} from "@/lib/bot/admin";
import { dictionaryFor } from "@/lib/bot/dictionary";
import { STEP_INTENTS, type MatchedStep } from "@/lib/bot/intents";
import { compileDictionary, matchOne } from "@/lib/bot/match";
import { normalizeText } from "@/lib/bot/normalize";
import { SEED_PHRASES } from "@/lib/bot/seed";
import type { BotUnmatched } from "@/lib/bot/types";
import { MemoryStore } from "@/lib/data/memory";
import { NOW, days } from "./helpers";

/**
 * Admin › Bot dictionary and Admin › Unmatched phrases (lib/bot/admin.ts):
 * the dictionary by question, the team's phrases, and one click from what
 * an owner typed to a phrase the bot understands.
 */

const ADMIN = "admin@yallapp.test";
/** An Egyptian owner asking for a makeup artist's app: nothing in the dictionary says it. */
const MAKEUP = "عايز ابلكيشن لميكب ارتست";

function row(patch: Partial<BotUnmatched> = {}): BotUnmatched {
  const text = patch.text ?? MAKEUP;
  return {
    id: 1,
    step: "kind",
    text,
    normalized: normalizeText(text),
    dashLang: "ar",
    dialect: "ar-eg",
    chosenIntent: null,
    status: "open",
    mappedIntent: null,
    createdAt: NOW,
    resolvedAt: null,
    resolvedBy: null,
    ...patch,
  };
}

async function logged(store: MemoryStore, patch: Partial<Omit<BotUnmatched, "id">> = {}): Promise<number> {
  const { id, ...rest } = row(patch);
  void id;
  return store.addBotUnmatched(rest);
}

const understood = async (store: MemoryStore, text: string, step: MatchedStep = "kind") => matchOne(dictionaryFor(await store.listBotPhrases()), text, STEP_INTENTS[step]);

describe("the dictionary language of what an owner typed", () => {
  it("is the Arabic dialect it was written in, MSA when none told, else Turkish or English", () => {
    expect(phraseLangOf(MAKEUP, "ar-eg", "ar")).toBe("ar-eg");
    expect(phraseLangOf("أبغى تطبيق لصالون", "ar-gulf", "en")).toBe("ar-gulf");
    expect(phraseLangOf("تطبيق لصالون تجميل", null, "en")).toBe("ar");
    expect(phraseLangOf("kuaför salonu", null, "en")).toBe("tr");
    expect(phraseLangOf("kuafor salonu", null, "tr")).toBe("tr");
    expect(phraseLangOf("Makeup artist", null, "ar")).toBe("en");
  });
});

describe("unmatched phrases, grouped", () => {
  it("groups by question and normalised text, counts them and the buttons chosen next, the most typed first", () => {
    const groups = groupUnmatched([
      row({ id: 1, text: "تطبيق ميكب", createdAt: days(-3) }),
      row({ id: 2, text: "عايز ابلكيشن لميكب ارتست", chosenIntent: "kind.bookings", createdAt: days(-2) }),
      row({ id: 3, text: "عايز أبلكيشن لميكب آرتست", chosenIntent: "kind.bookings", createdAt: days(-1), dashLang: "en" }),
      row({ id: 4, text: "عايز ابلكيشن لميكب ارتست", chosenIntent: "kind.services", dialect: null }),
      // The same words on another question are another group.
      row({ id: 5, step: "features", text: "عايز ابلكيشن لميكب ارتست" }),
      // A button of another question is never counted.
      row({ id: 6, text: "تطبيق ميكب", chosenIntent: "feature.chat" }),
    ]);
    expect(groups.map((g) => [g.step, g.count])).toEqual([
      ["kind", 3],
      ["kind", 2],
      ["features", 1],
    ]);
    const [makeup, short] = groups;
    expect(makeup).toMatchObject({
      normalized: normalizeText(MAKEUP),
      text: "عايز ابلكيشن لميكب ارتست",
      lastAt: NOW,
      chosen: [
        { intent: "kind.bookings", count: 2 },
        { intent: "kind.services", count: 1 },
      ],
      suggested: "kind.bookings",
      dialects: ["ar-eg"],
      lang: "ar",
    });
    expect(makeup!.dashLangs.sort()).toEqual(["ar", "en"]);
    expect(short).toMatchObject({ chosen: [], suggested: null, lang: "ar-eg" });
  });

  it("suggests what the dictionary finds in it now when no button was chosen (a phrase added since)", () => {
    const dictionary = compileDictionary([...SEED_PHRASES, { intent: "kind.bookings", lang: "ar-eg", text: "ميكب ارتست" }]);
    const [group] = groupUnmatched([row()], dictionary);
    expect(group!.nowFound[0]).toBe("kind.bookings");
    expect(group!.suggested).toBe("kind.bookings");
  });
});

describe("the dictionary by question", () => {
  it("lists each intent's built-in phrases, the ones switched off, and the team's own, in one language when asked", async () => {
    const store = new MemoryStore();
    const builtIn = SEED_PHRASES.find((p) => p.intent === "kind.restaurant" && p.lang === "ar-eg")!;
    expect((await switchBuiltInPhrase(store, builtIn, true, ADMIN, NOW)).ok).toBe(true);
    const added = await addTeamPhrase(store, { intent: "kind.restaurant", lang: "ar-eg", text: "محل فطير" }, ADMIN, NOW);
    expect(added).toMatchObject({ ok: true, outcome: "added" });
    const changes = await store.listBotPhrases();
    const all = dictionaryView("kind", changes);
    expect(all.map((v) => v.intent)).toEqual([...STEP_INTENTS.kind]);
    const restaurant = all.find((v) => v.intent === "kind.restaurant")!;
    expect(restaurant.label).toBe("Business: Restaurant & café");
    expect(restaurant.builtIn.find((p) => p.lang === builtIn.lang && p.text === builtIn.text)?.off).toBe(true);
    expect(restaurant.builtIn.filter((p) => p.off)).toHaveLength(1);
    expect(restaurant.added).toMatchObject([{ lang: "ar-eg", text: "محل فطير", createdBy: ADMIN }]);
    expect(restaurant.builtIn.some((p) => p.lang === "tr")).toBe(true);
    const egyptian = dictionaryView("kind", changes, "ar-eg").find((v) => v.intent === "kind.restaurant")!;
    expect(egyptian.builtIn.every((p) => p.lang === "ar-eg")).toBe(true);
    expect(dictionaryView("kind", changes, "tr").find((v) => v.intent === "kind.restaurant")!.added).toEqual([]);
  });

  it("shows the \"I want\" words, Egyptian with عايز / عاوز / محتاج and أبغى only Gulf", () => {
    const [want] = dictionaryView("want", []);
    const of = (lang: string) => want!.builtIn.filter((p) => p.lang === lang).map((p) => p.text);
    expect(of("ar-eg")).toEqual(expect.arrayContaining(["عايز", "عاوز", "محتاج"]));
    expect(of("ar-eg")).not.toContain("أبغى");
    expect(of("ar-gulf")).toContain("أبغى");
    expect(want!.alsoOn).toEqual([]);
  });

  it("says which other questions share an intent", () => {
    expect(stepsOfIntent("answer.yes")).toEqual(["logo", "website"]);
    expect(dictionaryView("logo", []).find((v) => v.intent === "answer.yes")!.alsoOn).toEqual(["website"]);
    expect(stepsOfIntent("kind.taxi")).toEqual(["kind"]);
  });
});

describe("the team's phrases", () => {
  it("adds one the bot then understands, once; checks it first", async () => {
    const store = new MemoryStore();
    expect((await understood(store, "زلابيا وبلح الشام")).kind).toBe("none");
    const added = await addTeamPhrase(store, { intent: "kind.restaurant", lang: "ar-eg", text: "  زلابيا   وبلح الشام " }, ADMIN, NOW);
    expect(added).toMatchObject({ ok: true, outcome: "added", phrase: { text: "زلابيا وبلح الشام", normalized: normalizeText("زلابيا وبلح الشام"), kind: "added", createdBy: ADMIN, createdAt: NOW } });
    expect(await understood(store, "زلابيا وبلح الشام")).toMatchObject({ kind: "sure", intent: "kind.restaurant" });
    // The same words again, spelled another way, aren't added twice.
    expect(await addTeamPhrase(store, { intent: "kind.restaurant", lang: "ar-eg", text: "زلابيـا وبلَح الشّام" }, ADMIN, NOW)).toMatchObject({ ok: true, outcome: "already" });
    expect(await store.listBotPhrases()).toHaveLength(1);
    for (const [input, error] of [
      [{ intent: "kind.nothing", lang: "ar-eg", text: "x" }, "Choose one of the intents."],
      [{ intent: "kind.restaurant", lang: "ar-xx", text: "x" }, "Choose the phrase's language."],
      [{ intent: "kind.restaurant", lang: "en", text: "   " }, "Type the phrase."],
      [{ intent: "kind.restaurant", lang: "en", text: "a".repeat(81) }, "Keep the phrase to 80 characters."],
      [{ intent: "kind.restaurant", lang: "en", text: "!!!" }, "The phrase needs letters or numbers."],
    ] as const) {
      expect(await addTeamPhrase(store, input, ADMIN, NOW)).toEqual({ ok: false, error });
    }
  });

  it("switches a built-in one off and on again, and adding it switches it on; never deletes it", async () => {
    const store = new MemoryStore();
    const phrase = { intent: "kind.restaurant", lang: "en" as const, text: "restaurant" };
    expect(await understood(store, "a restaurant")).toMatchObject({ kind: "sure", intent: "kind.restaurant" });
    expect(await switchBuiltInPhrase(store, phrase, true, ADMIN, NOW)).toMatchObject({ ok: true, changed: true });
    expect(await switchBuiltInPhrase(store, phrase, true, ADMIN, NOW)).toMatchObject({ ok: true, changed: false });
    expect(await store.listBotPhrases()).toMatchObject([{ kind: "off", intent: "kind.restaurant", lang: "en", normalized: "restaurant" }]);
    expect((await understood(store, "a restaurant")).kind).not.toBe("sure");
    expect(await switchBuiltInPhrase(store, phrase, false, ADMIN, NOW)).toMatchObject({ ok: true, changed: true });
    expect(await store.listBotPhrases()).toEqual([]);
    expect(await understood(store, "a restaurant")).toMatchObject({ kind: "sure", intent: "kind.restaurant" });
    // Added while it is off: on again.
    await switchBuiltInPhrase(store, phrase, true, ADMIN, NOW);
    expect(await addTeamPhrase(store, { ...phrase, text: "Restaurant" }, ADMIN, NOW)).toMatchObject({ ok: true, outcome: "switched_on" });
    expect(await store.listBotPhrases()).toEqual([]);
    expect(await addTeamPhrase(store, phrase, ADMIN, NOW)).toMatchObject({ ok: true, outcome: "already" });
    // Only a built-in phrase is switched; a team phrase is removed.
    expect(await switchBuiltInPhrase(store, { ...phrase, text: "fish house" }, true, ADMIN, NOW)).toEqual({ ok: false, error: "That isn't a built-in phrase." });
  });

  it("removes only a phrase the team added", async () => {
    const store = new MemoryStore();
    const added = await addTeamPhrase(store, { intent: "kind.fitness", lang: "tr", text: "pilates stüdyosu" }, ADMIN, NOW);
    await switchBuiltInPhrase(store, { intent: "kind.restaurant", lang: "en", text: "restaurant" }, true, ADMIN, NOW);
    const off = (await store.listBotPhrases()).find((p) => p.kind === "off")!;
    expect(await removeTeamPhrase(store, off.id)).toBeNull();
    expect(await removeTeamPhrase(store, "nope")).toBeNull();
    expect(await removeTeamPhrase(store, added.ok ? added.phrase!.id : "")).toMatchObject({ text: "pilates stüdyosu" });
    expect(await store.listBotPhrases()).toEqual([off]);
  });
});

describe("one click from what owners typed to the dictionary", () => {
  it("adds it to the button chosen next, in its dialect, marks every open row of it, and the bot understands it then", async () => {
    const store = new MemoryStore();
    expect((await understood(store, MAKEUP)).kind).toBe("none");
    await logged(store, { chosenIntent: "kind.bookings", createdAt: days(-1) });
    await logged(store, { text: "عايز أبلكيشن لميكب آرتست", chosenIntent: "kind.bookings" });
    const otherStep = await logged(store, { step: "features" });
    const { groups } = await openUnmatchedGroups(store, "kind");
    expect(groups).toHaveLength(1);
    const [group] = groups;
    expect(group).toMatchObject({ count: 2, suggested: "kind.bookings", lang: "ar-eg" });

    const later = new Date(NOW.getTime() + 60_000);
    const mapped = await mapUnmatched(store, { step: group!.step, normalized: group!.normalized, intent: group!.suggested, lang: group!.lang, text: group!.text }, ADMIN, later);
    expect(mapped).toMatchObject({ ok: true, outcome: "added", rows: 2, intent: "kind.bookings", lang: "ar-eg" });
    expect(await store.listBotPhrases()).toMatchObject([{ intent: "kind.bookings", lang: "ar-eg", kind: "added", createdBy: ADMIN }]);
    expect(await understood(store, MAKEUP)).toMatchObject({ kind: "sure", intent: "kind.bookings" });
    // A small typo still finds it (the bot then asks).
    expect(await understood(store, "عايز ابليكشن لميكب ارتست")).toMatchObject({ kind: "choices", intents: ["kind.bookings"] });
    expect((await openUnmatchedGroups(store, "kind")).groups).toEqual([]);
    const done = await store.listBotUnmatched({ status: "mapped", offset: 0, limit: 10 });
    expect(done.items.map((r) => [r.mappedIntent, r.resolvedBy, r.resolvedAt])).toEqual([
      ["kind.bookings", ADMIN, later],
      ["kind.bookings", ADMIN, later],
    ]);
    expect((await store.getBotUnmatched(otherStep))?.status).toBe("open");
  });

  it("takes only an intent of the phrase's own question, and a phrase that passes the checks", async () => {
    const store = new MemoryStore();
    await logged(store);
    const base = { step: "kind", normalized: normalizeText(MAKEUP), lang: "ar-eg", text: MAKEUP };
    expect(await mapUnmatched(store, { ...base, intent: "feature.chat" }, ADMIN, NOW)).toEqual({ ok: false, error: "Choose one of this question's intents." });
    expect(await mapUnmatched(store, { ...base, step: "name", intent: "kind.bookings" }, ADMIN, NOW)).toEqual({ ok: false, error: "Unknown question." });
    expect(await mapUnmatched(store, { ...base, normalized: "", intent: "kind.bookings" }, ADMIN, NOW)).toEqual({ ok: false, error: "Unknown phrase." });
    expect(await mapUnmatched(store, { ...base, intent: "kind.bookings", text: "x".repeat(81) }, ADMIN, NOW)).toMatchObject({ ok: false });
    expect(await store.listBotPhrases()).toEqual([]);
    expect((await openUnmatchedGroups(store, null)).groups).toHaveLength(1);
    // An edited, shorter phrase is fine: the rows it came from are marked all the same.
    expect(await mapUnmatched(store, { ...base, intent: "kind.bookings", text: "ميكب ارتست" }, ADMIN, NOW)).toMatchObject({ ok: true, rows: 1, text: "ميكب ارتست" });
    expect(await understood(store, "محتاج ابلكيشن ميكب ارتست")).toMatchObject({ kind: "sure", intent: "kind.bookings" });
  });

  it("ignores one: nothing is added, its open rows leave the list", async () => {
    const store = new MemoryStore();
    await logged(store);
    await logged(store);
    expect(await ignoreUnmatched(store, { step: "kind", normalized: normalizeText(MAKEUP) }, ADMIN, NOW)).toBe(2);
    expect(await ignoreUnmatched(store, { step: "kind", normalized: normalizeText(MAKEUP) }, ADMIN, NOW)).toBe(0);
    expect(await ignoreUnmatched(store, { step: "name", normalized: "x" }, ADMIN, NOW)).toBeNull();
    expect(await store.listBotPhrases()).toEqual([]);
    expect((await openUnmatchedGroups(store, null)).groups).toEqual([]);
    expect((await store.listBotUnmatched({ status: "ignored", offset: 0, limit: 10 })).total).toBe(2);
  });
});
