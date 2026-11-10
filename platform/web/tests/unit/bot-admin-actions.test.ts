import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUDIT_ACTIONS, AUDIT_TARGETS } from "@/lib/admin/audit-actions";
import { can, type AdminRole } from "@/lib/admin/permissions";
import { normalizeText } from "@/lib/bot/normalize";
import { MemoryStore } from "@/lib/data/memory";
import { ICON_NAMES } from "@/components/icon-names";
import { NOW } from "./helpers";

/** Admin › Bot dictionary's actions: who may teach the bot, and the audit log of what they did. */

const state: { store: MemoryStore; role: AdminRole } = { store: new MemoryStore(), role: "support" };
type Entry = { action: string; target: { type: string; id: unknown }; summary: string };
const audit = vi.fn<(entry: Entry) => Promise<null>>(async () => null);

class Redirected extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
}

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn(async (permission = "view") => {
    if (!can(state.role, permission)) throw new Redirected(`/admin?denied=${permission}`);
    return { id: "u-admin", email: "help@yallapp.test", name: "Help", adminRole: state.role };
  }),
}));
vi.mock("@/lib/data", () => ({ getStore: async () => state.store }));
vi.mock("@/lib/admin/audit", () => ({ recordAudit: (entry: Entry) => audit(entry) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirected(url);
  },
}));

const { addBotPhraseAction, ignoreBotUnmatchedAction, mapBotUnmatchedAction, removeBotPhraseAction, switchBotPhraseAction } = await import("@/app/actions/admin-bot");

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const MAKEUP = "عايز ابلكيشن لميكب ارتست";

beforeEach(() => {
  state.store = new MemoryStore();
  state.role = "support";
  audit.mockClear();
});

describe("Admin › Bot dictionary actions", () => {
  it("lets owners, admins and support teach the bot; a viewer only sees it", async () => {
    expect((["owner", "admin", "support", "viewer"] as const).map((role) => can(role, "bot.edit"))).toEqual([true, true, true, false]);
    state.role = "viewer";
    await expect(addBotPhraseAction({}, form({ intent: "kind.restaurant", lang: "en", text: "tea house" }))).rejects.toThrow("redirect /admin?denied=bot.edit");
    await expect(switchBotPhraseAction(form({ intent: "kind.restaurant", phrase: JSON.stringify({ lang: "en", text: "restaurant", off: true }) }))).rejects.toThrow(Redirected);
    await expect(ignoreBotUnmatchedAction(form({ step: "kind", normalized: "x" }))).rejects.toThrow(Redirected);
    expect(await state.store.listBotPhrases()).toEqual([]);
    expect(audit).not.toHaveBeenCalled();
  });

  it("adds a phrase, says so, and logs it; an error is shown on the field", async () => {
    const added = await addBotPhraseAction({}, form({ intent: "kind.restaurant", lang: "ar-eg", text: "زلابيا" }));
    expect(added).toMatchObject({ ok: true, message: 'Added "زلابيا" to Business: Restaurant & café (Arabic: Egyptian). The bot understands it now.' });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "bot.phrase_add", target: { type: "bot_phrase", id: (await state.store.listBotPhrases())[0]!.id } }));
    expect(await addBotPhraseAction({}, form({ intent: "kind.restaurant", lang: "ar-eg", text: "زلابيا" }))).toMatchObject({ ok: true, message: expect.stringContaining("is already in") });
    expect(audit).toHaveBeenCalledTimes(1);
    expect(await addBotPhraseAction({}, form({ intent: "kind.restaurant", lang: "ar-eg", text: "" }))).toEqual({ errors: { text: "Type the phrase." }, values: { lang: "ar-eg", text: "" } });
  });

  it("switches a built-in phrase off and on from the button pressed, and removes a team phrase", async () => {
    const off = form({ intent: "kind.restaurant", phrase: JSON.stringify({ lang: "en", text: "restaurant", off: true }) });
    await switchBotPhraseAction(off);
    await switchBotPhraseAction(off);
    expect(await state.store.listBotPhrases()).toMatchObject([{ kind: "off", text: "restaurant" }]);
    expect(audit.mock.calls.map(([e]) => e.action)).toEqual(["bot.phrase_switch"]);
    await switchBotPhraseAction(form({ intent: "kind.restaurant", phrase: JSON.stringify({ lang: "en", text: "restaurant", off: false }) }));
    expect(await state.store.listBotPhrases()).toEqual([]);
    await switchBotPhraseAction(form({ intent: "kind.restaurant", phrase: "not json" }));
    await addBotPhraseAction({}, form({ intent: "kind.fitness", lang: "tr", text: "pilates stüdyosu" }));
    const [phrase] = await state.store.listBotPhrases();
    await removeBotPhraseAction(form({ id: phrase!.id }));
    await removeBotPhraseAction(form({ id: phrase!.id }));
    expect(await state.store.listBotPhrases()).toEqual([]);
    expect(audit.mock.calls.map(([e]) => e.action)).toEqual(["bot.phrase_switch", "bot.phrase_switch", "bot.phrase_add", "bot.phrase_remove"]);
  });

  it("maps what owners typed in one click, or ignores it, and logs which", async () => {
    const row = { step: "kind" as const, text: MAKEUP, normalized: normalizeText(MAKEUP), dashLang: "ar" as const, dialect: "ar-eg" as const, chosenIntent: "kind.bookings", status: "open" as const, mappedIntent: null, createdAt: NOW, resolvedAt: null, resolvedBy: null };
    await state.store.addBotUnmatched(row);
    await state.store.addBotUnmatched({ ...row, step: "features", chosenIntent: null });
    const mapped = await mapBotUnmatchedAction({}, form({ step: "kind", normalized: row.normalized, intent: "kind.bookings", lang: "ar-eg", text: MAKEUP }));
    expect(mapped).toMatchObject({ ok: true, message: expect.stringContaining("to Business:") });
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ action: "bot.unmatched_map", target: { type: "bot_unmatched", id: "kind" }, summary: expect.stringContaining("typed 1 time on the kind question") }));
    expect(await mapBotUnmatchedAction({}, form({ step: "kind", normalized: row.normalized, intent: "feature.chat", lang: "ar-eg", text: MAKEUP }))).toMatchObject({ message: "Choose one of this question's intents." });
    await ignoreBotUnmatchedAction(form({ step: "features", normalized: row.normalized, text: MAKEUP }));
    await ignoreBotUnmatchedAction(form({ step: "features", normalized: row.normalized, text: MAKEUP }));
    expect(audit.mock.calls.map(([e]) => e.action)).toEqual(["bot.unmatched_map", "bot.unmatched_ignore"]);
    expect((await state.store.listBotUnmatched({ status: "open", offset: 0, limit: 10 })).total).toBe(0);
  });

  it("has audit labels, and a place in the admin's menu with an icon of the set", () => {
    for (const action of ["bot.phrase_add", "bot.phrase_remove", "bot.phrase_switch", "bot.unmatched_map", "bot.unmatched_ignore"]) expect(AUDIT_ACTIONS).toHaveProperty([action]);
    expect(AUDIT_TARGETS).toMatchObject({ bot_phrase: "Bot phrase", bot_unmatched: "Unmatched bot phrase" });
    const layout = readFileSync(path.join(process.cwd(), "src/app/admin/layout.tsx"), "utf8");
    expect(layout).toContain('{ href: "/admin/bot", label: "Bot dictionary", icon: "forum" }');
    expect(ICON_NAMES).toContain("forum");
  });

  it("renders the dictionary and the unmatched phrases, with the controls only for who may change them", async () => {
    const { default: DictionaryPage } = await import("@/app/admin/bot/page");
    const { default: UnmatchedPage } = await import("@/app/admin/bot/unmatched/page");
    await addBotPhraseAction({}, form({ intent: "kind.restaurant", lang: "ar-eg", text: "زلابيا" }));
    await switchBotPhraseAction(form({ intent: "kind.restaurant", phrase: JSON.stringify({ lang: "en", text: "restaurant", off: true }) }));
    await state.store.addBotUnmatched({ step: "kind", text: MAKEUP, normalized: normalizeText(MAKEUP), dashLang: "ar", dialect: "ar-eg", chosenIntent: "kind.bookings", status: "open", mappedIntent: null, createdAt: NOW, resolvedAt: null, resolvedBy: null });
    const html = async (page: (props: never) => Promise<ReactElement>, params: Record<string, string>) =>
      renderToStaticMarkup(await page({ searchParams: Promise.resolve(params), params: Promise.resolve({}) } as never));

    const dictionary = await html(DictionaryPage, { lang: "ar-eg", try: "عايز مطعم كشري" });
    expect(dictionary).toContain("Bot dictionary");
    expect(dictionary).toContain("Unmatched phrases (1)");
    expect(dictionary).toContain("زلابيا");
    expect(dictionary).toContain("Sure: Business: Restaurant &amp; café. Written in Arabic: Egyptian.");
    expect(dictionary).toContain("Add phrase");
    expect(dictionary).toContain("Switch off");
    const english = await html(DictionaryPage, { lang: "en" });
    expect(english).toContain("Switch on");
    expect(await html(DictionaryPage, { step: "want" })).toContain("أبغى");

    const unmatched = await html(UnmatchedPage, {});
    expect(unmatched).toContain(MAKEUP);
    expect(unmatched).toContain("Business: Bookings");
    expect(unmatched).toContain("Add to ");
    expect(unmatched).toContain("Ignore");
    expect(unmatched).toContain("written in Arabic: Egyptian");

    state.role = "viewer";
    const seen = await html(UnmatchedPage, { step: "kind" });
    expect(seen).toContain(MAKEUP);
    expect(seen).toContain("Your role can see this but not teach the bot.");
    expect(seen).not.toContain("Ignore");
    expect(await html(DictionaryPage, {})).not.toContain("Add phrase");
  });
});
