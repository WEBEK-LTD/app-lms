import { KINDS, kindById, kindOf, type KindInfo } from "../app/kinds";
import type { App, AppType, MarketTemplate } from "../data/types";
import { isStudioProject } from "../studio/section";

/**
 * 106 The app kinds a template fits (lib/app/kinds.ts KINDS ids). A
 * template's pages are made for its project's engine (its lists, screens
 * and tabs), so it only fits kinds of that engine: the designer picks up to
 * three of them.
 */

export const MAX_TEMPLATE_KINDS = 3;

/** The kinds a project of this engine can be published for, in the picker's order. */
export function kindsForEngine(engine: AppType): KindInfo[] {
  return KINDS.filter((k) => k.engine === engine);
}

/** The kind of an app ("store", "restaurant", …): what a template fits and what a move must keep. */
export function appKindId(app: Pick<App, "appType"> & { vertical?: App["vertical"] }): string {
  return kindOf(app).id;
}

/** The kinds a template is listed under, known ones only. */
export function templateKinds(template: Pick<MarketTemplate, "kinds">): KindInfo[] {
  return template.kinds.map((id) => kindById(id)).filter((k): k is KindInfo => k !== null);
}

/** Whether a template can go on this app: a Studio project of one of its kinds. */
export function templateFits(template: Pick<MarketTemplate, "kinds">, app: Pick<App, "appType" | "section"> & { vertical?: App["vertical"] }): boolean {
  return isStudioProject(app) && template.kinds.includes(appKindId(app));
}
