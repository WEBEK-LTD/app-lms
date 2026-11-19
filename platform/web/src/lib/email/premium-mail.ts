import { isLang, type Lang } from "@/i18n/config";
import { appEmailHtml, escapeHtml, hexColour, sides } from "./app-email-shell";

/**
 * 200 The owner: every email that goes out is premium ("اي ايميل يتبعت يبقا
 * بريميوم"). The emails designed one by one (the receipt, how to pay, the
 * welcome, the code, a campaign, moving an app) keep their own design; every
 * other email (a template's plain words, or a text-only email) is put in the
 * same look at the last step before it is sent: an app's email to its
 * customers in the app's logo and colour, Yallapp's own in Yallapp's. The
 * words stay the template's: the subject as the card's heading, its
 * paragraphs, its links in the brand's colour, a link alone on its line as
 * a button. Light and dark, in the email's language (Arabic right to left).
 */

/** Who an email is from: the app (its logo or name, its colour), or Yallapp. */
export interface MailBrand {
  name: string;
  logoUrl: string | null;
  darkLogoUrl?: string | null;
  logoSize?: { width: number; height: number };
  colour: string;
}

/** The mark renderTemplate puts on a template's plain HTML, so it is dressed before it is sent. */
export const PLAIN_MARK = "data-ylp-plain";

/** Yallapp's own brand for its emails (the logo in public/email). */
export function yallappBrand(baseUrl: string): MailBrand {
  const base = baseUrl.replace(/\/+$/, "");
  return {
    name: "Yallapp",
    logoUrl: `${base}/email/yallapp-logo.png`,
    darkLogoUrl: `${base}/email/yallapp-logo-reversed.png`,
    logoSize: { width: 99, height: 32 },
    colour: "#5B3FD6",
  };
}

const WORDS: Record<Lang, { sentBy: (name: string) => string; open: string }> = {
  en: { sentBy: (name) => `Sent by ${name}`, open: "Open the link" },
  ar: { sentBy: (name) => `أُرسل من ${name}`, open: "افتح الرابط" },
  tr: { sentBy: (name) => `${name} tarafından gönderildi`, open: "Bağlantıyı aç" },
};

const URL_IN_TEXT = /(^|[\s(>])(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)])/g;
const ONLY_LINK = /^\s*(?:<a\s[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>|(https?:\/\/[^\s<>"']+))\s*$/i;

/** The body of an HTML email made from a template, and its language. */
function plainParts(html: string): { body: string; lang: Lang } {
  const lang = /<html[^>]*\blang="([a-z]{2})"/i.exec(html)?.[1]?.toLowerCase();
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  return { body, lang: lang && isLang(lang) ? lang : "en" };
}

/** A text-only email's words as HTML (escaped, its line breaks kept). */
function textAsHtml(text: string): string {
  return escapeHtml(text).replace(/\r\n/g, "\n").replace(/\n/g, "<br>\n");
}

/** An email's words as the card's rows: paragraphs, links in the brand's colour, a lone link as a button. */
function bodyRows(body: string, lang: Lang, brand: string): string {
  const { dir, start } = sides(lang);
  const colour = hexColour(brand);
  const paragraphs = body
    .split(/(?:<br>\s*){2,}/i)
    .map((p) => p.replace(/^(?:\s|<br>)+|(?:\s|<br>)+$/gi, ""))
    .filter((p) => p !== "");
  const linkStyle = `color:${colour};font-weight:600;text-decoration:underline;word-break:break-all`;
  const styleLinks = (p: string) =>
    p
      .split(/(<a\s[\s\S]*?<\/a>)/i)
      .map((part) =>
        part.startsWith("<a")
          ? // A template's own links take the brand's colour.
            part.replace(/^<a\s([^>]*)>/i, (_, attrs: string) => `<a class="ylp-link" style="${linkStyle}" ${attrs.replace(/\s*style="[^"]*"/i, "")}>`)
          : // Addresses written as words become links.
            part.replace(URL_IN_TEXT, (_, before: string, url: string) => `${before}<a href="${url}" class="ylp-link" style="${linkStyle}">${url}</a>`),
      )
      .join("");
  return paragraphs
    .map((p, i) => {
      const lone = ONLY_LINK.exec(p);
      const padding = i === paragraphs.length - 1 ? "0 32px 30px 32px" : "0 32px 14px 32px";
      if (lone) {
        const url = (lone[1] ?? lone[2])!;
        return (
          `<tr><td class="ylp-pad" style="padding:${padding};text-align:${start}" dir="${dir}">` +
          `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0"><tr><td style="border-radius:12px;background:${colour}">` +
          `<a href="${url}" style="display:inline-block;padding:13px 22px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px">${escapeHtml(WORDS[lang].open)}</a></td></tr></table>` +
          `<div class="ylp-muted" style="margin-top:8px;font-size:12px;line-height:1.5;color:#6E6A85;word-break:break-all">${styleLinks(url)}</div></td></tr>`
        );
      }
      return (
        `<tr><td class="ylp-pad" style="padding:${padding};text-align:${start}" dir="${dir}">` +
        `<p class="ylp-text" style="margin:0;font-size:15px;line-height:1.65;color:#24223A">${styleLinks(p)}</p></td></tr>`
      );
    })
    .join("\n");
}

/** Whether this email's HTML is a template's plain words (or it has none), to dress before sending. */
export function needsDressing(html: string | undefined): boolean {
  return html === undefined || html.trim() === "" || html.includes(PLAIN_MARK);
}

/**
 * The email in the premium look, when it is a template's plain words or
 * text only; an email with its own design is left as it is.
 */
export function dressMail<M extends { subject: string; text: string; html?: string }>(mail: M, brand: MailBrand, lang?: Lang): M {
  if (!needsDressing(mail.html)) return mail;
  const parts = mail.html && mail.html.trim() !== "" ? plainParts(mail.html) : { body: textAsHtml(mail.text), lang: lang ?? "en" };
  const language = lang ?? parts.lang;
  const { dir, start } = sides(language);
  const heading =
    `<tr><td class="ylp-pad" style="padding:30px 32px 14px 32px;text-align:${start}" dir="${dir}">` +
    `<h1 class="ylp-text" style="margin:0;font-size:22px;line-height:1.35;font-weight:800;color:#24223A">${escapeHtml(mail.subject)}</h1></td></tr>`;
  const html = appEmailHtml({
    lang: language,
    appName: brand.name,
    logoUrl: brand.logoUrl,
    darkLogoUrl: brand.darkLogoUrl ?? null,
    logoSize: brand.logoSize,
    brand: brand.colour,
    title: mail.subject,
    preheader: mail.text.replace(/\s+/g, " ").trim().slice(0, 120),
    rows: heading + "\n" + bodyRows(parts.body, language, brand.colour),
    footer: WORDS[language].sentBy(brand.name),
  });
  return { ...mail, html };
}
