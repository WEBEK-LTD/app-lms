import type { ContactSetting } from "./data/types";

/**
 * 72 Yallapp's two WhatsApp support numbers: one for customers in Egypt and
 * one for everyone else. Shared by the server and the browser (no secrets
 * here): the server picks by the visitor's country when it knows it, and
 * pages built ahead of time pick in the browser (`WhatsAppLink`).
 */

export type WhatsAppRegion = "egypt" | "international";

export interface WhatsAppLine {
  region: WhatsAppRegion;
  /** The wa.me link. */
  url: string;
  /** As shown, like +20 104 256 0010. */
  display: string;
}

export interface WhatsAppLines {
  egypt: WhatsAppLine;
  international: WhatsAppLine;
}

/** The numbers until the team changes them in Admin › Settings › Contact details. */
export const DEFAULT_WHATSAPP = "+90 544 673 19 42";
export const DEFAULT_WHATSAPP_EGYPT = "+20 104 256 0010";

export function whatsappUrl(number: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}`;
}

/** Both numbers from the setting; one saved before Phase 72 has no Egyptian number yet and gets the default. */
export function whatsappLines(setting: Pick<ContactSetting, "whatsapp" | "whatsappEgypt">): WhatsAppLines {
  const egypt = setting.whatsappEgypt?.trim() || DEFAULT_WHATSAPP_EGYPT;
  return {
    egypt: { region: "egypt", url: whatsappUrl(egypt), display: egypt },
    international: { region: "international", url: whatsappUrl(setting.whatsapp), display: setting.whatsapp },
  };
}

/**
 * Both numbers on one line, each with where it's for, for emails and other
 * plain text: "+20 104 256 0010 (In Egypt) · +90 544 673 19 42 (Outside Egypt)".
 */
export function bothWhatsApp(lines: WhatsAppLines, labels: { inEgypt: string; outsideEgypt: string }): string {
  return `${lines.egypt.display} (${labels.inEgypt}) · ${lines.international.display} (${labels.outsideEgypt})`;
}

/** The region for a country: Egypt's number in Egypt, the international one elsewhere and when the country isn't known. */
export function regionOf(country: string | null | undefined): WhatsAppRegion {
  return country?.toUpperCase() === "EG" ? "egypt" : "international";
}

/** The one number to show where only one fits. */
export function whatsappFor(lines: WhatsAppLines, country: string | null | undefined): WhatsAppLine {
  return lines[regionOf(country)];
}

/**
 * In the browser, for a page built ahead of time (no country from the
 * request): Egypt when the browser's time zone is Cairo's or its preferred
 * language names Egypt as its region (Phase 52's last hint, `ar-EG`).
 */
export function browserInEgypt(timeZone: string | undefined, languages: readonly string[]): boolean {
  if (timeZone === "Africa/Cairo") return true;
  const first = languages.find((tag) => tag.split("-").slice(1).some((part) => /^[A-Za-z]{2}$/.test(part)));
  return Boolean(first && first.split("-").slice(1).some((part) => part.toUpperCase() === "EG"));
}
