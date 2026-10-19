import 'package:flutter/foundation.dart' show SynchronousFuture;
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../../l10n/app_localizations.dart';
import '../../l10n/app_localizations_overlay.dart';
import '../api/models/config_models.dart';
import 'string_overlay.dart';

export '../../l10n/app_localizations.dart';

/// Interface languages the app ships (`Config.languages` codes).
const supportedLanguages = Languages.shippedLanguages;

extension L10nContext on BuildContext {
  /// The interface strings in the language in use.
  AppLocalizations get l10n => AppLocalizations.of(this);
}

/// 43 The app's strings in [code]: the owner's [pack] (a string pack) over
/// the app's own strings in that language, else over English. So a string
/// shows the owner's text, else the app's in that language, else English.
AppLocalizations localizationsFor(String code, [Map<String, String>? pack]) {
  final base = lookupAppLocalizations(
    Locale(supportedLanguages.contains(code) ? code : 'en'),
  );
  if (pack == null || pack.isEmpty) return base;
  return OverlayLocalizations(base, StringOverlay(pack, locale: code), code);
}

/// 43 Loads [AppLocalizations] for any of the app's languages, with the
/// owner's string packs ([packs]: language code, then key and text).
class AppStringsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const AppStringsDelegate([this.packs = const {}]);

  final Map<String, Map<String, String>> packs;

  @override
  bool isSupported(Locale locale) => true;

  @override
  Future<AppLocalizations> load(Locale locale) => SynchronousFuture(
    localizationsFor(locale.languageCode, packs[locale.languageCode]),
  );

  @override
  bool shouldReload(AppStringsDelegate old) => !identical(old.packs, packs);
}

/// The app's strings with the owner's packs, and the system widgets'
/// (Material, Cupertino) in every language they come in.
List<LocalizationsDelegate<dynamic>> appLocalizationsDelegates([
  Map<String, Map<String, String>> packs = const {},
]) => [
  AppStringsDelegate(packs),
  GlobalMaterialLocalizations.delegate,
  GlobalCupertinoLocalizations.delegate,
  GlobalWidgetsLocalizations.delegate,
];

AppLocalizations _current = lookupAppLocalizations(const Locale('en'));

/// The interface strings for code that has no [BuildContext] (API error
/// messages, formatters). Widgets use `context.l10n` so they rebuild when
/// the language changes.
AppLocalizations get currentL10n => _current;

/// Called by the app root whenever the language or its string pack changes.
void setCurrentLanguage(String code, [Map<String, String>? pack]) {
  _current = localizationsFor(code, pack);
}

const _mark = '\u{E000}';

/// Splits a translated sentence around its placeholders, so rich text can
/// style or link them: `parts(l10n.sentTo)` gives the text before, between
/// and after the placeholders, in the language's own order.
List<String> parts(String Function(String mark) message) =>
    message(_mark).split(_mark);

/// Like [parts], for messages with two placeholders.
List<String> parts2(String Function(String a, String b) message) =>
    message(_mark, _mark).split(_mark);
