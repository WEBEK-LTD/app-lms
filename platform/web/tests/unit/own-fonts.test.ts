import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { BlobStore } from "@/lib/blobs";
import type { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { effectivePlans } from "@/lib/entitlements";
import { lookFont, servedAppearance } from "@/lib/fonts/look";
import { addOwnFont, ownFontView, removeOwnFont, type OwnFontUpload } from "@/lib/fonts/own";
import { readFont } from "@/lib/fonts/sfnt";
import { loadLayout, lookAndLanguages, saveDraft } from "@/lib/pages/layout";
import type { Plan, PlanInfo } from "@/lib/plans";
import { NOW, setupClient } from "./helpers";

/** 97.2 The owner's own fonts: checked as fonts, counted in Media storage, used in the look like any other. */

const font = (file: string) => readFileSync(path.resolve(__dirname, "../..", file));
const MEDIUM = font("src/app/fonts/og/BricolageGrotesque-Medium.ttf");
const EXTRABOLD = font("src/app/fonts/og/BricolageGrotesque-ExtraBold.ttf");
const VARIABLE = font("../../mobile/assets/fonts/outfit/Outfit-Variable.ttf");

/** A copy of a font with a 16-bit field of one of its tables changed. */
function patched(data: Buffer, table: string, at: number, value: number): Buffer {
  const copy = Buffer.from(data);
  const count = copy.readUInt16BE(4);
  for (let i = 0; i < count; i++) {
    if (copy.toString("latin1", 12 + i * 16, 16 + i * 16) === table) copy.writeUInt16BE(value, copy.readUInt32BE(12 + i * 16 + 8) + at);
  }
  return copy;
}

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

describe("a font file", () => {
  it("says its kind, family, weight and whether it may be embedded", () => {
    expect(readFont(MEDIUM)).toEqual({ ok: true, facts: { kind: "ttf", family: "Bricolage Grotesque 48pt", weight: 500, variable: false, italic: false, restricted: false } });
    expect(readFont(VARIABLE)).toMatchObject({ ok: true, facts: { family: "Outfit", variable: true } });
    expect(readFont(patched(MEDIUM, "OS/2", 8, 0x0002))).toMatchObject({ ok: true, facts: { restricted: true } });
    // "Editable" and "preview & print" allow it.
    expect(readFont(patched(MEDIUM, "OS/2", 8, 0x0008))).toMatchObject({ ok: true, facts: { restricted: false } });
    expect(readFont(patched(MEDIUM, "head", 44, 0x0002))).toMatchObject({ ok: true, facts: { italic: true } });
    expect(readFont(Buffer.concat([Buffer.from("wOF2"), MEDIUM.subarray(4)]))).toEqual({ ok: false, problem: "web_font" });
    expect(readFont(Buffer.concat([Buffer.from("ttcf"), MEDIUM.subarray(4)]))).toEqual({ ok: false, problem: "collection" });
    expect(readFont(Buffer.from("<html>not a font</html>"))).toEqual({ ok: false, problem: "not_font" });
  });
});

describe("own fonts", () => {
  let store: MemoryStore;
  let app: App;
  let blobs: MemoryBlobs;
  let plans: Record<Plan, PlanInfo>;
  const upload = (patch: Partial<OwnFontUpload> = {}): OwnFontUpload => ({
    family: "Harbour Sans",
    licence: true,
    files: [{ name: "HarbourSans-Medium.ttf", data: MEDIUM }],
    by: "ada@academy.test",
    ...patch,
  });
  const add = (patch: Partial<OwnFontUpload> = {}) => addOwnFont({ store, blobs, plans, now: NOW }, app, upload(patch));

  beforeEach(async () => {
    const setup = await setupClient();
    store = setup.store;
    app = { ...newApp(setup.client.id, null, NOW, "store"), backend: "hosted", appName: "Harbour Books", connector: { kind: "catalog" } };
    await store.createApp(app);
    blobs = new MemoryBlobs();
    plans = await effectivePlans(store);
  });

  it("asks for a name of its own and the licence, and takes only upright fonts that may be embedded", async () => {
    expect(await add({ family: "Harbour/Sans" })).toEqual({ ok: false, error: "name" });
    expect(await add({ family: "cairo" })).toEqual({ ok: false, error: "name_taken" });
    expect(await add({ family: "Outfit" })).toEqual({ ok: false, error: "name_taken" });
    expect(await add({ licence: false })).toEqual({ ok: false, error: "licence" });
    expect(await add({ files: [] })).toEqual({ ok: false, error: "no_files" });
    expect(await add({ files: [{ name: "a.woff2", data: Buffer.concat([Buffer.from("wOF2"), MEDIUM.subarray(4)]) }] })).toEqual({ ok: false, error: "web_font", file: "a.woff2" });
    expect(await add({ files: [{ name: "i.ttf", data: patched(MEDIUM, "head", 44, 2) }] })).toEqual({ ok: false, error: "italic", file: "i.ttf" });
    expect(await add({ files: [{ name: "r.ttf", data: patched(MEDIUM, "OS/2", 8, 2) }] })).toEqual({ ok: false, error: "restricted", file: "r.ttf" });
    expect(await add({ files: [{ name: "a.ttf", data: MEDIUM }, { name: "b.ttf", data: MEDIUM }] })).toEqual({ ok: false, error: "same_weight" });
    expect(await add({ files: [{ name: "v.ttf", data: VARIABLE }, { name: "m.ttf", data: MEDIUM }] })).toEqual({ ok: false, error: "variable" });
    expect(await store.listOwnFonts(app.id)).toEqual([]);
    expect(blobs.files.size).toBe(0);
  });

  it("keeps the files as assets, counts them in Media storage, and adds weights under the same name", async () => {
    const first = await add();
    expect(first).toMatchObject({ ok: true, font: { family: "Harbour Sans", files: [{ weight: 500 }], sizeBytes: MEDIUM.length, licenceConfirmedBy: "ada@academy.test" } });
    expect(await store.mediaUsage(app.id)).toBe(MEDIUM.length);
    const second = await add({ family: "harbour  sans", files: [{ name: "HarbourSans-ExtraBold.ttf", data: EXTRABOLD }] });
    expect(second).toMatchObject({ ok: true, font: { family: "Harbour Sans", files: [{ weight: 500 }, { weight: 800 }] } });
    expect(await store.listOwnFonts(app.id)).toHaveLength(1);
    expect(await store.mediaUsage(app.id)).toBe(MEDIUM.length + EXTRABOLD.length);
    expect(await add({ family: "Harbour Sans", files: [{ name: "again.ttf", data: MEDIUM }] })).toEqual({ ok: false, error: "same_weight" });

    // Each file is an asset (served like an icon), as a font.
    const saved = (await store.listOwnFonts(app.id))[0]!;
    const asset = (await store.getAsset(saved.files[0]!.assetId))!;
    expect(asset).toMatchObject({ kind: "font", contentType: "font/ttf", size: MEDIUM.length, clientId: app.clientId });
    expect(blobs.files.get(asset.blobKey)?.data.equals(MEDIUM)).toBe(true);
    expect(ownFontView(saved)).toMatchObject({ family: "Harbour Sans", weights: [500, 800], previewUrl: `/api/v1/assets/${saved.files[0]!.assetId}` });

    // Deleted with its files.
    expect(await removeOwnFont({ store, blobs }, app.id, saved.id)).toMatchObject({ family: "Harbour Sans" });
    expect(await store.listOwnFonts(app.id)).toEqual([]);
    expect(await store.getAsset(saved.files[0]!.assetId)).toBeNull();
    expect(blobs.files.size).toBe(0);
    expect(await store.mediaUsage(app.id)).toBe(0);
  });

  it("refuses a font that doesn't fit the app's storage", async () => {
    plans = { ...plans, growth: { ...plans.growth, limits: { ...plans.growth.limits, storageGb: 0 } } };
    expect(await add()).toEqual({ ok: false, error: "storage" });
  });

  it("is chosen in the look like any font, and the app gets its files from Yallapp", async () => {
    await add({ files: [{ name: "v.ttf", data: VARIABLE }] });
    const saved = (await store.listOwnFonts(app.id))[0]!;
    expect(lookFont("harbour sans", ["Harbour Sans"])).toEqual({ font: "DM Sans", font_family: "Harbour Sans" });
    expect(lookFont("Harbour Sans")).toBeNull();

    const draft = (await loadLayout(store, app, NOW)).draft;
    const result = await saveDraft(store, app, { ...draft, appearance: { ...draft.appearance, font_family: "Harbour Sans", arabic_font: "Harbour Sans" } }, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.draft.appearance).toMatchObject({ font: "DM Sans", font_family: "Harbour Sans", arabic_font: "Harbour Sans" });
    // Another app's font isn't this app's.
    const other = { ...app, id: "4c5c1fd2-9a5e-4c0f-8a51-61f0d0e0a001" };
    await store.createApp(other);
    expect(await saveDraft(store, other, { ...draft, appearance: { ...draft.appearance, font_family: "Harbour Sans" } }, NOW)).toMatchObject({ ok: false });

    const served = servedAppearance(result.value.draft.appearance, "https://yallapp.test", [saved]);
    expect(served.font_files).toEqual([{ url: `https://yallapp.test/api/v1/assets/${saved.files[0]!.assetId}`, weight: null }]);
    expect(served.arabic_font_files).toEqual(served.font_files);
    // Not published yet: the app gets the default look.
    expect((await lookAndLanguages(store, app, undefined, null, { platformUrl: "https://yallapp.test" })).appearance.font_files).toBeUndefined();
  });
});
