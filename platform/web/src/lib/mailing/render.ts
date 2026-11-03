/**
 * 114 An email's design to the HTML inboxes read: tables, inline styles, a
 * fixed width that stacks on phones, Outlook's conditional table, a hidden
 * inbox preview line, dark-mode colors for the clients that apply them, and
 * right-to-left when the email is (Arabic): the text, the alignment, the
 * columns and the arrows are mirrored. Runs on the server (sending) and in
 * the browser (the builder's canvas and preview).
 *
 * Every email ends with the line that says why it came, the unsubscribe link
 * and Yallapp's place (COMPANY_PLACE); the admin can't remove it.
 */

import { COMPANY, COMPANY_PLACE } from "../company";
import { BRAND_THEME } from "./blocks";
import { escapeHtml, htmlToText, safeUrl, sanitizeHtml } from "./sanitize";
import type { MailAlign, MailBlock, MailBlockStyle, MailContent, MailDoc, MailFont, MailLang, MailSocialNetwork, MailStore, MailTheme } from "./types";

export interface RenderOptions {
  lang: MailLang;
  /** Where /email/yallapp-logo.png is (Yallapp's address). */
  assetBase: string;
  /** The recipient's own link, or "{{unsubscribe_link}}" to fill later. */
  unsubscribeUrl?: string;
  /** The builder's canvas: empty pictures show a placeholder and blocks carry their id. */
  editing?: boolean;
  /** Leave out the unsubscribe line (turning blocks into HTML, which adds its own when sent). */
  legal?: boolean;
}

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

type Dir = "ltr" | "rtl";

interface Ctx {
  theme: MailTheme;
  dir: Dir;
  lang: MailLang;
  assetBase: string;
  editing: boolean;
  /** The width the block is drawn in, px. */
  width: number;
}

const FONTS: Record<MailFont, string> = {
  brand: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', Times, serif",
  mono: "'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace",
};
/** Arabic reads best in these where the font above has no Arabic letters. */
const ARABIC_FONTS = "Tahoma, 'Segoe UI', 'Geeza Pro', 'Noto Sans Arabic', Arial, sans-serif";

export function fontStack(font: MailFont, dir: Dir): string {
  return dir === "rtl" && font !== "mono" ? `${ARABIC_FONTS}` : FONTS[font] ?? FONTS.brand;
}

/** "left" is where the line starts: the right side in right-to-left emails. */
export function side(align: MailAlign | undefined, dir: Dir, fallback: MailAlign = "left"): "left" | "center" | "right" {
  const value = align ?? fallback;
  if (value === "center") return "center";
  if (dir === "ltr") return value;
  return value === "left" ? "right" : "left";
}

function start(dir: Dir): "left" | "right" {
  return dir === "rtl" ? "right" : "left";
}

/** Arrows in labels point the way the reader reads. */
export function mirrorArrows(text: string, dir: Dir): string {
  if (dir === "ltr") return text;
  return text.replace(/[→←⟶⟵➜➔]/g, (c) => ({ "→": "←", "←": "→", "⟶": "⟵", "⟵": "⟶", "➜": "←", "➔": "←" })[c] ?? c);
}

function attr(value: string): string {
  return escapeHtml(value);
}

function pad(style: MailBlockStyle | undefined, fallback: [number, number, number, number], dir: Dir): string {
  const [t, r, b, l] = style?.padding ?? fallback;
  // Padding is written start/end like the alignment: mirrored in right-to-left emails.
  return dir === "rtl" ? `${t}px ${l}px ${b}px ${r}px` : `${t}px ${r}px ${b}px ${l}px`;
}

function link(url: string | undefined | null): string | null {
  if (!url || url === "https://" || url === "http://") return null;
  return safeUrl(url, "link");
}

function image(url: string | undefined | null): string | null {
  if (!url) return null;
  return safeUrl(url, "image");
}

/** The rich text of a block, with the email's paragraph and link styles; the last paragraph has no space under it. */
function richText(html: string, ctx: Ctx): string {
  const out = sanitizeHtml(html, "inline")
    .replace(/<p(\s[^>]*)?>/g, (_w, a: string | undefined) => `<p${withStyle(a, "margin:0 0 14px 0;")}>`)
    .replace(/<(ul|ol)(\s[^>]*)?>/g, (_w, tag: string, a: string | undefined) => `<${tag}${withStyle(a, `margin:0 0 14px 0;padding-${start(ctx.dir)}:22px;`)}>`)
    .replace(/<li(\s[^>]*)?>/g, (_w, a: string | undefined) => `<li${withStyle(a, "margin:0 0 6px 0;")}>`)
    .replace(/<a(\s[^>]*)?>/g, (_w, a: string | undefined) => `<a${withStyle(a, `color:${ctx.theme.accent};text-decoration:underline;`)}${/target=/.test(a ?? "") ? "" : ' target="_blank" rel="noopener noreferrer"'}>`);
  const last = out.lastIndexOf("margin:0 0 14px 0;");
  return last === -1 || /<(p|ul|ol)[\s>]/.test(out.slice(out.indexOf(">", last))) ? out : out.slice(0, last) + "margin:0;" + out.slice(last + "margin:0 0 14px 0;".length);
}

function withStyle(attrs: string | undefined, css: string): string {
  const a = attrs ?? "";
  if (/\sstyle="/.test(a)) return a.replace(/\sstyle="/, ` style="${css}`);
  return `${a} style="${css}"`;
}

function row(content: string, ctx: Ctx, block: MailBlock, fallbackPad: [number, number, number, number], extraClass = ""): string {
  const s = block.style;
  const bg = s?.background;
  const classes = [s?.fullWidth ? "" : "ya-px", extraClass].filter(Boolean).join(" ");
  const padding = s?.fullWidth ? pad({ padding: [s.padding?.[0] ?? 0, 0, s.padding?.[2] ?? 0, 0] }, fallbackPad, ctx.dir) : pad(s, fallbackPad, ctx.dir);
  const id = ctx.editing ? ` data-block="${attr(block.id)}"` : "";
  return `<tr><td${id}${classes ? ` class="${classes}"` : ""} style="padding:${padding};${bg ? `background-color:${bg};` : ""}" ${bg ? `bgcolor="${bg}"` : ""} dir="${ctx.dir}">${content}</td></tr>`;
}

function textColor(block: MailBlock, ctx: Ctx): { color: string; cls: string } {
  if (block.style?.color) return { color: block.style.color, cls: "" };
  if (block.style?.background) return { color: ctx.theme.text, cls: "" };
  return { color: ctx.theme.text, cls: "ya-text" };
}

function placeholder(ctx: Ctx, label: string, height: number): string {
  if (!ctx.editing) return "";
  return `<div style="height:${height}px;line-height:${height}px;background:#EFEBE3;border:1px dashed #CFC8BA;border-radius:12px;color:#8A8698;font-size:13px;text-align:center;font-family:${FONTS.system}">${escapeHtml(label)}</div>`;
}

const STORE_NAMES: Record<MailStore, string> = { google_play: "Google Play", app_store: "App Store", galaxy_store: "Galaxy Store", appgallery: "AppGallery", getapps: "GetApps" };
const STORE_LEAD: Record<MailLang, string> = { en: "Get it on", ar: "حمّله من", tr: "İndirin:" };
const SOCIAL_NAMES: Record<MailSocialNetwork, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", x: "X", youtube: "YouTube", tiktok: "TikTok", whatsapp: "WhatsApp", website: "Website" };
const WEBSITE: Record<MailLang, string> = { en: "Website", ar: "الموقع", tr: "Web sitesi" };
const WATCH: Record<MailLang, string> = { en: "Watch the video", ar: "شاهد الفيديو", tr: "Videoyu izleyin" };

function button(b: { label: string; url: string }, ctx: Ctx, style: MailBlockStyle | undefined, align: "left" | "center" | "right", full = false): string {
  const href = link(b.url);
  const bg = style?.surface ?? ctx.theme.brand;
  const color = style?.color ?? "#FFFFFF";
  const radius = style?.radius ?? Math.min(ctx.theme.radius, 999);
  const size = style?.fontSize ?? 16;
  const label = escapeHtml(mirrorArrows(b.label, ctx.dir));
  const inner = `<a href="${attr(href ?? "#")}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:${fontStack(style?.font ?? ctx.theme.font, ctx.dir)};font-size:${size}px;font-weight:${style?.fontWeight ?? 700};line-height:1.2;color:${color};text-decoration:none;border-radius:${radius}px;${full ? "width:100%;box-sizing:border-box;text-align:center;" : ""}">${label}</a>`;
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" ${full ? 'width="100%"' : ""} align="${align === "center" ? "center" : align}" style="margin:0 ${align === "center" ? "auto" : "0"};"><tr><td align="center" bgcolor="${bg}" style="border-radius:${radius}px;background-color:${bg};">${inner}</td></tr></table>`;
}

function blockHtml(block: MailBlock, ctx: Ctx): string {
  const s = block.style;
  const font = fontStack(s?.font ?? ctx.theme.font, ctx.dir);
  const { color, cls } = textColor(block, ctx);
  const align = side(s?.align, ctx.dir);
  const inner = ctx.width - (s?.fullWidth ? 0 : (s?.padding?.[1] ?? 32) + (s?.padding?.[3] ?? 32));
  switch (block.type) {
    case "header": {
      const variant = block.logo ?? "dark";
      const logo =
        variant === "none"
          ? ""
          : variant === "light"
            ? `<img src="${attr(ctx.assetBase)}/email/yallapp-logo-reversed.png" width="99" height="32" alt="${COMPANY.name}" style="display:block;border:0;height:32px;width:auto;" />`
            : `<img class="ya-logo-light" src="${attr(ctx.assetBase)}/email/yallapp-logo.png" width="99" height="32" alt="${COMPANY.name}" style="display:block;border:0;height:32px;width:auto;" /><!--[if !mso]><!--><img class="ya-logo-dark" src="${attr(ctx.assetBase)}/email/yallapp-logo-reversed.png" width="99" height="32" alt="${COMPANY.name}" style="display:none;border:0;height:32px;width:auto;max-height:0;overflow:hidden;" /><!--<![endif]-->`;
      const href = link(block.href);
      const logoCell = href && logo ? `<a href="${attr(href)}" target="_blank" rel="noopener noreferrer">${logo}</a>` : logo;
      const links = (block.links ?? [])
        .filter((l) => l.label.trim())
        .map((l) => `<a href="${attr(link(l.url) ?? "#")}" target="_blank" rel="noopener noreferrer" class="${cls}" style="color:${color};text-decoration:none;font-family:${font};font-size:14px;font-weight:600;margin-${start(ctx.dir)}:18px;">${escapeHtml(l.label)}</a>`)
        .join("");
      if (!links) {
        return row(`<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td align="${align}" style="text-align:${align};"><div style="display:inline-block;">${logoCell}</div></td></tr></table>`, ctx, block, [28, 32, 12, 32]);
      }
      return row(
        `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" dir="${ctx.dir}"><tr><td align="${start(ctx.dir)}" valign="middle">${logoCell}</td><td align="${ctx.dir === "rtl" ? "left" : "right"}" valign="middle" style="text-align:${ctx.dir === "rtl" ? "left" : "right"};">${links}</td></tr></table>`,
        ctx,
        block,
        [28, 32, 12, 32],
      );
    }
    case "heading": {
      const level = block.level ?? 1;
      const size = s?.fontSize ?? (level === 1 ? 32 : level === 2 ? 24 : 19);
      const text = sanitizeHtml(block.text ?? "", "inline").replace(/<\/?(p|ul|ol|li)[^>]*>/g, "");
      return row(
        `<h${level} class="${cls}" style="margin:0;font-family:${font};font-size:${size}px;line-height:1.25;font-weight:${s?.fontWeight ?? 800};color:${color};text-align:${align};letter-spacing:${level === 1 && ctx.dir === "ltr" ? "-0.02em" : "0"};">${text}</h${level}>`,
        ctx,
        block,
        level === 1 ? [12, 32, 8, 32] : [10, 32, 6, 32],
      );
    }
    case "text": {
      const size = s?.fontSize ?? 16;
      return row(`<div class="${cls}" style="font-family:${font};font-size:${size}px;line-height:1.65;color:${color};text-align:${align};">${richText(block.text ?? "", ctx)}</div>`, ctx, block, [8, 32, 8, 32]);
    }
    case "image": {
      const src = image(block.src);
      if (!src) return ctx.editing ? row(placeholder(ctx, "Add a picture", 180), ctx, block, [8, 32, 8, 32]) : "";
      const width = Math.min(block.width ?? inner, inner);
      const radius = s?.radius ?? 0;
      const img = `<img src="${attr(src)}" width="${width}" alt="${attr(block.alt ?? "")}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;outline:none;text-decoration:none;border-radius:${radius}px;margin:0 ${align === "center" ? "auto" : "0"};" />`;
      const href = link(block.href);
      return row(`<div style="text-align:${align};">${href ? `<a href="${attr(href)}" target="_blank" rel="noopener noreferrer">${img}</a>` : img}</div>`, ctx, block, [8, 32, 8, 32]);
    }
    case "button": {
      if (!block.button?.label) return "";
      return row(button(block.button, ctx, s, align, false), ctx, block, [12, 32, 20, 32]);
    }
    case "divider": {
      const size = block.size ?? 1;
      return row(`<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td class="ya-rule" style="border-top:${size}px solid ${s?.borderColor ?? "#E7E2D8"};font-size:0;line-height:0;height:0;">&nbsp;</td></tr></table>`, ctx, block, [16, 32, 16, 32]);
    }
    case "spacer": {
      const size = block.size ?? 24;
      const id = ctx.editing ? ` data-block="${attr(block.id)}"` : "";
      return `<tr><td${id} style="height:${size}px;line-height:${size}px;font-size:0;${s?.background ? `background-color:${s.background};` : ""}">&nbsp;</td></tr>`;
    }
    case "columns": {
      const columns = (block.columns ?? []).slice(0, 3);
      if (!columns.length) return "";
      const gap = 16;
      const colWidth = Math.floor((inner - gap * (columns.length - 1)) / columns.length);
      const cells = columns
        .map((column, index) => {
          const rows = column.map((b) => blockHtml(b, { ...ctx, width: colWidth })).join("");
          const padStart = index === 0 ? 0 : gap / 2;
          const padEnd = index === columns.length - 1 ? 0 : gap / 2;
          return `<td class="ya-col" width="${colWidth}" valign="top" style="width:${colWidth}px;padding-${start(ctx.dir)}:${padStart}px;padding-${ctx.dir === "rtl" ? "left" : "right"}:${padEnd}px;" dir="${ctx.dir}"><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${rows || (ctx.editing ? `<tr><td>${placeholder(ctx, "Drop blocks here", 80)}</td></tr>` : "")}</table></td>`;
        })
        .join("");
      return row(`<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" dir="${ctx.dir}"><tr>${cells}</tr></table>`, ctx, block, [12, 32, 12, 32]);
    }
    case "imageText": {
      const src = image(block.src);
      const imgWidth = Math.floor(inner * 0.44);
      const textWidth = inner - imgWidth - 24;
      const radius = s?.radius ?? 12;
      const pic = src ? `<img src="${attr(src)}" width="${imgWidth}" alt="${attr(block.alt ?? "")}" style="display:block;width:100%;max-width:${imgWidth}px;height:auto;border:0;border-radius:${radius}px;" />` : placeholder(ctx, "Add a picture", 160);
      const words =
        (block.title ? `<h3 class="${cls}" style="margin:0 0 8px 0;font-family:${font};font-size:20px;line-height:1.3;font-weight:800;color:${color};">${escapeHtml(block.title)}</h3>` : "") +
        `<div class="${cls}" style="font-family:${font};font-size:15px;line-height:1.6;color:${color};">${richText(block.text ?? "", ctx)}</div>` +
        (block.button?.label ? `<div style="padding-top:14px;">${button(block.button, ctx, { ...s, fontSize: 15, padding: undefined }, start(ctx.dir) as "left" | "right")}</div>` : "");
      const picCell = `<td class="ya-col" width="${imgWidth}" valign="middle" style="width:${imgWidth}px;">${pic}</td>`;
      const gapCell = `<td class="ya-gap" width="24" style="width:24px;font-size:0;line-height:0;">&nbsp;</td>`;
      const textCell = `<td class="ya-col" width="${textWidth}" valign="middle" style="width:${textWidth}px;text-align:${start(ctx.dir)};" dir="${ctx.dir}">${words}</td>`;
      const cells = (block.imageSide ?? "left") === "left" ? picCell + gapCell + textCell : textCell + gapCell + picCell;
      return row(`<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" dir="${ctx.dir}"><tr>${cells}</tr></table>`, ctx, block, [12, 32, 12, 32]);
    }
    case "social": {
      const items = (block.social ?? []).filter((x) => link(x.url));
      if (!items.length) return ctx.editing ? row(placeholder(ctx, "Add your profiles' links", 48), ctx, block, [12, 32, 12, 32]) : "";
      const pills = items
        .map((x) => `<a href="${attr(link(x.url)!)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:4px;padding:8px 14px;border-radius:999px;border:1px solid ${s?.borderColor ?? "#DDD6C9"};font-family:${font};font-size:13px;font-weight:600;color:${s?.color ?? ctx.theme.text};text-decoration:none;" class="${s?.color ? "" : "ya-text ya-pill"}">${escapeHtml(x.network === "website" ? WEBSITE[ctx.lang] : SOCIAL_NAMES[x.network])}</a>`)
        .join("");
      return row(`<div style="text-align:${align};">${pills}</div>`, ctx, block, [12, 32, 12, 32]);
    }
    case "video": {
      const src = image(block.src);
      const href = link(block.href);
      const radius = s?.radius ?? 12;
      const thumb = src
        ? `<img src="${attr(src)}" width="${inner}" alt="${attr(block.alt || WATCH[ctx.lang])}" style="display:block;width:100%;max-width:${inner}px;height:auto;border:0;border-radius:${radius}px;" />`
        : placeholder(ctx, "Add the video's thumbnail", 220);
      const play = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:12px auto 0 auto;"><tr><td style="border-radius:999px;background-color:${ctx.theme.brand};" bgcolor="${ctx.theme.brand}"><a href="${attr(href ?? "#")}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 20px;font-family:${font};font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;">&#9654;&nbsp; ${escapeHtml(WATCH[ctx.lang])}</a></td></tr></table>`;
      return row(`${href && src ? `<a href="${attr(href)}" target="_blank" rel="noopener noreferrer">${thumb}</a>` : thumb}${play}`, ctx, block, [8, 32, 8, 32]);
    }
    case "quote": {
      const accent = s?.borderColor ?? "#FF5A1F";
      const surface = s?.surface ?? "#F8F5EF";
      const qColor = s?.color ?? ctx.theme.text;
      const avatar = image(block.src);
      const who =
        (avatar ? `<img src="${attr(avatar)}" width="44" height="44" alt="" style="display:inline-block;width:44px;height:44px;border-radius:999px;vertical-align:middle;margin-${ctx.dir === "rtl" ? "left" : "right"}:10px;border:0;" />` : "") +
        `<span style="display:inline-block;vertical-align:middle;"><strong style="font-family:${font};font-size:15px;color:${qColor};">${escapeHtml(block.title ?? "")}</strong>${block.caption ? `<br /><span style="font-family:${font};font-size:13px;color:${ctx.theme.muted};">${escapeHtml(block.caption)}</span>` : ""}</span>`;
      return row(
        `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr><td class="ya-surface" style="background-color:${surface};border-${start(ctx.dir)}:4px solid ${accent};border-radius:${s?.radius ?? 12}px;padding:22px 24px;text-align:${start(ctx.dir)};" bgcolor="${surface}" dir="${ctx.dir}"><div style="font-family:${s?.font ? font : fontStack("serif", ctx.dir)};font-size:${s?.fontSize ?? 19}px;line-height:1.55;color:${qColor};font-style:${ctx.dir === "rtl" ? "normal" : "italic"};margin:0 0 14px 0;" class="ya-text">${ctx.dir === "rtl" ? "”" : "“"}${escapeHtml(block.text ?? "")}${ctx.dir === "rtl" ? "“" : "”"}</div>${who}</td></tr></table>`,
        ctx,
        block,
        [12, 32, 12, 32],
      );
    }
    case "cards": {
      const cards = (block.cards ?? []).slice(0, 3);
      if (!cards.length) return "";
      const gap = 14;
      const w = Math.floor((inner - gap * (cards.length - 1)) / cards.length);
      const surface = s?.surface ?? "#F8F5EF";
      const border = s?.borderColor ?? "#ECE6DA";
      const radius = s?.radius ?? ctx.theme.radius;
      const cells = cards
        .map((card, index) => {
          const pic = image(card.image);
          const body =
            (pic ? `<img src="${attr(pic)}" width="${w - 2}" alt="" style="display:block;width:100%;height:auto;border:0;border-radius:${radius}px ${radius}px 0 0;" />` : "") +
            `<div style="padding:20px 20px 22px 20px;text-align:${start(ctx.dir)};" dir="${ctx.dir}">` +
            (card.kicker ? `<div style="font-family:${font};font-size:12px;font-weight:800;letter-spacing:${ctx.dir === "rtl" ? "0" : "0.08em"};text-transform:uppercase;color:${ctx.theme.accent};margin:0 0 8px 0;">${escapeHtml(card.kicker)}</div>` : "") +
            `<div class="ya-text" style="font-family:${font};font-size:18px;font-weight:800;line-height:1.3;color:${s?.color ?? ctx.theme.text};margin:0 0 6px 0;">${escapeHtml(card.title)}</div>` +
            `<div class="ya-muted" style="font-family:${font};font-size:14px;line-height:1.55;color:${ctx.theme.muted};">${escapeHtml(card.text)}</div>` +
            (card.button?.label ? `<div style="padding-top:14px;"><a href="${attr(link(card.button.url) ?? "#")}" target="_blank" rel="noopener noreferrer" style="font-family:${font};font-size:14px;font-weight:700;color:${ctx.theme.accent};text-decoration:none;">${escapeHtml(mirrorArrows(card.button.label, ctx.dir))}</a></div>` : "") +
            `</div>`;
          const padS = index === 0 ? 0 : gap / 2;
          const padE = index === cards.length - 1 ? 0 : gap / 2;
          return `<td class="ya-col" width="${w}" valign="top" style="width:${w}px;padding-${start(ctx.dir)}:${padS}px;padding-${ctx.dir === "rtl" ? "left" : "right"}:${padE}px;"><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr><td class="ya-surface" bgcolor="${surface}" style="background-color:${surface};border:1px solid ${border};border-radius:${radius}px;">${body}</td></tr></table></td>`;
        })
        .join("");
      return row(`<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" dir="${ctx.dir}"><tr>${cells}</tr></table>`, ctx, block, [12, 32, 12, 32]);
    }
    case "coupon": {
      const surface = s?.surface ?? "#FFF4EC";
      const border = s?.borderColor ?? "#FF5A1F";
      const cColor = s?.color ?? ctx.theme.text;
      return row(
        `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr><td align="center" class="ya-surface" bgcolor="${surface}" style="background-color:${surface};border:2px dashed ${border};border-radius:${s?.radius ?? ctx.theme.radius}px;padding:24px 20px;text-align:center;">` +
          (block.text ? `<div style="font-family:${font};font-size:14px;font-weight:600;color:${ctx.theme.muted};margin:0 0 8px 0;" class="ya-muted">${escapeHtml(block.text)}</div>` : "") +
          `<div style="font-family:${FONTS.mono};font-size:30px;font-weight:800;letter-spacing:0.12em;color:${cColor};margin:0;" class="ya-text" dir="ltr">${escapeHtml(block.code ?? "")}</div>` +
          (block.button?.label ? `<div style="padding-top:18px;">${button(block.button, ctx, { fontSize: 15 }, "center")}</div>` : "") +
          `</td></tr></table>`,
        ctx,
        block,
        [12, 32, 12, 32],
      );
    }
    case "badges": {
      const stores = (block.stores ?? []).filter((x) => link(x.url));
      if (!stores.length) return ctx.editing ? row(placeholder(ctx, "Add your app's store links", 52), ctx, block, [12, 32, 12, 32]) : "";
      const dark = s?.surface ?? "#0E0D24";
      const pills = stores
        .map(
          (x) =>
            `<a href="${attr(link(x.url)!)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:4px;padding:9px 16px;border-radius:10px;background-color:${dark};font-family:${font};color:#FFFFFF;text-decoration:none;text-align:${start(ctx.dir)};line-height:1.15;"><span style="font-size:10px;opacity:0.8;display:block;">${escapeHtml(STORE_LEAD[ctx.lang])}</span><span style="font-size:15px;font-weight:700;display:block;" dir="ltr">${STORE_NAMES[x.store]}</span></a>`,
        )
        .join("");
      return row(`<div style="text-align:${align};">${pills}</div>`, ctx, block, [12, 32, 12, 32]);
    }
    case "list": {
      const items = (block.items ?? []).filter((x) => x.trim());
      const check = s?.surface ?? "#FFE9DF";
      const mark = s?.borderColor ?? "#C2410C";
      const rows = items
        .map(
          (item) =>
            `<tr><td width="30" valign="top" style="width:30px;padding:2px 0 10px 0;"><div style="width:22px;height:22px;line-height:22px;border-radius:999px;background-color:${check};color:${mark};font-size:13px;font-weight:800;text-align:center;font-family:${FONTS.system};">&#10003;</div></td><td valign="top" class="${cls}" style="padding:2px 0 10px 0;font-family:${font};font-size:${s?.fontSize ?? 16}px;line-height:1.5;color:${color};text-align:${start(ctx.dir)};">${escapeHtml(item)}</td></tr>`,
        )
        .join("");
      return row(`<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" dir="${ctx.dir}">${rows}</table>`, ctx, block, [8, 32, 8, 32]);
    }
    case "html": {
      const clean = sanitizeHtml(block.html ?? "", "document").replace(/<\/?(html|head|body)[^>]*>/gi, "").replace(/<(meta|title)[^>]*>(<\/title>)?/gi, "");
      return row(`<div class="${cls}" style="font-family:${font};font-size:16px;line-height:1.6;color:${color};">${clean}</div>`, ctx, block, [8, 32, 8, 32]);
    }
    case "footer": {
      const fColor = s?.color ?? ctx.theme.muted;
      return row(`<div class="${s?.color ? "" : "ya-muted"}" style="font-family:${font};font-size:${s?.fontSize ?? 13}px;line-height:1.6;color:${fColor};text-align:${align};">${richText(block.text ?? "", ctx)}</div>`, ctx, block, [20, 32, 8, 32]);
    }
  }
}

const LEGAL: Record<MailLang, { why: string; unsubscribe: string }> = {
  en: { why: "You're getting this email because you use Yallapp.", unsubscribe: "Unsubscribe from marketing emails" },
  ar: { why: "تصلك هذه الرسالة لأنك تستخدم Yallapp.", unsubscribe: "إلغاء الاشتراك في الرسائل التسويقية" },
  tr: { why: "Bu e-postayı Yallapp kullandığınız için alıyorsunuz.", unsubscribe: "Pazarlama e-postalarından çıkın" },
};

/** The line every campaign email ends with (why it came, the unsubscribe link, Yallapp's place). */
export function legalFooterHtml(lang: MailLang, dir: Dir, unsubscribeUrl: string, theme: MailTheme = BRAND_THEME): string {
  const t = LEGAL[lang];
  const font = fontStack(theme.font, dir);
  return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:${theme.width}px;margin:0 auto;"><tr><td class="ya-px" dir="${dir}" style="padding:22px 32px 36px 32px;text-align:center;font-family:${font};font-size:12px;line-height:1.7;color:#7A768C;"><span class="ya-legal">${escapeHtml(t.why)}</span><br /><a href="${attr(unsubscribeUrl)}" target="_blank" rel="noopener noreferrer" class="ya-legal" style="color:#7A768C;text-decoration:underline;">${escapeHtml(t.unsubscribe)}</a> &nbsp;·&nbsp; <span class="ya-legal" dir="ltr">${COMPANY.name} · ${escapeHtml(COMPANY_PLACE)}</span></td></tr></table>`;
}

export function legalFooterText(lang: MailLang, unsubscribeUrl: string): string {
  const t = LEGAL[lang];
  return `${t.why}\n${t.unsubscribe}: ${unsubscribeUrl}\n${COMPANY.name} · ${COMPANY_PLACE}`;
}

function preheader(text: string): string {
  if (!text.trim()) return "";
  // Hidden; the spacers keep inboxes from filling the preview with the email's first words.
  return `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(text)}${"&#847;&zwnj;&nbsp;".repeat(60)}</div>`;
}

function head(theme: MailTheme, dir: Dir, lang: MailLang, title: string): string {
  const w = theme.width;
  return `<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="x-apple-disable-message-reformatting" /><meta name="color-scheme" content="light dark" /><meta name="supported-color-schemes" content="light dark" /><title>${escapeHtml(title)}</title><!--[if mso]><style type="text/css">table,td,div,h1,h2,h3,p,a{font-family:Arial,sans-serif !important;}</style><![endif]--><style type="text/css">
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;width:100% !important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}
img{-ms-interpolation-mode:bicubic;}
a[x-apple-data-detectors]{color:inherit !important;text-decoration:none !important;}
@media only screen and (max-width:${w + 20}px){
.ya-wrap{width:100% !important;}
.ya-px{padding-left:20px !important;padding-right:20px !important;}
.ya-col{display:block !important;width:100% !important;max-width:100% !important;padding-left:0 !important;padding-right:0 !important;padding-bottom:16px !important;}
.ya-gap{display:none !important;}
h1{font-size:28px !important;}
}
@media (prefers-color-scheme:dark){
.ya-page{background-color:#0B0A1C !important;}
.ya-body{background-color:#17162F !important;}
.ya-text{color:#F1EEF8 !important;}
.ya-muted,.ya-legal{color:#A9A5C0 !important;}
.ya-surface{background-color:#221F3E !important;border-color:#34305A !important;}
.ya-pill{border-color:#3A3660 !important;}
.ya-rule{border-color:#34305A !important;}
.ya-logo-light{display:none !important;max-height:0 !important;}
.ya-logo-dark{display:block !important;max-height:none !important;}
}
[data-ogsc] .ya-text{color:#F1EEF8 !important;}
[data-ogsc] .ya-muted{color:#A9A5C0 !important;}
[data-ogsb] .ya-body{background-color:#17162F !important;}
[data-ogsb] .ya-page{background-color:#0B0A1C !important;}
</style></head>`;
}

/** 114 One block as the builder's canvas draws it: its rows in a table of `width` (the email's, or a column's). */
export function renderBlockForCanvas(doc: MailDoc, block: MailBlock, options: { dir: Dir; lang: MailLang; assetBase: string; width?: number }): string {
  const theme = { ...BRAND_THEME, ...doc.theme };
  const width = options.width ?? theme.width;
  const ctx: Ctx = { theme, dir: options.dir, lang: options.lang, assetBase: options.assetBase.replace(/\/+$/, ""), editing: true, width };
  return `<table role="presentation" width="${width}" border="0" cellpadding="0" cellspacing="0" dir="${options.dir}" style="width:100%;max-width:${width}px;border-collapse:collapse;">${blockHtml(block, ctx)}</table>`;
}

/** The email as the preview shows it in dark mode: the dark colors of clients that apply them, whatever the computer's own setting. */
export function forceDark(html: string): string {
  return html.replace("@media (prefers-color-scheme:dark){", "@media all{");
}

/** The design's blocks as a whole email, with the merge tags still in it. */
export function renderDoc(doc: MailDoc, content: Pick<MailContent, "subject" | "preview" | "dir">, options: RenderOptions): string {
  const theme = { ...BRAND_THEME, ...doc.theme };
  const dir: Dir = content.dir === "rtl" ? "rtl" : "ltr";
  const ctx: Ctx = { theme, dir, lang: options.lang, assetBase: options.assetBase.replace(/\/+$/, ""), editing: !!options.editing, width: theme.width };
  const rows = doc.blocks.map((b) => blockHtml(b, ctx)).join("\n");
  const unsubscribe = options.unsubscribeUrl ?? "{{unsubscribe_link}}";
  const radius = theme.radius;
  return (
    `<!DOCTYPE html>\n<html lang="${options.lang}" dir="${dir}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">` +
    head(theme, dir, options.lang, content.subject) +
    `<body class="ya-page" dir="${dir}" style="margin:0;padding:0;background-color:${theme.background};" bgcolor="${theme.background}">` +
    preheader(content.preview) +
    `<table role="presentation" class="ya-page" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${theme.background}" style="background-color:${theme.background};"><tr><td align="center" style="padding:28px 12px 0 12px;">` +
    `<!--[if mso]><table role="presentation" width="${theme.width}" align="center" border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->` +
    `<table role="presentation" class="ya-wrap ya-body" width="${theme.width}" border="0" cellpadding="0" cellspacing="0" dir="${dir}" bgcolor="${theme.body}" style="width:100%;max-width:${theme.width}px;background-color:${theme.body};border-radius:${radius}px;overflow:hidden;">${rows}<tr><td style="height:16px;line-height:16px;font-size:0;">&nbsp;</td></tr></table>` +
    (options.legal === false ? "" : legalFooterHtml(options.lang, dir, unsubscribe, theme)) +
    `<!--[if mso]></td></tr></table><![endif]-->` +
    `</td></tr></table></body></html>`
  );
}

/** The admin's own HTML as an email: sanitized, with the preview line, the direction and the unsubscribe line added. */
export function renderHtmlMode(html: string, content: Pick<MailContent, "subject" | "preview" | "dir">, options: RenderOptions): string {
  const dir: Dir = content.dir === "rtl" ? "rtl" : "ltr";
  let clean = sanitizeHtml(html, "document");
  const unsubscribe = options.unsubscribeUrl ?? "{{unsubscribe_link}}";
  if (!/<body[\s>]/i.test(clean)) {
    clean = `<!DOCTYPE html>\n<html lang="${options.lang}" dir="${dir}">${head(BRAND_THEME, dir, options.lang, content.subject)}<body dir="${dir}" style="margin:0;padding:0;">${clean}</body></html>`;
  } else {
    if (!/<html[^>]*\sdir=/i.test(clean)) clean = clean.replace(/<html\b/i, `<html dir="${dir}"`);
    if (!/<body[^>]*\sdir=/i.test(clean)) clean = clean.replace(/<body\b/i, `<body dir="${dir}"`);
  }
  clean = clean.replace(/(<body[^>]*>)/i, `$1${preheader(content.preview)}`);
  const footer = legalFooterHtml(options.lang, dir, unsubscribe);
  return /<\/body>/i.test(clean) ? clean.replace(/<\/body>/i, `${footer}</body>`) : clean + footer;
}

/** One language of the email, ready but for its merge tags. */
export function renderContent(content: MailContent, options: RenderOptions): RenderedMail {
  const html = content.mode === "html" ? renderHtmlMode(content.html ?? "", content, options) : renderDoc(content.doc ?? { version: 1, theme: BRAND_THEME, blocks: [] }, content, options);
  return { subject: content.subject, html, text: htmlToText(html.replace(/<div style="display:none[^>]*>[\s\S]*?<\/div>/, "")) };
}

/** Gmail cuts emails past about 102 KB; the review step warns before then. */
export function htmlSizeKb(html: string): number {
  return Math.round(new TextEncoder().encode(html).length / 102.4) / 10;
}
