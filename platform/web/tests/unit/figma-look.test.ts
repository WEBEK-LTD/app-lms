import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { activateLicense, parseSiteInfo } from "@/lib/license/service";
import { figmaImageType, foreignFigmaImages, saveFigmaImage } from "@/lib/figma/images";
import { colorHex, readTokens, suggestLook } from "@/lib/figma/tokens";
import { shownAppearance } from "@/lib/fonts/look";
import type { BlobStore } from "@/lib/blobs";
import { loadLayout, lookAndLanguages, publishLayout, saveDraft } from "@/lib/pages/layout";
import { pluginLayout } from "@/lib/pages/plugin";
import type { FigmaLook, LayoutContent } from "@/lib/pages/types";
import { parseFigmaLook } from "@/lib/pages/validate";
import { solidPng } from "../e2e/png";
import { NOW, setupClient } from "./helpers";
import { expectPlatformContract } from "./platform-contract";

/** 97.3 The Figma look: read from exported files, kept apart from the standard look, shown when chosen. */

const memoryBlobs = (): BlobStore => {
  const files = new Map<string, { data: Buffer; contentType: string }>();
  return { put: async (k, data, contentType) => void files.set(k, { data, contentType }), get: async (k) => files.get(k) ?? null, delete: async (k) => void files.delete(k) };
};

describe("design tokens exported from Figma", () => {
  it("reads W3C tokens as Figma exports its variables, with references", () => {
    const tokens = readTokens({
      color: {
        $type: "color",
        brand: {
          primary: { $value: { colorSpace: "srgb", components: [0.12, 0.31, 0.37], alpha: 1, hex: "#1F4E5F" } },
          accent: { $value: "{color.brand.orange}" },
          orange: { $value: "#ff5a1f" },
        },
        grey: { 100: { $value: "#F4F4F4" } },
      },
      font: { body: { $type: "fontFamily", $value: ["Cairo", "sans-serif"] } },
      radius: { md: { $type: "dimension", $value: "8px" } },
    });
    expect(tokens).toEqual({
      colors: [
        { name: "color / brand / primary", hex: "#1F4E5F" },
        { name: "color / brand / accent", hex: "#FF5A1F" },
        { name: "color / grey / 100", hex: "#F4F4F4" },
      ],
      fonts: [{ name: "font / body", family: "Cairo" }],
      radii: [8],
    });
    expect(suggestLook(tokens!)).toEqual({ primary: "#1F4E5F", secondary: "#FF5A1F", font: "Cairo", corners: "soft" });
  });

  it("reads Tokens Studio, Style Dictionary and lists of variables", () => {
    const studio = readTokens({
      global: {
        colors: { secondary: { value: "rgba(232, 176, 75, 1)", type: "color" }, primary: { value: "#0e0d24", type: "color" } },
        typography: { h1: { value: { fontFamily: "Tajawal", fontWeight: "700" }, type: "typography" } },
        radii: { card: { value: "1rem", type: "borderRadius" } },
      },
    })!;
    // A dark brand color is still the brand's when the file names it so.
    expect(suggestLook(studio)).toEqual({ primary: "#0E0D24", secondary: "#E8B04B", font: "Tajawal", corners: "round" });
    expect(readTokens({ color: { base: { red: { value: "#c00" } } } })!.colors).toEqual([{ name: "color / base / red", hex: "#CC0000" }]);
    const variables = readTokens({ collections: [{ name: "Brand", modes: [{ name: "Light", variables: [{ name: "brand/primary", type: "color", value: { r: 0.1, g: 0.5, b: 0.3, a: 1 } }] }] }] })!;
    expect(variables.colors).toEqual([{ name: "Brand / Light / brand/primary", hex: "#1A804D" }]);
    expect(readTokens({ hello: "world" })).toBeNull();
    expect(readTokens(null)).toBeNull();
    expect(colorHex("rgb(255, 90, 31)")).toBe("#FF5A1F");
    expect(colorHex("#12345678")).toBe("#123456");
    expect(colorHex("tomato")).toBeNull();
  });
});

describe("the Figma look in the layout", () => {
  const look = (patch: Partial<FigmaLook> = {}): FigmaLook => ({
    primary_color: "#1F4E5F",
    secondary_color: "#FF5A1F",
    font_family: "Cairo",
    corners: "round",
    logo_asset_id: null,
    pictures: [],
    source: { kind: "files", name: "harbour-tokens.json", imported_at: NOW.toISOString() },
    ...patch,
  });

  it("is checked like the standard look", () => {
    expect(parseFigmaLook(look({ primary_color: "#1f4e5f" }))).toMatchObject({ primary_color: "#1F4E5F", font_family: "Cairo", corners: "round" });
    expect(parseFigmaLook(look({ font_family: "Lexend" }))?.font_family).toBe("Lexend");
    // Own fonts by name.
    expect(parseFigmaLook(look({ font_family: "Harbour Sans" }), undefined, ["Harbour Sans"])?.font_family).toBe("Harbour Sans");
  });

  it("is shown only in the Figma mode, over the template and modes of the standard look, which stays as it was", () => {
    const standard: LayoutContent["appearance"] = { template: "bold", theme_mode: "dark", user_can_change_mode: true, secondary_color: null, font: "Outfit", font_family: "Lora", corners: "sharp", cards: "flat" };
    const url = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
    const figma = look({ logo_asset_id: "9f1c2b6e-1d2f-4a3b-8c4d-5e6f7a8b9c0d" });
    expect(shownAppearance({ appearance: standard, figma_look: figma }, url)).toEqual(standard);
    expect(shownAppearance({ appearance: standard, look_mode: "figma", figma_look: figma }, url)).toEqual({
      template: "bold",
      theme_mode: "dark",
      user_can_change_mode: true,
      cards: "flat",
      font: "DM Sans",
      font_family: "Cairo",
      secondary_color: "#FF5A1F",
      corners: "round",
      primary_color: "#1F4E5F",
      logo_url: "https://yallapp.test/api/v1/assets/9f1c2b6e-1d2f-4a3b-8c4d-5e6f7a8b9c0d",
    });
    // No font in the file: the bundled font, not the standard look's free font.
    expect(shownAppearance({ appearance: standard, look_mode: "figma", figma_look: look({ font_family: null }) }, url)).not.toHaveProperty("font_family");
  });

  it("names only the account's own pictures, and reaches the app (hosted and WordPress) when published", async () => {
    const { store, client, licenseKey } = await setupClient();
    const app = { ...newApp(client.id, "https://academy.test", NOW, "lms"), websiteDoneAt: NOW };
    await store.createApp(app);
    const blobs = memoryBlobs();
    const logo = await saveFigmaImage({ store, blobs, now: NOW }, app, solidPng(64, 64, [31, 78, 95]));
    expect(logo.ok).toBe(true);
    if (!logo.ok) return;
    expect(await saveFigmaImage({ store, blobs, now: NOW }, app, Buffer.from("<svg/>"))).toEqual({ ok: false, error: "type" });
    expect(figmaImageType(solidPng(2, 2, [0, 0, 0]))).toEqual({ contentType: "image/png", extension: "png" });
    expect(await foreignFigmaImages(store, client.id, [logo.assetId])).toEqual([]);
    expect(await foreignFigmaImages(store, "another-client", [logo.assetId])).toEqual([logo.assetId]);

    const draft = (await loadLayout(store, app, NOW)).draft;
    const stranger = "4b1c2b6e-1d2f-4a3b-8c4d-5e6f7a8b9c0d";
    expect(await saveDraft(store, app, { ...draft, look_mode: "figma", figma_look: look({ logo_asset_id: stranger }) }, NOW)).toEqual({
      ok: false,
      errors: ["Figma look: a picture isn't one of your files. Import it again."],
    });
    expect(await saveDraft(store, app, { ...draft, look_mode: "figma" }, NOW)).toMatchObject({ ok: false, errors: ["Look: import a Figma file before showing its look."] });
    expect(await saveDraft(store, app, { ...draft, figma_look: look({ primary_color: "teal", font_family: "Comic Sans MS", logo_asset_id: "../../x" }) }, NOW)).toEqual({
      ok: false,
      errors: ["Figma look: the main color must look like #1F4E5F.", "Figma look: choose a free font or one of your own.", "Figma look: the logo isn't one of your files."],
    });
    const figma = look({ logo_asset_id: logo.assetId, pictures: [{ asset_id: logo.assetId, name: "Harbour" }] });
    const saved = await saveDraft(store, app, { ...draft, look_mode: "figma", figma_look: figma }, NOW);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    // The standard look is kept as it was.
    expect(saved.value.draft.appearance).toEqual(draft.appearance);
    expect(saved.value.draft.figma_look).toMatchObject({ primary_color: "#1F4E5F", logo_asset_id: logo.assetId });

    const served = (await lookAndLanguages(store, app, { version: "draft", ...saved.value.draft }, null, { platformUrl: "https://yallapp.test" })).appearance;
    expect(served).toMatchObject({ primary_color: "#1F4E5F", font_family: "Cairo", logo_url: `https://yallapp.test/api/v1/assets/${logo.assetId}` });
    expect(served.font_files?.[0]?.url).toContain("/api/v1/fonts/ofl/cairo/");

    expect((await publishLayout(store, app, undefined, "owner@academy.test", NOW)).ok).toBe(true);
    const site = parseSiteInfo({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.4.20" });
    if (!site.ok) throw new Error("bad site");
    await activateLicense(store, site.value, NOW);
    const result = await pluginLayout(store, site.value, null, NOW, "https://yallapp.test");
    expectPlatformContract("POST", "/apps/layout", result);
    if (result.status !== 200) throw new Error(`status ${result.status}`);
    expect(result.body.appearance).toMatchObject({ primary_color: "#1F4E5F", font_family: "Cairo", logo_url: `https://yallapp.test/api/v1/assets/${logo.assetId}` });
    // The Figma look itself stays on the platform.
    expect(result.body).not.toHaveProperty("figma_look");
    expect(result.body).not.toHaveProperty("look_mode");

    // Back to the standard look: as it was.
    const back = await saveDraft(store, app, { ...saved.value.draft, look_mode: "standard" }, NOW);
    expect(back.ok && back.value.draft).toMatchObject({ appearance: draft.appearance, figma_look: { primary_color: "#1F4E5F" } });
    expect(back.ok && back.value.draft.look_mode).toBeUndefined();
  });
});
