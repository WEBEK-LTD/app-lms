import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/models.dart';
import '../gate/app_gate.dart';
import '../storage/local_settings.dart';
import 'l10n.dart';

/// The device's preferred languages, most preferred first. Tests override it.
final deviceLocalesProvider = Provider<List<Locale>>(
  (ref) => WidgetsBinding.instance.platformDispatcher.locales,
);

/// `Config.languages` from the last `/config`. Set by the gate before it
/// loads the pages, so they come back in the right language. Null until the
/// first `/config`.
final remoteLanguagesProvider = NotifierProvider<RemoteLanguages, Languages?>(
  RemoteLanguages.new,
);

class RemoteLanguages extends Notifier<Languages?> {
  @override
  Languages? build() => null;

  /// A server without `Config.languages` is English only.
  void update(Languages? languages) => state =
      languages ?? const Languages(defaultCode: 'en', available: ['en']);
}

/// Picks the language: the user's choice when the client offers it, else
/// the device's language when offered, else the client's default.
///
/// Before the first `/config` ([languages] null) any language the app ships
/// may be used.
String resolveLanguage({
  required String? saved,
  required Iterable<String> device,
  required Languages? languages,
}) {
  final available = languages?.available ?? supportedLanguages;
  if (saved != null && available.contains(saved)) return saved;
  for (final code in device) {
    if (available.contains(code)) return code;
  }
  if (languages != null) return languages.defaultCode;
  return 'en';
}

/// The language in use, a `Config.languages` code. Sent as `Accept-Language`
/// on every request; content providers watch it so they reload when it
/// changes.
final appLanguageProvider = Provider<String>((ref) {
  return resolveLanguage(
    saved: ref.watch(localSettingsProvider.select((s) => s.language)),
    device: [for (final l in ref.watch(deviceLocalesProvider)) l.languageCode],
    languages: ref.watch(remoteLanguagesProvider),
  );
});

/// The languages the user can pick in Settings.
final availableLanguagesProvider = Provider<List<String>>(
  (ref) => ref.watch(remoteLanguagesProvider)?.available ?? const ['en'],
);

/// Saves the user's pick and reloads the config, the pages and the content
/// in that language.
void changeLanguage(WidgetRef ref, String code) {
  if (ref.read(appLanguageProvider) == code) return;
  ref.read(localSettingsProvider.notifier).setLanguage(code);
  ref.read(appGateProvider.notifier).load(quiet: true);
}

/// A language's name in its own language, for the picker.
String languageName(String code) => lookupAppLocalizations(
  Locale(supportedLanguages.contains(code) ? code : 'en'),
).languageName;
