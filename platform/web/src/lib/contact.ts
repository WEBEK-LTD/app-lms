import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { getCurrentUser } from "./auth/session";
import { DEFAULT_WHATSAPP, DEFAULT_WHATSAPP_EGYPT, whatsappFor, whatsappLines, type WhatsAppLines } from "./contact-lines";
import { getStore } from "./data";
import type { ContactSetting } from "./data/types";
import { visitorCountry } from "./geo";
import { platformSetting } from "./settings/platform";

/** Yallapp's WhatsApp numbers (72: one for Egypt, one for everywhere else) and email, until the team changes them in the admin. */
export const DEFAULT_CONTACT: Required<ContactSetting> = { whatsapp: DEFAULT_WHATSAPP, whatsappEgypt: DEFAULT_WHATSAPP_EGYPT, email: "info@yallapp.com.tr" };

export interface Contact {
  /** 72 The number for this visitor: by their country when it's known (`getVisitorContact`), else the international one. */
  whatsappUrl: string;
  whatsappDisplay: string;
  /** 72 The country the number was picked for; null when it isn't known (pages built ahead of time pick in the browser). */
  country: string | null;
  /** 72 Both numbers, to show with their labels where there's room. */
  lines: WhatsAppLines;
  email: string;
}

export function contactFrom(setting: ContactSetting, country: string | null = null): Contact {
  const lines = whatsappLines(setting);
  const picked = whatsappFor(lines, country);
  return { whatsappUrl: picked.url, whatsappDisplay: picked.display, country, lines, email: setting.email };
}

async function contactSetting(): Promise<ContactSetting> {
  try {
    return (await platformSetting(await getStore(), "contact"))?.value ?? DEFAULT_CONTACT;
  } catch {
    return DEFAULT_CONTACT;
  }
}

/** The contact details, without reading the request (pages built ahead of time). The defaults when the database can't be read (as during a build). */
export const getContact = cache(async (): Promise<Contact> => contactFrom(await contactSetting()));

/**
 * 72 The contact details with the WhatsApp number for this visitor, as
 * Phase 52 picks prices: a signed-in client's account country first, then
 * the request's (the host's geo header, then the browser's language
 * region). Reads the request headers, so only for pages rendered per
 * request (the dashboard, the home and pricing pages).
 */
export const getVisitorContact = cache(async (): Promise<Contact> => {
  const setting = await contactSetting();
  let country: string | null = null;
  try {
    const user = await getCurrentUser();
    const client = user ? await (await getStore()).getClientByUserId(user.id) : null;
    country = client?.country || null;
  } catch {
    // No account country: the request's.
  }
  country ??= visitorCountry(await headers());
  return contactFrom(setting, country);
});
