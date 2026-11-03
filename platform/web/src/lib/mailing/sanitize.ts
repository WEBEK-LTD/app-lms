/**
 * 114 What an email may hold of the HTML the admin writes (HTML mode, the
 * HTML block, and the rich text of the blocks): an allow list of tags,
 * attributes and URL schemes. No scripts, no event handlers, no forms, no
 * frames, no embedded objects, no base or refresh. Kept dependency free: it
 * runs on the server (sending) and in the browser (the live preview).
 *
 * "document": a whole email (html, head, style, tables).
 * "inline": a text block's paragraphs, lists, links and emphasis.
 */

export type SanitizeProfile = "document" | "inline";

const DOCUMENT_TAGS = new Set([
  "html", "head", "body", "title", "meta", "style",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col", "center",
  "div", "span", "p", "br", "hr", "a", "img", "picture", "source",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "b", "strong", "i", "em", "u", "s", "strike", "del", "ins", "small", "sub", "sup", "mark", "font", "big",
  "ul", "ol", "li", "dl", "dt", "dd", "blockquote", "pre", "code", "address", "abbr", "cite", "q", "time",
  "section", "article", "header", "footer", "main", "nav", "aside", "figure", "figcaption",
]);

const INLINE_TAGS = new Set(["p", "br", "a", "b", "strong", "i", "em", "u", "s", "small", "sub", "sup", "span", "ul", "ol", "li", "mark", "code"]);

/** Dropped with everything inside them. */
const DROP_WITH_CONTENT = new Set(["script", "noscript", "template", "iframe", "frame", "frameset", "object", "embed", "applet", "svg", "math", "textarea", "select", "xmp", "plaintext", "noembed", "noframes", "canvas", "audio", "video", "button", "option"]);

/** Tags that never have a closing tag. */
const VOID = new Set(["br", "hr", "img", "meta", "col", "source", "wbr", "input", "link", "base", "area", "param", "track", "embed"]);

const GLOBAL_ATTRS = new Set(["style", "class", "id", "align", "valign", "dir", "lang", "title", "role", "width", "height", "bgcolor", "color", "border"]);

const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "name"]),
  img: new Set(["src", "alt", "srcset"]),
  source: new Set(["srcset", "media", "type"]),
  table: new Set(["cellpadding", "cellspacing", "summary", "background"]),
  td: new Set(["colspan", "rowspan", "background", "nowrap", "scope", "headers"]),
  th: new Set(["colspan", "rowspan", "background", "nowrap", "scope", "headers"]),
  col: new Set(["span"]),
  colgroup: new Set(["span"]),
  font: new Set(["face", "size"]),
  meta: new Set(["charset", "name", "content"]),
  ol: new Set(["start", "type", "reversed"]),
  li: new Set(["value"]),
  body: new Set(["background"]),
  time: new Set(["datetime"]),
  html: new Set(["xmlns", "xmlns:v", "xmlns:o"]),
};

const INLINE_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "style", "title"]),
  span: new Set(["style", "dir", "lang"]),
  p: new Set(["style", "dir", "lang"]),
  ul: new Set(["style", "dir"]),
  ol: new Set(["style", "dir", "start"]),
  li: new Set(["style"]),
  mark: new Set(["style"]),
};

const URL_ATTRS = new Set(["href", "src", "background", "srcset"]);

/** Decodes the character references an attacker could hide a scheme behind. */
export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);?/gi, (whole, ref: string) => {
    if (ref[0] === "#") {
      const code = ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", colon: ":", tab: "\t", newline: "\n", sol: "/", lpar: "(", rpar: ")" };
    return named[ref.toLowerCase()] ?? whole;
  });
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * A link or picture address an email may carry: web, mail and phone links,
 * an anchor, a merge tag ({{sign_in_link}}), and for pictures data images.
 * Null for anything else (javascript:, vbscript:, data: pages, file:).
 */
export function safeUrl(raw: string, kind: "link" | "image" = "link"): string | null {
  const value = decodeEntities(raw).replace(/[\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, "");
  if (!value) return null;
  if (/^\{\{\s*[a-z_]+(\s*\|[^}]*)?\}\}/i.test(value)) return raw.trim();
  if (value.startsWith("#")) return kind === "link" ? value : null;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value)?.[1]?.toLowerCase();
  if (!scheme) return null; // Relative addresses go nowhere in an inbox.
  if (scheme === "http" || scheme === "https") return raw.trim();
  if (kind === "link" && (scheme === "mailto" || scheme === "tel")) return raw.trim();
  if (kind === "image" && /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(value)) return value;
  return null;
}

/** CSS in a style attribute or a style tag, without what can run code or load from elsewhere. */
export function sanitizeCss(css: string): string {
  let out = decodeCssEscapes(css).replace(/<\/?[a-z!]/gi, "").replace(/[<>]/g, "");
  out = out.replace(/\/\*[\s\S]*?\*\//g, "");
  out = out.replace(/@import[^;]*;?/gi, "").replace(/@charset[^;]*;?/gi, "");
  out = out.replace(/expression\s*\(/gi, "x(").replace(/behaviou?r\s*:/gi, "x:").replace(/-moz-binding\s*:/gi, "x:").replace(/javascript\s*:/gi, "").replace(/vbscript\s*:/gi, "");
  out = out.replace(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi, (_whole, _q: string, address: string) => {
    const safe = safeUrl(address, "image");
    return safe && !safe.startsWith("{{") ? `url('${safe.replace(/['"\\()]/g, "")}')` : "none";
  });
  return out.trim();
}

function decodeCssEscapes(css: string): string {
  return css.replace(/\\([0-9a-f]{1,6})\s?/gi, (_w, hex: string) => {
    const code = parseInt(hex, 16);
    return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
  }).replace(/\\(.)/g, "$1");
}

/** Outlook's conditional comments: only their markers pass; what's between them is sanitized like the rest. */
const CONDITIONAL_OPEN = /^<!--\[if\s+[a-z0-9 !()|&]+\]>(<!-->)?$/i;
const CONDITIONAL_CLOSE = /^(<!--)?<!\[endif\]-->$/i;

export function sanitizeHtml(html: string, profile: SanitizeProfile = "document"): string {
  const tags = profile === "document" ? DOCUMENT_TAGS : INLINE_TAGS;
  let out = "";
  let i = 0;
  const n = html.length;
  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      out += escapeText(html.slice(i));
      break;
    }
    out += escapeText(html.slice(i, lt));
    i = lt;
    // Comments, including Outlook's conditional ones.
    if (html.startsWith("<!--", i) || html.startsWith("<![", i)) {
      const marker = /^(<!--\[if[^\]]*\]>(<!-->)?|(<!--)?<!\[endif\]-->)/i.exec(html.slice(i, i + 80));
      if (marker && profile === "document" && (CONDITIONAL_OPEN.test(marker[0]) || CONDITIONAL_CLOSE.test(marker[0]))) {
        out += marker[0];
        i += marker[0].length;
        continue;
      }
      const end = html.indexOf("-->", i + 4);
      i = end === -1 ? n : end + 3;
      continue;
    }
    if (html.startsWith("<!", i) || html.startsWith("<?", i)) {
      const end = html.indexOf(">", i);
      const decl = html.slice(i, end === -1 ? n : end + 1);
      if (profile === "document" && /^<!doctype\s+html[^<>]*>$/i.test(decl)) out += decl;
      i = end === -1 ? n : end + 1;
      continue;
    }
    const tag = /^<(\/?)([a-z][a-z0-9:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/i.exec(html.slice(i));
    if (!tag) {
      // A "<" that starts no tag is text.
      out += "&lt;";
      i += 1;
      continue;
    }
    i += tag[0].length;
    const closing = tag[1] === "/";
    const name = tag[2]!.toLowerCase();
    if (DROP_WITH_CONTENT.has(name)) {
      if (!closing && !tag[4] && !VOID.has(name)) {
        const close = new RegExp(`</${name}\\s*>`, "i").exec(html.slice(i));
        i = close ? i + close.index + close[0].length : n;
      }
      continue;
    }
    if (name === "style" || name === "title") {
      if (closing) continue;
      const close = new RegExp(`</${name}\\s*>`, "i").exec(html.slice(i));
      const body = html.slice(i, close ? i + close.index : n);
      i = close ? i + close.index + close[0].length : n;
      if (profile !== "document") continue;
      out += name === "style" ? `<style type="text/css">${sanitizeCss(body)}</style>` : `<title>${escapeText(decodeEntities(body))}</title>`;
      continue;
    }
    if (!tags.has(name)) continue; // Unknown or not allowed (form, input, link, base): the tag goes, its text stays.
    if (closing) {
      if (!VOID.has(name)) out += `</${name}>`;
      continue;
    }
    const attrs = sanitizeAttributes(name, tag[3] ?? "", profile);
    if (name === "meta" && !/\b(charset|name)=/.test(attrs)) continue;
    out += `<${name}${attrs}${VOID.has(name) ? " /" : ""}>`;
  }
  return out;
}

function escapeText(text: string): string {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeAttributes(tag: string, source: string, profile: SanitizeProfile): string {
  const allowedForTag = profile === "document" ? TAG_ATTRS[tag] : INLINE_ATTRS[tag];
  const pattern = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  const seen = new Set<string>();
  let out = "";
  let target = false;
  for (const match of source.matchAll(pattern)) {
    const name = match[1]!.toLowerCase();
    if (seen.has(name)) continue;
    seen.add(name);
    if (name.startsWith("on") || name === "formaction" || name === "srcdoc" || name === "xlink:href") continue;
    const allowed = profile === "document" ? GLOBAL_ATTRS.has(name) || name.startsWith("aria-") || allowedForTag?.has(name) : allowedForTag?.has(name);
    if (!allowed) continue;
    let value = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
    if (URL_ATTRS.has(name)) {
      if (name === "srcset") {
        const parts = value.split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
          const [address, size] = part.split(/\s+/, 2);
          const safe = safeUrl(address ?? "", "image");
          return safe ? `${safe}${size ? ` ${size.replace(/[^0-9.wx]/g, "")}` : ""}` : null;
        });
        if (parts.some((part) => part === null)) continue;
        value = parts.join(", ");
      } else {
        const safe = safeUrl(value, tag === "img" || name === "background" ? "image" : "link");
        if (safe === null) continue;
        value = safe;
      }
    }
    if (name === "style") {
      value = sanitizeCss(value);
      if (!value) continue;
    }
    if (name === "target") {
      if (value !== "_blank") continue;
      target = true;
    }
    if (name === "rel") continue; // Set below for links that open elsewhere.
    if (name === "meta" || (tag === "meta" && name === "content" && /^\s*\d+\s*;\s*url=/i.test(value))) continue;
    out += ` ${name}="${escapeHtml(value)}"`;
  }
  if (tag === "a" && target) out += ' rel="noopener noreferrer"';
  return out;
}

/** Text without any tag (the email's plain text part, the inbox preview). */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(style|script|title|head)[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_w, href: string, label: string) => {
        const text = label.replace(/<[^>]+>/g, "").trim();
        const address = decodeEntities(href);
        return !text ? address : text === address || address.startsWith("mailto:") || address.startsWith("tel:") ? text : `${text} (${address})`;
      })
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li|tr|table|blockquote|center)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
