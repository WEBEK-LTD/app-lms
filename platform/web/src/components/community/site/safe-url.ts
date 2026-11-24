/**
 * 231 An address an <img> may show: a picture this browser made from a chosen
 * file (blob:), a path on this site, or an https address. Anything else
 * (javascript:, data:, a scheme-relative //host, text) gives null.
 */
export function safeImageSrc(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (/^\/(?![/\\])/.test(v)) return v;
  try {
    const url = new URL(v);
    if (url.protocol === "blob:" || url.protocol === "https:") return url.href;
  } catch {
    return null;
  }
  return null;
}
