import 'package:flutter/widgets.dart';

import '../l10n/l10n.dart';

/// 169 Capitals and small letters as the language writes them. Dart's
/// `toUpperCase` and `toLowerCase` know no language: in Turkish and Azeri
/// the dotted i's capital is İ and the dotless ı's is I ("AŞK İÇİN", not
/// "AŞK IÇIN"), and the other way round for small letters. Every text the
/// app shows in another case goes through these: kickers, labels, buttons,
/// initials and Studio's capitals. Codes, hosts and file types keep Dart's.

/// Whether [languageCode] writes the dotted and dotless i apart.
bool dottedILanguage(String? languageCode) {
  final code = _base(languageCode);
  return code == 'tr' || code == 'az';
}

String _base(String? languageCode) =>
    (languageCode ?? '').split(RegExp('[-_]')).first.toLowerCase();

/// The language in use when none is given: the app's interface language.
String _current() => currentL10n.localeName;

/// [text] in capitals as [languageCode] writes them (the app's language
/// when null).
String upperIn(String text, [String? languageCode]) {
  if (dottedILanguage(languageCode ?? _current())) {
    return text.replaceAll('i', 'İ').toUpperCase();
  }
  return text.toUpperCase();
}

/// [text] in small letters as [languageCode] writes them (the app's
/// language when null).
String lowerIn(String text, [String? languageCode]) {
  if (dottedILanguage(languageCode ?? _current())) {
    return text.replaceAll('I', 'ı').replaceAll('İ', 'i').toLowerCase();
  }
  // Without the language, a dotted capital İ is a plain i, not i and a dot.
  return text.replaceAll('İ', 'i').toLowerCase();
}

extension TextCaseContext on BuildContext {
  String get _language =>
      Localizations.maybeLocaleOf(this)?.languageCode ?? _current();

  /// [text] in capitals in the language in use.
  String upper(String text) => upperIn(text, _language);

  /// [text] in small letters in the language in use.
  String lower(String text) => lowerIn(text, _language);
}

extension LocaleCase on String {
  /// This text in capitals in the language in use at [context].
  String toUpperCaseIn(BuildContext context) => context.upper(this);

  /// This text in small letters in the language in use at [context].
  String toLowerCaseIn(BuildContext context) => context.lower(this);
}
