import { cleanBlockHtml } from "../pages/html";

/**
 * 23 Article bodies, processed like lesson content (`Lesson` in
 * docs/api/openapi.yaml): the text block allowlist (lib/pages/html.ts) plus
 * https pictures, and every iframe replaced by
 * `<div data-yallapp-embed="yallapp-embed-N"></div>` with its details in
 * `embeds`. Only web pages can be embedded; other addresses are dropped.
 */

export interface Embed {
  placeholder: string;
  src: string;
  provider: "youtube" | "vimeo" | "same_site" | "other";
  width: string | null;
  height: string | null;
  aspect_ratio: number | null;
  allow_fullscreen: boolean;
}

export interface ArticleBody {
  render_mode: "native";
  html: string | null;
  webview_url: null;
  embeds: Embed[];
}

export function embedProvider(src: string, siteHost: string | null): Embed["provider"] {
  let host = "";
  try {
    host = new URL(src).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (/(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/.test(host)) return "youtube";
  if (/(^|\.)vimeo\.com$/.test(host)) return "vimeo";
  const site = (siteHost ?? "").toLowerCase().replace(/^www\./, "");
  return site && host.replace(/^www\./, "") === site ? "same_site" : "other";
}

function dimension(attributes: string, name: "width" | "height"): string | null {
  const attr = new RegExp(`(?:^|\\s)${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s"'>]+)`, "i").exec(attributes)?.[1]?.replace(/^["']|["']$/g, "").trim() ?? "";
  const style = /(?:^|\s)style\s*=\s*("[^"]*"|'[^']*')/i.exec(attributes)?.[1] ?? "";
  const value = (attr || (new RegExp(`(?:^|;|["'])\\s*${name}\\s*:\\s*([0-9.]+(?:px|%)?)`, "i").exec(style)?.[1] ?? "")).replace(/px$/i, "");
  return /^[0-9.]+%?$/.test(value) ? value : null;
}

export function aspectRatio(provider: Embed["provider"], width: string | null, height: string | null): number | null {
  if (width && height && !width.includes("%") && !height.includes("%") && Number(height) > 0) return Math.round((Number(width) / Number(height)) * 10000) / 10000;
  if (provider === "youtube" || provider === "vimeo") return Math.round((16 / 9) * 10000) / 10000;
  return null;
}

const BLOCK_TAG = /<\/?(p|br|h[1-6]|ul|ol|li|blockquote|figure|div|iframe|img|table|section|article)\b/i;

/** Plain text as paragraphs (an empty line between them); HTML as it is. */
export function asHtml(body: string): string {
  if (BLOCK_TAG.test(body)) return body;
  return body
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** The body as the app gets it: cleaned HTML with embed placeholders, and the embeds. */
export function articleBody(body: string, siteHost: string | null = null): ArticleBody {
  const embeds: Embed[] = [];
  const html = cleanBlockHtml(asHtml(body), {
    images: true,
    embed: (raw, attributes) => {
      const src = raw.startsWith("//") ? `https:${raw}` : raw;
      if (!/^https?:\/\//i.test(src) || src.length > 2000) return null;
      try {
        new URL(src);
      } catch {
        return null;
      }
      const placeholder = `yallapp-embed-${embeds.length + 1}`;
      const provider = embedProvider(src, siteHost);
      const width = dimension(attributes, "width");
      const height = dimension(attributes, "height");
      embeds.push({
        placeholder,
        src,
        provider,
        width,
        height,
        aspect_ratio: aspectRatio(provider, width, height),
        allow_fullscreen: /(?:^|\s)allowfullscreen\b/i.test(attributes) || /(?:^|\s)allow\s*=\s*["'][^"']*fullscreen/i.test(attributes),
      });
      return `<div data-yallapp-embed="${placeholder}"></div>`;
    },
  });
  return { render_mode: "native", html: html || null, webview_url: null, embeds };
}

/** Text without tags, entities decoded and spaces collapsed: for excerpts and search. */
export function plainText(html: string): string {
  // Cleaned first (scripts and styles go with their content, text is escaped), so every "<" left starts a tag.
  return cleanBlockHtml(html)
    .replace(/<br>|<\/(p|li|h[1-6]|blockquote)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeChar(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeChar(Number(dec)))
    .replace(/&quot;/gi, '"')
    .replace(/&#?apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&hellip;/gi, "…")
    .replace(/&[lr]squo;/gi, "'")
    .replace(/&[lr]dquo;/gi, '"')
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function safeChar(code: number): string {
  return Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : " ";
}

/** A short excerpt: the text up to `max` characters, cut at a word. */
export function excerptOf(text: string, max = 200): string | null {
  const plain = text.replace(/\s+/g, " ").trim();
  if (!plain) return null;
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—-]+$/, "")}…`;
}
