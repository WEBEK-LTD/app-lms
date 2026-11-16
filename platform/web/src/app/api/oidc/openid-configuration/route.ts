import { appUrl } from "@/lib/env";
import { OIDC_MAX_AGE_SECONDS, openIdConfiguration } from "@/lib/google/platform-keys";

export const dynamic = "force-dynamic";

/**
 * 136 `/oidc/.well-known/openid-configuration` (rewritten here in
 * next.config.ts): the platform as an OpenID Connect issuer, which Google's
 * Workload Identity Federation reads to find the key set its assertions are
 * checked with (lib/google/platform-keys.ts). Public: it names no secret.
 */
export async function GET(): Promise<Response> {
  return Response.json(openIdConfiguration(appUrl()), {
    headers: { "cache-control": `public, max-age=${OIDC_MAX_AGE_SECONDS}`, "access-control-allow-origin": "*" },
  });
}
