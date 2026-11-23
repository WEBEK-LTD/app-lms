import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUDIT_ACTIONS } from "@/lib/admin/audit-actions";
import { can, type AdminRole } from "@/lib/admin/permissions";
import { registerClient } from "@/lib/auth/accounts";
import type { BlobStore } from "@/lib/blobs";
import { MemoryStore } from "@/lib/data/memory";
import { designerPageDefaults, type TemplateDesigner } from "@/lib/data/types";
import { LOGO_PATH } from "@/lib/seo";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { designerChip } from "@/lib/studio-market/catalog";
import { designerProfileLd } from "@/lib/studio-market/designer-public";
import { DESIGNER_PHOTO_MAX_BYTES, PAGE_MESSAGES } from "@/lib/studio-market/designer-page";
import { DESIGNER_MESSAGES } from "@/lib/studio-market/designers";
import { designerPhotoUrl, HOUSE_DESIGNER_ID, HOUSE_PAGE_MESSAGES, houseLogoUrl, isHouseDesigner } from "@/lib/studio-market/house-photo";
import { HOUSE_DESIGNER_ID as FROM_HOUSE } from "@/lib/studio-market/house";
import { HOUSE_PHOTO_PATH, safePhotoUrl } from "@/lib/studio-market/photo-url";
import { solidPng } from "../e2e/png";

/**
 * 218 Yallapp's own designer page: the Yallapp logo is its photo until the
 * team uploads one (on the market's cards, the page and its JSON-LD), and
 * Admin › Studio Market › Designers › Yallapp's own page changes the photo
 * (the designer upload's checks) and the line, approved at once, in the
 * audit log, for the team members with `market.review` only.
 */

const APP = "https://app.yallapp.test";
const NOW = new Date("2026-11-23T10:00:00Z");
const state: { store: MemoryStore; role: AdminRole } = { store: new MemoryStore(), role: "admin" };
type Entry = { action: string; target: { type: string; id: unknown }; summary: string; before?: unknown; after?: unknown };
const audit = vi.fn<(entry: Entry) => Promise<null>>(async () => null);

class Redirected extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
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
const blobs = new MemoryBlobs();

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn(async (permission = "view") => {
    if (!can(state.role, permission)) throw new Redirected(`/admin?denied=${permission}`);
    return { id: "u-admin", email: "sara@yallapp.test", name: "Sara", adminRole: state.role };
  }),
  adminCan: vi.fn(async (permission: Parameters<typeof can>[1]) => can(state.role, permission)),
}));
vi.mock("@/lib/data", () => ({ getStore: async () => state.store }));
vi.mock("@/lib/blobs", () => ({ getBlobStore: () => blobs }));
vi.mock("@/lib/admin/audit", () => ({ recordAudit: (entry: Entry) => audit(entry) }));
vi.mock("@/lib/env", async (original) => ({ ...(await original<typeof import("@/lib/env")>()), appUrl: () => APP }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirected(url);
  },
}));

const { saveHouseDesignerAction } = await import("@/app/actions/admin-market");

function designer(over: Partial<TemplateDesigner> = {}): TemplateDesigner {
  return { id: HOUSE_DESIGNER_ID, clientId: "c-demo", name: "Yallapp", slug: "yallapp", country: "EG", bio: null, status: "active", termsAcceptedAt: NOW, createdAt: NOW, updatedAt: NOW, ...designerPageDefaults(), ...over };
}

const ASSET = "0b9c3a5e-1f2d-4c6b-8a7e-9d0f1e2a3b4c";

describe("218 the Yallapp logo is Yallapp's own designer's photo until one is uploaded", () => {
  it("is the site's own logo (lib/seo.ts), a file the website serves", () => {
    expect(HOUSE_PHOTO_PATH).toBe(LOGO_PATH);
    expect(existsSync(path.resolve(__dirname, "../../public", HOUSE_PHOTO_PATH.slice(1)))).toBe(true);
    expect(houseLogoUrl()).toBe(`${APP}${HOUSE_PHOTO_PATH}`);
  });

  it("passes the photo check, which still refuses any other address", () => {
    expect(safePhotoUrl(`${APP}${HOUSE_PHOTO_PATH}`)).toBe(`${APP}${HOUSE_PHOTO_PATH}`);
    expect(safePhotoUrl(`${APP}/api/v1/assets/${ASSET}`)).toBe(`${APP}/api/v1/assets/${ASSET}`);
    for (const bad of [`${APP}/favicon.svg`, `${APP}${HOUSE_PHOTO_PATH}?x=1`, `${APP}${HOUSE_PHOTO_PATH}#x`, `javascript:alert(1)//${HOUSE_PHOTO_PATH}`, HOUSE_PHOTO_PATH]) expect(safePhotoUrl(bad), bad).toBeNull();
  });

  it("shows on Yallapp's own chip and page (and its JSON-LD image), never on another designer's", () => {
    expect(FROM_HOUSE).toBe(HOUSE_DESIGNER_ID);
    const house = designer();
    expect(isHouseDesigner(house)).toBe(true);
    expect(designerPhotoUrl(house)).toBe(houseLogoUrl());
    expect(designerChip(house).photoUrl).toBe(houseLogoUrl());
    const ld = designerProfileLd(APP, "en", { designer: house, photoUrl: designerPhotoUrl(house), bio: null, links: [], cards: [] }) as { mainEntity: { image?: string } };
    expect(ld.mainEntity.image).toBe(houseLogoUrl());

    // Another designer without a photo: their initials (no photo).
    const other = designer({ id: "d-other", slug: "nur", name: "Studio Nur" });
    expect(isHouseDesigner(other)).toBe(false);
    expect(designerPhotoUrl(other)).toBeNull();
    expect(designerChip(other).photoUrl).toBeNull();
    // Another designer's photo waiting for the team: still nothing.
    expect(designerPhotoUrl({ ...other, photoAssetId: ASSET, profileReview: "pending" })).toBeNull();
  });

  it("gives way to the uploaded photo once approved (a waiting one leaves the logo)", () => {
    expect(designerPhotoUrl(designer({ photoAssetId: ASSET, profileReview: "approved" }))).toBe(`${APP}/api/v1/assets/${ASSET}`);
    expect(designerPhotoUrl(designer({ photoAssetId: ASSET, profileReview: "pending" }))).toBe(houseLogoUrl());
  });
});

async function demoAccount(): Promise<string> {
  const { client } = await registerClient(state.store, { name: "Yallapp demos", email: `demos-${Math.random().toString(36).slice(2)}@house.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  await state.store.setPlatformSetting("demo", { clientId: client.id }, "team@yallapp.test", NOW);
  clearPlatformSettingsCache();
  return client.id;
}

async function houseOnStore(over: Partial<TemplateDesigner> = {}): Promise<TemplateDesigner> {
  const clientId = await demoAccount();
  const made = await state.store.createTemplateDesigner(designer({ clientId, ...over }));
  return made!;
}

function form(fields: Record<string, string | Blob>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const png = () => new File([new Uint8Array(solidPng(64, 64, [20, 18, 40]))], "photo.png", { type: "image/png" });

beforeEach(() => {
  state.store = new MemoryStore();
  state.role = "admin";
  blobs.files.clear();
  audit.mockClear();
  clearPlatformSettingsCache();
});

describe("218 Admin › Studio Market › Designers › Yallapp's own page", () => {
  it("is for the team members with market.review only, and asks before anything else", async () => {
    const source = readFileSync(path.resolve(__dirname, "../../src/app/actions/admin-market.ts"), "utf8");
    expect(source).toMatch(/export async function saveHouseDesignerAction\([^)]*\)[^{]*\{\n\s*const admin = await requireAdmin\("market\.review"\);/);
    await houseOnStore();
    expect((["owner", "admin", "support", "viewer"] as const).map((role) => can(role, "market.review"))).toEqual([true, true, true, false]);
    for (const role of ["viewer", null] as unknown as AdminRole[]) {
      state.role = role;
      await expect(saveHouseDesignerAction({}, form({ bio: "Hi", photo: png() }))).rejects.toThrow("redirect /admin?denied=market.review");
    }
    expect(blobs.files.size).toBe(0);
    expect(audit).not.toHaveBeenCalled();
    expect((await state.store.getTemplateDesigner(HOUSE_DESIGNER_ID))!.bio).toBeNull();
  });

  it("says to make the demo apps first when there's no Yallapp page yet", async () => {
    expect(await saveHouseDesignerAction({}, form({ bio: "Hi" }))).toEqual({ errors: { form: HOUSE_PAGE_MESSAGES.none } });
  });

  it("uploads a PNG or JPEG (by its first bytes) up to 2 MB as the demo account's designer_photo, approved at once, in the audit log", async () => {
    const house = await houseOnStore();
    const saved = await saveHouseDesignerAction({}, form({ bio: "  Yallapp's   own designs, free. ", photo: png() }));
    expect(saved).toMatchObject({ ok: true, message: HOUSE_PAGE_MESSAGES.saved });
    const after = (await state.store.getTemplateDesigner(HOUSE_DESIGNER_ID))!;
    expect(after).toMatchObject({ bio: "Yallapp's own designs, free.", profileReview: "approved", profileNote: null });
    expect(after.photoAssetId).toBeTruthy();
    const asset = (await state.store.getAsset(after.photoAssetId!))!;
    expect(asset).toMatchObject({ clientId: house.clientId, kind: "designer_photo", contentType: "image/png" });
    expect(asset.blobKey).toBe(`assets/${house.clientId}/${after.photoAssetId}.png`);
    expect(blobs.files.has(asset.blobKey)).toBe(true);
    // Shown on the public pages now, with no review.
    expect(designerPhotoUrl(after)).toBe(`${APP}/api/v1/assets/${after.photoAssetId}`);
    expect(AUDIT_ACTIONS).toHaveProperty(["market.house_page_saved"]);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "market.house_page_saved", target: { type: "market_designer", id: HOUSE_DESIGNER_ID }, summary: expect.stringContaining("uploaded a photo") }));
  });

  it("refuses a file that isn't a PNG or JPEG whatever its name and type, and one over 2 MB", async () => {
    await houseOnStore();
    const fake = new File([new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>")], "photo.png", { type: "image/png" });
    expect(await saveHouseDesignerAction({}, form({ bio: "", photo: fake }))).toMatchObject({ errors: { photo: PAGE_MESSAGES.photo } });
    const big = new File([new Uint8Array(DESIGNER_PHOTO_MAX_BYTES + 1)], "big.jpg", { type: "image/jpeg" });
    expect(await saveHouseDesignerAction({}, form({ bio: "", photo: big }))).toMatchObject({ errors: { photo: PAGE_MESSAGES.photo } });
    expect(await saveHouseDesignerAction({}, form({ bio: "x".repeat(401) }))).toMatchObject({ errors: { bio: DESIGNER_MESSAGES.bio } });
    expect((await state.store.getTemplateDesigner(HOUSE_DESIGNER_ID))!).toMatchObject({ photoAssetId: null, bio: null, profileReview: "none" });
    expect(blobs.files.size).toBe(0);
    expect(audit).not.toHaveBeenCalled();
  });

  it("replaces the photo (the old one's file and asset gone), then “Use the Yallapp logo” removes it", async () => {
    await houseOnStore();
    await saveHouseDesignerAction({}, form({ bio: "", photo: png() }));
    const first = (await state.store.getTemplateDesigner(HOUSE_DESIGNER_ID))!.photoAssetId!;
    await saveHouseDesignerAction({}, form({ bio: "", photo: png() }));
    const second = (await state.store.getTemplateDesigner(HOUSE_DESIGNER_ID))!.photoAssetId!;
    expect(second).not.toBe(first);
    expect(await state.store.getAsset(first)).toBeNull();
    expect(blobs.files.size).toBe(1);
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ summary: expect.stringContaining("replaced the photo") }));

    // A photo sent with the tick is ignored: the logo it is.
    expect(await saveHouseDesignerAction({}, form({ bio: "", useLogo: "on", photo: png() }))).toMatchObject({ ok: true, message: HOUSE_PAGE_MESSAGES.logo });
    const after = (await state.store.getTemplateDesigner(HOUSE_DESIGNER_ID))!;
    expect(after.photoAssetId).toBeNull();
    expect(await state.store.getAsset(second)).toBeNull();
    expect(blobs.files.size).toBe(0);
    expect(designerPhotoUrl(after)).toBe(houseLogoUrl());
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ summary: expect.stringContaining("the Yallapp logo shows") }));
  });

  it("approves a line waiting from before, and never touches another designer", async () => {
    await houseOnStore({ bio: "Old", profileReview: "pending" });
    const other = await state.store.createTemplateDesigner(designer({ id: "d-other", clientId: await demoAccount(), slug: "nur", name: "Studio Nur", bio: "Mine", profileReview: "pending" }));
    await saveHouseDesignerAction({}, form({ bio: "New line" }));
    expect((await state.store.getTemplateDesigner(HOUSE_DESIGNER_ID))!).toMatchObject({ bio: "New line", profileReview: "approved" });
    expect((await state.store.getTemplateDesigner(other!.id))!).toMatchObject({ bio: "Mine", profileReview: "pending" });
  });
});
