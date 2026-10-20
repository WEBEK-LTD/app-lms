import { rm } from "node:fs/promises";
import path from "node:path";
import { E2E } from "../../playwright.config";

/**
 * Each run starts with an empty mail folder. The specs read every captured
 * email to find theirs; left from earlier local runs, thousands of files made
 * those reads fail (too many open files) and the first email look missing.
 */
export default async function globalSetup(): Promise<void> {
  await rm(path.resolve(E2E.mailDir), { recursive: true, force: true });
}
