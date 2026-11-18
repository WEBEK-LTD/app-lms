import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { ensureStoriesSeeded } from ".";
import { storyViewOf, type StoryView } from "./view";

/** 165 Dashboard › Stories for Studio's canvas and inspector: copied from the design the first time (as the Stories page does). */
export async function studioStories(store: DataStore, app: App, now: Date): Promise<StoryView[]> {
  await ensureStoriesSeeded(store, app, now);
  return (await store.listAppStories(app.id)).map(storyViewOf);
}
