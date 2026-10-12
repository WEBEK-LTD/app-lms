/**
 * Normalises a WordPress site URL so the same site always maps to the same
 * value, whatever the plugin or the client typed:
 *
 * - scheme is ignored (http and https are the same site);
 * - host is lowercased, IDNs are converted to punycode, a leading `www.` and
 *   a trailing dot are removed;
 * - default ports are dropped, other ports are kept;
 * - query, fragment, credentials and trailing slashes are dropped;
 * - the path is kept, so `example.com/academy` (a WordPress install in a
 *   subdirectory) is a different site from `example.com`.
 *
 * Returns null when the value isn't an http(s) URL with a host.
 */
export function normalizeSiteUrl(input: string): string | null {
  if (typeof input !== "string") return null;
  let raw = input.trim();
  if (!raw || raw.length > 2048) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    // A scheme without "//" (mailto:, javascript:) isn't a site; "host:8080" is.
    if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(raw)) return null;
    raw = `https://${raw}`;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  let host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host.includes("..")) return null;
  if (host.startsWith("www.") && host.length > 4) host = host.slice(4);

  const defaultPort = url.port === "" || (url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443");
  const port = defaultPort ? "" : `:${url.port}`;

  const path = decodeSafe(url.pathname)
    .replace(/\/{2,}/g, "/")
    .replace(/\/index\.php$/i, "")
    .replace(/\/+$/, "")
    .toLowerCase();

  return `${host}${port}${path}`;
}

function decodeSafe(value: string): string {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

export function sameSite(a: string, b: string): boolean {
  const left = normalizeSiteUrl(a);
  return left !== null && left === normalizeSiteUrl(b);
}

/** Accepts only absolute http(s) URLs (for forms). */
export function isHttpUrl(value: string, httpsOnly = false): boolean {
  try {
    const url = new URL(value);
    if (httpsOnly) return url.protocol === "https:" && Boolean(url.hostname);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}
