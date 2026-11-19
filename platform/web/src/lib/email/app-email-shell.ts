import type { Lang } from "@/i18n/config";

/**
 * 198, 199 The look of the emails a client's app sends its own customers
 * (the receipt, the welcome, the sign-in or reset code): the app's logo
 * (else its name in its colour) at the top, never Yallapp's, a card with
 * the app's main colour as its accent, and a footer in the app's name. In
 * the customer's language (Arabic right to left), by day and by night: the
 * email says it has both looks (`color-scheme`), a mail app in dark mode
 * takes the dark colours (`prefers-color-scheme`, Outlook's `[data-ogsc]`),
 * and the light colours stay readable where a mail app turns them around by
 * itself (Gmail). Tables and inline styles, at most 600 px wide.
 */

export interface AppEmailShell {
  lang: Lang;
  /** The app's name. */
  appName: string;
  /** The app's logo, else its icon, as a public address; null for none. */
  logoUrl: string | null;
  /** The app's main colour (#RRGGBB). */
  brand: string;
  /** The `<title>` (the subject). */
  title: string;
  /** The line a mail app shows beside the subject. */
  preheader: string;
  /** The card's inside: rows (`<tr>`) of the card's one-column table, made with the helpers below. */
  rows: string;
  /** The line under the card. */
  footer: string;
}

export const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** A colour as #RRGGBB, else the platform's own. */
export function hexColour(colour: string | null | undefined): string {
  const c = (colour ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(c) ? c.toUpperCase() : "#5B3FD6";
}

/** The colour mixed toward white (t 0..1), for its soft tints. */
export function tintColour(colour: string, t: number): string {
  const c = hexColour(colour);
  const ch = (i: number) => Math.round(parseInt(c.slice(1 + i * 2, 3 + i * 2), 16) * (1 - t) + 255 * t);
  return `#${[0, 1, 2].map((i) => ch(i).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** Which side a line starts and ends on in this language. */
export function sides(lang: Lang): { dir: "rtl" | "ltr"; start: "right" | "left"; end: "left" | "right" } {
  return lang === "ar" ? { dir: "rtl", start: "right", end: "left" } : { dir: "ltr", start: "left", end: "right" };
}

/** A padded row of the card. */
export function cardRow(lang: Lang, inner: string, padding = "0 32px"): string {
  const { dir, start } = sides(lang);
  return `<tr><td class="ylp-pad" style="padding:${padding};text-align:${start}" dir="${dir}">${inner}</td></tr>`;
}

/** The pill at the card's top (✓ Order #1024). */
export function pill(brand: string, text: string): string {
  return `<div class="ylp-pill" style="display:inline-block;padding:6px 12px;border-radius:999px;background:${tintColour(brand, 0.9)};color:${hexColour(brand)};font-size:13px;font-weight:700">${escapeHtml(text)}</div>`;
}

/** The card's heading. */
export function heading(text: string): string {
  return `<h1 class="ylp-text" style="margin:16px 0 8px 0;font-size:24px;line-height:1.3;font-weight:800;color:#24223A">${escapeHtml(text)}</h1>`;
}

/** A paragraph: the main ink, or muted. */
export function paragraph(text: string, options: { muted?: boolean; strong?: boolean; size?: number; margin?: string } = {}): string {
  const cls = options.muted ? "ylp-muted" : "ylp-text";
  const colour = options.muted ? "#5C5874" : "#24223A";
  return `<p class="${cls}" style="margin:${options.margin ?? "0 0 8px 0"};font-size:${options.size ?? 15}px;line-height:1.6;color:${colour}${options.strong ? ";font-weight:600" : ""}">${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
}

/** The whole email. */
export function appEmailHtml(shell: AppEmailShell): string {
  const { dir } = sides(shell.lang);
  const rtl = shell.lang === "ar";
  const brand = hexColour(shell.brand);
  const name = escapeHtml(shell.appName);
  const font = rtl ? "Tahoma,'Segoe UI',Arial,sans-serif" : "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const head = shell.logoUrl
    ? `<img src="${escapeHtml(shell.logoUrl)}" width="64" height="64" alt="${name}" style="display:block;width:64px;height:64px;border-radius:16px;border:0;outline:none;text-decoration:none;margin:0 auto;object-fit:cover" />`
    : `<div class="ylp-brand" style="font-size:24px;font-weight:800;letter-spacing:-0.2px;color:${brand}">${name}</div>`;
  return `<!doctype html>
<html lang="${shell.lang}" dir="${dir}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(shell.title)}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  @media (max-width: 620px) { .ylp-card { border-radius:0 !important; } .ylp-pad { padding-left:20px !important; padding-right:20px !important; } }
  @media (prefers-color-scheme: dark) {
    .ylp-page { background:#121019 !important; }
    .ylp-card { background:#1D1A28 !important; border-color:#2E2A3D !important; }
    .ylp-text, .ylp-line { color:#EDE9F6 !important; }
    .ylp-muted { color:#A9A3BF !important; }
    .ylp-line { border-color:#2E2A3D !important; }
    .ylp-sum, .ylp-code { background:#262235 !important; }
    .ylp-total, .ylp-code { color:#FFFFFF !important; }
    .ylp-brand { color:${tintColour(brand, 0.35)} !important; }
    .ylp-pill { background:#262235 !important; color:#EDE9F6 !important; }
  }
  [data-ogsc] .ylp-page { background:#121019 !important; }
  [data-ogsc] .ylp-card { background:#1D1A28 !important; }
  [data-ogsc] .ylp-text, [data-ogsc] .ylp-line { color:#EDE9F6 !important; }
  [data-ogsc] .ylp-muted { color:#A9A3BF !important; }
  [data-ogsc] .ylp-sum, [data-ogsc] .ylp-code { background:#262235 !important; }
  [data-ogsc] .ylp-total, [data-ogsc] .ylp-code { color:#FFFFFF !important; }
</style>
</head>
<body class="ylp-page" style="margin:0;padding:0;background:#F4F2F8;font-family:${font}" dir="${dir}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(shell.preheader)}</div>
<table role="presentation" class="ylp-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F2F8">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
<tr><td align="center" style="padding:4px 0 20px 0">${head}</td></tr>
<tr><td>
<table role="presentation" class="ylp-card" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #E7E4EF;border-radius:20px;overflow:hidden">
<tr><td style="height:6px;line-height:6px;font-size:0;background:${brand}">&nbsp;</td></tr>
${shell.rows}
</table>
</td></tr>
<tr><td align="center" class="ylp-muted" style="padding:18px 8px 0 8px;font-size:12px;line-height:1.6;color:#8A86A0">${escapeHtml(shell.footer)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
