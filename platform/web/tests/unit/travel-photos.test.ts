import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TRAVEL_PHOTOS } from "@/lib/travel/samples";

const dir = path.resolve(__dirname, "../../public/travel-photos");

describe("126 Safra's photos", () => {
  it("are the files in public/travel-photos, each a JPEG and small", () => {
    const files = readdirSync(dir).filter((f) => f.endsWith(".jpg")).map((f) => f.slice(0, -4)).sort();
    expect(files).toEqual([...TRAVEL_PHOTOS].sort());
    for (const name of TRAVEL_PHOTOS) {
      const data = readFileSync(path.join(dir, `${name}.jpg`));
      expect(data.subarray(0, 3).toString("hex"), name).toBe("ffd8ff");
      expect(data.length, name).toBeLessThan(150_000);
    }
  });

  it("are each dedicated to the public domain, with their author and page in the credits", () => {
    const credits = JSON.parse(readFileSync(path.join(dir, "CREDITS.json"), "utf8")) as { file: string; author: string; license: string; page: string }[];
    const notes = readFileSync(path.join(dir, "CREDITS.md"), "utf8");
    for (const name of TRAVEL_PHOTOS) {
      const c = credits.find((x) => x.file === `${name}.jpg`);
      expect(c, name).toBeDefined();
      expect(c!.author.length, name).toBeGreaterThan(0);
      expect(c!.license, name).toMatch(/^(CC0 1\.0|Public domain)$/);
      expect(c!.page, name).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(notes, name).toContain(`**${name}.jpg**`);
    }
    // The sign-in screen's photo too.
    const screens = JSON.parse(readFileSync(path.resolve(__dirname, "../../public/demo-screens/CREDITS.json"), "utf8")) as { file: string; license: string }[];
    expect(screens.find((s) => s.file === "safra-caldera.jpg")?.license).toBe("CC0 1.0");
  });
});
