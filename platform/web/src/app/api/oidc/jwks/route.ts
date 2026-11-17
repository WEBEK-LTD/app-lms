import { getStore } from "@/lib/data";
import { encryptionKey } from "@/lib/env";
import { ensurePlatformKey, OIDC_MAX_AGE_SECONDS, platformJwks } from "@/lib/google/platform-keys";

export const dynamic = "force-dynamic";

/**
 * 136 `/oidc/jwks.json` (rewritten here in next.config.ts): the public keys
 * the platform signs its assertions for Google with, the current one and
 * those replaced in the last two days. The first key is made here when there
 * is none yet, so Google never reads an empty set.
 */
export async function GET(): Promise<Response> {
  const store = await getStore();
  const now = new Date();
  let keys = await store.listPlatformSigningKeys("gcp-wif");
  if (!keys.some((k) => k.retiredAt === null)) {
    await ensurePlatformKey(store, "gcp-wif", encryptionKey(), now);
    keys = await store.listPlatformSigningKeys("gcp-wif");
  }
  return Response.json(platformJwks(keys, now), {
    headers: { "content-type": "application/jwk-set+json", "cache-control": `public, max-age=${OIDC_MAX_AGE_SECONDS}`, "access-control-allow-origin": "*" },
  });
}
