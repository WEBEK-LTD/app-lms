import { getStore } from "@/lib/data";
import { encryptionKey } from "@/lib/env";
import { OIDC_CACHE_CONTROL, publishedPlatformJwks } from "@/lib/google/platform-keys";

export const dynamic = "force-dynamic";

/**
 * 136 `/oidc/jwks.json` (rewritten here in next.config.ts): the public keys
 * the platform signs its assertions for Google with, the current one and
 * those replaced in the last two days. The first key is made here when there
 * is none yet, so Google never reads an empty set. 216 Kept a minute by each
 * server (no database read meanwhile), forgotten when a key is made or
 * rotated, so Google's token service gets its answer quickly.
 */
export async function GET(): Promise<Response> {
  const jwks = await publishedPlatformJwks(getStore, encryptionKey, new Date());
  return Response.json(jwks, {
    headers: { "content-type": "application/jwk-set+json", "cache-control": OIDC_CACHE_CONTROL, "access-control-allow-origin": "*" },
  });
}
