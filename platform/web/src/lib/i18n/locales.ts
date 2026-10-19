/**
 * 43 The languages an app can offer: every language the app's system
 * widgets come in (Flutter's GlobalMaterialLocalizations and
 * GlobalCupertinoLocalizations, `kMaterialSupportedLanguages`), with its
 * name in English and in the language itself. The app has the same list
 * (mobile/lib/core/l10n/locales.dart); a unit test keeps them equal.
 *
 * Yallapp ships its own translations of the app and of the texts it writes
 * in English, Arabic and Turkish (`BUILT_IN_LANGUAGES`); any other language
 * starts in English and the owner translates it.
 */

export interface LocaleInfo {
  code: string;
  /** In English, for the dashboard. */
  name: string;
  /** In the language itself, for the app's language picker. */
  nativeName: string;
  rtl: boolean;
}

/** Languages written right to left (also those the app can't offer yet). */
export const RTL_CODES: readonly string[] = ["ar", "fa", "ur", "he", "ku", "ps", "sd", "ug", "yi", "dv"];

const L = (code: string, name: string, nativeName: string): LocaleInfo => ({ code, name, nativeName, rtl: RTL_CODES.includes(code) });

export const LOCALES: readonly LocaleInfo[] = [
  L("af", "Afrikaans", "Afrikaans"),
  L("am", "Amharic", "አማርኛ"),
  L("ar", "Arabic", "العربية"),
  L("as", "Assamese", "অসমীয়া"),
  L("az", "Azerbaijani", "Azərbaycan"),
  L("be", "Belarusian", "Беларуская"),
  L("bg", "Bulgarian", "Български"),
  L("bn", "Bengali", "বাংলা"),
  L("bo", "Tibetan", "བོད་སྐད་"),
  L("bs", "Bosnian", "Bosanski"),
  L("ca", "Catalan", "Català"),
  L("cs", "Czech", "Čeština"),
  L("cy", "Welsh", "Cymraeg"),
  L("da", "Danish", "Dansk"),
  L("de", "German", "Deutsch"),
  L("el", "Greek", "Ελληνικά"),
  L("en", "English", "English"),
  L("es", "Spanish", "Español"),
  L("et", "Estonian", "Eesti"),
  L("eu", "Basque", "Euskara"),
  L("fa", "Persian", "فارسی"),
  L("fi", "Finnish", "Suomi"),
  L("fil", "Filipino", "Filipino"),
  L("fr", "French", "Français"),
  L("ga", "Irish", "Gaeilge"),
  L("gl", "Galician", "Galego"),
  L("gsw", "Swiss German", "Schwiizertüütsch"),
  L("gu", "Gujarati", "ગુજરાતી"),
  L("he", "Hebrew", "עברית"),
  L("hi", "Hindi", "हिन्दी"),
  L("hr", "Croatian", "Hrvatski"),
  L("hu", "Hungarian", "Magyar"),
  L("hy", "Armenian", "Հայերեն"),
  L("id", "Indonesian", "Bahasa Indonesia"),
  L("is", "Icelandic", "Íslenska"),
  L("it", "Italian", "Italiano"),
  L("ja", "Japanese", "日本語"),
  L("ka", "Georgian", "ქართული"),
  L("kk", "Kazakh", "Қазақ тілі"),
  L("km", "Khmer", "ខ្មែរ"),
  L("kn", "Kannada", "ಕನ್ನಡ"),
  L("ko", "Korean", "한국어"),
  L("ky", "Kyrgyz", "Кыргызча"),
  L("lo", "Lao", "ລາວ"),
  L("lt", "Lithuanian", "Lietuvių"),
  L("lv", "Latvian", "Latviešu"),
  L("mk", "Macedonian", "Македонски"),
  L("ml", "Malayalam", "മലയാളം"),
  L("mn", "Mongolian", "Монгол"),
  L("mr", "Marathi", "मराठी"),
  L("ms", "Malay", "Bahasa Melayu"),
  L("my", "Burmese", "မြန်မာ"),
  L("nb", "Norwegian Bokmål", "Norsk bokmål"),
  L("ne", "Nepali", "नेपाली"),
  L("nl", "Dutch", "Nederlands"),
  L("no", "Norwegian", "Norsk"),
  L("or", "Odia", "ଓଡ଼ିଆ"),
  L("pa", "Punjabi", "ਪੰਜਾਬੀ"),
  L("pl", "Polish", "Polski"),
  L("ps", "Pashto", "پښتو"),
  L("pt", "Portuguese", "Português"),
  L("ro", "Romanian", "Română"),
  L("ru", "Russian", "Русский"),
  L("si", "Sinhala", "සිංහල"),
  L("sk", "Slovak", "Slovenčina"),
  L("sl", "Slovenian", "Slovenščina"),
  L("sq", "Albanian", "Shqip"),
  L("sr", "Serbian", "Српски"),
  L("sv", "Swedish", "Svenska"),
  L("sw", "Swahili", "Kiswahili"),
  L("ta", "Tamil", "தமிழ்"),
  L("te", "Telugu", "తెలుగు"),
  L("th", "Thai", "ไทย"),
  L("tl", "Tagalog", "Tagalog"),
  L("tr", "Turkish", "Türkçe"),
  L("ug", "Uyghur", "ئۇيغۇرچە"),
  L("uk", "Ukrainian", "Українська"),
  L("ur", "Urdu", "اردو"),
  L("uz", "Uzbek", "Oʻzbekcha"),
  L("vi", "Vietnamese", "Tiếng Việt"),
  L("zh", "Chinese", "中文"),
  L("zu", "Zulu", "isiZulu"),
];

const BY_CODE = new Map(LOCALES.map((l) => [l.code, l]));

/** Languages one app can offer. */
export const MAX_LANGUAGES = 20;

/** Languages Yallapp ships its own translations in. */
export const BUILT_IN_LANGUAGES = ["en", "ar", "tr"] as const;

export function isLanguageCode(value: unknown): value is string {
  return typeof value === "string" && BY_CODE.has(value);
}

export function localeInfo(code: string): LocaleInfo | null {
  return BY_CODE.get(code) ?? null;
}

/** The language's name in English ("French"); the code when it isn't one. */
export function languageName(code: string): string {
  return BY_CODE.get(code)?.name ?? code;
}

export function isRtl(code: string): boolean {
  return RTL_CODES.includes(code);
}

export function isBuiltInLanguage(code: string): boolean {
  return (BUILT_IN_LANGUAGES as readonly string[]).includes(code);
}
