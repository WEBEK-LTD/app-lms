import { describe, expect, it } from "vitest";
import { GET as searchRoute } from "@/app/api/v1/fonts/route";
import type { BlobStore } from "@/lib/blobs";
import { FONTS_COMMIT, FREE_FONT_COUNT, fontFileAt, fontFiles, freeFont, googleFontsSource, isBundledFont, searchFonts } from "@/lib/fonts/catalog";
import { fontTypeOf, freeFontFile } from "@/lib/fonts/files";
import { lookArabicFont, lookFont, servedAppearance, withLook } from "@/lib/fonts/look";
import { defaultAppearance, BUILT_IN_APP_DEFAULTS } from "@/lib/pages/defaults";
import type { Appearance } from "@/lib/pages/types";
import { parseAppDefaults, parseAppearance } from "@/lib/pages/validate";

/** 97.1 Every free font: the catalog, the look's fields, the files served from Yallapp. */

const LOOK: Appearance = { template: "classic", theme_mode: "system", user_can_change_mode: true, secondary_color: null, font: "Outfit", corners: "soft", cards: "flat" };
const TTF = Buffer.concat([Buffer.from([0, 1, 0, 0]), Buffer.alloc(60, 7)]);

class MemoryBlobs implements BlobStore {
  files = new Map<string, { data: Buffer; contentType: string }>();
  async put(key: string, data: Buffer, contentType: string) {
    this.files.set(key, { data, contentType });
  }
  async get(key: string) {
    return this.files.get(key) ?? null;
  }
  async delete(key: string) {
    this.files.delete(key);
  }
}

describe("the catalog", () => {
  it("has every family of Google Fonts at one commit, the bundled ones and Arabic ones among them", () => {
    expect(FONTS_COMMIT).toMatch(/^[0-9a-f]{40}$/);
    expect(FREE_FONT_COUNT).toBeGreaterThan(1500);
    for (const family of ["Bricolage Grotesque", "Outfit", "Readex Pro", "Inter", "Roboto"]) expect(freeFont(family)?.family).toBe(family);
    for (const family of ["Cairo", "Tajawal", "Almarai", "Amiri", "IBM Plex Sans Arabic"]) expect(freeFont(family)?.arabic).toBe(true);
    expect(freeFont("cairo")?.family).toBe("Cairo");
    expect(freeFont("Material Symbols Rounded")).toBeNull();
    expect(freeFont("Not A Font")).toBeNull();
  });

  it("searches by name, the bundled fonts first, with an Arabic filter", () => {
    expect(searchFonts({}).slice(0, 6).map((f) => f.family)).toEqual(["Bricolage Grotesque", "Plus Jakarta Sans", "Outfit", "Manrope", "DM Sans", "Lexend"]);
    expect(searchFonts({ q: "cair" })[0]!.family).toBe("Cairo");
    // Starting with the words first, then containing them.
    const plex = searchFonts({ q: "plex sans", limit: 100 }).map((f) => f.family);
    expect(plex).toContain("IBM Plex Sans Arabic");
    expect(searchFonts({ arabic: true, limit: 100 }).every((f) => f.arabic)).toBe(true);
    expect(searchFonts({ category: "serif", limit: 5 }).every((f) => f.category === "serif")).toBe(true);
    expect(searchFonts({ limit: 1000 })).toHaveLength(100);
  });

  it("names the files the app downloads: none for a bundled font", () => {
    expect(fontFiles("https://yallapp.example", "Outfit")).toEqual([]);
    expect(fontFiles("https://yallapp.example", "Readex Pro")).toEqual([]);
    expect(fontFiles("https://yallapp.example", "Unknown")).toEqual([]);
    const cairo = fontFiles("https://yallapp.example", "Cairo");
    expect(cairo).toEqual([{ url: "https://yallapp.example/api/v1/fonts/ofl/cairo/Cairo%5Bslnt%2Cwght%5D.ttf", weight: null }]);
    // A font without a variable file: one file per weight.
    const tajawal = fontFiles("https://yallapp.example", "Tajawal");
    // One entry per file: Tajawal has no 600 of its own.
    expect(tajawal.map((f) => f.weight)).toEqual([400, 500, 700]);
    expect(isBundledFont("Lexend")).toBe(true);
    expect(isBundledFont("Cairo")).toBe(false);
  });
});

describe("the look's fonts", () => {
  it("keeps a bundled font to show until the chosen one is on the phone", () => {
    expect(lookFont("Outfit")).toEqual({ font: "Outfit" });
    expect(lookFont("cairo")).toEqual({ font: "DM Sans", font_family: "Cairo" });
    expect(lookFont("Playfair Display")).toEqual({ font: "Bricolage Grotesque", font_family: "Playfair Display" });
    expect(lookFont("Readex Pro")).toEqual({ font: "DM Sans", font_family: "Readex Pro" });
    expect(lookFont("Nope")).toBeNull();
    expect(lookArabicFont("Tajawal")).toEqual({ arabic_font: "Tajawal" });
    expect(lookArabicFont("Readex Pro")).toEqual({});
    expect(lookArabicFont("Inter")).toBeNull();
  });

  it("checks the fonts in a saved look, and never keeps their files", () => {
    const look = parseAppearance({ ...LOOK, font_family: "Cairo", arabic_font: "Tajawal", font_files: [{ url: "https://evil.example/x.ttf", weight: null }] });
    expect(look).toEqual({ ...LOOK, font: "DM Sans", font_family: "Cairo", arabic_font: "Tajawal" });
    // A bundled font chosen: no free font kept.
    expect(parseAppearance({ ...LOOK, font_family: "Lexend" })).toEqual({ ...LOOK, font: "Lexend" });
    expect(parseAppearance({ ...LOOK, font_family: null, arabic_font: "" })).toEqual(LOOK);
    const languages = { default: "en", available: ["en"] };
    expect(parseAppDefaults({ appearance: { ...LOOK, font_family: "Comic Sans MS", arabic_font: "Inter" }, languages })).toEqual({
      ok: false,
      errors: ["Choose a font from the list.", "Choose an Arabic font from the list."],
    });
    expect(parseAppDefaults({ appearance: { ...LOOK, font_family: "Cairo" }, languages })).toMatchObject({ ok: true, value: { appearance: { font: "DM Sans", font_family: "Cairo" } } });
  });

  it("serves the files of the look's free fonts, on Yallapp", () => {
    const served = servedAppearance({ ...LOOK, font: "DM Sans", font_family: "Cairo", arabic_font: "Tajawal" }, "https://yallapp.example");
    expect(served.font_files).toEqual([{ url: "https://yallapp.example/api/v1/fonts/ofl/cairo/Cairo%5Bslnt%2Cwght%5D.ttf", weight: null }]);
    expect(served.arabic_font_files).toHaveLength(3);
    expect(servedAppearance(LOOK, "https://yallapp.example")).toEqual(LOOK);
  });

  it("a design's or the Branding step's font replaces a free font", () => {
    const current = { ...LOOK, font: "DM Sans" as const, font_family: "Cairo" };
    expect(withLook(current, { font: "Manrope" })).toEqual({ ...LOOK, font: "Manrope" });
    expect(withLook(current, { font: "Bricolage Grotesque", font_family: "Lora" })).toEqual({ ...LOOK, font: "Bricolage Grotesque", font_family: "Lora" });
    expect(withLook(current, { corners: "round" })).toEqual({ ...current, corners: "round" });
  });

  it("an app starts with the free font of its Branding step", () => {
    const app = { template: "bold" as const, font: "Cairo", brandingDoneAt: new Date() };
    expect(defaultAppearance(app, BUILT_IN_APP_DEFAULTS)).toMatchObject({ template: "bold", font: "DM Sans", font_family: "Cairo" });
    expect(defaultAppearance({ ...app, font: "Lexend" }, BUILT_IN_APP_DEFAULTS).font_family).toBeUndefined();
  });
});

describe("the font files", () => {
  const cairo = freeFont("Cairo")!;
  const file = "Cairo[slnt,wght].ttf";

  it("are copied once from google/fonts at the catalog's commit, then served from the file store", async () => {
    const blobs = new MemoryBlobs();
    const asked: string[] = [];
    const fetcher = (async (url: string) => {
      asked.push(url);
      return new Response(new Uint8Array(TTF), { status: 200 });
    }) as typeof fetch;
    const first = await freeFontFile(cairo.dir, file, { blobs, fetcher });
    expect(first).toEqual({ data: TTF, contentType: "font/ttf" });
    expect(asked).toEqual([googleFontsSource(cairo.dir, file)]);
    expect(asked[0]).toBe(`https://raw.githubusercontent.com/google/fonts/${FONTS_COMMIT}/ofl/cairo/Cairo%5Bslnt%2Cwght%5D.ttf`);
    expect(await freeFontFile(cairo.dir, file, { blobs, fetcher })).toEqual({ data: TTF, contentType: "font/ttf" });
    expect(asked).toHaveLength(1);
  });

  it("only the catalog's files, only fonts, and says when GitHub can't be reached", async () => {
    const blobs = new MemoryBlobs();
    let calls = 0;
    const fetcher = (async () => {
      calls++;
      return new Response("<html>not found</html>", { status: 200 });
    }) as typeof fetch;
    expect(await freeFontFile(cairo.dir, "../../etc/passwd", { blobs, fetcher })).toBeNull();
    expect(await freeFontFile("ofl/nothere", file, { blobs, fetcher })).toBeNull();
    expect(calls).toBe(0);
    expect(await freeFontFile(cairo.dir, file, { blobs, fetcher })).toBe("unavailable");
    const down = (async () => new Response("", { status: 502 })) as typeof fetch;
    expect(await freeFontFile(cairo.dir, file, { blobs, fetcher: down })).toBe("unavailable");
    expect(blobs.files.size).toBe(0);
    expect(fontFileAt(cairo.dir, file)).toBe(cairo);
    expect(fontTypeOf(Buffer.from("OTTO\0\0\0\0\0\0\0\0"))).toBe("font/otf");
    expect(fontTypeOf(Buffer.from("{\"a\":1}"))).toBeNull();
  });
});

describe("GET /api/v1/fonts", () => {
  it("finds fonts with a file to show each in", async () => {
    const res = searchRoute(new Request("https://yallapp.example/api/v1/fonts?q=taj&arabic=1"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { fonts: { family: string; arabic: boolean; bundled: boolean; preview_url: string }[] };
    expect(body.fonts[0]).toEqual({ family: "Tajawal", category: "sans", arabic: true, bundled: false, preview_url: "/api/v1/fonts/ofl/tajawal/Tajawal-Regular.ttf" });
    expect(searchRoute(new Request("https://yallapp.example/api/v1/fonts?category=comic")).status).toBe(400);
  });
});
