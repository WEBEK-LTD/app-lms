import { describe, expect, it } from "vitest";
import { ar, en, tr } from "@/i18n/dashboard/studio";
import { APP_WORDS } from "@/lib/studio/app-words";
import { KINDS } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import { itemSourcesFor } from "@/lib/pages/sources";
import { parseStudioPage } from "@/lib/pages/validate";
import { PAGE_TEMPLATES } from "@/lib/studio/page-templates";
import { TEMPLATES, type SectionWord } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";
import { NOW } from "./helpers";

/** Editor audit 3.3: the page templates beside the others, and an element locked in the editor. */
describe("Studio page templates (About, FAQ) and locked elements", () => {
  it("adds About and FAQ beside the templates there were, changing none of them", () => {
    expect(PAGE_TEMPLATES.map((t) => t.id)).toEqual(["about", "faq", "reviews", "how", "join"]);
    // The ids don't clash with a template there already was (Contact stays as it was).
    expect(TEMPLATES.map((t) => t.id).filter((id) => PAGE_TEMPLATES.some((p) => p.id === id))).toEqual([]);
    expect(TEMPLATES.map((t) => t.id)).toContain("contact");
  });

  it("makes pages the platform takes, for every project type", () => {
    for (const kind of KINDS) {
      const app = { ...newApp("c1", null, NOW, kind.engine, kind.vertical), backend: "hosted" as const };
      const ctx = { brand: "#1F4E5F", source: itemSourcesFor(app)[0] ?? null, w: (word: SectionWord) => `[${word}]` };
      for (const template of PAGE_TEMPLATES) {
        const parsed = parseStudioPage(template.make(ctx), app, { default: "en", available: ["en"] });
        expect(parsed.ok ? [] : parsed.errors, `${kind.id} › ${template.id}`).toEqual([]);
      }
    }
  });

  it("has every word it uses, and its name, in English, Arabic and Turkish", () => {
    const used = new Set<string>();
    const ctx = { brand: "#1F4E5F", source: null, w: (word: SectionWord) => (used.add(word), word as string) };
    for (const template of PAGE_TEMPLATES) template.make(ctx);
    const keys = PAGE_TEMPLATES.map((t) => `tpl_${t.id}`);
    expect(used.size).toBeGreaterThan(10);
    for (const [lang, dict] of Object.entries({ en, ar, tr }) as [string, Record<string, unknown>][]) {
      expect(keys.filter((k) => typeof dict[k] !== "string"), lang).toEqual([]);
    }
    // 128.11 Its words are the app's (lib/studio/app-words.ts); its name the editor's.
    for (const [lang, dict] of Object.entries(APP_WORDS) as [string, Record<string, unknown>][]) {
      expect([...used].filter((k) => typeof dict[k] !== "string"), lang).toEqual([]);
    }
  });

  it("the FAQ page asks its questions in accordions, and About tells its story", () => {
    const ctx = { brand: "#1F4E5F", source: null, w: (word: SectionWord) => word as string };
    const faq = PAGE_TEMPLATES.find((t) => t.id === "faq")!.make(ctx);
    expect(allNodes(faq).filter((n) => n.type === "accordion")).toHaveLength(2);
    const about = PAGE_TEMPLATES.find((t) => t.id === "about")!.make(ctx);
    expect(allNodes(about).some((n) => n.text === "storyText")).toBe(true);
  });

  it("keeps an element's lock for the editor, and never on the page itself", () => {
    const app = { ...newApp("c1", null, NOW, "store", null), backend: "hosted" as const };
    const page = {
      header: { type: "logo_actions" as const, buttons: [] },
      body: { id: "root", type: "column" as const, locked: true, children: [{ id: "a", type: "text" as const, text: "Hi", locked: true }, { id: "b", type: "text" as const, text: "There", locked: "yes" }] },
    };
    const parsed = parseStudioPage(page, app, { default: "en", available: ["en"] });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.body.locked).toBeUndefined();
    expect(parsed.value.body.children?.map((n) => n.locked)).toEqual([true, undefined]);
  });
});
