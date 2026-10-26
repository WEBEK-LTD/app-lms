import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App } from "@/lib/data/types";
import { NOW } from "./helpers";

/** 85.3 What automatic notifications keep, the same on every store: each notice once, and the carts. */
export function autoNoticesStoreSuite(store: () => DataStore) {
  it("takes each notice once per person and what it's about", async () => {
    const s = store();
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(s, { name: "Pulse", email: `pulse-${suffix}@auto.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", connector: { kind: "catalog" } };
    await s.createApp(app);
    const digits = suffix.replace(/\D/g, "").padEnd(3, "5").slice(0, 3);
    const a = (await s.createHostedUser({ appId: app.id, phone: `+90534${digits}0001`, name: "A", email: null, city: null, now: NOW }))!;
    const b = (await s.createHostedUser({ appId: app.id, phone: `+90534${digits}0002`, name: "B", email: null, city: null, now: NOW }))!;
    const claim = (userId: number, ref: string, kind = "event_soon") => s.claimAutoNotice({ appId: app.id, kind, ref, userId, now: NOW });
    const [first, again] = await Promise.all([claim(a.id, "event:1"), claim(a.id, "event:1")]);
    expect([first, again].filter(Boolean)).toHaveLength(1);
    expect(await claim(b.id, "event:1")).toBe(true);
    expect(await claim(a.id, "event:2")).toBe(true);
    expect(await claim(a.id, "event:1", "class_soon")).toBe(true);

    // Carts: kept per person; reminded once until they change.
    const at = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000);
    await s.saveHostedCart(app.id, a.id, 2, at(0));
    await s.saveHostedCart(app.id, b.id, 0, at(0));
    const left = await s.listLeftHostedCarts(at(-24), at(1), 10);
    expect(left.filter((c) => c.appId === app.id).map((c) => [c.userId, c.items])).toEqual([[a.id, 2]]);
    expect(await s.markHostedCartReminded(app.id, a.id, at(-1), at(4))).toBe(false);
    expect(await s.markHostedCartReminded(app.id, a.id, left.find((c) => c.appId === app.id)!.updatedAt, at(4))).toBe(true);
    expect((await s.listLeftHostedCarts(at(-24), at(5), 10)).filter((c) => c.appId === app.id)).toEqual([]);
    // A change after the reminder may bring another.
    await s.saveHostedCart(app.id, a.id, 3, at(5));
    expect((await s.listLeftHostedCarts(at(-24), at(9), 10)).filter((c) => c.appId === app.id).map((c) => c.items)).toEqual([3]);
  });
}
