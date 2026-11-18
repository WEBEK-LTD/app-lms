import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { dashboardStoriesSaved, ensureStoriesSeeded } from ".";
import { storyViewOf, type StoryView } from "./view";

/** 165 Dashboard › Stories for Studio's canvas and inspector: copied from the design the first time (as the Stories page does). */
export async function studioStories(store: DataStore, app: App, now: Date): Promise<StoryView[]> {
  await ensureStoriesSeeded(store, app, now);
  return (await store.listAppStories(app.id)).map(storyViewOf);
}

/**
 * 165 What Studio's canvas and inspector get of Dashboard › Stories: its
 * stories once the owner has saved them there (the canvas draws them), else
 * none, and the story elements follow the design, editable in Studio.
 */
export async function studioStoriesFor(store: DataStore, app: App, now: Date): Promise<{ stories?: StoryView[]; storiesSaved: boolean }> {
  const stories = await studioStories(store, app, now);
  const saved = await dashboardStoriesSaved(store, app);
  return saved ? { stories, storiesSaved: true } : { storiesSaved: false };
}
