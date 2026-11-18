import type { StudioPage } from "../pages/types";
import { mapTree } from "../studio/tree";
import { dashboardStoryElements, withServedStories } from "./elements";
import { servedStories } from "./serve";
import { storyOfView, type StoryView } from "./view";

/**
 * 165 Studio's canvas: the page with Dashboard › Stories in its story
 * elements whose source is the dashboard, in the language being edited, as
 * the app shows them now. With none shown, an element keeps its design (to
 * be selected and switched), and the inspector says so.
 */
export function withDashboardStories(page: StudioPage, stories: readonly StoryView[] | undefined, lang: string, def: string, now: Date): StudioPage {
  if (!stories) return page;
  const elements = new Map(dashboardStoryElements(page.body).map((e) => [e.node.id, e.kind]));
  if (!elements.size) return page;
  const served = servedStories(stories.map((s) => storyOfView(s)), lang, def, now);
  if (!served.length) return page;
  const body = mapTree(page.body, (n) => {
    const kind = elements.get(n.id);
    return kind ? (withServedStories(n, kind, served) ?? n) : n;
  });
  return body ? { ...page, body } : page;
}
