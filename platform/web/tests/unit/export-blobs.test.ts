import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error A plain script without types.
import { exportBlobs, safeKey } from "../../scripts/export-blobs.mjs";

type Blob = { data: Buffer; etag: string; contentType: string };

function fakeStore(blobs: Map<string, Blob>) {
  const gets: string[] = [];
  return {
    gets,
    async *list() {
      const all = [...blobs.entries()].map(([key, b]) => ({ key, etag: b.etag }));
      // Two pages, like Netlify's.
      yield { blobs: all.slice(0, 1), directories: [] };
      yield { blobs: all.slice(1), directories: [] };
    },
    async getWithMetadata(key: string) {
      gets.push(key);
      const b = blobs.get(key);
      return b ? { data: b.data.buffer.slice(b.data.byteOffset, b.data.byteOffset + b.data.byteLength), etag: b.etag, metadata: { contentType: b.contentType } } : null;
    },
  };
}

describe("79.1 the Netlify Blobs export", () => {
  it("copies every blob, then only what changed, and removes what went", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "blobs-"));
    const blobs = new Map<string, Blob>([
      ["icons/app1/icon.png", { data: Buffer.from([137, 80, 78, 71]), etag: "e1", contentType: "image/png" }],
      ["plugin/yallapp-0.4.9.zip", { data: Buffer.from("zip"), etag: "e2", contentType: "application/zip" }],
      ["../escape", { data: Buffer.from("x"), etag: "e3", contentType: "text/plain" }],
    ]);
    const first = fakeStore(blobs);
    expect(await exportBlobs(first, dir)).toEqual({ blobs: 2, downloaded: 2, removed: 0, skipped: ["../escape"] });
    expect([...(await readFile(path.join(dir, "icons/app1/icon.png")))]).toEqual([137, 80, 78, 71]);
    expect(JSON.parse(await readFile(path.join(dir, "icons/app1/icon.png.meta.json"), "utf8"))).toEqual({ contentType: "image/png" });

    blobs.set("plugin/yallapp-0.4.9.zip", { data: Buffer.from("zip2"), etag: "e2b", contentType: "application/zip" });
    blobs.delete("icons/app1/icon.png");
    const second = fakeStore(blobs);
    expect(await exportBlobs(second, dir)).toEqual({ blobs: 1, downloaded: 1, removed: 1, skipped: ["../escape"] });
    expect(second.gets).toEqual(["plugin/yallapp-0.4.9.zip"]);
    expect(await readFile(path.join(dir, "plugin/yallapp-0.4.9.zip"), "utf8")).toBe("zip2");
    expect(await readdir(path.join(dir, "icons/app1"))).toEqual([]);

    const third = fakeStore(blobs);
    expect((await exportBlobs(third, dir)).downloaded).toBe(0);
    expect(third.gets).toEqual([]);
  });

  it("keeps keys inside the folder", () => {
    expect(safeKey("logos/a.png")).toBe(true);
    for (const bad of ["../x", "/etc/passwd", "a/../../b", ".etags.json", "x.meta.json", ""]) expect(safeKey(bad)).toBe(false);
  });
});
