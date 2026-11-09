import { mapTree } from "../studio/tree";
import { sha256Hex } from "../crypto/tokens";
import type { App } from "../data/types";
import { appSwitches } from "../app/switches";
import { hasFeature, pageEditorLevel, type PlanInfo } from "../plans";
import { blockActions, mapBlockActions } from "./block-actions";
import { defaultLayout } from "./defaults";
import { itemSourcesFor } from "./sources";
import type { Action, AppDefaultsSetting, BlockType, ItemSource, Languages, Layout, LayoutBlock, LayoutContent } from "./types";

/**
 * 13.1 What an app's plan allows of its pages, look and languages. The
 * served layout (hosted API and the plugin's layout endpoint) goes through
 * `layoutForPlan`, so a feature the plan lacks disappears from the app
 * quietly, also after a downgrade; the page editor uses the same limits.
 */

/**
 * The simple page editor (Starter): the blocks it can add. The blocks its
 * template's pages came with stay editable; web pages (custom code), block
 * styling, saved sections and more pages need the full editor.
 */
export const BASIC_BLOCK_TYPES: readonly BlockType[] = ["text", "image", "banner", "slider", "items", "button", "contact", "spacer"];
/** The blocks the simple editor's app never shows: custom code. */
export const BASIC_BLOCKED_TYPES: readonly BlockType[] = ["embed"];
/** The most pages an app on the simple editor has: its template's (the designs have 4 to 6). */
export const BASIC_MAX_PAGES = 6;

/** A block as the simple editor's app shows it: without its own styling. */
function plainBlock(block: LayoutBlock): LayoutBlock {
  if (block.look === undefined) return block;
  const { look: _look, ...rest } = block;
  void _look;
  return rest;
}

/** The content sources the plan lets the pages list: the app's main one first. */
export function allowedSources(app: Pick<App, "appType" | "backend"> & Partial<Pick<App, "connector">>, plan: Pick<PlanInfo, "limits"> | null): ItemSource[] {
  const all = itemSourcesFor(app);
  const limit = plan?.limits.sources ?? null;
  return limit === null ? all : all.slice(0, Math.max(1, limit));
}

/** At most the plan's number of languages: the default and the first others, in the owner's order (43 any language counts). */
export function languagesForPlan(languages: Languages, plan: Pick<PlanInfo, "limits"> | null): Languages {
  const limit = plan?.limits.languages ?? null;
  if (limit === null || languages.available.length <= limit) return languages;
  const others = languages.available.filter((l) => l !== languages.default).slice(0, Math.max(0, limit - 1));
  return { default: languages.default, available: languages.available.filter((l) => l === languages.default || others.includes(l)) };
}

function actionAllowed(action: Action | null | undefined, sources: ItemSource[]): boolean {
  return !action?.item || sources.includes(action.item.source);
}

function blockAllowed(block: LayoutBlock, sources: ItemSource[]): boolean {
  if (block.source && !sources.includes(block.source)) return false;
  return true;
}

function cleanBlock(block: LayoutBlock, sources: ItemSource[]): LayoutBlock {
  // 33 Entries' actions too; a quick link to an entry the plan leaves out goes.
  if (blockActions(block).every((a) => actionAllowed(a, sources))) return block;
  return mapBlockActions(block, (a) => (actionAllowed(a, sources) ? a : null));
}

/**
 * The layout as the plan allows it: without the full page editor, the
 * ready-made pages and tabs for the app type (keeping the published look and
 * languages); no lists from sources beyond the plan's; at most its
 * languages. The version changes when the result differs, so the plugin's
 * cache and the app's ETag pick up a plan change.
 */
export function layoutForPlan(layout: Layout, app: App, plan: PlanInfo | null, defaults: AppDefaultsSetting): Layout {
  const menuOf = (l: { menu?: LayoutContent["menu"] }) => (l.menu?.length ? { menu: l.menu } : {});
  if (!plan) return withSwitches(layout, app, { appearance: layout.appearance, languages: layout.languages, tabs: layout.tabs, ...tabBarOf(layout), ...menuOf(layout), pages: layout.pages });
  const sources = allowedSources(app, plan);
  let content: LayoutContent = { appearance: layout.appearance, languages: languagesForPlan(layout.languages, plan), tabs: layout.tabs, ...tabBarOf(layout), ...menuOf(layout), pages: layout.pages };
  const level = pageEditorLevel(plan);
  if (level === null) {
    // The ready-made pages, without a side menu; 109 the tab bar keeps its look.
    const ready = defaultLayout(app, defaults, app.createdAt);
    content = { appearance: content.appearance, languages: content.languages, tabs: ready.tabs, ...tabBarOf(content), pages: ready.pages };
  } else if (level === "basic") {
    // The simple editor: its pages up to the templates' number, no custom code, no block styling.
    const pages = content.pages.slice(0, BASIC_MAX_PAGES).map((p) => ({ ...p, blocks: p.blocks.filter((b) => !BASIC_BLOCKED_TYPES.includes(b.type)).map(plainBlock) }));
    const kept = new Set(pages.map((p) => p.slug));
    const opens = (t: { target: Action }) => t.target.type !== "page" || !t.target.page_slug || kept.has(t.target.page_slug);
    const tabs = content.tabs.filter(opens);
    const menu = (content.menu ?? []).filter(opens);
    content = { appearance: content.appearance, languages: content.languages, tabs, ...tabBarOf({ tabs, tab_bar: content.tab_bar }), ...menuOf({ menu }), pages };
  }
  const menu = (content.menu ?? []).filter((t) => actionAllowed(t.target, sources));
  const tabs = content.tabs.filter((t) => actionAllowed(t.target, sources));
  content = {
    appearance: content.appearance,
    languages: content.languages,
    tabs,
    ...tabBarOf({ tabs, tab_bar: content.tab_bar }),
    ...menuOf({ menu }),
    pages: content.pages.map((p) => {
      const page = { ...p, blocks: p.blocks.filter((b) => blockAllowed(b, sources)).map((b) => cleanBlock(b, sources)) };
      // 103R A Studio page only with Studio on the plan; its lists and taps within the plan's sources.
      if (!page.studio) return page;
      // Templates = demos: Yallapp's own Studio demos show their Studio home, motion and all, whatever the demos' plan has.
      const studioDemo = Boolean(app.demo && app.section === "studio");
      if (!hasFeature(plan, "studio") && !studioDemo) {
        const { studio: _studio, ...rest } = page;
        void _studio;
        return rest;
      }
      const motion = studioDemo || hasFeature(plan, "studio_motion");
      const body = mapTree(page.studio.body, (n) => {
        // 107.2 A hidden element stays in the editor only.
        if (n.hidden) return null;
        if ((n.type === "items" || n.type === "categories") && (n.source === undefined || !sources.includes(n.source))) return null;
        let node = n.action && !actionAllowed(n.action, sources) ? { ...n, action: null } : n;
        // 103R Motion only with "Motion in the editor" on the plan.
        if (!motion && node.motion) {
          const { motion: _motion, ...still } = node;
          void _motion;
          node = still;
        }
        return node;
      });
      return { ...page, studio: { ...page.studio, body: body ?? page.studio.body } };
    }),
  };
  return withSwitches(layout, app, content);
}

/** 109 The tab bar's look, without a middle tab that isn't one of the tabs any more. */
function tabBarOf(l: Pick<LayoutContent, "tabs" | "tab_bar">): Pick<LayoutContent, "tab_bar"> {
  if (!l.tab_bar) return {};
  const { center, ...rest } = l.tab_bar;
  const style = center && l.tabs.some((t) => t.id === center) ? { ...rest, center } : rest;
  return Object.keys(style).length ? { tab_bar: style } : {};
}

/**
 * 83.3 The content without the features the team switched off for the app
 * (lib/app/switches.ts), as a layout: the same one when nothing changed,
 * else with its own version.
 */
function withSwitches(layout: Layout, app: Pick<App, "switches">, content: LayoutContent): Layout {
  const on = appSwitches(app);
  const noIcon = <T extends { icon_url?: string | null }>(x: T): T => {
    if (on.own_icons || x.icon_url === undefined) return x;
    const { icon_url: _icon, ...rest } = x;
    void _icon;
    return rest as T;
  };
  const block = (b: LayoutBlock): LayoutBlock => {
    let next = b;
    if (!on.block_looks && next.look !== undefined) {
      const { look: _look, ...rest } = next;
      void _look;
      next = rest;
    }
    if (!on.own_icons && next.links?.some((l) => l.icon_url !== undefined)) next = { ...next, links: next.links.map(noIcon) };
    return next;
  };
  const menu = on.side_menu ? (content.menu ?? []).map(noIcon) : [];
  const switched: LayoutContent = {
    appearance: content.appearance,
    languages: content.languages,
    tabs: content.tabs.map(noIcon),
    ...tabBarOf(content),
    ...(menu.length ? { menu } : {}),
    pages: content.pages.map((p) => ({ ...p, blocks: p.blocks.map(block) })),
  };
  const original = { appearance: layout.appearance, languages: layout.languages, tabs: layout.tabs, ...tabBarOf(layout), ...(layout.menu?.length ? { menu: layout.menu } : {}), pages: layout.pages };
  if (JSON.stringify(switched) === JSON.stringify(original)) return layout;
  return { version: `${layout.version}~${sha256Hex(JSON.stringify(switched)).slice(0, 12)}`, ...switched };
}

/** Why a layout can't be published on this plan, or null. */
export function planLayoutErrors(content: LayoutContent, plan: PlanInfo | null): string[] {
  if (!plan) return [];
  const errors: string[] = [];
  const limit = plan.limits.languages;
  if (limit !== null && content.languages.available.length > limit) {
    errors.push(`Your ${plan.name} plan includes ${limit} app language${limit === 1 ? "" : "s"}. Turn off the others, or upgrade your plan.`);
  }
  // The simple page editor: the template's pages, no custom code, no block styling.
  if (pageEditorLevel(plan) === "basic") {
    if (content.pages.length > BASIC_MAX_PAGES) errors.push(`Your ${plan.name} plan includes up to ${BASIC_MAX_PAGES} pages. Remove the others, or upgrade your plan for the full page editor.`);
    const blocks = content.pages.flatMap((p) => p.blocks);
    if (blocks.some((b) => BASIC_BLOCKED_TYPES.includes(b.type))) errors.push(`Web page blocks need the full page editor. Remove them, or upgrade your plan.`);
    if (blocks.some((b) => b.look !== undefined)) errors.push(`Block styling needs the full page editor. Reset the blocks' look, or upgrade your plan.`);
  }
  // 103R Studio pages per project, on a Studio plan.
  const pages = plan.limits.studioPages;
  const studioPages = content.pages.filter((p) => p.studio).length;
  if (pages !== undefined && pages !== null && studioPages > pages) {
    errors.push(`Your ${plan.name} plan includes up to ${pages} Studio pages. Take the others out of Studio, or upgrade your plan.`);
  }
  return errors;
}
