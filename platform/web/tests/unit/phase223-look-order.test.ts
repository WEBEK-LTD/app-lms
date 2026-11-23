import { describe, expect, it } from "vitest";
import { demoIdOf, STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { startLooks } from "@/lib/demo/picker";
import { mainLookOf, mainTemplateOf, signatureDesigns, signatureLooksOf } from "@/lib/studio/demo-designs";
import { SIGNATURE_LOOKS, signatureTemplateId } from "@/lib/studio/demo-designs/signature";
import { houseLooks } from "@/lib/studio-market/house";
import { SHOP_TYPES, shopTypeOfDesign, shopTypeTemplate } from "@/lib/studio/shop-types";
import { TEMPLATES } from "@/lib/studio/sections";
import { LOOK_SHOT_KEYS, lookScreen } from "@/site/look-shots";

/**
 * 223 The shared base of the shop types' templates C and D (the owner, 23
 * November 2026): Studio offers every demo's looks in one order, C, D, A,
 * B, the main look (the demo itself) first: C where the demo has it, else A.
 */
describe("223 the looks' order", () => {
  it("is C, D, A, B", () => {
    expect([...SIGNATURE_LOOKS]).toEqual(["c", "d", "a", "b"]);
  });

  it("lists every demo's looks in that order, its main look first, on /start and in Studio Market", () => {
    for (const demo of STUDIO_DEMO_TYPES) {
      const looks = signatureLooksOf(demo);
      expect(looks).toEqual(SIGNATURE_LOOKS.filter((l) => looks.includes(l)));
      expect(looks[0] ?? "a").toBe(mainLookOf(demo));
      expect(startLooks(demo)).toEqual(looks);
      expect(houseLooks().filter((h) => h.demo === demo).map((h) => h.look)).toEqual(looks);
    }
  });

  it("makes the main look the demo itself: its template is the demo's home and its default design", () => {
    for (const demo of STUDIO_DEMO_TYPES) {
      if (!signatureLooksOf(demo).length) continue;
      expect(mainTemplateOf(demo)).toBe(signatureTemplateId(demo, mainLookOf(demo)));
      expect(TEMPLATES.some((t) => t.id === mainTemplateOf(demo))).toBe(true);
    }
  });

  it("registers every look's template in Studio's order, C and D before A and B for each demo", () => {
    for (const demo of STUDIO_DEMO_TYPES) {
      const ids = TEMPLATES.filter((t) => t.demo === demo && t.look).map((t) => t.look);
      expect(ids).toEqual(signatureLooksOf(demo));
    }
    expect(signatureDesigns().length).toBe(STUDIO_DEMO_TYPES.reduce((n, d) => n + signatureLooksOf(d).length, 0));
  });

  it("starts a shop type from its main look, and knows a project of any of its looks", () => {
    for (const type of SHOP_TYPES) {
      if (!type.demo) continue;
      expect(shopTypeTemplate(type)).toBe(signatureTemplateId(type.demo, mainLookOf(type.demo)));
      for (const look of SIGNATURE_LOOKS) expect(shopTypeOfDesign(`${type.demo}_signature_${look}`)?.id).toBe(type.id);
    }
  });

  it("knows a shop type's demo app by its look A (made before) or its main look C", () => {
    expect(demoIdOf({ appType: "store", vertical: null, design: "clothes_signature_a" })).toBe("clothes");
    expect(demoIdOf({ appType: "store", vertical: null, design: "clothes_signature_c" })).toBe("clothes");
    expect(demoIdOf({ appType: "store", vertical: null, design: "kids_signature_c" })).toBe("kids");
    expect(demoIdOf({ appType: "store", vertical: null, design: "clothes_signature_b" })).toBe("store");
  });

  it("shows the website's look pictures in that order, look A by day always (the demo's own home without a picture of its own)", () => {
    expect(LOOK_SHOT_KEYS.slice(0, 4)).toEqual(["c", "c-dark", "d", "d-dark"]);
    for (const demo of STUDIO_DEMO_TYPES) expect(lookScreen(demo, "a")).not.toBeNull();
  });
});
