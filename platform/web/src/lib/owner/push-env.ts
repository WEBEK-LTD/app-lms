import "server-only";
import { getStore } from "../data";
import type { DataStore } from "../data/store";
import { ownerPushCaptureDir, ownerPushCredentials } from "../env";
import { parseServiceAccount } from "../hosted/push";
import type { OwnerPushDeps, OwnerPushMessage } from "./push";

/**
 * 58 What the owners' pushes need on the server: Yallapp Business's Firebase
 * project from the environment, and in local runs and tests a folder that
 * keeps each push (YALLAPP_OWNER_PUSH_DIR, never on Netlify).
 */
export async function ownerPushDeps(now: Date = new Date(), store?: DataStore): Promise<OwnerPushDeps> {
  const credentials = ownerPushCredentials();
  const parsed = credentials.serviceAccountJson ? parseServiceAccount(credentials.serviceAccountJson) : null;
  if (credentials.serviceAccountJson && !parsed) console.error("[owner-push] OWNER_PUSH_FIREBASE_SERVICE_ACCOUNT isn't a Firebase service account key");
  const dir = ownerPushCaptureDir();
  return {
    store: store ?? (await getStore()),
    now,
    account: parsed ? { ...parsed, hms: credentials.hms } : null,
    ...(dir ? { capture: (push: { to: string[]; message: OwnerPushMessage }) => capture(dir, push) } : {}),
  };
}

async function capture(dir: string, push: { to: string[]; message: OwnerPushMessage }): Promise<void> {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.json`), JSON.stringify({ ...push, sentAt: new Date().toISOString() }));
}

/** Runs a push without ever failing the caller (with the caller's store when it has one). */
export async function pushOwnerSafely(push: (deps: OwnerPushDeps) => Promise<unknown>, store?: DataStore): Promise<void> {
  try {
    await push(await ownerPushDeps(new Date(), store));
  } catch (error) {
    console.error("[owner-push]", error instanceof Error ? error.message : String(error));
  }
}
