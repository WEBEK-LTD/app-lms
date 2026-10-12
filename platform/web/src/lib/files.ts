import "server-only";
import { createHmac } from "node:crypto";
import type { Artifact, ArtifactKind } from "./data/types";
import { filesBaseUrl, filesSigningSecret } from "./env";

/**
 * Download links for build files on files.yallapp.com.tr.
 *
 * The pipeline stores each file there and reports its plain URL. The PHP
 * script on that host refuses unsigned or expired links, so every time a page
 * shows a link we add `expires` (unix seconds) and `sig`:
 *
 *   sig = hex(HMAC-SHA256(FILES_SIGNING_SECRET, `${pathname}?expires=${expires}`))
 *
 * which PHP checks with hash_hmac('sha256', $path . '?expires=' . $expires, $secret)
 * and hash_equals. Signed links are made at render time and never stored.
 */

export const FILE_LINK_TTL_SECONDS = 15 * 60;

export const ARTIFACT_LABEL: Record<ArtifactKind, string> = {
  apk: "Android APK",
  aab: "Android App Bundle (.aab)",
  ipa: "iOS build (.ipa)",
  keystore: "Android upload key (keep it safe)",
  store_assets: "Store assets (.zip)",
};

export const FILES_NOT_CONFIGURED = "Downloads aren't configured yet";

/** The exact string that is signed. Changing it breaks every download on files.yallapp.com.tr. */
export function fileSignaturePayload(pathname: string, expires: number): string {
  return `${pathname}?expires=${expires}`;
}

export function fileSignature(secret: string, pathname: string, expires: number): string {
  return createHmac("sha256", secret).update(fileSignaturePayload(pathname, expires)).digest("hex");
}

/**
 * Signs `url` when its origin is `baseUrl`'s; other URLs are returned as they
 * are. Any query string or fragment on the stored URL is dropped, because
 * only the path is covered by the signature.
 */
export function signFileUrl(
  url: string,
  options: { baseUrl: string; secret: string; now?: Date; ttlSeconds?: number },
): string {
  const parsed = new URL(url);
  if (parsed.origin !== new URL(options.baseUrl).origin) return url;
  const now = options.now ?? new Date();
  const expires = Math.floor(now.getTime() / 1000) + (options.ttlSeconds ?? FILE_LINK_TTL_SECONDS);
  const sig = fileSignature(options.secret, parsed.pathname, expires);
  return `${parsed.origin}${parsed.pathname}?expires=${expires}&sig=${sig}`;
}

/** A link as a page shows it: a signed href, or no href and the reason why. */
export type FileLink = { href: string; disabledReason: null } | { href: null; disabledReason: string };

/** Signs an artifact URL with the environment's FILES_BASE_URL and FILES_SIGNING_SECRET. */
export function fileLink(url: string, now: Date = new Date()): FileLink {
  let baseUrl: string;
  let secret: string | undefined;
  try {
    baseUrl = filesBaseUrl();
    secret = filesSigningSecret();
  } catch (error) {
    // A wrong setting shouldn't take the builds page down: log it and show the links as not configured.
    console.error(error instanceof Error ? error.message : error);
    return { href: null, disabledReason: FILES_NOT_CONFIGURED };
  }
  if (!URL.canParse(url)) return { href: null, disabledReason: FILES_NOT_CONFIGURED };
  if (new URL(url).origin !== baseUrl) return { href: url, disabledReason: null };
  if (!secret) return { href: null, disabledReason: FILES_NOT_CONFIGURED };
  return { href: signFileUrl(url, { baseUrl, secret, now }), disabledReason: null };
}

/** Signed links for a build's artifacts, in the order the pipeline reported them. */
export function artifactLinks(artifacts: Artifact[], now: Date = new Date()): ({ kind: ArtifactKind; label: string } & FileLink)[] {
  return artifacts.map((artifact) => ({ kind: artifact.kind, label: ARTIFACT_LABEL[artifact.kind], ...fileLink(artifact.url, now) }));
}
