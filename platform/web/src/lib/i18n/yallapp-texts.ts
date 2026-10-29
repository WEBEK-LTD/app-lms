import { APP_TYPES, KINDS } from "../app/kinds";
import type { App, AppBackend } from "../data/types";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "../pages/defaults";
import { applyDesign, DESIGNS } from "../pages/designs";
import { aboutPage, contactPage } from "../pages/designs/build";
import { SCREEN_LABELS } from "../pages/labels";
import { newBlock } from "../pages/model";
import { blockTypesFor, itemSourcesFor, screenOptionsFor } from "../pages/sources";
import { ENTRY_LISTS, TRANSLATABLE, TRANSLATABLE_ENTRIES, type LayoutBlock, type LayoutContent } from "../pages/types";

/**
 * 43 Every text Yallapp writes into an app's pages: the default tabs, page
 * titles and home blocks of every kind of app (WordPress and the hosted
 * API), the ready-made designs' sample texts, and what a new block starts
 * with. `{app}` stands for the app's name. The built-in dictionary
 * (lib/i18n/builtin) must have each in Arabic and Turkish; a unit test
 * fails when a new one is added without them.
 */

/** The texts of a layout that can carry translations, as written. */
export function layoutTexts(layout: Pick<LayoutContent, "tabs" | "pages" | "menu">): string[] {
  const out: string[] = [];
  const add = (value: unknown) => {
    if (typeof value === "string" && value.trim()) out.push(value);
  };
  for (const tab of [...layout.tabs, ...(layout.menu ?? [])]) add(tab.label);
  for (const page of layout.pages) {
    add(page.title);
    for (const block of page.blocks) out.push(...blockTexts(block));
  }
  return out;
}

function blockTexts(block: LayoutBlock): string[] {
  const out: string[] = [];
  const record = block as unknown as Record<string, unknown>;
  for (const field of TRANSLATABLE.block) if (typeof record[field] === "string" && (record[field] as string).trim()) out.push(record[field] as string);
  for (const list of ENTRY_LISTS) {
    for (const entry of (record[list] ?? []) as Record<string, unknown>[]) {
      for (const field of TRANSLATABLE_ENTRIES[list]) if (typeof entry[field] === "string" && (entry[field] as string).trim()) out.push(entry[field] as string);
    }
  }
  return out;
}

const BACKENDS: AppBackend[] = ["hosted", "wordpress"];

function sampleApp(appType: App["appType"], backend: AppBackend, appName: string | null): App {
  return { appType, backend, appName, template: "classic", font: "Bricolage Grotesque", brandingDoneAt: null } as unknown as App;
}

/** Whether a text has words to translate ("24/7" and "100%" don't); 110 a unit is one too ("48 h"). */
export function hasWords(text: string): boolean {
  return /\p{L}/u.test(text.replace(/\{app\}/g, ""));
}

/** Every Yallapp-written page text, once each, in a stable order. */
export function yallappPageTexts(): string[] {
  const texts = new Set<string>();
  const now = new Date("2026-01-01T00:00:00Z");
  const add = (list: string[]) => list.filter(hasWords).forEach((t) => texts.add(t));
  for (const kind of KINDS) {
    for (const backend of BACKENDS) {
      for (const name of ["{app}", null]) {
        add(layoutTexts(defaultLayout({ ...sampleApp(kind.engine, backend, name), vertical: kind.vertical }, BUILT_IN_APP_DEFAULTS, now)));
      }
    }
  }
  for (const design of DESIGNS) {
    // 110 With the pictures (and the welcome heading the banner repeats taken out), and without them as apps that chose a design before have it.
    for (const [name, pictureBase] of [["{app}", "https://yallapp.test"], [null, "https://yallapp.test"], ["{app}", undefined], [null, undefined]] as const) {
      const layout = applyDesign(design, {
        appName: name,
        facts: { website: "https://example.com", email: "hello@example.com", whatsapp: "+905551112233" },
        current: { appearance: { ...BUILT_IN_APP_DEFAULTS.appearance, secondary_color: null }, languages: BUILT_IN_APP_DEFAULTS.languages },
        now,
        // 99.1 With the Social links block the Contact page gets.
        social: [{ network: "instagram", url: "https://instagram.com/example" }],
        // And the pictures, with the banner a home page without slides gets.
        pictureBase,
      });
      add(layoutTexts(layout));
    }
  }
  // 99.1 The banner a home page without slides gets (a team's design), and 110.3 the About us and Contact pages it gets when it has none.
  texts.add("Welcome to {app}");
  add(layoutTexts({ tabs: [], pages: [aboutPage(), contactPage()].map((p) => ({ ...p, updated_at: now.toISOString() })) }));
  // What a new block starts with: placeholders, titles and quick links to the app's screens.
  for (const appType of APP_TYPES) {
    for (const backend of BACKENDS) {
      const app = sampleApp(appType, backend, "{app}");
      const screens = screenOptionsFor(app);
      for (const type of blockTypesFor(app)) add(blockTexts(newBlock(type, itemSourcesFor(app), screens)));
      add(screens.map((s) => s.label));
    }
  }
  add(Object.values(SCREEN_LABELS));
  // The name used when an app has none yet.
  texts.add("our app");
  return [...texts];
}
