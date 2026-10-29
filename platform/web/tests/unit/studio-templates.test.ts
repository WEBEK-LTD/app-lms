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
    // 105.1.6 Three ready-made designs for a food delivery company, and its welcome section first.
    expect(templatesFor(kindOf("food")).map((t) => t.id)).toEqual(["food", "food_offers", "food_brand", "brand", "contact", "blank"]);
    expect(sectionsFor(kindOf("food"))[0]!.id).toBe("food");
    expect(sectionsFor(kindOf("delivery")).map((s) => s.id)).not.toContain("food");
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

  it("105.1.6 sends a food delivery company's customers to the restaurants and their orders", () => {
    for (const template of templatesFor(kindOf("food")).filter((t) => t.id.startsWith("food"))) {
      const page = template.make({ brand: "#1F4E5F", source: "restaurants", w: (word) => word });
      const nodes = allNodes(page);
      expect(nodes.some((n) => n.type === "items" && n.source === "restaurants"), template.id).toBe(true);
      expect(nodes.map((n) => n.action?.screen).filter(Boolean), template.id).toContain("restaurants");
      // The steps, where there are steps, say how an order reaches the door.
      const words = nodes.map((n) => n.text).filter(Boolean);
      if (words.includes("stepsTitle")) expect(words, template.id).toEqual(expect.arrayContaining(["foodStepOne", "foodStepTwo", "foodStepThree"]));
      expect(words, template.id).not.toContain("stepOne");
    }
    const welcome = templatesFor(kindOf("food"))[0]!.make({ brand: "#1F4E5F", source: "restaurants", w: (word) => word });
    expect(allNodes(welcome).map((n) => n.action?.screen).filter(Boolean)).toEqual(["restaurants", "food_orders", "restaurants"]);
  });

  it("105.2 gives a ride company three designs that ask for a ride, its welcome section first", () => {
    expect(templatesFor(kindOf("rides")).map((t) => t.id)).toEqual(["ride", "ride_offers", "ride_brand", "brand", "contact", "blank"]);
    expect(sectionsFor(kindOf("rides"))[0]!.id).toBe("ride");
    expect(sectionsFor(kindOf("food")).map((s) => s.id)).not.toContain("ride");
    for (const template of templatesFor(kindOf("rides")).filter((t) => t.id.startsWith("ride"))) {
      const nodes = allNodes(template.make({ brand: "#1F4E5F", source: "vehicle_types", w: (word) => word }));
      expect(nodes.map((n) => n.action?.screen).filter(Boolean), template.id).toContain("ride");
      const words = nodes.map((n) => n.text).filter(Boolean);
      if (words.includes("stepsTitle")) expect(words, template.id).toEqual(expect.arrayContaining(["rideStepOne", "rideStepTwo", "rideStepThree"]));
      expect(words, template.id).not.toContain("stepOne");
    }
    const welcome = templatesFor(kindOf("rides"))[0]!.make({ brand: "#1F4E5F", source: "vehicle_types", w: (word) => word });
    expect(allNodes(welcome).map((n) => n.action?.screen).filter(Boolean)).toEqual(["ride", "my_rides", "ride"]);
  });

  it("105.3 gives an academy with many teachers three designs that open its teachers, its welcome section first", () => {
    expect(templatesFor(kindOf("instructors")).map((t) => t.id)).toEqual(["teachers", "teachers_offers", "teachers_brand", "brand", "contact", "blank"]);
    expect(sectionsFor(kindOf("instructors"))[0]!.id).toBe("teachers");
    // A plain academy has neither.
    expect(templatesFor(kindOf("academy")).map((t) => t.id)).not.toContain("teachers");
    // 105.4 A school's own three, with its welcome first.
    expect(templatesFor(kindOf("school")).map((t) => t.id)).toEqual(["school", "school_news", "school_brand", "brand", "contact", "blank"]);
    expect(sectionsFor(kindOf("school"))[0]!.id).toBe("school");
    expect(sectionsFor(kindOf("academy")).map((s) => s.id)).not.toContain("teachers");
    const welcome = templatesFor(kindOf("instructors"))[0]!.make({ brand: "#1F4E5F", source: "courses", w: (word) => word });
    expect(allNodes(welcome).map((n) => n.action?.screen).filter(Boolean)).toEqual(["teachers", "courses", "teachers"]);
    const words = allNodes(welcome).map((n) => n.text).filter(Boolean);
    expect(words).toEqual(expect.arrayContaining(["teachersStepOne", "teachersStepTwo", "teachersStepThree"]));
  });
});
