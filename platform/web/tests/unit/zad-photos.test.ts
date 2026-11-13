import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ZAD_PHOTOS } from "@/lib/demo/zad-photos";
import { isAcademyPhoto } from "@/lib/demo/academy-photos";
import { ACADEMY_COURSES } from "@/lib/demo/teachers";

const dir = path.resolve(__dirname, "../../public/demo-photos");
const FREE = /^(CC0|Public domain|CC BY(-SA)? \d\.\d)$/;

describe("Zad's photos", () => {
  it("are the files in public/demo-photos, each a JPEG at its size and small", () => {
    const files = readdirSync(dir).filter((f) => f.endsWith(".jpg")).map((f) => f.slice(0, -4)).sort();
    expect(files).toEqual([...ZAD_PHOTOS].sort());
    for (const name of ZAD_PHOTOS) {
      const data = readFileSync(path.join(dir, `${name}.jpg`));
      expect(data.subarray(0, 3).toString("hex"), name).toBe("ffd8ff");
      expect(data.length, name).toBeLessThan(150_000);
    }
  });

  it("each have their author and a free licence in the credits", () => {
    const credits = JSON.parse(readFileSync(path.join(dir, "CREDITS.json"), "utf8")) as { file: string; author: string; license: string; page: string }[];
    for (const name of ZAD_PHOTOS) {
      const c = credits.find((x) => x.file === `${name}.jpg`);
      expect(c, name).toBeDefined();
      expect(c!.author.length, name).toBeGreaterThan(0);
      expect(c!.license, name).toMatch(FREE);
      expect(c!.page, name).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
  });

  it("128.7 give Rawaq Academy's popular courses their covers as its approved board has them, the academy story's photos", () => {
    const cover = (title: string) => ACADEMY_COURSES.find((c) => c.title === title)!.picture;
    expect(cover("Start Your Own Small Business")).toBe("academy-desk");
    expect(cover("Arabic for Beginners")).toBe("academy-live");
    expect(isAcademyPhoto(cover("Arabic for Beginners"))).toBe(true);
  });
});
