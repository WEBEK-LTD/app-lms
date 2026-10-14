/**
 * The small Markdown the team writes in the admin (website pages,
 * announcements): paragraphs, ## headings, - and 1. lists, > notes, ---
 * rules, ``` code blocks, **bold**, *italic*, `code` and
 * [links](https://…) (`\` before a character shows it as it is). There is no raw
 * HTML: every character of the text is escaped, and links only open http(s),
 * mailto and tel addresses or paths on this site. One parser, rendered by
 * components/markdown.tsx for pages and by `markdownToHtml` for emails.
 */

export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "link"; href: string; c: Inline[] }
  | { t: "br" };

export type Block =
  | { t: "p"; c: Inline[] }
  | { t: "h"; level: 2 | 3 | 4; c: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; start: number; items: Inline[][] }
  | { t: "quote"; blocks: Block[] }
  | { t: "pre"; lang: string; v: string }
  | { t: "hr" };

/** Addresses a link may open; anything else is shown as plain text. */
export function safeHref(href: string): string | null {
  const value = href.trim();
  if (/^\/(?!\/)/.test(value) || value.startsWith("#")) return value;
  if (/^(https?:\/\/|mailto:|tel:)[^\s<>"']+$/i.test(value)) return value;
  return null;
}

const HEADING = /^(#{1,4})\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const NUMBERED = /^(\d{1,3})[.)]\s+(.*)$/;
const RULE = /^(-{3,}|\*{3,}|_{3,})$/;
/** A code block opens and closes with ``` or ~~~ on a line of its own; a word after the opening one names the language. */
const FENCE = /^(```|~~~)\s*([a-z0-9+-]*)\s*$/i;

/** Splits Markdown into blocks. */
export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!.trimEnd();
    const trimmed = line.trim();
    if (trimmed === "") {
      i += 1;
      continue;
    }
    const fence = FENCE.exec(trimmed);
    if (fence) {
      // A code block keeps its lines as they are, up to the closing fence (or the end of the text).
      const code: string[] = [];
      i += 1;
      while (i < lines.length && lines[i]!.trim() !== fence[1]) {
        code.push(lines[i]!.trimEnd());
        i += 1;
      }
      i += 1;
      blocks.push({ t: "pre", lang: fence[2]!.toLowerCase(), v: code.join("\n") });
      continue;
    }
    if (RULE.test(trimmed)) {
      blocks.push({ t: "hr" });
      i += 1;
      continue;
    }
    const heading = HEADING.exec(trimmed);
    if (heading) {
      const level = Math.max(2, heading[1]!.length) as 2 | 3 | 4;
      blocks.push({ t: "h", level, c: parseInline(heading[2]!.replace(/\s+#+$/, "")) });
      i += 1;
      continue;
    }
    if (trimmed.startsWith(">")) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith(">")) {
        quoted.push(lines[i]!.trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ t: "quote", blocks: parseMarkdown(quoted.join("\n")) });
      continue;
    }
    const bullet = BULLET.exec(trimmed);
    const numbered = NUMBERED.exec(trimmed);
    if (bullet || numbered) {
      const ordered = !bullet;
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i]!;
        const item = ordered ? NUMBERED.exec(current.trim()) : BULLET.exec(current.trim());
        if (item && !/^\s{2,}/.test(current)) {
          items.push(ordered ? item[2]! : item[1]!);
        } else if (current.trim() !== "" && /^\s+/.test(current) && items.length) {
          // An indented line continues the item above.
          items[items.length - 1] += `\n${current.trim()}`;
        } else {
          break;
        }
        i += 1;
      }
      blocks.push(
        ordered ? { t: "ol", start: Number(numbered![1]), items: items.map(parseInline) } : { t: "ul", items: items.map(parseInline) },
      );
      continue;
    }
    const paragraph: string[] = [];
    while (i < lines.length) {
      const current = lines[i]!.trim();
      if (current === "" || HEADING.test(current) || current.startsWith(">") || FENCE.test(current) || RULE.test(current) || BULLET.test(current) || NUMBERED.test(current)) {
        break;
      }
      paragraph.push(lines[i]!);
      i += 1;
    }
    blocks.push({ t: "p", c: parseInline(paragraph.join("\n")) });
  }
  return blocks;
}

/** Bold, italic, code, links and line breaks inside a block. */
export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let text = "";
  const flush = () => {
    if (text) out.push({ t: "text", v: text });
    text = "";
  };
  let i = 0;
  while (i < source.length) {
    const ch = source[i]!;
    if (ch === "\\" && i + 1 < source.length && /[\\`*_[\]()#>!-]/.test(source[i + 1]!)) {
      text += source[i + 1];
      i += 2;
      continue;
    }
    if (ch === "\n") {
      // Two spaces or a backslash at the end of a line break it; otherwise lines join.
      if (/ {2,}$/.test(text)) {
        text = text.replace(/ +$/, "");
        flush();
        out.push({ t: "br" });
      } else {
        text = text.replace(/ +$/, "") + " ";
      }
      i += 1;
      while (source[i] === " ") i += 1;
      continue;
    }
    if (ch === "`") {
      const end = source.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        out.push({ t: "code", v: source.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (ch === "*" && source[i + 1] === "*") {
      const end = source.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        out.push({ t: "strong", c: parseInline(source.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    if ((ch === "*" || ch === "_") && source[i + 1] !== ch && source[i + 1] !== " ") {
      const end = source.indexOf(ch, i + 1);
      // `_` inside a word (snake_case) isn't emphasis.
      const wordBefore = ch === "_" && /\w/.test(source[i - 1] ?? "");
      if (end > i + 1 && source[end - 1] !== " " && !wordBefore) {
        flush();
        out.push({ t: "em", c: parseInline(source.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    if (ch === "[") {
      const close = findClosing(source, i);
      if (close > i && source[close + 1] === "(") {
        const end = findClosing(source, close + 1, "(", ")");
        if (end > close + 1) {
          const label = parseInline(source.slice(i + 1, close));
          const href = safeHref(source.slice(close + 2, end));
          flush();
          if (href) out.push({ t: "link", href, c: label });
          else out.push(...label);
          i = end + 1;
          continue;
        }
      }
    }
    text += ch;
    i += 1;
  }
  flush();
  return out;
}

/** The bracket that closes the one at `start`, allowing nested ones (a link's text, or an address with parentheses). */
function findClosing(source: string, start: number, open = "[", close = "]"): number {
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === "\\") {
      i += 1;
      continue;
    }
    if (source[i] === open) depth += 1;
    if (source[i] === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]!);
}

function inlineHtml(nodes: Inline[], baseUrl: string): string {
  return nodes
    .map((n) => {
      switch (n.t) {
        case "text":
          return escapeHtml(n.v);
        case "strong":
          return `<strong>${inlineHtml(n.c, baseUrl)}</strong>`;
        case "em":
          return `<em>${inlineHtml(n.c, baseUrl)}</em>`;
        case "code":
          return `<code>${escapeHtml(n.v)}</code>`;
        case "br":
          return "<br>";
        case "link":
          return `<a href="${escapeHtml(n.href.startsWith("/") ? `${baseUrl}${n.href}` : n.href)}">${inlineHtml(n.c, baseUrl)}</a>`;
      }
    })
    .join("");
}

/** HTML for an email. Paths on this site become full addresses on `baseUrl`. */
export function markdownToHtml(source: string, baseUrl = ""): string {
  const render = (blocks: Block[]): string =>
    blocks
      .map((b) => {
        switch (b.t) {
          case "p":
            return `<p>${inlineHtml(b.c, baseUrl)}</p>`;
          case "h":
            return `<h${b.level}>${inlineHtml(b.c, baseUrl)}</h${b.level}>`;
          case "ul":
            return `<ul>${b.items.map((item) => `<li>${inlineHtml(item, baseUrl)}</li>`).join("")}</ul>`;
          case "ol":
            return `<ol${b.start !== 1 ? ` start="${b.start}"` : ""}>${b.items.map((item) => `<li>${inlineHtml(item, baseUrl)}</li>`).join("")}</ol>`;
          case "quote":
            return `<blockquote>${render(b.blocks)}</blockquote>`;
          case "pre":
            return `<pre><code>${escapeHtml(b.v)}</code></pre>`;
          case "hr":
            return "<hr>";
        }
      })
      .join("\n");
  return render(parseMarkdown(source));
}

/** The words of some inline nodes, for titles and summaries. */
export function inlineText(nodes: Inline[]): string {
  return nodes.map((n) => (n.t === "text" || n.t === "code" ? n.v : n.t === "br" ? " " : "c" in n ? inlineText(n.c) : "")).join("");
}

/** A heading's anchor: its words in lowercase, joined with dashes ("Before you start" → "before-you-start"). */
export function headingId(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

/** Fills `{{name}}` with the given values (website pages: the contact details). Other text stays as it is. */
export function fillValues(source: string, values: Record<string, string>): string {
  return source.replace(/\{\{([a-z_]+)\}\}/g, (match, name: string) => (name in values ? values[name]! : match));
}
