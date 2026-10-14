/**
 * Listing descriptions: offices type plain text or paste simple HTML. Only
 * a few formatting tags survive cleaning (no attributes, except a link's
 * https, mailto or tel address); scripts, styles and everything else go.
 */

const ALLOWED = new Set(["p", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li", "h3", "h4", "a"]);
const BLOCK = /<(p|ul|ol|h3|h4)>/;
/** Tags whose content goes too, not just the tag. */
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|template|noscript|svg|math|head|title)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

const escapeText = (s: string) =>
  s
    .replace(/&(?!(?:[a-z]+|#\d{1,7}|#x[0-9a-f]{1,6});)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function safeHref(attributes: string): string | null {
  const match = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attributes);
  const href = (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim().replace(/&amp;/g, "&");
  return /^(https:\/\/|mailto:|tel:)/i.test(href) ? href : null;
}

/** The description with only the allowed tags left. */
export function cleanDescription(input: string): string {
  const text = input.replace(/\r\n?/g, "\n").replace(DROP_WITH_CONTENT, "").replace(/<!--[\s\S]*?-->/g, "");
  let out = "";
  let last = 0;
  const open: string[] = [];
  for (const match of text.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^<>]*)>/g)) {
    out += escapeText(text.slice(last, match.index));
    last = match.index + match[0].length;
    const name = match[1]!.toLowerCase();
    if (!ALLOWED.has(name)) continue;
    const closing = match[0].startsWith("</");
    if (name === "br") {
      if (!closing) out += "<br>";
    } else if (closing) {
      const at = open.lastIndexOf(name);
      if (at === -1) continue;
      // Close what was left open inside it.
      while (open.length > at) out += `</${open.pop()}>`;
    } else if (name === "a") {
      const href = safeHref(match[2] ?? "");
      if (!href) continue;
      open.push("a");
      out += `<a href="${escapeText(href)}">`;
    } else {
      open.push(name);
      out += `<${name}>`;
    }
  }
  out += escapeText(text.slice(last));
  while (open.length) out += `</${open.pop()}>`;
  return out.trim();
}

/** `description_html`: cleaned HTML as it is, or plain text as paragraphs. */
export function listingDescriptionHtml(description: string): string {
  const clean = cleanDescription(description);
  if (BLOCK.test(clean)) return clean;
  return clean
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}
