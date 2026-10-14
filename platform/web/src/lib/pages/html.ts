/**
 * Cleans the HTML of a text block with an allowlist: simple formatting,
 * lists, headings, quotes and links. Everything else is dropped (with the
 * content of script-like elements); text is kept and escaped. The app
 * renders the result natively, like lesson HTML.
 */

const TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "hr", "span", "small"]);
const VOID = new Set(["br", "hr"]);
/** Dropped together with what's inside them. */
const DROP_WITH_CONTENT = new Set(["script", "style", "iframe", "object", "embed", "noscript", "template", "textarea", "select", "svg", "math", "head", "title", "form"]);
const ENTITY = /^&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});/i;

function escapeText(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]!;
    if (c === "&") out += ENTITY.test(text.slice(i)) ? "&" : "&amp;";
    else if (c === "<") out += "&lt;";
    else if (c === ">") out += "&gt;";
    else out += c;
  }
  return out;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => String.fromCodePoint(Math.min(Number.parseInt(hex, 16) || 32, 0x10ffff)))
    .replace(/&#(\d+);?/g, (_, dec: string) => String.fromCodePoint(Math.min(Number(dec) || 32, 0x10ffff)))
    .replace(/&colon;/gi, ":")
    .replace(/&amp;/gi, "&")
    .replace(/&tab;|&newline;/gi, "");
}

/** A link the app may open: http(s), mailto or tel. */
export function safeHref(value: string): string | null {
  const plain = decodeEntities(value).trim();
  if (/[\u0000-\u001f\s]/.test(plain)) return null;
  if (!/^(https?:\/\/|mailto:|tel:)/i.test(plain) || plain.length > 2000) return null;
  if (/^https?:/i.test(plain)) {
    try {
      new URL(plain);
    } catch {
      return null;
    }
  }
  return plain;
}

function attributeValue(attributes: string, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s"'>]+)`, "i").exec(attributes);
  return match ? match[1]!.replace(/^["']|["']$/g, "") : null;
}

const quote = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * 23 What article bodies add to a text block's allowlist: pictures (https
 * only, with their alt text) in figures with captions, and iframes, which
 * `embed` turns into a placeholder (or drops when it returns null).
 */
export interface CleanOptions {
  images?: boolean;
  embed?: (src: string, attributes: string) => string | null;
}

const IMAGE_TAGS = new Set(["figure", "figcaption"]);

export function cleanBlockHtml(html: string, options: CleanOptions = {}): string {
  const out: string[] = [];
  const open: string[] = [];
  let dropping: string | null = null;
  // 23 Attribute names and unquoted values never contain "<", so a tag that isn't closed stops at the next one (feeds are untrusted and long).
  const pattern = /<!--[\s\S]*?(?:-->|$)|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>]+))?)*)\s*(\/?)>/g;
  let last = 0;
  for (const match of html.matchAll(pattern)) {
    const before = html.slice(last, match.index);
    last = match.index + match[0].length;
    if (!dropping) out.push(escapeText(before));
    if (match[0].startsWith("<!--")) continue;
    const closing = match[1] === "/";
    const name = match[2]!.toLowerCase();
    if (dropping) {
      if (closing && name === dropping) dropping = null;
      continue;
    }
    if (name === "iframe" && options.embed && !closing) {
      const src = attributeValue(match[3] ?? "", "src") ?? attributeValue(match[3] ?? "", "data-src") ?? "";
      const placeholder = options.embed(decodeEntities(src).trim(), match[3] ?? "");
      if (placeholder) out.push(placeholder);
      if (match[4] !== "/") dropping = name;
      continue;
    }
    if (DROP_WITH_CONTENT.has(name)) {
      if (!closing && match[4] !== "/") dropping = name;
      continue;
    }
    if (name === "img" && options.images) {
      const src = decodeEntities(attributeValue(match[3] ?? "", "src") ?? "").trim();
      if (!closing && /^https:\/\//i.test(src) && safeHref(src)) {
        const alt = decodeEntities(attributeValue(match[3] ?? "", "alt") ?? "").slice(0, 300);
        out.push(`<img src="${quote(src)}" alt="${quote(alt)}">`);
      }
      continue;
    }
    if (!TAGS.has(name) && !(options.images && IMAGE_TAGS.has(name))) continue;
    if (closing) {
      const at = open.lastIndexOf(name);
      if (at === -1) continue;
      // Closes what was left open inside it too.
      for (const tag of open.splice(at).reverse()) out.push(`</${tag}>`);
      continue;
    }
    if (VOID.has(name)) {
      out.push(`<${name}>`);
      continue;
    }
    let attributes = "";
    if (name === "a") {
      const href = safeHref(attributeValue(match[3] ?? "", "href") ?? "");
      if (href) attributes = ` href="${quote(href)}"`;
    }
    out.push(`<${name}${attributes}>`);
    open.push(name);
  }
  if (!dropping) out.push(escapeText(html.slice(last)));
  for (const tag of open.reverse()) out.push(`</${tag}>`);
  return out.join("").trim();
}
