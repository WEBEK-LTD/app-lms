import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GreetingText, TrackingCard } from "@/components/studio/tracking";
import { ar, en, tr } from "@/i18n/dashboard/studio";
import { STUDIO_TRACKING_DEFAULTS, STUDIO_TRACKING_KINDS, STUDIO_TRACKING_STYLES, type StudioNode } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";

/**
 * 130.11 The live element's more looks: the person's next trip (`trip`),
 * a boarding pass (`ticket`) and the main number large (`headline`), a
 * card of the free taxis, and a greeting's own words; kept by the
 * platform, drawn on Studio's canvas, named in the inspector, in the
 * contract and its public copy.
 */

const APP = { appType: "travel" as const, backend: "hosted" as const, vertical: null };
const LANGS = { default: "en" as const, available: ["en" as const, "ar" as const] };

function parsed(children: unknown[]) {
  return parseStudioPage({ body: { id: "root", type: "column", children } }, APP, LANGS);
}

const live = (id: string, kind: string, style?: string) => ({ id, type: "tracking", tracking: { kind, ...(style ? { style } : {}) } });

describe("130.11 the live element's more looks", () => {
  it("keeps the trip, a ticket, a headline and a card that is not the kind's own; drops the kind's own and nonsense", () => {
    const page = parsed([live("trip", "trip", "ticket"), live("days", "trip", "card"), live("taxis", "nearby_taxis", "card"), live("ride", "ride", "card"), live("mins", "ride", "headline"), live("drv", "ride", "driver")]);
    expect(page.ok ? [] : page.errors).toEqual([]);
    if (!page.ok) return;
    expect(page.value.body.children!.map((n) => n.tracking)).toEqual([
      { kind: "trip", style: "ticket" },
      { kind: "trip" },
      { kind: "nearby_taxis", style: "card" },
      { kind: "ride", style: "card" },
      { kind: "ride", style: "headline" },
      { kind: "ride" },
    ]);
    expect(parsed([live("odd", "trip", "poster")]).ok).toBe(false);
    expect(parsed([live("odd", "flight")]).ok).toBe(false);
  });

  it("keeps a greeting's own words and its words without a name, translated", () => {
    const page = parsed([{ id: "hello", type: "greeting", text: "Where to, {name}?", title: "Where to?", translations: { ar: { text: "إلى أين يا {name}؟", title: "إلى أين؟" } } }]);
    expect(page.ok ? [] : page.errors).toEqual([]);
    if (page.ok) expect(page.value.body.children![0]).toMatchObject({ text: "Where to, {name}?", title: "Where to?", translations: { ar: { text: "إلى أين يا {name}؟", title: "إلى أين؟" } } });
  });

  it("draws each kind in each look on the canvas, with a sample", () => {
    for (const kind of STUDIO_TRACKING_KINDS) {
      for (const style of STUDIO_TRACKING_STYLES) {
        for (const lang of ["en", "ar", "tr"]) {
          const node: StudioNode = { id: "n", type: "tracking", tracking: { kind, style } };
          const html = renderToStaticMarkup(createElement(TrackingCard, { node, lang, dark: lang === "ar", brand: "#0F766C", second: "#C9A063", color: "#0E1424" }));
          expect(html, `${kind} ${style} ${lang}`).toContain("data-studio-tracking");
        }
      }
    }
    const trip = (style: "card" | "ticket" | "line" | "headline") => renderToStaticMarkup(createElement(TrackingCard, { node: { id: "n", type: "tracking", tracking: { kind: "trip", style } }, lang: "en", dark: false, brand: "#0E1424", second: "#C9A063", color: undefined }));
    expect(trip("card")).toContain("Safra Bay Resort");
    expect(trip("card")).toContain("SFR 472");
    expect(trip("ticket")).toContain("Boarding pass");
    expect(trip("ticket")).toContain("DPS");
    expect(trip("line")).toContain("Bali");
    const greeting = renderToStaticMarkup(createElement(GreetingText, { lang: "en", own: "Where to, {name}?" }));
    expect(greeting).toContain("Where to, Omar?");
  });

  it("names the new kind and looks in the inspector, in the three languages", () => {
    for (const words of [en, ar, tr] as unknown as Record<string, string>[]) {
      for (const kind of STUDIO_TRACKING_KINDS) expect(words[`tracking_${kind}`]).toBeTruthy();
      for (const style of STUDIO_TRACKING_STYLES) expect(words[`trackingStyle_${style}`]).toBeTruthy();
      for (const key of ["greetingWords", "greetingWordsHint", "greetingAlone", "greetingAloneHint"]) expect(words[key]).toBeTruthy();
    }
    expect(STUDIO_TRACKING_DEFAULTS.trip).toBe("card");
  });

  it("is in the contract and its public copy, the same", () => {
    const contract = readFileSync(join(process.cwd(), "..", "..", "docs", "api", "openapi.yaml"), "utf8");
    expect(readFileSync(join(process.cwd(), "public", "developers", "openapi.yaml"), "utf8")).toBe(contract);
    expect(contract).toContain("kind: { type: string, enum: [shipment, ride, nearby_taxis, trip] }");
    // With 130.1–130.6's live cards' premium looks.
    expect(contract).toContain("style: { type: string, enum: [card, driver, line, ticket, headline, hero, ring, pill, steps] }");
  });
});
