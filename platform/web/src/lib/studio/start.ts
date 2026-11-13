import type { App } from "../data/types";
import { demoDesign } from "../demo/look";
import { DEMO_TAB_BARS } from "../demo/screens";
import { designLayout } from "../pages/layout";
import type { LayoutContent } from "../pages/types";
import { demoPageTabs, demoScreenPages, demoTabPages } from "./demo-pages";
import type { SectionContext, TemplateInfo } from "./sections";

/**
 * A new Studio project's first draft (app/actions/studio-projects.ts): the
 * pages its kind starts with and its home as a Studio page from the chosen
 * template. Templates = demos: a demo's template is the whole demo, its
 * design's pages, tabs and look, its home the page the demo shows, 119 its
 * bar's design and 120 every tab after the home a Studio page drawn around
 * the tab's screen, as the demo has them (lib/studio/demo-pages.ts;
 * tests/unit/studio-demo-templates.test.ts compares the two). 123 A
 * template for the whole project (lib/studio/academy.ts) the same, with its
 * own tabs, bar and look; `site` is the owner's website, when known.
 */
export function startLayout(app: App, template: TemplateInfo, ready: LayoutContent, now: Date, made: SectionContext, site: string | null = null): LayoutContent {
  const project = template.project ?? null;
  // 128 A demo's template is the demo, its own pages after the home too.
  const ctx: SectionContext = template.demo ? { ...made, demo: template.demo } : made;
  const designed = template.demo ? designLayout(app, demoDesign(template.demo), ready, now) : ready;
  // 123 A template for the whole project: its tabs (a Blog tab with the site's blog, when the site is known) and its look.
  const layout = project
    ? { ...designed, tabs: project.tabs(designed.tabs, site), appearance: { ...designed.appearance, ...project.appearance } }
    : designed;
  const home = template.make(ctx);
  const pages = layout.pages.some((p) => p.slug === "home")
    ? layout.pages.map((p) => (p.slug === "home" ? { ...p, blocks: [], studio: home } : p))
    : [{ slug: "home", title: "Home", show_title: false, updated_at: now.toISOString(), blocks: [], studio: home }, ...layout.pages];
  if (!template.demo && !project) return { ...layout, pages };
  const taken = new Set(pages.map((p) => p.slug));
  // 123 A template whose screens draw their own large titles has nothing over its tabs' screens.
  const ownTabPages = demoTabPages(layout.tabs, ctx).map((p) => (project?.bare_tab_pages ? { ...p, studio: { body: { ...p.studio.body, children: [] }, screen: p.studio.screen } } : p));
  const tabPages = [...ownTabPages, ...demoScreenPages(app, layout.tabs, ctx, new Set([...taken, ...layout.tabs.map((t) => t.id)]))]
    .filter((p) => !taken.has(p.slug))
    .map((p) => ({ ...p, show_title: false, updated_at: now.toISOString(), blocks: [] }))
    .map((p) => (project?.page_header && p.studio.header ? { ...p, studio: { ...p.studio, header: { ...p.studio.header, ...project.page_header } } } : p));
  const tabBar = template.demo ? DEMO_TAB_BARS[template.demo] : project!.tab_bar;
  return { ...layout, pages: [...pages, ...tabPages], tabs: demoPageTabs(layout.tabs, ctx), tab_bar: structuredClone(tabBar) };
}
