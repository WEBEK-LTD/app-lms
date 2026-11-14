import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ar, en, tr } from "@/i18n/dashboard/studio";
import { APP_WORDS } from "@/lib/studio/app-words";
import { ITEM_SOURCES, STUDIO_NODE_TYPES } from "@/lib/pages/types";
import { SECTIONS, TEMPLATES } from "@/lib/studio/sections";

/**
 * The Studio editor builds some of its words' keys as it runs (a list's
 * source, a section, a template, a section's word): a key with no text
 * stops the editor ("This page couldn't load"), so each one is checked
 * here in every language. 128.11 A section's words are the app's
 * (lib/studio/app-words.ts), not the editor's.
 */
describe("Studio editor words", () => {
  const words = [...readFileSync(path.resolve(__dirname, "../../src/lib/studio/sections.ts"), "utf8").matchAll(/^\s*\| "(\w+)"$/gm)].map((m) => m[1]!);
  const keys = [...ITEM_SOURCES.map((s) => `el_items_${s}`), ...STUDIO_NODE_TYPES.map((t) => `el_${t}`), ...SECTIONS.map((s) => `sec_${s.id}`), ...TEMPLATES.map((t) => `tpl_${t.id}`)];

  it("has a text for every list source, block, section, template and word", () => {
    expect(words.length).toBeGreaterThan(20);
    for (const [lang, dict] of Object.entries({ en, ar, tr }) as [string, Record<string, unknown>][]) {
      expect(keys.filter((k) => typeof dict[k] !== "string"), lang).toEqual([]);
    }
    for (const [lang, dict] of Object.entries(APP_WORDS) as [string, Record<string, unknown>][]) {
      expect(words.filter((k) => typeof dict[k] !== "string"), lang).toEqual([]);
    }
  });
});
