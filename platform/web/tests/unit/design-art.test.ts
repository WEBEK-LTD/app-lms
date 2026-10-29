import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { artPng } from "@/lib/demo/art";
import { DESIGN_ART } from "@/lib/demo/design-art";
import { DESIGNS } from "@/lib/pages/designs";
import { PICTURE } from "@/lib/pages/designs/build";

/**
 * 110.3 The drawn pictures of the designs' pages (lib/demo/design-art.ts),
 * in public/design-pictures. Draw them again after changing them:
 * `YALLAPP_DRAW_PICTURES=1 npx vitest run tests/unit/design-art.test.ts`.
 */

const FOLDER = path.resolve(__dirname, "../../public/design-pictures");

/** Every `picture:` a design names, anywhere in its pages. */
function named(): Set<string> {
  const out = new Set<string>();
  const walk = (value: unknown) => {
    if (typeof value === "string" && value.startsWith(PICTURE)) out.add(value.slice(PICTURE.length));
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(DESIGNS.map((d) => d.pages));
  return out;
}

describe("110.3 the designs' drawn pictures", () => {
  it.runIf(process.env.YALLAPP_DRAW_PICTURES)("draws them", () => {
    for (const [file, { art, width, height }] of Object.entries(DESIGN_ART)) writeFileSync(path.join(FOLDER, file), artPng(art, width, height));
  });

  it("has a small file for each, and each one is drawn and used", () => {
    const used = named();
    for (const file of used) expect(DESIGN_ART[file], file).toBeDefined();
    for (const file of Object.keys(DESIGN_ART)) {
      expect(used.has(file), `${file} isn't used`).toBe(true);
      const at = path.join(FOLDER, file);
      expect(existsSync(at), file).toBe(true);
      expect(statSync(at).size, file).toBeLessThan(40 * 1024);
    }
    // No file left from a picture that's gone.
    expect(readdirSync(FOLDER).filter((f) => f.startsWith("art-") && !DESIGN_ART[f])).toEqual([]);
  });
});
