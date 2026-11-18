"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import type { DashKey } from "@/i18n/dashboard";
import { appLanguagesOf } from "@/lib/selling/store";
import { parseStory, STORY_LIMITS, type StoryInput } from "@/lib/stories";
import { leadSetSlug, storySetPages } from "@/lib/stories/sets";
import { storyViewsOf, type StoryView } from "@/lib/stories/view";

// 165 Dashboard › Stories: adding, changing, switching, reordering and removing the app's stories.

export type StoriesResult = { ok: true; stories: StoryView[] } | { ok: false; errors: DashKey[] };

async function requireStoriesApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app) redirect("/dashboard/app-type");
  return context as ClientContext & { app: App };
}

async function listed(appId: string): Promise<StoriesResult> {
  const store = await getStore();
  revalidatePath("/dashboard/stories");
  const record = await store.getAppLayout(appId);
  // 194 Each with its set (a story from before 194 in the lead page's).
  return { ok: true, stories: storyViewsOf(await store.listAppStories(appId), leadSetSlug((record?.published ?? record?.draft)?.pages ?? [])) };
}

/** Adds a story (`id` null, at the end) or changes one. */
export async function saveStoryAction(id: number | null, input: StoryInput): Promise<StoriesResult> {
  const context = await requireStoriesApp();
  const { app } = context;
  const store = await getStore();
  const now = new Date();
  const record = await store.getAppLayout(app.id);
  const languages = await appLanguagesOf(store, app);
  const pages = (record?.published ?? record?.draft)?.pages ?? [];
  const parsed = parseStory(input ?? {}, { app, languages: [languages.default, ...languages.available.filter((l) => l !== languages.default)], slugs: new Set([...pages.map((p) => p.slug), ...(record?.draft.pages ?? []).map((p) => p.slug)]) });
  if (!parsed.ok) return parsed;
  const current = await store.listAppStories(app.id);
  if (id === null) {
    if (current.length >= STORY_LIMITS.stories) return { ok: false, errors: ["stories.errTooMany"] };
    const position = current.length ? Math.max(...current.map((s) => s.position)) + 1 : 0;
    // 194 In the set it was added to: one of the pages with story elements, else the lead page's.
    const sets = storySetPages(pages).map((p) => p.slug);
    const page = typeof input?.page === "string" && sets.includes(input.page) ? input.page : leadSetSlug(pages);
    await store.createAppStory({ ...parsed.value, appId: app.id, position, importKey: null, page, createdAt: now, updatedAt: now });
    await recordStaffChange(context, "Added a story");
  } else {
    if (!(await store.updateAppStory(app.id, id, { ...parsed.value, updatedAt: now }))) return { ok: false, errors: ["stories.errMissing"] };
    await recordStaffChange(context, "Changed a story");
  }
  return listed(app.id);
}

/** Shows a story in the app, or keeps it off. */
export async function setStoryEnabledAction(id: number, enabled: boolean): Promise<StoriesResult> {
  const context = await requireStoriesApp();
  const store = await getStore();
  if (!(await store.updateAppStory(context.app.id, Number(id), { enabled: enabled === true, updatedAt: new Date() }))) return { ok: false, errors: ["stories.errMissing"] };
  await recordStaffChange(context, enabled ? "Showed a story" : "Turned a story off");
  return listed(context.app.id);
}

/** Puts the stories in this order. */
export async function reorderStoriesAction(ids: number[]): Promise<StoriesResult> {
  const context = await requireStoriesApp();
  const store = await getStore();
  const list = (Array.isArray(ids) ? ids : []).map(Number).filter((n) => Number.isSafeInteger(n) && n > 0).slice(0, 100);
  await store.reorderAppStories(context.app.id, list, new Date());
  await recordStaffChange(context, "Reordered the stories");
  return listed(context.app.id);
}

/** Removes a story; the app stops showing it at once. */
export async function deleteStoryAction(id: number): Promise<StoriesResult> {
  const context = await requireStoriesApp();
  const store = await getStore();
  await store.deleteAppStory(context.app.id, Number(id));
  await recordStaffChange(context, "Removed a story");
  return listed(context.app.id);
}
