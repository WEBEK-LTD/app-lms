import type { App } from "../data/types";
import { ENGINES, type KindInfo } from "../app/kinds";

/**
 * 103R Yallapp Studio is its own section of the account: Studio projects
 * (`App.section` "studio") have their own home, project pages and editor,
 * apart from the regular dashboard's apps.
 */

export function isStudioProject(app: Pick<App, "section"> | null | undefined): boolean {
  return app?.section === "studio";
}

/** Dashboard pages that belong to the account rather than one app: a Studio project leaves them where they are. */
const ACCOUNT_PAGES = new Set(["app-type", "businesses", "account", "team", "open"]);

/**
 * Where a dashboard address opens for a Studio project: the same page in
 * Studio's frame (`/studio/project/…`), its overview for the dashboard's
 * home, Studio's editor for the regular page editor; null for the
 * account's own pages.
 */
export function studioPathFor(path: string): string | null {
  const m = /^\/(?:ar\/|tr\/)?dashboard(\/[^?#]*)?(\?[^#]*)?/.exec(path);
  if (!m) return "/studio/project";
  const rest = (m[1] ?? "").replace(/\/+$/, "");
  const query = m[2] ?? "";
  const first = rest.split("/")[1] ?? "";
  if (ACCOUNT_PAGES.has(first)) return null;
  if (!first) return "/studio/project";
  if (first === "pages") return "/studio/editor";
  return `/studio/project${rest}${query}`;
}

/** 103R.3 Where a new Studio project's content comes from, as the new project's second step offers it. */
export type StudioSource = "catalog" | "wordpress" | "shopify" | "platform" | "custom_api";

const SOURCE_ORDER: readonly StudioSource[] = ["catalog", "wordpress", "shopify", "platform", "custom_api"];

/** Kinds only Studio offers (104 a delivery company, 105.1 food delivery, 105.2 ride hailing): their content is kept in Yallapp. */
export const STUDIO_ONLY_KINDS: ReadonlySet<string> = new Set(["delivery", "food", "rides"]);

/** The content sources a kind's engine takes, content kept in Yallapp first. */
export function studioSourcesFor(kind: Pick<KindInfo, "id" | "engine">): StudioSource[] {
  if (STUDIO_ONLY_KINDS.has(kind.id)) return ["catalog"];
  const websites: readonly string[] = ENGINES[kind.engine].websites;
  const sources = SOURCE_ORDER.filter((s) => websites.includes(s));
  return sources.length ? sources : ["catalog"];
}
