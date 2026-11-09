import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import type { DataStore } from "@/lib/data/store";
import type { BotPhrase, BotUnmatched } from "@/lib/bot/types";
import { NOW } from "./helpers";

/** The app-builder bot's storage, the same on every store (MemoryStore, and MySQL or MariaDB with migration 0118). */
export function botStoreSuite(store: () => DataStore) {
  const phrase = (patch: Partial<BotPhrase> = {}): BotPhrase => ({
    id: randomUUID(),
    intent: "kind.restaurant",
    lang: "ar-eg",
    text: "مطعم فول",
    normalized: "مطعم فول",
    kind: "added",
    createdBy: "admin@yallapp.test",
    createdAt: NOW,
    ...patch,
  });
  const unmatched = (patch: Partial<Omit<BotUnmatched, "id">> = {}): Omit<BotUnmatched, "id"> => ({
    step: "kind",
    text: "ميكب ارتست",
    normalized: `ميكب ارتست ${randomUUID().slice(0, 8)}`,
    dashLang: "ar",
    dialect: "ar-eg",
    chosenIntent: null,
    status: "open",
    mappedIntent: null,
    createdAt: NOW,
    resolvedAt: null,
    resolvedBy: null,
    ...patch,
  });

  it("keeps the team's phrases, in Arabic and Turkish letters, oldest first, and replaces and deletes them", async () => {
    const s = store();
    const first = phrase({ createdAt: new Date(NOW.getTime() - 60_000), text: "kuaförüm", normalized: "kuaforum", lang: "tr", intent: "kind.bookings" });
    const second = phrase({ kind: "off" });
    await s.saveBotPhrase(first);
    await s.saveBotPhrase(second);
    const mine = (await s.listBotPhrases()).filter((p) => p.id === first.id || p.id === second.id);
    expect(mine).toEqual([first, second]);
    await s.saveBotPhrase({ ...second, text: "مطعم فول وطعمية" });
    expect((await s.listBotPhrases()).find((p) => p.id === second.id)?.text).toBe("مطعم فول وطعمية");
    expect(await s.deleteBotPhrase(first.id)).toBe(true);
    expect(await s.deleteBotPhrase(first.id)).toBe(false);
    expect((await s.listBotPhrases()).some((p) => p.id === first.id)).toBe(false);
  });

  it("logs what the bot didn't understand and the button chosen next, once", async () => {
    const s = store();
    const id = await s.addBotUnmatched(unmatched());
    expect(await s.getBotUnmatched(id)).toMatchObject({ id, step: "kind", text: "ميكب ارتست", chosenIntent: null, status: "open", dialect: "ar-eg" });
    expect(await s.setBotUnmatchedChoice(id, "kind.bookings")).toBe(true);
    expect(await s.setBotUnmatchedChoice(id, "kind.store")).toBe(false);
    expect((await s.getBotUnmatched(id))?.chosenIntent).toBe("kind.bookings");
    expect(await s.getBotUnmatched(id + 100_000)).toBeNull();
    expect(await s.setBotUnmatchedChoice(id + 100_000, "kind.store")).toBe(false);
  });

  it("lists them the latest first, by status and question", async () => {
    const s = store();
    const step = "colour" as const;
    const older = await s.addBotUnmatched(unmatched({ step, createdAt: new Date(NOW.getTime() - 120_000) }));
    const newer = await s.addBotUnmatched(unmatched({ step, createdAt: new Date(NOW.getTime() - 60_000) }));
    const listed = await s.listBotUnmatched({ status: "open", step, offset: 0, limit: 500 });
    const ids = listed.items.map((r) => r.id);
    expect(ids.indexOf(newer)).toBeLessThan(ids.indexOf(older));
    expect(listed.total).toBeGreaterThanOrEqual(2);
    expect(listed.items.every((r) => r.step === step && r.status === "open")).toBe(true);
    const page = await s.listBotUnmatched({ status: "open", step, offset: 0, limit: 1 });
    expect(page.items.length).toBe(1);
    expect(page.total).toBe(listed.total);
  });

  it("maps every open row of a question's text at once, and leaves the others", async () => {
    const s = store();
    const normalized = `زي اوبر ${randomUUID().slice(0, 8)}`;
    const a = await s.addBotUnmatched(unmatched({ normalized }));
    const b = await s.addBotUnmatched(unmatched({ normalized, chosenIntent: "kind.rides" }));
    const otherStep = await s.addBotUnmatched(unmatched({ normalized, step: "features" }));
    const at = new Date(NOW.getTime() + 1000);
    expect(await s.resolveBotUnmatched({ step: "kind", normalized, status: "mapped", mappedIntent: "kind.rides", resolvedBy: "admin@yallapp.test", resolvedAt: at })).toBe(2);
    expect(await s.getBotUnmatched(a)).toMatchObject({ status: "mapped", mappedIntent: "kind.rides", resolvedBy: "admin@yallapp.test", resolvedAt: at });
    expect((await s.getBotUnmatched(b))?.status).toBe("mapped");
    expect((await s.getBotUnmatched(otherStep))?.status).toBe("open");
    // Once resolved, a choice is no longer recorded, and resolving again changes nothing.
    expect(await s.setBotUnmatchedChoice(a, "kind.taxi")).toBe(false);
    expect(await s.resolveBotUnmatched({ step: "kind", normalized, status: "ignored", mappedIntent: null, resolvedBy: "x", resolvedAt: at })).toBe(0);
  });

  it("deletes the rows from before a date", async () => {
    const s = store();
    const old = await s.addBotUnmatched(unmatched({ createdAt: new Date("2020-01-01T00:00:00Z") }));
    const kept = await s.addBotUnmatched(unmatched());
    expect(await s.deleteBotUnmatchedBefore(new Date("2021-01-01T00:00:00Z"))).toBeGreaterThanOrEqual(1);
    expect(await s.getBotUnmatched(old)).toBeNull();
    expect(await s.getBotUnmatched(kept)).not.toBeNull();
  });
}
