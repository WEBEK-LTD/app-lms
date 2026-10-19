import { sha256Hex } from "../crypto/tokens";
import type { App } from "../data/types";
import { hasFeature, type PlanInfo } from "../plans";
import { blockActions, mapBlockActions } from "./block-actions";
import { defaultLayout } from "./defaults";
import { itemSourcesFor } from "./sources";
import type { Action, AppDefaultsSetting, ItemSource, Languages, Layout, LayoutBlock, LayoutContent } from "./types";

/**
 * 13.1 What an app's plan allows of its pages, look and languages. The
 * served layout (hosted API and the plugin's layout endpoint) goes through
 * `layoutForPlan`, so a feature the plan lacks disappears from the app
 * quietly, also after a downgrade; the page editor uses the same limits.
 */

/** The content sources the plan lets the pages list: the app's main one first. */
export function allowedSources(app: Pick<App, "appType" | "backend">, plan: Pick<PlanInfo, "limits"> | null): ItemSource[] {
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
  if (!plan) return layout;
  const sources = allowedSources(app, plan);
  let content: LayoutContent = { appearance: layout.appearance, languages: languagesForPlan(layout.languages, plan), tabs: layout.tabs, pages: layout.pages };
  if (!hasFeature(plan, "page_editor")) {
    const ready = defaultLayout(app, defaults, app.createdAt);
    content = { ...content, tabs: ready.tabs, pages: ready.pages };
  }
  content = {
    ...content,
    tabs: content.tabs.filter((t) => actionAllowed(t.target, sources)),
    pages: content.pages.map((p) => ({ ...p, blocks: p.blocks.filter((b) => blockAllowed(b, sources)).map((b) => cleanBlock(b, sources)) })),
  };
  const same = JSON.stringify(content) === JSON.stringify({ appearance: layout.appearance, languages: layout.languages, tabs: layout.tabs, pages: layout.pages });
  if (same) return layout;
  return { version: `${layout.version}~${sha256Hex(JSON.stringify(content)).slice(0, 12)}`, ...content };
}

/** Why a layout can't be published on this plan, or null. */
export function planLayoutErrors(content: LayoutContent, plan: PlanInfo | null): string[] {
  if (!plan) return [];
  const errors: string[] = [];
  const limit = plan.limits.languages;
  if (limit !== null && content.languages.available.length > limit) {
    errors.push(`Your ${plan.name} plan includes ${limit} app language${limit === 1 ? "" : "s"}. Turn off the others, or upgrade your plan.`);
  }
  return errors;
}
