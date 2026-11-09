import type { App } from "../data/types";
import { demoDesign } from "../demo/look";
import { designLayout } from "../pages/layout";
import type { LayoutContent } from "../pages/types";
import type { SectionContext, TemplateInfo } from "./sections";

/**
 * A new Studio project's first draft (app/actions/studio-projects.ts): the
 * pages its kind starts with and its home as a Studio page from the chosen
 * template. Templates = demos: a demo's template is the whole demo, its
 * design's pages, tabs and look and its home the page the demo shows
 * (tests/unit/studio-demo-templates.test.ts compares the two).
 */
export function startLayout(app: App, template: TemplateInfo, ready: LayoutContent, now: Date, ctx: SectionContext): LayoutContent {
  const layout = template.demo ? designLayout(app, demoDesign(template.demo), ready, now) : ready;
  const home = template.make(ctx);
  const pages = layout.pages.some((p) => p.slug === "home")
    ? layout.pages.map((p) => (p.slug === "home" ? { ...p, blocks: [], studio: home } : p))
    : [{ slug: "home", title: "Home", show_title: false, updated_at: now.toISOString(), blocks: [], studio: home }, ...layout.pages];
  return { ...layout, pages };
}
