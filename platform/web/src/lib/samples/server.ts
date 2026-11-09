import "server-only";
import { getBlobStore } from "../blobs";
import type { DataStore } from "../data/store";
import type { DemoId } from "../demo/constants";
import { seedDemoSamples } from "./demo";
import { sourcesIn, type SampleList } from "./lists";
import { seedSamples, type SampleDeps } from "./seed";

/** 110.2 Seeding with the platform's file storage. */
export function sampleDeps(store: DataStore, now: Date): SampleDeps {
  const blobs = getBlobStore();
  return { store, putBlob: (key, data, type) => blobs.put(key, data, type), now };
}

/**
 * After a design was chosen: the empty lists its pages show get samples,
 * (templates = demos) the demo's own entries when it is a demo's design.
 * The design is taken all the same when this fails (logged).
 */
export async function seedForDesign(store: DataStore, appId: string, pages: unknown, now: Date, demo: DemoId | null = null): Promise<SampleList[]> {
  try {
    const deps = sampleDeps(store, now);
    const sources = sourcesIn(pages);
    return demo ? await seedDemoSamples(deps, appId, demo, { sources }) : await seedSamples(deps, appId, { sources });
  } catch (error) {
    console.error(`[samples] ${appId}: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}
