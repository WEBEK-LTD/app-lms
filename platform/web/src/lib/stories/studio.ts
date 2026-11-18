import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import type { ShopCategories } from "../studio/shop-categories";
import { dashboardStoriesSaved, ensureStoriesSeeded } from ".";
import { leadSetSlug } from "./sets";
import { storyViewsOf, type StoryView } from "./view";

/**
 * 165 Dashboard › Stories for Studio's canvas and inspector: copied from the
 * design as the app shows it (as the Stories page does), each with its set
 * (194: the page whose story elements show it).
 */
export async function studioStories(store: DataStore, app: App, now: Date, shop: ShopCategories | null = null): Promise<StoryView[]> {
  await ensureStoriesSeeded(store, app, now, shop);
  const record = await store.getAppLayout(app.id);
  const lead = leadSetSlug((record?.published ?? record?.draft)?.pages ?? []);
  return storyViewsOf(await store.listAppStories(app.id), lead);
}

/**
 * 165 What Studio's canvas and inspector get of Dashboard › Stories: its
 * stories once the owner has saved them there (the canvas draws each page's
 * set), else none, and the story elements follow the design, editable in Studio.
 */
export async function studioStoriesFor(store: DataStore, app: App, now: Date, shop: ShopCategories | null = null): Promise<{ stories?: StoryView[]; storiesSaved: boolean }> {
  const stories = await studioStories(store, app, now, shop);
  const saved = await dashboardStoriesSaved(store, app);
  return saved ? { stories, storiesSaved: true } : { storiesSaved: false };
}
