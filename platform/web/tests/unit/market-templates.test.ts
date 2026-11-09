import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { StudioNode } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";
import { ELEMENTS } from "@/lib/studio/elements";
import { sectionsFor, templatesFor } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";
import { NOW } from "./helpers";

const MARKETPLACE = { type: "food" as const, vertical: "marketplace" as const };
const FOOD = { type: "food" as const, vertical: null };
const ctx = { brand: "#0E7C66", source: null, w: (word: string) => `[${word}]`, newId: (() => { let n = 0; return () => `n${++n}`; })() };
const app = { ...newApp("client-1", null, NOW, "food", "marketplace"), backend: "hosted" as const };

function parse(node: StudioNode) {
  return parseStudioPage({ header: { type: "logo_actions", buttons: [] }, body: { id: "root", type: "column", children: [node] } }, app, { default: "en", available: ["en"] });
}

describe("115.14 the marketplace's Studio templates and its market element", () => {
  it("gives marketplace projects their three templates, and food delivery keeps its own", () => {
    // Templates = demos: Zad's own first, then the marketplace's three.
    expect(templatesFor(MARKETPLACE)[0]!.id).toBe("demo_marketplace");
    expect(templatesFor(MARKETPLACE).filter((t) => !t.demo).map((t) => t.id)).toEqual(["market", "market_offers", "market_grocery", "brand", "contact", "blank"]);
    expect(templatesFor(FOOD).map((t) => t.id)).not.toContain("market");
    expect(sectionsFor(MARKETPLACE).map((s) => s.id)).toEqual(expect.arrayContaining(["m_address", "m_kinds", "m_offers", "m_club", "m_near", "m_rated", "m_fast", "m_departments"]));
    expect(sectionsFor(FOOD).map((s) => s.id)).not.toContain("m_address");
  });

  it("builds the full home: search on top, kinds, offers, the club, places near, best rated, fastest, departments", () => {
    const home = templatesFor(MARKETPLACE).find((t) => t.id === "market")!.make(ctx as never);
    const market = allNodes(home).filter((n) => n.type === "market");
    expect(market.map((n) => n.market!.section)).toEqual(["address", "kinds", "offers", "cuisines", "club", "vendors", "vendors", "vendors", "cuisines", "reorder"]);
    expect(market[0]).toMatchObject({ text: "[mSearch]" });
    expect(market.find((n) => n.market!.sort === "fastest")).toMatchObject({ title: "[mFast]", market: { style: "list", limit: 6 } });
    expect(market.find((n) => n.title === "[mDepartments]")?.market).toEqual({ section: "cuisines", kind: "grocery" });
  });

  it("keeps a market element's section and choices, drops the defaults, and refuses what it doesn't know", () => {
    const kept = parse({ id: "m1", type: "market", title: "Near you", text: "Open now", market: { section: "vendors", style: "cards", kind: "grocery", sort: "nearest", tag: "Bakery", free_delivery: true, limit: 10 } });
    expect(kept.ok).toBe(true);
    const node = kept.ok ? kept.value.body.children![0]! : null;
    expect(node).toMatchObject({ type: "market", title: "Near you", text: "Open now", market: { section: "vendors", kind: "grocery", sort: "nearest", tag: "Bakery", free_delivery: true } });
    expect(node?.market).not.toHaveProperty("style");
    expect(node?.market).not.toHaveProperty("limit");
    expect(parse({ id: "m2", type: "market", market: { section: "aisles" as never } }).ok).toBe(false);
    expect(parse({ id: "m3", type: "market", market: { section: "vendors", limit: 99 } }).ok).toBe(false);
    expect(parse({ id: "m4", type: "market" }).ok).toBe(false);
  });

  it("offers the element only in marketplace projects", () => {
    expect(ELEMENTS.find((e) => e.type === "market")).toMatchObject({ only: "marketplace" });
  });
});
