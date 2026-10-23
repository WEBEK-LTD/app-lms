import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { LayoutBlock } from "@/lib/pages/types";
import { NOW } from "./helpers";

/** 84.3 Saved sections, the same on every store. */
export function sectionsStoreSuite(store: () => DataStore) {
  it("keeps an account's saved sections, newest first, and only its own", async () => {
    const s = store();
    const account = async (name: string) =>
      (await registerClient(s, { name, email: `${name.toLowerCase()}-${randomUUID()}@sections.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW)).client;
    const mine = await account("Hana");
    const theirs = await account("Ali");
    const blocks: LayoutBlock[] = [{ id: "hello", type: "text", visibility: "everyone", title: null, html: "<p>Hello</p>" }];
    const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);
    const first = { id: randomUUID(), clientId: mine.id, name: "Welcome", blocks, createdAt: at(1), createdBy: "owner@shop.test" };
    const second = { id: randomUUID(), clientId: mine.id, name: "Offers", blocks, createdAt: at(2), createdBy: null };
    await s.createSavedSection(first);
    await s.createSavedSection(second);
    await s.createSavedSection({ id: randomUUID(), clientId: theirs.id, name: "Theirs", blocks, createdAt: at(3), createdBy: null });

    const list = await s.listSavedSections(mine.id);
    expect(list.map((x) => x.name)).toEqual(["Offers", "Welcome"]);
    expect(list[1]).toEqual(first);
    // Another account can't delete it.
    expect(await s.deleteSavedSection(theirs.id, first.id)).toBe(false);
    expect(await s.deleteSavedSection(mine.id, first.id)).toBe(true);
    expect(await s.deleteSavedSection(mine.id, first.id)).toBe(false);
    expect((await s.listSavedSections(mine.id)).map((x) => x.name)).toEqual(["Offers"]);
  });
}
