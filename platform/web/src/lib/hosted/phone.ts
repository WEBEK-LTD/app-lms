/** A mobile number split into its country code and national part. */
export interface Phone {
  /** "+90". */
  countryCode: string;
  /** "5321234567". */
  number: string;
  /** "+905321234567". */
  e164: string;
}

/**
 * Parses what a customer typed, the same way as the plugin (Phone::parse):
 * a number typed with its country code again ("+90 532…", "0090…") keeps only
 * the national part; leading zeros go.
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
  if (total < 8 || total > 15) return null;
  return { countryCode: `+${cc}`, number: digits, e164: `+${cc}${digits}` };
}

/** Parses a full number ("+90 532 123 45 67") or a national one with a default country code. */
export function parseAnyPhone(value: string, defaultCountryCode: string): Phone | null {
  const raw = value.trim();
  if (raw.startsWith("+")) {
    const digits = raw.replace(/\D+/g, "");
    for (const length of [1, 2, 3]) {
      const phone = parsePhone(digits.slice(0, length), digits.slice(length));
      if (phone && phone.e164 === `+${digits}`) return phone;
    }
    return null;
  }
  return parsePhone(defaultCountryCode, raw);
}
