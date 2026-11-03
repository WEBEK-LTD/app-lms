/**
 * 114 The signed links in a campaign email: the recipient's unsubscribe page
 * (and its one-click POST, RFC 8058), the open pixel, and each tracked link's
 * redirect. A token names the recipient's row by its number and carries an
 * HMAC (SIGNING_SECRET), so nobody can unsubscribe or count someone else; a
 * click also signs its address, so the redirect never goes anywhere the
 * email didn't link to. No email address is ever in a link.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

function mac(secret: string, data: string, length: number): string {
  return createHmac("sha256", secret).update(data).digest("base64url").slice(0, length);
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function recipientToken(id: number, secret: string): string {
  const head = id.toString(36);
  return `${head}.${mac(secret, `mail-recipient:${head}`, 22)}`;
}

/** The recipient's number, or null for a token that wasn't signed here. */
export function readRecipientToken(token: string, secret: string): number | null {
  const match = /^([0-9a-z]{1,12})\.([A-Za-z0-9_-]{22})$/.exec(token);
  if (!match) return null;
  if (!same(match[2]!, mac(secret, `mail-recipient:${match[1]!}`, 22))) return null;
  const id = parseInt(match[1]!, 36);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function clickSignature(token: string, url: string, secret: string): string {
  return mac(secret, `mail-click:${token}:${url}`, 16);
}

export function validClick(token: string, url: string, signature: string, secret: string): boolean {
  return /^[A-Za-z0-9_-]{16}$/.test(signature) && same(signature, clickSignature(token, url, secret));
}

export interface MailLinks {
  unsubscribePage: string;
  oneClick: string;
  open: string;
  click(url: string): string;
}

export function mailLinks(base: string, token: string, secret: string): MailLinks {
  const root = base.replace(/\/+$/, "");
  return {
    unsubscribePage: `${root}/unsubscribe/${token}`,
    oneClick: `${root}/api/mail/unsubscribe/${token}`,
    open: `${root}/api/mail/open/${token}`,
    click: (url) => `${root}/api/mail/click/${token}?u=${encodeURIComponent(url)}&s=${clickSignature(token, url, secret)}`,
  };
}

const HREF = /(<a\b[^>]*?\shref=")([^"]+)(")/gi;

/** Every web link of the email through its tracked redirect, but the unsubscribe link. */
export function trackLinks(html: string, links: MailLinks): string {
  return html.replace(HREF, (whole, before: string, href: string, after: string) => {
    const url = href.replace(/&amp;/g, "&");
    if (!/^https?:\/\//i.test(url) || url === links.unsubscribePage || url.startsWith(links.unsubscribePage)) return whole;
    return `${before}${links.click(url).replace(/&/g, "&amp;")}${after}`;
  });
}

/** The 1×1 picture whose loading counts an open, just before </body>. */
export function addOpenPixel(html: string, links: MailLinks): string {
  const pixel = `<img src="${links.open}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0;" />`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${pixel}</body>`) : html + pixel;
}

/** The web links of an email (the report's link table lists them even before anyone clicks). */
export function linksOf(html: string): string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(HREF)) {
    const url = match[2]!.replace(/&amp;/g, "&");
    if (/^https?:\/\//i.test(url)) found.add(url);
  }
  return [...found];
}
