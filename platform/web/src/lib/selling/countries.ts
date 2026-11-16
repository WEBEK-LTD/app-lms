/**
 * 132.170 Every country a shop can deliver to: the 249 ISO 3166-1 alpha-2
 * codes, named in the dashboard's (or the app's) language by Node's and the
 * browser's own data (Intl.DisplayNames), English when a language has no name
 * for one. The countries the platform serves first keep the short names the
 * app showed before (lib/selling/shipping.ts `SHIPPING_COUNTRIES`: "السعودية",
 * not "المملكة العربية السعودية"). No country data is bundled beyond the codes.
 */

/** The short names of the countries the platform serves first, as the app showed them before 132.170. */
export const SHIPPING_COUNTRIES: Record<string, { en: string; ar: string; tr: string }> = {
  TR: { en: "Turkey", ar: "تركيا", tr: "Türkiye" },
  EG: { en: "Egypt", ar: "مصر", tr: "Mısır" },
  SA: { en: "Saudi Arabia", ar: "السعودية", tr: "Suudi Arabistan" },
  AE: { en: "United Arab Emirates", ar: "الإمارات", tr: "Birleşik Arap Emirlikleri" },
  KW: { en: "Kuwait", ar: "الكويت", tr: "Kuveyt" },
  QA: { en: "Qatar", ar: "قطر", tr: "Katar" },
  BH: { en: "Bahrain", ar: "البحرين", tr: "Bahreyn" },
  OM: { en: "Oman", ar: "عُمان", tr: "Umman" },
};

export const ISO_COUNTRIES: readonly string[] = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT " +
  "MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG " +
  "UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

/** The countries the platform serves first, at the top of the picker, in this order. */
export const FIRST_COUNTRIES: readonly string[] = ["TR", "EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO"];

const KNOWN = new Set(ISO_COUNTRIES);

/** An ISO 3166-1 code, upper case, or null. */
export function isoCountry(value: unknown): string | null {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return KNOWN.has(code) ? code : null;
}

const displayNames = new Map<string, Intl.DisplayNames | null>();
function namesIn(lang: string): Intl.DisplayNames | null {
  if (!displayNames.has(lang)) {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([lang], { type: "region", fallback: "none" });
    } catch {
      names = null;
    }
    displayNames.set(lang, names);
  }
  return displayNames.get(lang)!;
}

/** The country's name in `lang` ("Egypt", "مصر", "Mısır"), in English when `lang` has none, else the code. */
export function countryNameIn(code: string, lang: string): string {
  const own = (SHIPPING_COUNTRIES[code] as Record<string, string> | undefined)?.[lang];
  if (own) return own;
  const named = namesIn(lang)?.of(code);
  if (named && named !== code) return named;
  if (lang !== "en") return countryNameIn(code, "en");
  return code;
}

/** Its name in the dashboard's three languages, as the app's `StoreConfig.shipping.countries[].names` carries it. */
export function countryNames(code: string): { en: string; ar: string; tr: string } {
  return { en: countryNameIn(code, "en"), ar: countryNameIn(code, "ar"), tr: countryNameIn(code, "tr") };
}

/** Every country for the picker: the platform's first ones on top, then the rest A–Z in `lang`. */
export function countryChoices(lang: string): { code: string; name: string; first: boolean }[] {
  let collator: Intl.Collator;
  try {
    collator = new Intl.Collator(lang);
  } catch {
    collator = new Intl.Collator("en");
  }
  const first = FIRST_COUNTRIES.map((code) => ({ code, name: countryNameIn(code, lang), first: true }));
  const rest = ISO_COUNTRIES.filter((code) => !FIRST_COUNTRIES.includes(code))
    .map((code) => ({ code, name: countryNameIn(code, lang), first: false }))
    .sort((a, b) => collator.compare(a.name, b.name));
  return [...first, ...rest];
}
