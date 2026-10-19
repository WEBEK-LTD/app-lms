import 'package:flutter/widgets.dart';

/// 43 A language the app can show: every language Flutter's Material and
/// Cupertino widgets come in, with its name in English and in the language
/// itself. The same list as the platform's (platform/web/src/lib/i18n/
/// locales.ts); a platform unit test keeps them equal.
@immutable
class AppLocale {
  const AppLocale(this.code, this.name, this.nativeName);

  final String code;

  /// In English.
  final String name;

  /// In the language itself, for the language picker.
  final String nativeName;

  bool get rtl => rtlLanguageCodes.contains(code);
}

/// Languages written right to left (also those the app can't show yet).
const rtlLanguageCodes = {
  'ar',
  'fa',
  'ur',
  'he',
  'ku',
  'ps',
  'sd',
  'ug',
  'yi',
  'dv',
};

/// The language's entry, or null for a code the app can't show.
AppLocale? appLocaleOf(String code) {
  for (final locale in appLocales) {
    if (locale.code == code) return locale;
  }
  return null;
}

/// The direction a language is written in.
TextDirection directionOf(String code) =>
    rtlLanguageCodes.contains(code) ? TextDirection.rtl : TextDirection.ltr;

const appLocales = [
  AppLocale('af', 'Afrikaans', 'Afrikaans'),
  AppLocale('am', 'Amharic', 'አማርኛ'),
  AppLocale('ar', 'Arabic', 'العربية'),
  AppLocale('as', 'Assamese', 'অসমীয়া'),
  AppLocale('az', 'Azerbaijani', 'Azərbaycan'),
  AppLocale('be', 'Belarusian', 'Беларуская'),
  AppLocale('bg', 'Bulgarian', 'Български'),
  AppLocale('bn', 'Bengali', 'বাংলা'),
  AppLocale('bo', 'Tibetan', 'བོད་སྐད་'),
  AppLocale('bs', 'Bosnian', 'Bosanski'),
  AppLocale('ca', 'Catalan', 'Català'),
  AppLocale('cs', 'Czech', 'Čeština'),
  AppLocale('cy', 'Welsh', 'Cymraeg'),
  AppLocale('da', 'Danish', 'Dansk'),
  AppLocale('de', 'German', 'Deutsch'),
  AppLocale('el', 'Greek', 'Ελληνικά'),
  AppLocale('en', 'English', 'English'),
  AppLocale('es', 'Spanish', 'Español'),
  AppLocale('et', 'Estonian', 'Eesti'),
  AppLocale('eu', 'Basque', 'Euskara'),
  AppLocale('fa', 'Persian', 'فارسی'),
  AppLocale('fi', 'Finnish', 'Suomi'),
  AppLocale('fil', 'Filipino', 'Filipino'),
  AppLocale('fr', 'French', 'Français'),
  AppLocale('ga', 'Irish', 'Gaeilge'),
  AppLocale('gl', 'Galician', 'Galego'),
  AppLocale('gsw', 'Swiss German', 'Schwiizertüütsch'),
  AppLocale('gu', 'Gujarati', 'ગુજરાતી'),
  AppLocale('he', 'Hebrew', 'עברית'),
  AppLocale('hi', 'Hindi', 'हिन्दी'),
  AppLocale('hr', 'Croatian', 'Hrvatski'),
  AppLocale('hu', 'Hungarian', 'Magyar'),
  AppLocale('hy', 'Armenian', 'Հայերեն'),
  AppLocale('id', 'Indonesian', 'Bahasa Indonesia'),
  AppLocale('is', 'Icelandic', 'Íslenska'),
  AppLocale('it', 'Italian', 'Italiano'),
  AppLocale('ja', 'Japanese', '日本語'),
  AppLocale('ka', 'Georgian', 'ქართული'),
  AppLocale('kk', 'Kazakh', 'Қазақ тілі'),
  AppLocale('km', 'Khmer', 'ខ្មែរ'),
  AppLocale('kn', 'Kannada', 'ಕನ್ನಡ'),
  AppLocale('ko', 'Korean', '한국어'),
  AppLocale('ky', 'Kyrgyz', 'Кыргызча'),
  AppLocale('lo', 'Lao', 'ລາວ'),
  AppLocale('lt', 'Lithuanian', 'Lietuvių'),
  AppLocale('lv', 'Latvian', 'Latviešu'),
  AppLocale('mk', 'Macedonian', 'Македонски'),
  AppLocale('ml', 'Malayalam', 'മലയാളം'),
  AppLocale('mn', 'Mongolian', 'Монгол'),
  AppLocale('mr', 'Marathi', 'मराठी'),
  AppLocale('ms', 'Malay', 'Bahasa Melayu'),
  AppLocale('my', 'Burmese', 'မြန်မာ'),
  AppLocale('nb', 'Norwegian Bokmål', 'Norsk bokmål'),
  AppLocale('ne', 'Nepali', 'नेपाली'),
  AppLocale('nl', 'Dutch', 'Nederlands'),
  AppLocale('no', 'Norwegian', 'Norsk'),
  AppLocale('or', 'Odia', 'ଓଡ଼ିଆ'),
  AppLocale('pa', 'Punjabi', 'ਪੰਜਾਬੀ'),
  AppLocale('pl', 'Polish', 'Polski'),
  AppLocale('ps', 'Pashto', 'پښتو'),
  AppLocale('pt', 'Portuguese', 'Português'),
  AppLocale('ro', 'Romanian', 'Română'),
  AppLocale('ru', 'Russian', 'Русский'),
  AppLocale('si', 'Sinhala', 'සිංහල'),
  AppLocale('sk', 'Slovak', 'Slovenčina'),
  AppLocale('sl', 'Slovenian', 'Slovenščina'),
  AppLocale('sq', 'Albanian', 'Shqip'),
  AppLocale('sr', 'Serbian', 'Српски'),
  AppLocale('sv', 'Swedish', 'Svenska'),
  AppLocale('sw', 'Swahili', 'Kiswahili'),
  AppLocale('ta', 'Tamil', 'தமிழ்'),
  AppLocale('te', 'Telugu', 'తెలుగు'),
  AppLocale('th', 'Thai', 'ไทย'),
  AppLocale('tl', 'Tagalog', 'Tagalog'),
  AppLocale('tr', 'Turkish', 'Türkçe'),
  AppLocale('ug', 'Uyghur', 'ئۇيغۇرچە'),
  AppLocale('uk', 'Ukrainian', 'Українська'),
  AppLocale('ur', 'Urdu', 'اردو'),
  AppLocale('uz', 'Uzbek', 'Oʻzbekcha'),
  AppLocale('vi', 'Vietnamese', 'Tiếng Việt'),
  AppLocale('zh', 'Chinese', '中文'),
  AppLocale('zu', 'Zulu', 'isiZulu'),
];
