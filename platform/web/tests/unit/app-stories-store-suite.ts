import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, AppStory } from "@/lib/data/types";

/**
 * 165 Dashboard › Stories in the data stores, the same on the memory store
 * and on MySQL or MariaDB (migration 0143): in their order, changed,
 * reordered, removed, copied from Studio once per key, gone with their app,
 * and the app marked once its Studio stories were copied.
 */

export const NOW = new Date("2026-11-18T09:00:00.000Z");

export async function storiesApp(s: DataStore): Promise<App> {
  const suffix = randomUUID().slice(0, 8);
  const { client } = await registerClient(s, { name: "Leqaa Flowers", email: `leqaa-${suffix}@stories.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
  const app: App = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", appName: "Leqaa", connector: { kind: "catalog" } };
  await s.createApp(app);
  return app;
}

export function storyOf(appId: string, n: number, extra: Partial<Omit<AppStory, "id">> = {}): Omit<AppStory, "id"> {
  return {
    appId,
    position: n,
    enabled: true,
    startsAt: null,
    endsAt: null,
    media: { kind: "image", imageUrl: `https://files.test/story-${n}.jpg`, videoUrl: null },
    texts: { en: { title: `Story ${n}`, ring: `Ring ${n}` }, ar: { title: `قصة ${n}` } },
    icon: "favorite",
    action: null,
    categoryId: null,
    importKey: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...extra,
  };
}

export function appStoriesStoreSuite(make: () => DataStore) {
  it("165 keeps an app's stories in their order with everything they carry", async () => {
    const s = make();
    const app = await storiesApp(s);
    const other = await storiesApp(s);
    const b = (await s.createAppStory(storyOf(app.id, 1)))!;
    const a = (await s.createAppStory(storyOf(app.id, 0, { media: { kind: "video", imageUrl: null, videoUrl: "https://files.test/v.mp4" }, action: { type: "screen", screen: "courses", category_id: "12" }, categoryId: "12", startsAt: new Date("2026-11-20T00:00:00.000Z"), endsAt: new Date("2026-11-25T00:00:00.000Z"), enabled: false })))!;
    await s.createAppStory(storyOf(other.id, 0));
    const list = await s.listAppStories(app.id);
    expect(list.map((x) => x.id)).toEqual([a.id, b.id]);
    expect(list[0]).toEqual({ ...storyOf(app.id, 0, { media: { kind: "video", imageUrl: null, videoUrl: "https://files.test/v.mp4" }, action: { type: "screen", screen: "courses", category_id: "12" }, categoryId: "12", startsAt: new Date("2026-11-20T00:00:00.000Z"), endsAt: new Date("2026-11-25T00:00:00.000Z"), enabled: false }), id: a.id });
    expect(await s.getAppStory(app.id, b.id)).toEqual({ ...storyOf(app.id, 1), id: b.id });
    // Another app's story isn't this app's.
    expect(await s.getAppStory(other.id, b.id)).toBeNull();
  });

  it("165 changes, reorders and removes a story, only the app's own", async () => {
    const s = make();
    const app = await storiesApp(s);
    const other = await storiesApp(s);
    const [x, y, z] = [(await s.createAppStory(storyOf(app.id, 0)))!, (await s.createAppStory(storyOf(app.id, 1)))!, (await s.createAppStory(storyOf(app.id, 2)))!];
    const later = new Date(NOW.getTime() + 60_000);
    expect(await s.updateAppStory(app.id, y.id, { texts: { en: { title: "Love", kicker: "For love", button: "Send flowers" } }, icon: null, enabled: false, action: { type: "page", page_slug: "bouquet" }, updatedAt: later })).toBe(true);
    expect(await s.updateAppStory(other.id, y.id, { enabled: true, updatedAt: later })).toBe(false);
    expect(await s.getAppStory(app.id, y.id)).toMatchObject({ texts: { en: { title: "Love", kicker: "For love", button: "Send flowers" } }, icon: null, enabled: false, action: { type: "page", page_slug: "bouquet" }, updatedAt: later, media: y.media });
    await s.reorderAppStories(app.id, [z.id, x.id, 999_999], later);
    expect((await s.listAppStories(app.id)).map((t) => t.id)).toEqual([z.id, x.id, y.id]);
    expect(await s.deleteAppStory(other.id, x.id)).toBe(false);
    expect(await s.deleteAppStory(app.id, x.id)).toBe(true);
    expect(await s.deleteAppStory(app.id, x.id)).toBe(false);
    expect((await s.listAppStories(app.id)).map((t) => t.id)).toEqual([z.id, y.id]);
  });

  it("165 copies a story from Studio once per key, and marks the app once", async () => {
    const s = make();
    const app = await storiesApp(s);
    const first = await s.createAppStory(storyOf(app.id, 0, { importKey: "home:hero:0" }));
    expect(first).not.toBeNull();
    expect(await s.createAppStory(storyOf(app.id, 0, { importKey: "home:hero:0" }))).toBeNull();
    // A copy from Studio is no save of the owner's (the story elements still follow the design).
    expect((await s.getAppById(app.id))?.storiesSavedAt ?? null).toBeNull();
    // The owner's own (no key) are never refused, and saved in Dashboard › Stories.
    expect(await s.createAppStory(storyOf(app.id, 1))).not.toBeNull();
    expect((await s.getAppById(app.id))?.storiesSavedAt).toBeTruthy();
    expect(await s.createAppStory(storyOf(app.id, 2))).not.toBeNull();
    expect((await s.listAppStories(app.id)).length).toBe(3);
    expect((await s.getAppById(app.id))?.storiesSeededAt ?? null).toBeNull();
    expect(await s.markStoriesSeeded(app.id, NOW)).toBe(true);
    expect(await s.markStoriesSeeded(app.id, new Date(NOW.getTime() + 1000))).toBe(false);
    expect((await s.getAppById(app.id))?.storiesSeededAt).toEqual(NOW);
  });

  it("165 goes with its app", async () => {
    const s = make();
    const app = await storiesApp(s);
    await s.createAppStory(storyOf(app.id, 0));
    const deletion = { id: randomUUID(), appId: app.id, clientId: app.clientId, appName: "Leqaa", reason: "owner" as const, deletedBy: "owner@stories.test", deletedAt: NOW, purgeAfter: NOW, status: "waiting" as const, closedAt: null, closedBy: null, pendingBuilds: [] };
    expect(await s.softDeleteApp(deletion)).toBe(true);
    expect(await s.purgeDeletedApp(deletion.id, "test", NOW, [])).toBe(true);
    expect(await s.listAppStories(app.id)).toEqual([]);
  });
}
