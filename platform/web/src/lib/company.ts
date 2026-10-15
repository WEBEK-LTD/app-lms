/**
 * 32 How Yallapp presents itself on its pages, in emails and to search
 * engines: its name and the city it's based in. No registration number and no
 * street address.
 */
export const COMPANY = {
  name: "Yallapp",
  city: "Cairo",
  country: "Egypt",
  /** ISO 3166-1 alpha-2, for structured data. */
  countryCode: "EG",
  website: "https://yallapp.com.tr",
} as const;

/** "Cairo, Egypt". */
export const COMPANY_PLACE = `${COMPANY.city}, ${COMPANY.country}`;

/** The footer's line: "© 2026 Yallapp · Cairo, Egypt". */
export function legalLine(year: number = new Date().getFullYear()): string {
  return `© ${year} ${COMPANY.name} · ${COMPANY_PLACE}`;
}
