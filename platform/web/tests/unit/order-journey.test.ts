import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Timeline } from "@/components/studio/premium/timeline";
import { PREMIUM_WORDS_EN } from "@/components/studio/premium/shared";
import { newApp } from "@/lib/app/setup";
import { DELIVERY_STAGES } from "@/lib/data/types";
import type { StudioNode } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";
import { en as appEn } from "@/lib/studio/app-words";
import { studioDemoDesign } from "@/lib/studio/demo-designs";
import { journeyEntryIndex, latestOrderOnItsWay, orderInProgress, orderJourneyStep, STAGE_JOURNEY } from "@/lib/studio/order-journey";
import type { SectionContext } from "@/lib/studio/sections";

/**
 * 132.160 "How your flowers travel" follows the person's newest order: every
 * delivery stage has its step (ordered or paid → prepared → on its way →
 * delivered), a WordPress shop's statuses and a carrier's shipment too; the
 * newest order still on its way is the one followed; the four steps spread
 * over the entries drawn; `timeline.source` checked and kept; Studio's canvas
 * lights a sample order's step with a note; and Leqaa's two looks use it.
 */

const NOW = new Date("2026-11-16T10:00:00Z");
const app = { ...newApp("c", null, NOW, "store", null), section: "studio" as const };
const LANGS = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };

const timeline = (extra: Record<string, unknown> = {}) => ({
  id: "track",
  type: "timeline",
  timeline: { source: "latest_order", ...extra },
  entries: [{ title: "Order placed", highlight: true }, { title: "Arranged" }, { title: "On its way" }, { title: "Delivered" }],
});

describe("132.160 the order's journey", () => {
  it("gives every delivery stage a step", () => {
    expect(Object.keys(STAGE_JOURNEY).sort()).toEqual([...DELIVERY_STAGES].sort());
    expect(orderJourneyStep({ status: "processing" })).toBe("ordered");
    expect(orderJourneyStep({ status: "pending" })).toBe("ordered");
    expect(orderJourneyStep({ status: "processing", stage: { code: "preparing" } })).toBe("prepared");
    expect(orderJourneyStep({ status: "processing", stage: { code: "postponed" } })).toBe("prepared");
    expect(orderJourneyStep({ status: "processing", stage: { code: "returned" } })).toBe("prepared");
    expect(orderJourneyStep({ status: "processing", stage: { code: "shipped" } })).toBe("on_its_way");
    expect(orderJourneyStep({ status: "processing", stage: { code: "failed" } })).toBe("on_its_way");
    expect(orderJourneyStep({ status: "completed", stage: { code: "delivered" } })).toBe("delivered");
    expect(orderJourneyStep({ status: "completed" })).toBe("delivered");
    // A stage the mapping doesn't know: by the rest of the order.
    expect(orderJourneyStep({ status: "processing", stage: { code: "teleported" } })).toBe("ordered");
  });

  it("reads a carrier's shipment, a WordPress shop's statuses and a restaurant's steps", () => {
    expect(orderJourneyStep({ status: "processing", shipment: { carrier: "Aras" } })).toBe("on_its_way");
    // The plugin: paid is "preparing", Shipped is "out_for_delivery".
    expect(orderJourneyStep({ status: "processing", fulfilment_status: "preparing" })).toBe("ordered");
    expect(orderJourneyStep({ status: "processing", fulfilment_status: "out_for_delivery" })).toBe("on_its_way");
    const kitchen = { type: "delivery" };
    expect(orderJourneyStep({ status: "processing", fulfilment: kitchen, fulfilment_status: "received" })).toBe("ordered");
    expect(orderJourneyStep({ status: "processing", fulfilment: kitchen, fulfilment_status: "preparing" })).toBe("prepared");
    expect(orderJourneyStep({ status: "processing", fulfilment: kitchen, fulfilment_status: "out_for_delivery" })).toBe("on_its_way");
  });

  it("follows the newest order still on its way", () => {
    expect(["pending", "processing", "on_hold"].every((status) => orderInProgress({ status }))).toBe(true);
    expect(["completed", "cancelled", "refunded", "failed"].some((status) => orderInProgress({ status }))).toBe(false);
    const orders = [
      { id: 1, status: "processing", created_at: "2026-11-10T10:00:00Z" },
      { id: 2, status: "processing", created_at: "2026-11-15T10:00:00Z", stage: { code: "shipped" } },
      { id: 3, status: "completed", created_at: "2026-11-16T09:00:00Z" },
    ];
    expect(latestOrderOnItsWay(orders)?.id).toBe(2);
    expect(latestOrderOnItsWay([orders[2]!])).toBeNull();
  });

  it("spreads the four steps over the entries drawn", () => {
    expect([0, 1, 2, 3].map((i) => journeyEntryIndex((["ordered", "prepared", "on_its_way", "delivered"] as const)[i]!, 4))).toEqual([0, 1, 2, 3]);
    expect(journeyEntryIndex("delivered", 3)).toBe(2);
    expect(journeyEntryIndex("prepared", 3)).toBe(1);
    expect(journeyEntryIndex("on_its_way", 1)).toBe(0);
    expect(journeyEntryIndex("on_its_way", 0)).toBe(-1);
  });

  it("checks and keeps the timeline's source; refuses one it doesn't know", () => {
    const ok = parseStudioPage({ body: { id: "root", type: "column", children: [timeline()] } }, app, LANGS);
    expect(ok.ok ? [] : ok.errors).toEqual([]);
    expect(ok.ok && ok.value.body.children?.[0]?.timeline).toEqual({ source: "latest_order" });
    const bad = parseStudioPage({ body: { id: "root", type: "column", children: [timeline({ source: "next_booking" })] } }, app, LANGS);
    expect(bad.ok).toBe(false);
    expect(bad.ok ? "" : bad.errors.join(" ")).toContain("choose what the steps follow");
    // Without it, as before.
    const plain = parseStudioPage({ body: { id: "root", type: "column", children: [{ ...timeline(), timeline: { style: "vertical" } }] } }, app, LANGS);
    expect(plain.ok && plain.value.body.children?.[0]?.timeline).toBeUndefined();
  });

  it("draws a sample order out for delivery on Studio's canvas, with its note", () => {
    const draw = (node: StudioNode) => renderToStaticMarkup(createElement(Timeline, { node, lang: "en", defaultLang: "en", dark: false, brand: "#C2185B", accent: null, color: undefined, words: PREMIUM_WORDS_EN, editing: true }));
    const live = draw(timeline() as unknown as StudioNode);
    expect(live).toContain('data-studio-timeline-source="latest_order"');
    expect(live).toContain("In the app, their newest order");
    // The third step ("On its way") is the current one, not the highlighted first.
    const current = /aria-current="step"[^>]*>[\s\S]*?<b[^>]*>([^<]+)<\/b>/.exec(live)?.[1];
    expect(current).toBe("On its way");
    const drawn = draw({ ...(timeline() as unknown as StudioNode), timeline: {} });
    expect(drawn).not.toContain("latest_order");
    expect(/aria-current="step"[^>]*>[\s\S]*?<b[^>]*>([^<]+)<\/b>/.exec(drawn)?.[1]).toBe("Order placed");
  });

  it("has Leqaa's orders follow the person's newest order in both looks, its first step lit for older apps", () => {
    const ctx: SectionContext = { brand: "#C2185B", source: null, app: "Leqaa", lang: "en", w: (word) => String(appEn[word]) };
    for (const look of ["a", "b"] as const) {
      const nodes = studioDemoDesign("flowers", look)!.over("orders", ctx)!;
      const track = nodes.find((n) => n.type === "timeline")!;
      expect(track.timeline, look).toMatchObject({ source: "latest_order" });
      expect(track.entries?.findIndex((e) => e.highlight), look).toBe(0);
      expect(track.entries?.map((e) => e.title), look).toEqual([appEn.lqTrack1, appEn.lqTrack2, appEn.lqTrack3, appEn.lqTrack4]);
      const parsed = parseStudioPage({ body: { id: "root", type: "column", children: nodes } }, app, LANGS);
      expect(parsed.ok ? [] : parsed.errors, look).toEqual([]);
    }
  });
});
