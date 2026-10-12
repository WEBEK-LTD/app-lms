import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { blobsDir, blobsMode } from "./env";

/**
 * File storage for uploads (app icons, logos) and plugin releases.
 * Netlify Blobs in production; a local folder in development and tests.
 */
export interface BlobStore {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ data: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
}

const STORE_NAME = "yallapp-files";

class NetlifyBlobStore implements BlobStore {
  private async store() {
    const { getStore } = await import("@netlify/blobs");
    return getStore({ name: STORE_NAME, consistency: "strong" });
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    const store = await this.store();
    const body = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    await store.set(key, body, { metadata: { contentType } });
  }

  async get(key: string): Promise<{ data: Buffer; contentType: string } | null> {
    const store = await this.store();
    const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
    if (!result) return null;
    const contentType = typeof result.metadata.contentType === "string" ? result.metadata.contentType : "application/octet-stream";
    return { data: Buffer.from(result.data), contentType };
  }

  async delete(key: string): Promise<void> {
    const store = await this.store();
    await store.delete(key);
  }
}

class FileBlobStore implements BlobStore {
  constructor(private readonly root: string) {}

  private file(key: string): string {
    if (!/^[a-z0-9][a-z0-9/_.-]*$/i.test(key) || key.includes("..")) throw new Error("Invalid blob key");
    return path.join(this.root, key);
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    const file = this.file(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
    await writeFile(`${file}.meta.json`, JSON.stringify({ contentType }));
  }

  async get(key: string): Promise<{ data: Buffer; contentType: string } | null> {
    const file = this.file(key);
    try {
      const [data, meta] = await Promise.all([readFile(file), readFile(`${file}.meta.json`, "utf8")]);
      return { data, contentType: (JSON.parse(meta) as { contentType: string }).contentType };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const file = this.file(key);
    await rm(file, { force: true });
    await rm(`${file}.meta.json`, { force: true });
  }
}

let instance: BlobStore | null = null;

export function getBlobStore(): BlobStore {
  instance ??= blobsMode() === "netlify" ? new NetlifyBlobStore() : new FileBlobStore(path.resolve(blobsDir()));
  return instance;
}
