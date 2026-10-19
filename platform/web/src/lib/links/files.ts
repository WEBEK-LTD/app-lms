import type { DataStore } from "../data/store";
import type { AppLinkTarget } from "../data/types";
import { platformAppleAssociation, platformAssetLinks } from "./well-known";

/**
 * 46 Yallapp's own link files at the root of its domain (rewritten from
 * `/.well-known/…` in next.config.ts): every app, each for its `/a/<app_id>/`
 * on iOS. Kept for a minute per server instance; phones and Apple's CDN cache
 * them longer anyway.
 */
let cached: { at: number; targets: AppLinkTarget[] } | null = null;
const KEEP_MS = 60_000;

async function targets(store: DataStore, now: number): Promise<AppLinkTarget[]> {
  if (cached && now - cached.at < KEEP_MS) return cached.targets;
  const list = await store.listAppLinkTargets();
  cached = { at: now, targets: list };
  return list;
}

/** Forgets the copy, after an app's link facts change. */
export function forgetLinkTargets(): void {
  cached = null;
}

const HEADERS = { "content-type": "application/json", "cache-control": "public, max-age=300", "access-control-allow-origin": "*" };

export async function assetLinksResponse(store: DataStore, now = Date.now()): Promise<Response> {
  return new Response(JSON.stringify(platformAssetLinks(await targets(store, now))), { status: 200, headers: HEADERS });
}

export async function appleAssociationResponse(store: DataStore, now = Date.now()): Promise<Response> {
  return new Response(JSON.stringify(platformAppleAssociation(await targets(store, now))), { status: 200, headers: HEADERS });
}
