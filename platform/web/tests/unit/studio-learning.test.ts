import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { parseStudioPage } from "@/lib/pages/validate";
import { ELEMENTS, newNode } from "@/lib/studio/elements";

/** 123 An academy's Studio page: the greeting header and the student's own cards (`learning`). */

const NOW = new Date("2026-11-11T10:00:00Z");
const app = { ...newApp("c", null, NOW, "lms", null), section: "studio" as const };

function parse(page: unknown) {
  return parseStudioPage(page, app, { default: "en", available: ["en"] });
}

describe("123 the student's own cards", () => {
  it("keeps the greeting header and each card it knows", () => {
    const parsed = parse({
      header: { type: "greeting", title: "What will you learn today?", buttons: ["search", "notifications"] },
      body: {
        id: "root",
        type: "column",
        children: ["continue", "streak", "live", "week"].map((section) => ({ id: section, type: "learning", learning: { section, extra: 1 }, title: "Mine" })),
      },
    });
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    if (!parsed.ok) return;
    expect(parsed.value.header).toMatchObject({ type: "greeting", buttons: ["search", "notifications"] });
    expect(parsed.value.body.children!.map((n) => n.learning)).toEqual([{ section: "continue" }, { section: "streak" }, { section: "live" }, { section: "week" }]);
    expect(parsed.value.body.children![0]!.title).toBe("Mine");
  });

  it("asks which card an unknown one is", () => {
    const parsed = parse({ body: { id: "root", type: "column", children: [{ id: "x", type: "learning", learning: { section: "horoscope" } }] } });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.errors.join(" ")).toContain("choose which of the student's cards it is.");
  });

  it("is offered to academies only, and starts as the course they're taking", () => {
    expect(ELEMENTS.find((e) => e.type === "learning")?.only).toBe("academy");
    const node = newNode("learning", { source: "courses", brand: "#1D2B4F", text: (w) => w });
    expect(node.learning).toEqual({ section: "continue" });
    expect(parse({ body: { id: "root", type: "column", children: [node] } }).ok).toBe(true);
  });
});
