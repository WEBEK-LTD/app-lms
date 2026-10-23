import { isAppType, kindOf } from "../../app/kinds";
import type { DataStore } from "../../data/store";
import type { App, AppVertical, DesignsSetting } from "../../data/types";
import { platformSetting } from "../../settings/platform";
import { DESIGNS, withCompanyPages } from "./index";
import type { Design } from "./build";

/**
 * 84.4 The designs owners can choose: the built-in ones (lib/pages/designs)
 * the team didn't hide, then the team's own (Admin › Designs, the
 * `designs` setting). The team's are made from an app's draft in the page
 * editor, so they are checked like any layout when an owner applies one.
 */

export const NO_DESIGNS: DesignsSetting = { custom: [], hidden: [] };

export async function designsSetting(store: DataStore, options: { fresh?: boolean } = {}): Promise<DesignsSetting> {
  return (await platformSetting(store, "designs", options))?.value ?? NO_DESIGNS;
}

/** Every design owners can choose, built-in first. */
export async function designCatalog(store: DataStore, options: { fresh?: boolean } = {}): Promise<Design[]> {
  const setting = await designsSetting(store, options);
  return [...DESIGNS.filter((d) => !setting.hidden.includes(d.id)), ...setting.custom.map((d, i) => withCompanyPages(d, DESIGNS.length + i))];
}

export async function findDesign(store: DataStore, id: unknown): Promise<Design | null> {
  if (typeof id !== "string" || !id) return null;
  return (await designCatalog(store)).find((d) => d.id === id) ?? null;
}

/** The designs for the app's kind (its engine and vertical). */
export async function designsForApp(store: DataStore, app: Pick<App, "appType"> & { vertical?: AppVertical | null }): Promise<Design[]> {
  if (!isAppType(app.appType)) return [];
  const kind = kindOf(app).id;
  return (await designCatalog(store)).filter((d) => d.kind === kind);
}

/** Whether the design is one the app's kind can use now. */
export async function designFitsApp(store: DataStore, design: Design, app: Pick<App, "appType"> & { vertical?: AppVertical | null }): Promise<boolean> {
  return (await designsForApp(store, app)).some((d) => d.id === design.id);
}
