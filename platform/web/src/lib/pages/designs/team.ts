import { kindOf } from "../../app/kinds";
import { newId } from "../../crypto/tokens";
import type { DataStore } from "../../data/store";
import type { App, DesignsSetting } from "../../data/types";
import { clearPlatformSettingsCache } from "../../settings/platform";
import { loadLayout } from "../layout";
import { parseLayoutContent } from "../validate";
import type { Design } from "./build";
import { designsSetting } from "./catalog";
import { DESIGNS } from "./index";

/**
 * 84.4 The team's designs (Admin › Designs): made from an app's draft (the
 * page editor is where they're built), named and described like the
 * built-in ones; and the built-in ones the team hides.
 */

export const TEAM_DESIGN_LIMITS = { max: 60, nameChars: 40, descriptionChars: 110 } as const;

export type TeamDesignError = "name" | "description" | "limit" | "app" | "invalid" | "not_found";

function cleanText(value: unknown, max: number): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text && text.length <= max ? text : null;
}

async function save(store: DataStore, next: DesignsSetting, by: string, now: Date): Promise<void> {
  const empty = next.custom.length === 0 && next.hidden.length === 0;
  await store.setPlatformSetting("designs", empty ? null : next, by, now);
  clearPlatformSettingsCache();
}

/** A new design for the app's kind from the app's draft: its tabs, side menu, pages and look (not its main colour). */
export async function addDesignFromApp(
  store: DataStore,
  app: App | null,
  input: { name: unknown; description: unknown },
  by: string,
  now: Date,
): Promise<{ ok: true; design: Design } | { ok: false; error: TeamDesignError; detail?: string }> {
  const name = cleanText(input.name, TEAM_DESIGN_LIMITS.nameChars);
  if (!name) return { ok: false, error: "name" };
  const description = cleanText(input.description, TEAM_DESIGN_LIMITS.descriptionChars);
  if (!description) return { ok: false, error: "description" };
  if (!app) return { ok: false, error: "app" };
  const setting = await designsSetting(store, { fresh: true });
  if (setting.custom.length >= TEAM_DESIGN_LIMITS.max) return { ok: false, error: "limit" };
  const draft = (await loadLayout(store, app, now)).draft;
  // Checked like a publish, so owners only ever get a design that works.
  const parsed = parseLayoutContent(draft, { app, now });
  if (!parsed.ok) return { ok: false, error: "invalid", detail: parsed.errors[0] };
  const layout = parsed.value;
  const { template, corners, cards, font, secondary_color } = layout.appearance;
  const design: Design = {
    id: `team-${newId().slice(0, 8)}`,
    kind: kindOf(app).id,
    name,
    description,
    look: { template, corners, cards, font, secondary_color },
    tabs: layout.tabs,
    ...(layout.menu?.length ? { menu: layout.menu } : {}),
    // Hand-picked entries are the app's own: the design's lists start from the newest instead.
    pages: layout.pages.map((p) => ({ slug: p.slug, title: p.title, show_title: p.show_title, blocks: p.blocks.map((b) => (b.query?.ids.length ? { ...b, query: { ...b.query, ids: [] } } : b)) })),
  };
  await save(store, { ...setting, custom: [...setting.custom, design] }, by, now);
  return { ok: true, design };
}

export async function editTeamDesign(store: DataStore, id: string, input: { name: unknown; description: unknown }, by: string, now: Date): Promise<{ ok: true } | { ok: false; error: TeamDesignError }> {
  const setting = await designsSetting(store, { fresh: true });
  if (!setting.custom.some((d) => d.id === id)) return { ok: false, error: "not_found" };
  const name = cleanText(input.name, TEAM_DESIGN_LIMITS.nameChars);
  if (!name) return { ok: false, error: "name" };
  const description = cleanText(input.description, TEAM_DESIGN_LIMITS.descriptionChars);
  if (!description) return { ok: false, error: "description" };
  await save(store, { ...setting, custom: setting.custom.map((d) => (d.id === id ? { ...d, name, description } : d)) }, by, now);
  return { ok: true };
}

export async function deleteTeamDesign(store: DataStore, id: string, by: string, now: Date): Promise<boolean> {
  const setting = await designsSetting(store, { fresh: true });
  if (!setting.custom.some((d) => d.id === id)) return false;
  await save(store, { ...setting, custom: setting.custom.filter((d) => d.id !== id) }, by, now);
  return true;
}

/** Hides a built-in design from owners (apps that use it keep their pages), or shows it again. */
export async function setBuiltInDesignHidden(store: DataStore, id: string, hidden: boolean, by: string, now: Date): Promise<boolean> {
  if (!DESIGNS.some((d) => d.id === id)) return false;
  const setting = await designsSetting(store, { fresh: true });
  const list = setting.hidden.filter((h) => h !== id);
  await save(store, { ...setting, hidden: hidden ? [...list, id] : list }, by, now);
  return true;
}
