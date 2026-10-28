import { describe, expect, it } from "vitest";
import { KINDS } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import { allNodes } from "@/lib/studio/tree";
import { categorySourcesFor, itemSourcesFor } from "@/lib/pages/sources";
import { parseStudioPage } from "@/lib/pages/validate";
import { sectionsFor, templatesFor, type SectionWord } from "@/lib/studio/sections";
import { NOW } from "./helpers";

const kindOf = (id: string) => {
  const kind = KINDS.find((k) => k.id === id)!;
  return { type: kind.engine, vertical: kind.vertical };
};

describe("103R.7 Studio's templates and sections for each project type", () => {
  it("offers each type its own templates first, then the ones for every project", () => {
    expect(templatesFor(kindOf("store")).map((t) => t.id)).toEqual(["shop", "brand", "contact", "blank"]);
    // A restaurant gets its menu, not the shop.
    expect(templatesFor(kindOf("restaurant")).map((t) => t.id)).toEqual(["menu", "brand", "contact", "blank"]);
    expect(templatesFor(kindOf("academy"))[0]!.id).toBe("courses");
    expect(templatesFor(kindOf("bookings"))[0]!.id).toBe("services");
    expect(templatesFor(kindOf("clinic"))[0]!.id).toBe("services");
    expect(templatesFor(kindOf("delivery")).map((t) => t.id)).toEqual(["delivery", "brand", "contact", "blank"]);
    expect(templatesFor(null).map((t) => t.id)).toEqual(["brand", "contact", "blank"]);
    // The delivery company's sections come first, and only for it.
    expect(sectionsFor(kindOf("delivery"))[0]!.id).toBe("send");
    expect(sectionsFor(kindOf("store")).map((s) => s.id)).not.toContain("send");
    expect(sectionsFor(kindOf("store")).map((s) => s.id)).toContain("steps");
    // No categories section where there are none to list.
    expect(sectionsFor(kindOf("real_estate"), { categories: false }).map((s) => s.id)).not.toContain("categories");
  });

  it("makes pages the platform takes, for every project type", () => {
    for (const kind of KINDS) {
      const app = { ...newApp("c1", null, NOW, kind.engine, kind.vertical), backend: "hosted" as const };
      const ctx = { brand: "#1F4E5F", source: itemSourcesFor(app)[0] ?? null, w: (word: SectionWord) => `[${word}]` };
      for (const template of templatesFor({ type: kind.engine, vertical: kind.vertical })) {
        const parsed = parseStudioPage(template.make(ctx), app, { default: "en", available: ["en"] });
        expect(parsed.ok ? [] : parsed.errors, `${kind.id} › ${template.id}`).toEqual([]);
      }
      for (const section of sectionsFor({ type: kind.engine, vertical: kind.vertical }, { categories: categorySourcesFor(app).length > 0 })) {
        const page = { header: { type: "logo_actions" as const, buttons: [] }, body: { id: "root", type: "column" as const, children: [section.make(ctx)] } };
        const parsed = parseStudioPage(page, app, { default: "en", available: ["en"] });
        expect(parsed.ok ? [] : parsed.errors, `${kind.id} › section ${section.id}`).toEqual([]);
      }
    }
  });

  it("sends the delivery company's customers to send a parcel and to their shipments", () => {
    const page = templatesFor(kindOf("delivery"))[0]!.make({ brand: "#1F4E5F", source: "delivery_services", w: (word) => word });
    const screens = allNodes(page)
      .map((n) => n.action?.screen)
      .filter(Boolean);
    expect(screens).toEqual(["send_parcel", "shipments"]);
    expect(allNodes(page).some((n) => n.type === "items" && n.source === "delivery_services")).toBe(true);
  });
});
