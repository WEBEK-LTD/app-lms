/**
 * A PEM key rebuilt from its base64 body: one header, 64-character lines, LF, no byte order mark.
 * Keys pasted or saved by other tools can lose their line breaks or gain spaces, which OpenSSL in
 * fastlane's Ruby reads as a curve name ("invalid curve name"). Text that isn't a PEM block is kept.
 */
export function rewrapPem(text: string): string {
  const match = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/.exec(text.replace(/^\uFEFF/, ""));
  if (!match) return text;
  const body = (match[2] ?? "").replace(/[^A-Za-z0-9+/=]/g, "");
  const lines = body.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${match[1]}-----\n${lines.join("\n")}\n-----END ${match[1]}-----\n`;
}
