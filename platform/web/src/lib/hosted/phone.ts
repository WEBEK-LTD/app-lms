import { parsePhoneNumberFromString } from "libphonenumber-js/max";

/** A mobile number split into its country code and national part. */
export interface Phone {
  /** "+90". */
  countryCode: string;
  /** "5321234567". */
  number: string;
  /** "+905321234567". */
  e164: string;
}

/** Whether +<cc><number> is a real, valid number for its country (numbering plans, not just length). */
function valid(cc: string, digits: string): boolean {
  return parsePhoneNumberFromString(`+${cc}${digits}`)?.isValid() ?? false;
}

/**
 * Parses what a customer typed, the same way as the plugin (Phone::parse):
 * a number typed with its country code again ("+90 532…", "0090…") keeps only
 * the national part; leading zeros go. The result must be a valid number in
 * that country's numbering plan, so "+95 446731942" (a typo for +90 544…)
 * is refused instead of being sent to a number that doesn't exist.
 */
export function parsePhone(countryCode: unknown, number: unknown): Phone | null {
  const cc = String(countryCode ?? "").replace(/\D+/g, "");
  const raw = String(number ?? "").trim();
  const international = raw.startsWith("+") || raw.startsWith("00");
  let digits = raw.replace(/\D+/g, "").replace(/^0+/, "");
  if (cc === "" || cc.length > 3 || digits === "") return null;
  if (digits.startsWith(cc) && (international || (cc + digits).length > 13)) {
    digits = digits.slice(cc.length).replace(/^0+/, "");
  } else if (cc === "1" && digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  const total = (cc + digits).length;
  if (total < 8 || total > 15 || !valid(cc, digits)) return null;
  return { countryCode: `+${cc}`, number: digits, e164: `+${cc}${digits}` };
}

/**
 * Parses a full number ("+90 532 123 45 67", also "+90 0532…" with the
 * national 0 typed after the country code) or a national one with a default
 * country code.
 */
export function parseAnyPhone(value: string, defaultCountryCode: string): Phone | null {
  const raw = value.trim();
  if (raw.startsWith("+") || raw.startsWith("00")) {
    const digits = raw.replace(/\D+/g, "").replace(/^00/, "");
    for (const length of [1, 2, 3]) {
      const cc = digits.slice(0, length);
      const phone = parsePhone(cc, digits.slice(length));
      if (phone && phone.countryCode === `+${cc}`) return phone;
    }
    return null;
  }
  return parsePhone(defaultCountryCode, raw);
}
