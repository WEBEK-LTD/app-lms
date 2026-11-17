import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaFile } from "@/lib/data/types";

/**
 * A Media library picture's own link (/m/<id>): the redirect to its signed
 * link is the same for everyone, so Netlify's CDN keeps it for an hour and
 * the app's pictures don't each wait for a function and the database first.
 * Other files are never kept there (the owner may stop sharing them).
 */

const state: { files: MediaFile[] } = { files: [] };
vi.mock("@/lib/data", () => ({ getStore: async () => ({ getMediaFileById: async (id: string) => state.files.find((f) => f.id === id) ?? null }) }));
vi.mock("@/lib/media/storage", async (original) => {
  const actual = await original<typeof import("@/lib/media/storage")>();
  return { ...actual, getMediaStorage: () => actual.mediaStorageWith({ mode: "host", base: "https://media.test", secret: "gate-secret" }) };
});

const { GET } = await import("@/app/m/[id]/route");

const APP = "0b8c3c5e-1f0e-4d47-9a43-1b1c3a6f9e10";
const file = (id: string, kind: MediaFile["kind"], isPublic: boolean): MediaFile => ({
  id,
  appId: APP,
  name: `${kind}.bin`,
  kind,
  contentType: kind === "image" ? "image/jpeg" : "video/mp4",
  sizeBytes: 1000,
  storageKey: `${APP}/${id}.${kind === "image" ? "jpg" : "mp4"}`,
  status: "ready",
  public: isPublic,
  source: "library",
  createdAt: new Date(),
  updatedAt: new Date(),
});

const PICTURE = "5d2e7c1a-8b3f-4e6a-9c0d-2f4a6b8c0d1e";
const VIDEO = "6e3f8d2b-9c4a-4f7b-8d1e-3a5b7c9d1e2f";

const open = (id: string) => GET(new Request(`https://yallapp.test/m/${id}`), { params: Promise.resolve({ id }) } as never);

describe("a Media library picture's link", () => {
  beforeEach(() => {
    state.files = [file(PICTURE, "image", true), file(VIDEO, "video", true)];
  });

  it("is kept by the CDN for an hour, within its signed link's six", async () => {
    const response = await open(PICTURE);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toMatch(new RegExp(`^https://media\\.test/v/${APP}/${PICTURE}/jpg\\?expires=\\d+&sig=`));
    expect(response.headers.get("netlify-cdn-cache-control")).toBe("public, durable, max-age=3600");
    // Browsers and the app keep it a few minutes, as before.
    expect(response.headers.get("cache-control")).toBe("private, max-age=300");
    const expires = Number(new URL(response.headers.get("location")!).searchParams.get("expires"));
    expect(expires * 1000 - Date.now()).toBeGreaterThan(5 * 3600 * 1000);
  });

  it("a shared video isn't kept by the CDN", async () => {
    const response = await open(VIDEO);
    expect(response.status).toBe(302);
    expect(response.headers.get("netlify-cdn-cache-control")).toBeNull();
  });

  it("a file that isn't there isn't kept either", async () => {
    const response = await open("7f4a9e3c-0d5b-4a8c-9e2f-4b6c8d0e2f3a");
    expect(response.status).toBe(404);
    expect(response.headers.get("netlify-cdn-cache-control")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
