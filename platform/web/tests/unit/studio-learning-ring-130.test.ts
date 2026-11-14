import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LEARNING_WORDS_EN, LearningCard } from "@/components/studio/learning";
import { ar as studioAr, en as studioEn, tr as studioTr } from "@/i18n/dashboard/studio";
import { newApp } from "@/lib/app/setup";
import type { StudioNode } from "@/lib/pages/types";
import { STUDIO_LEARNING_DAYS, STUDIO_LEARNING_STYLES } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";

/**
 * 130.18 The student's cards' new options (`learning`): the course they are
 * taking in a gold ring (`style` `ring`) and this week's days under a
 * streak (`days`), kept as the contract says, drawn on Studio's canvas,
 * named in the inspector in Studio's three languages.
 */

const NOW = new Date("2026-11-13T10:00:00Z");
const app = { ...newApp("c", null, NOW, "lms", null), section: "studio" as const };
const parse = (children: unknown[]) => parseStudioPage({ body: { id: "root", type: "column", children } }, app, { default: "en", available: ["en"] });

const draw = (node: StudioNode, dark = false) => renderToStaticMarkup(createElement(LearningCard, { node, dark, color: null, words: LEARNING_WORDS_EN, title: null }));

describe("130.18 the gold ring and this week's days", () => {
  it("keeps them", () => {
    const parsed = parse([
      { id: "ring", type: "learning", learning: { section: "continue", style: "ring" } },
      { id: "letters", type: "learning", learning: { section: "streak", style: "photo", days: "letters" } },
      { id: "pills", type: "learning", learning: { section: "streak", days: "pills" } },
    ]);
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    if (!parsed.ok) return;
    expect(parsed.value.body.children!.map((n) => n.learning)).toEqual([
      { section: "continue", style: "ring" },
      { section: "streak", style: "photo", days: "letters" },
      { section: "streak", days: "pills" },
    ]);
  });

  it("asks for a look or days it doesn't know", () => {
    const style = parse([{ id: "x", type: "learning", learning: { section: "continue", style: "halo" } }]);
    expect(style.ok).toBe(false);
    if (!style.ok) expect(style.errors.join(" ")).toContain("choose how the student's card is drawn from the list.");
    const days = parse([{ id: "x", type: "learning", learning: { section: "streak", days: "stars" } }]);
    expect(days.ok).toBe(false);
    if (!days.ok) expect(days.errors.join(" ")).toContain("choose how this week's days are drawn from the list.");
  });

  it("draws the ring on the canvas, by day and by night", () => {
    for (const dark of [false, true]) {
      const html = draw({ id: "r", type: "learning", learning: { section: "continue", style: "ring" } }, dark);
      expect(html).toContain('data-studio-learning-ring="continue"');
      expect(html).toContain("Resume lesson");
      expect(html).toContain("61% of the course");
      expect(html).toContain(dark ? "#E7C982" : "#C99B4A");
    }
    // Its other cards as on a photo.
    expect(draw({ id: "s", type: "learning", learning: { section: "streak", style: "ring" } })).toContain('data-studio-learning-photo="streak"');
  });

  it("draws the week under a streak as letters or pills, and nothing without days", () => {
    for (const days of STUDIO_LEARNING_DAYS) {
      const html = draw({ id: "s", type: "learning", learning: { section: "streak", style: "photo", days } });
      expect(html).toContain(`data-studio-learning-days="${days}"`);
    }
    expect(draw({ id: "s", type: "learning", learning: { section: "streak", style: "photo" } })).not.toContain("data-studio-learning-days");
  });

  it("names every look and every choice of days in Studio's languages", () => {
    for (const words of [studioEn, studioAr, studioTr] as Record<string, unknown>[]) {
      for (const s of STUDIO_LEARNING_STYLES) expect(String(words[`learningStyle_${s}`] ?? "")).not.toBe("");
      for (const d of ["none", ...STUDIO_LEARNING_DAYS]) expect(String(words[`learningDays_${d}`] ?? "")).not.toBe("");
      expect(String(words.learningDays ?? "")).not.toBe("");
      for (const k of ["ringChip", "ringKicker", "ringLine", "ringResume"]) expect(String(words[`lw_${k}`] ?? "")).not.toBe("");
    }
  });
});
