import 'package:flutter/widgets.dart';

import '../../l10n/app_localizations.dart';
import '../api/models/config_models.dart';

export '../../l10n/app_localizations.dart';

/// Interface languages the app ships (`Config.languages` codes).
const supportedLanguages = Languages.shippedLanguages;

extension L10nContext on BuildContext {
  /// The interface strings in the language in use.
  AppLocalizations get l10n => AppLocalizations.of(this);
}

AppLocalizations _current = lookupAppLocalizations(const Locale('en'));

/// The interface strings for code that has no [BuildContext] (API error
/// messages, formatters). Widgets use `context.l10n` so they rebuild when
/// the language changes.
AppLocalizations get currentL10n => _current;

/// Called by the app root whenever the language changes.
void setCurrentLanguage(String code) {
  _current = lookupAppLocalizations(
    Locale(supportedLanguages.contains(code) ? code : 'en'),
  );
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
