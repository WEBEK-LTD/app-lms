import "server-only";
import type { DataStore } from "../data/store";
import { appUrl, encryptionKey, googleApiTestUrl, yallappFirebaseEnv, type YallappFirebaseEnv } from "../env";
import { endpointsAt, GOOGLE_ENDPOINTS, type GoogleEndpoints } from "./endpoints";
import type { Federation } from "./federation";
import { ensurePlatformKey, oidcIssuer, signPlatformJwt } from "./platform-keys";

/** 136 Google's APIs: the real ones, or the fake server of local tests (GOOGLE_API_TEST_URL). */
export function googleEndpoints(): GoogleEndpoints {
  const test = googleApiTestUrl();
  return test ? endpointsAt(test) : GOOGLE_ENDPOINTS;
}

/**
 * 136 The platform's federation with Google from the environment, signing
 * with its key in the store (made the first time); null when Yallapp's
 * Firebase isn't set up (GOOGLE_WIF_PROVIDER and the two service accounts).
 */
export function federationFromEnv(store?: DataStore): { federation: Federation; env: YallappFirebaseEnv } | null {
  const env = yallappFirebaseEnv();
  if (!env) return null;
  const issuer = oidcIssuer(appUrl());
  return {
    env,
    federation: {
      provider: env.provider,
      issuer,
      endpoints: googleEndpoints(),
      async sign(claims) {
        const data = store ?? (await (await import("../data")).getStore());
        const key = await ensurePlatformKey(data, "gcp-wif", encryptionKey(), new Date(claims.iat * 1000));
        return signPlatformJwt(key, encryptionKey(), claims);
      },
    },
  };
}
